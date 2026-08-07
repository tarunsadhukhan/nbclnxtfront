"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useStoppageSetup } from "./hooks/useStoppageSetup";
import { useEntriesByDate } from "./hooks/useEntriesByDate";
import StoppageEntryForm from "./_components/StoppageEntryForm";
import DailyStoppagesGrid from "./_components/DailyStoppagesGrid";
import { todayISO } from "./utils/stoppageCalc";
import type { StoppageEntryRow } from "./types/stoppageTypes";

export default function StoppageHoursPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

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
		() =>
			(selectedCompany?.branches ?? []).filter((b) =>
				sidebarBranchIds.includes(Number(b.branch_id))
			),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	const [editingEntry, setEditingEntry] = React.useState<StoppageEntryRow | null>(null);

	const { setup, loading: setupLoading, error: setupError } = useStoppageSetup(coId, branchId);
	const { rows: entries, loading: entriesLoading, refresh: refreshEntries } = useEntriesByDate(
		coId,
		tranDate,
		branchId
	);

	const onSaved = React.useCallback(() => {
		refreshEntries();
	}, [refreshEntries]);

	const onEdit = React.useCallback((row: StoppageEntryRow) => {
		setEditingEntry(row);
	}, []);

	const onCancelEdit = React.useCallback(() => {
		setEditingEntry(null);
	}, []);

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
				Stoppage Hours
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Log machine downtime by reason, per date and spell.
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
				<Alert severity="info">Select a branch to load stoppage data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<StoppageEntryForm
							coId={coId}
							branchId={branchId}
							setup={setup}
							editingEntry={editingEntry}
							onSaved={onSaved}
							onCancelEdit={onCancelEdit}
						/>
					)}
					<Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
							<Typography variant="subtitle2">Stoppages for date</Typography>
							<TextField
								type="date"
								size="small"
								value={tranDate}
								onChange={(e) => setTranDate(e.target.value)}
								InputLabelProps={{ shrink: true }}
							/>
						</Box>
						<DailyStoppagesGrid
							coId={coId}
							rows={entries}
							loading={entriesLoading}
							onEdit={onEdit}
							onDeleted={onSaved}
						/>
					</Box>
				</Box>
			)}
		</Box>
	);
}
