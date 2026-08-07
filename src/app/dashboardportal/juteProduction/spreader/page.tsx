"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useSpreaderSetup } from "./hooks/useSpreaderSetup";
import { useEntriesByDate } from "./hooks/useEntriesByDate";
import { useIssueSetup, useIssuesByDate } from "./hooks/useIssueSetup";
import { useRollStock } from "./hooks/useRollStock";
import ProductionEntryForm from "./_components/ProductionEntryForm";
import DailyEntriesGrid from "./_components/DailyEntriesGrid";
import IssueEntryForm from "./_components/IssueEntryForm";
import DailyIssuesGrid from "./_components/DailyIssuesGrid";
import RollStockTable from "./_components/RollStockTable";
import { todayISO } from "./utils/shift";

const TABS = ["Production", "Issue", "Stock View"] as const;

export default function SpreaderPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => { setMounted(true); }, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();
	const [tab, setTab] = React.useState(0);

	// Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
	const sidebarBranchIds = React.useMemo(() => selectedBranches.map(Number), [selectedBranches]);
	const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
	React.useEffect(() => {
		if (sidebarBranchIds.length === 1) {
			setPageBranchId(sidebarBranchIds[0]);
		} else if (sidebarBranchIds.length === 0) {
			setPageBranchId("");
		} else {
			setPageBranchId((prev) =>
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	// Production tab state
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const { setup: prodSetup, loading: setupLoading, error: setupError } = useSpreaderSetup(coId, branchId);
	const { rows: entries, loading: entriesLoading, refresh: refreshEntries } = useEntriesByDate(
		coId,
		entryDate,
		branchId
	);

	// Issue tab state
	const [issueDate, setIssueDate] = React.useState<string>(todayISO());
	const { setup: issueSetup, refresh: refreshIssueSetup } = useIssueSetup(coId, branchId);
	const { rows: issues, loading: issuesLoading, refresh: refreshIssues } = useIssuesByDate(
		coId,
		issueDate,
		branchId
	);

	// Stock tab state
	const { rows: stockRows, summary, loading: stockLoading, refresh: refreshStock } = useRollStock(coId, branchId);

	const onProductionSaved = React.useCallback(() => {
		refreshEntries();
		refreshIssueSetup();
		refreshStock();
	}, [refreshEntries, refreshIssueSetup, refreshStock]);

	const onIssueSaved = React.useCallback(() => {
		refreshIssues();
		refreshIssueSetup();
		refreshStock();
	}, [refreshIssues, refreshIssueSetup, refreshStock]);

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	if (sidebarBranchIds.length === 0) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select at least one branch in the sidebar to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Spreader Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Daily production entry, roll issue, and bin-level stock view.
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, minWidth: 240 }}
				>
					{branchOptions.map((b) => (
						<MenuItem key={b.branch_id} value={Number(b.branch_id)}>
							{b.branch_name}
						</MenuItem>
					))}
				</TextField>
			) : selectedBranchName ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Branch: {selectedBranchName}
				</Typography>
			) : null}

			{branchId == null ? (
				<Alert severity="info">Select a branch to load spreader data.</Alert>
			) : (
				<>
			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				variant="scrollable"
				scrollButtons="auto"
				allowScrollButtonsMobile
				sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
			>
				{TABS.map((label) => (
					<Tab key={label} label={label} sx={{ minHeight: 44 }} />
				))}
			</Tabs>

			{setupError ? <Alert severity="error">{setupError}</Alert> : null}

			{tab === 0 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{setupLoading || !prodSetup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<ProductionEntryForm coId={coId} branchId={branchId} setup={prodSetup} onSaved={onProductionSaved} />
					)}
					<Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
							<Typography variant="subtitle2">Entries for date</Typography>
							<TextField
								type="date"
								size="small"
								value={entryDate}
								onChange={(e) => setEntryDate(e.target.value)}
								InputLabelProps={{ shrink: true }}
							/>
						</Box>
						<DailyEntriesGrid
							coId={coId}
							rows={entries}
							loading={entriesLoading}
							onDeleted={onProductionSaved}
						/>
					</Box>
				</Box>
			) : null}

			{tab === 1 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{!issueSetup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : issueSetup.bins_with_stock.length === 0 ? (
						<Alert severity="info">No bins have stock to issue from.</Alert>
					) : (
						<IssueEntryForm coId={coId} branchId={branchId} setup={issueSetup} onSaved={onIssueSaved} />
					)}
					<Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
							<Typography variant="subtitle2">Issues for date</Typography>
							<TextField
								type="date"
								size="small"
								value={issueDate}
								onChange={(e) => setIssueDate(e.target.value)}
								InputLabelProps={{ shrink: true }}
							/>
						</Box>
						<DailyIssuesGrid
							coId={coId}
							rows={issues}
							loading={issuesLoading}
							onDeleted={onIssueSaved}
						/>
					</Box>
				</Box>
			) : null}

			{tab === 2 ? (
				<RollStockTable rows={stockRows} summary={summary} loading={stockLoading} />
			) : null}
				</>
			)}
		</Box>
	);
}
