"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO, computeTpiPreview } from "./utils/yarnTpiCalc";
import { useYarnTpiSetup } from "./hooks/useYarnTpiSetup";
import { useYarnTpiByDate } from "./hooks/useYarnTpiByDate";
import YarnTpiForm from "./_components/YarnTpiForm";
import YarnTpiGrid from "./_components/YarnTpiGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type { YarnTpiGroup, YarnTpiStats } from "./types/yarnTpiTypes";

// Mirror YarnTpiGrid.statsFor: prefer server stats, else client fallback.
function statsForGroup(g: YarnTpiGroup): YarnTpiStats {
	if (g.stats) return g.stats;
	const p = computeTpiPreview(g.readings ?? []);
	const stdTpi = g.std_tpi ?? null;
	return {
		...p,
		std_tpi: stdTpi,
		tpi_diff:
			p.avg_tpi != null && stdTpi != null ? Math.round((p.avg_tpi - stdTpi) * 100) / 100 : null,
	};
}

function fmtNum(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Columns mirror the on-screen grid (UI-only expand/actions columns omitted).
const PRINT_COLUMNS: PrintColumn[] = [
	{ key: "quality", label: "Quality" },
	{ key: "spinning_frame", label: "Spinning Frame" },
	{ key: "count_lbs", label: "Count (lbs)", align: "right" },
	{ key: "std_tpi", label: "Std.TPI", align: "right" },
	{ key: "avg_tpi", label: "Avg TPI", align: "right" },
	{ key: "tpi_diff", label: "Avg − Std", align: "right" },
	{ key: "std_dev", label: "Std Dev", align: "right" },
	{ key: "cv_pct", label: "CV %", align: "right" },
	{ key: "min_tpi", label: "Min", align: "right" },
	{ key: "max_tpi", label: "Max", align: "right" },
	{ key: "prepared_by", label: "Prepared By" },
];

export default function YarnTpiSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
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
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const { setup, loading: setupLoading, error: setupError } = useYarnTpiSetup(coId, entryDate, branchId);
	const {
		groups,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useYarnTpiByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: one consolidated report of every loaded test for the date.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (groups.length === 0) return null;
		const rows = groups.map((g) => {
			const s = statsForGroup(g);
			return {
				quality: g.item_name ?? g.item_code ?? `Yarn #${g.item_id}`,
				spinning_frame:
					g.mech_code ?? g.machine_name ?? (g.mc_id != null ? `MC #${g.mc_id}` : "—"),
				count_lbs: fmtNum(g.count_lbs),
				std_tpi: fmtNum(s.std_tpi),
				avg_tpi: fmtNum(s.avg_tpi),
				tpi_diff: fmtNum(s.tpi_diff),
				std_dev: fmtNum(s.std_dev),
				cv_pct: fmtNum(s.cv_pct),
				min_tpi: fmtNum(s.min_tpi),
				max_tpi: fmtNum(s.max_tpi),
				prepared_by: g.prepared_by ?? "—",
			};
		});
		return {
			reportTitle: "Yarn TPI SQC",
			reportCode: "R-08-TPI",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					columns: PRINT_COLUMNS,
					rows,
					emptyText: "No Yarn TPI tests for the selected date.",
				},
			],
		};
	}, [groups, selectedCompany, selectedBranchName, entryDate]);

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
				Yarn TPI SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture R-08-17 Yarn TPI &amp; TPI CV% — one test per (spinning frame, yarn quality) with a
				20-cell TPI reading grid. The server recomputes average TPI, std dev, CV%, min and max on save.
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
				<Alert severity="info">Select a branch to load Yarn TPI SQC data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Entry date</Typography>
						<TextField
							type="date"
							size="small"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<Box sx={{ flexGrow: 1 }} />
						<SqcPrintButton
							getReport={getReport}
							disabled={byDateLoading || groups.length === 0}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<YarnTpiForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<YarnTpiGrid coId={coId} groups={groups} loading={byDateLoading} onDeleted={onSaved} />
				</Box>
			)}
		</Box>
	);
}
