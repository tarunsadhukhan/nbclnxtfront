"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/drawheadCalc";
import { useDrawheadSetup } from "./hooks/useDrawheadSetup";
import { useDrawheadByDate } from "./hooks/useDrawheadByDate";
import DrawheadForm from "./_components/DrawheadForm";
import DrawheadGrid from "./_components/DrawheadGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type {
	DrawSection,
	DrawheadReadingRow,
	DrawheadGrandAverage,
	TimeBand,
} from "./types/drawheadTypes";

// Single-stage page; one tab for the multi-machine draw-sliver SWT sheet.
const TABS = ["R-08-08/09/10 Drawhead & Finisher Card"] as const;

// ─── Print label helpers (mirror DrawheadGrid's on-screen labels) ─────────────
const PRINT_SECTION_LABEL: Record<DrawSection, string> = {
	DRAWHEAD_SWT: "Drawhead SWT",
	DRAWHEAD_SWP: "Drawhead SWP",
	FINISHER_CARD: "Finisher Card",
};
const PRINT_SECTION_ORDER: DrawSection[] = ["DRAWHEAD_SWT", "DRAWHEAD_SWP", "FINISHER_CARD"];
const printSectionLabel = (s: DrawSection | null | undefined): string =>
	s ? PRINT_SECTION_LABEL[s] ?? s : "—";
const printSectionRank = (s: DrawSection | null | undefined): number => {
	const i = s ? PRINT_SECTION_ORDER.indexOf(s) : -1;
	return i === -1 ? PRINT_SECTION_ORDER.length : i;
};

const PRINT_TIME_BAND_LABEL: Record<TimeBand, string> = {
	MORNING: "Morning (AM)",
	AFTERNOON: "Afternoon (PM)",
};
const printTimeBandLabel = (t: TimeBand | null | undefined): string =>
	t ? PRINT_TIME_BAND_LABEL[t] ?? t : "—";

const printMachineLabel = (r: DrawheadReadingRow): string => {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
};
const printBatchLabel = (r: DrawheadReadingRow | DrawheadGrandAverage): string =>
	r.batch_plan_name ?? (r.batch_plan_id != null ? `Batch #${r.batch_plan_id}` : "—");
const printSpellLabel = (r: DrawheadReadingRow): string =>
	r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");

const fmt = (v: number | null | undefined, digits = 2): string =>
	v != null ? Number(v).toFixed(digits) : "—";
const fmtCv = (v: number | null | undefined): string =>
	v != null ? `${(Number(v) * 100).toFixed(2)}%` : "—";

export default function DrawheadSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

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

	// R-08-08/09/10 Drawhead & Finisher Card: per (section, time band, machine, spell, batch) bench readings by date.
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const {
		setup,
		loading: setupLoading,
		error: setupError,
	} = useDrawheadSetup(coId, entryDate, branchId);
	const {
		rows,
		sectionAverages,
		grandAverages,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useDrawheadByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: one consolidated report for the selected date. spell and
	// time_band are ordinary data columns (never a shift filter); the grid's
	// section grouping is preserved by sorting readings by section then batch, and
	// the server-computed per-section / per-batch averages are mirrored as their
	// own summary tables (matching the on-screen average blocks).
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;

		const readingColumns: PrintColumn[] = [
			{ key: "section", label: "Section" },
			{ key: "time_band", label: "Time Band" },
			{ key: "machine", label: "Machine" },
			{ key: "spell", label: "Spell" },
			{ key: "batch", label: "Batch" },
			{ key: "std_mr_pct", label: "Std MR%", align: "right" },
			{ key: "calc_wt", label: "Obs Wt", align: "right" },
			{ key: "calc_mr_pct", label: "MR%", align: "right" },
			{ key: "calc_corr_wt", label: "Corr Wt", align: "right" },
			{ key: "calc_sdev", label: "StDev", align: "right" },
			{ key: "calc_cv_pct", label: "CV %", align: "right" },
			{ key: "cv_within_band", label: "Band", align: "center" },
		];

		const sortedRows = [...rows].sort((a, b) => {
			const sr = printSectionRank(a.section) - printSectionRank(b.section);
			if (sr !== 0) return sr;
			return printBatchLabel(a).localeCompare(printBatchLabel(b));
		});

		const readingRows = sortedRows.map((r) => ({
			section: printSectionLabel(r.section),
			time_band: printTimeBandLabel(r.time_band),
			machine: printMachineLabel(r),
			spell: printSpellLabel(r),
			batch: printBatchLabel(r),
			std_mr_pct: fmt(r.std_mr_pct),
			calc_wt: fmt(r.calc_wt),
			calc_mr_pct: fmt(r.calc_mr_pct),
			calc_corr_wt: fmt(r.calc_corr_wt),
			calc_sdev: fmt(r.calc_sdev, 4),
			calc_cv_pct: fmtCv(r.calc_cv_pct),
			cv_within_band: r.cv_within_band == null ? "—" : r.cv_within_band ? "PASS" : "FAIL",
		}));

		const orderedSectionAverages = [...sectionAverages].sort(
			(a, b) => printSectionRank(a.section) - printSectionRank(b.section)
		);
		const sectionAvgColumns: PrintColumn[] = [
			{ key: "section", label: "Section" },
			{ key: "rows", label: "Rows", align: "right" },
			{ key: "obs", label: "Obs", align: "right" },
			{ key: "mr_pct", label: "MR%", align: "right" },
			{ key: "corr", label: "Corr", align: "right" },
			{ key: "sdev", label: "StDev", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
		];
		const sectionAvgRows = orderedSectionAverages.map((s) => ({
			section: printSectionLabel(s.section),
			rows: s.row_count ?? "—",
			obs: fmt(s.avg_obs),
			mr_pct: fmt(s.avg_mr_pct),
			corr: fmt(s.avg_corr_wt),
			sdev: fmt(s.avg_sdev, 4),
			cv_pct: fmtCv(s.avg_cv_pct),
		}));

		const grandAvgColumns: PrintColumn[] = [
			{ key: "batch", label: "Batch" },
			{ key: "rows", label: "Rows", align: "right" },
			{ key: "obs", label: "Obs", align: "right" },
			{ key: "mr_pct", label: "MR%", align: "right" },
			{ key: "corr", label: "Corr", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
		];
		const grandAvgRows = grandAverages.map((g) => ({
			batch: printBatchLabel(g),
			rows: g.row_count ?? "—",
			obs: fmt(g.grand_obs),
			mr_pct: fmt(g.grand_mr_pct),
			corr: fmt(g.grand_corr_wt),
			cv_pct: fmtCv(g.grand_cv_pct),
		}));

		return {
			reportTitle: "Drawhead & Finisher Card Sliver Weight SQC",
			reportCode: "R-08-08/09/10",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					title: "Average by Section",
					columns: sectionAvgColumns,
					rows: sectionAvgRows,
					emptyText: "No section-average rows for this date.",
				},
				{
					kind: "table",
					title: "Grand Average by Batch",
					columns: grandAvgColumns,
					rows: grandAvgRows,
					emptyText: "No grand-average rows for this date.",
				},
				{
					kind: "table",
					title: "Readings",
					columns: readingColumns,
					rows: readingRows,
				},
			],
		};
	}, [rows, sectionAverages, grandAverages, selectedCompany, selectedBranchName, entryDate]);

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
				Drawhead SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture draw sliver weight (R-08-08/09/10) across the three drawing sub-sections — Drawhead
				SWT, Drawhead SWP and Finisher Card — one sheet, many (section, time band, machine, spell,
				batch) reading sets, each linked to a batch (jute batch plan), each corrected to the
				quality&apos;s STD MR% 16 with per-section and per-batch grand averages.
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
				<Alert severity="info">Select a branch to load Drawhead & Finisher Card SQC data.</Alert>
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

					{tab === 0 ? (
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
								<Box sx={{ ml: "auto" }}>
									<SqcPrintButton
										getReport={getReport}
										disabled={byDateLoading || rows.length === 0}
									/>
								</Box>
							</Box>
							{setupError ? <Alert severity="error">{setupError}</Alert> : null}
							{setupLoading || !setup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<DrawheadForm
									coId={coId}
									branchId={branchId}
									entryDate={entryDate}
									setup={setup}
									onSaved={onSaved}
								/>
							)}
							<DrawheadGrid
								coId={coId}
								rows={rows}
								sectionAverages={sectionAverages}
								grandAverages={grandAverages}
								loading={byDateLoading}
								onDeleted={onSaved}
							/>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
