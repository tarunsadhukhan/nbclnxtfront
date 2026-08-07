"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/finDrawCalc";
import { useFinDrawSetup } from "./hooks/useFinDrawSetup";
import { useFinDrawByDate } from "./hooks/useFinDrawByDate";
import FinDrawForm from "./_components/FinDrawForm";
import FinDrawGrid from "./_components/FinDrawGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type {
	FinDrawGrandAverage,
	FinDrawReadingRow,
	FinDrawSection,
	SectionAverage,
} from "./types/finDrawTypes";

// Single-stage page; one tab for the multi-machine finisher-drawing SWT sheet.
const TABS = ["R-08-12/13/14 Finisher Drawing"] as const;

// ── Print label helpers (mirror FinDrawGrid's on-screen labels) ──────────────
const SECTION_LABEL: Record<FinDrawSection, string> = {
	HESS: "Hessian",
	SWP: "Sacking Warp (SWP)",
	SWT: "Sacking Warp/Twine (SWT)",
};
const SECTION_ORDER: FinDrawSection[] = ["HESS", "SWP", "SWT"];
const sectionLabel = (s: FinDrawSection | null | undefined): string =>
	s ? SECTION_LABEL[s] ?? s : "—";
const sectionRank = (s: FinDrawSection | null | undefined): number => {
	const i = s ? SECTION_ORDER.indexOf(s) : -1;
	return i === -1 ? SECTION_ORDER.length : i;
};

function machineLabel(r: FinDrawReadingRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function batchLabel(r: FinDrawReadingRow | FinDrawGrandAverage): string {
	return r.batch_plan_name ?? (r.batch_plan_id != null ? `Batch #${r.batch_plan_id}` : "—");
}

function spellLabel(r: FinDrawReadingRow): string {
	return r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

function dlvLabel(r: FinDrawReadingRow): string {
	const dlv = Array.isArray(r.dlv_nos) ? r.dlv_nos : [];
	if (dlv.length === 0) return "—";
	return dlv.map((d) => (d == null ? "—" : String(d))).join(", ");
}

const num = (v: number | null | undefined, digits = 2): string =>
	v != null ? Number(v).toFixed(digits) : "";
const pct = (v: number | null | undefined): string =>
	v != null ? `${(Number(v) * 100).toFixed(2)}%` : "";

// Readings table columns — mirror the grid (minus the delete action column).
const READING_COLUMNS: PrintColumn[] = [
	{ key: "entry_date", label: "Date" },
	{ key: "section", label: "Section" },
	{ key: "machine", label: "Machine" },
	{ key: "spell", label: "Spell" },
	{ key: "batch", label: "Batch" },
	{ key: "dlv", label: "DLV Nos" },
	{ key: "std_mr_pct", label: "Std MR%", align: "right" },
	{ key: "calc_wt", label: "Obs Wt", align: "right" },
	{ key: "calc_mr_pct", label: "MR%", align: "right" },
	{ key: "calc_corr_wt", label: "Corr Wt", align: "right" },
	{ key: "calc_sdev", label: "StDev", align: "right" },
	{ key: "calc_cv_pct", label: "CV %", align: "right" },
	{ key: "band", label: "Band", align: "center" },
];

const SECTION_AVG_COLUMNS: PrintColumn[] = [
	{ key: "section", label: "Section" },
	{ key: "row_count", label: "Rows", align: "right" },
	{ key: "avg_obs", label: "Obs", align: "right" },
	{ key: "avg_mr_pct", label: "MR%", align: "right" },
	{ key: "avg_corr_wt", label: "Corr", align: "right" },
	{ key: "avg_sdev", label: "StDev", align: "right" },
	{ key: "avg_cv_pct", label: "CV %", align: "right" },
];

const GRAND_AVG_COLUMNS: PrintColumn[] = [
	{ key: "batch", label: "Batch" },
	{ key: "row_count", label: "Rows", align: "right" },
	{ key: "grand_obs", label: "Obs", align: "right" },
	{ key: "grand_mr_pct", label: "MR%", align: "right" },
	{ key: "grand_corr_wt", label: "Corr", align: "right" },
	{ key: "grand_cv_pct", label: "CV %", align: "right" },
];

export default function FinDrawSqcPage() {
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

	// R-08-12/13/14 Finisher Drawing: per (section, machine, spell, batch) bench readings by date.
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const {
		setup,
		loading: setupLoading,
		error: setupError,
	} = useFinDrawSetup(coId, entryDate, branchId);
	const {
		rows,
		sectionAverages,
		grandAverages,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useFinDrawByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: ONE consolidated report for the selected date. Spell is an
	// ordinary data column; non-shift grouping (section, batch) is preserved as
	// sub-sections of the SAME day report. No new fetches — reuses loaded rows.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;

		const sortedRows = [...rows].sort((a, b) => {
			const sr = sectionRank(a.section) - sectionRank(b.section);
			if (sr !== 0) return sr;
			return batchLabel(a).localeCompare(batchLabel(b));
		});

		const readingRows = sortedRows.map((r: FinDrawReadingRow) => ({
			entry_date: r.entry_date,
			section: sectionLabel(r.section),
			machine: machineLabel(r),
			spell: spellLabel(r),
			batch: batchLabel(r),
			dlv: dlvLabel(r),
			std_mr_pct: num(r.std_mr_pct),
			calc_wt: num(r.calc_wt),
			calc_mr_pct: num(r.calc_mr_pct),
			calc_corr_wt: num(r.calc_corr_wt),
			calc_sdev: num(r.calc_sdev, 4),
			calc_cv_pct: pct(r.calc_cv_pct),
			band: r.cv_within_band == null ? "—" : r.cv_within_band ? "PASS" : "FAIL",
		}));

		const orderedSectionAverages = [...sectionAverages].sort(
			(a, b) => sectionRank(a.section) - sectionRank(b.section)
		);
		const sectionAvgRows = orderedSectionAverages.map((s: SectionAverage) => ({
			section: sectionLabel(s.section),
			row_count: s.row_count ?? "—",
			avg_obs: num(s.avg_obs),
			avg_mr_pct: num(s.avg_mr_pct),
			avg_corr_wt: num(s.avg_corr_wt),
			avg_sdev: num(s.avg_sdev, 4),
			avg_cv_pct: pct(s.avg_cv_pct),
		}));

		const grandAvgRows = grandAverages.map((g: FinDrawGrandAverage) => ({
			batch: batchLabel(g),
			row_count: g.row_count ?? "—",
			grand_obs: num(g.grand_obs),
			grand_mr_pct: num(g.grand_mr_pct),
			grand_corr_wt: num(g.grand_corr_wt),
			grand_cv_pct: pct(g.grand_cv_pct),
		}));

		return {
			reportTitle: "Finisher Draw Sliver Weight SQC",
			reportCode: "R-08-12",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{ kind: "table", title: "Readings", columns: READING_COLUMNS, rows: readingRows },
				...(sectionAvgRows.length > 0
					? ([
							{
								kind: "table",
								title: "Average by Section",
								columns: SECTION_AVG_COLUMNS,
								rows: sectionAvgRows,
							},
					  ] as const)
					: []),
				...(grandAvgRows.length > 0
					? ([
							{
								kind: "table",
								title: "Grand Average by Batch",
								columns: GRAND_AVG_COLUMNS,
								rows: grandAvgRows,
							},
					  ] as const)
					: []),
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
				Finisher Drawing SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture finisher drawing sliver weight (R-08-12/13/14) across the three sub-sections —
				Hessian, Sacking Warp (SWP) and Sacking Warp/Twine (SWT) — one sheet, many (section, machine,
				spell, batch) reading sets, each with up to 4 per-cut delivery (DLV) numbers and linked to a
				batch (jute batch plan), each corrected to STD MR% 16 with per-section and per-batch grand
				averages.
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
				<Alert severity="info">Select a branch to load Finisher Drawing SQC data.</Alert>
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
								<SqcPrintButton
									getReport={getReport}
									disabled={byDateLoading || rows.length === 0}
								/>
							</Box>
							{setupError ? <Alert severity="error">{setupError}</Alert> : null}
							{setupLoading || !setup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<FinDrawForm
									coId={coId}
									branchId={branchId}
									entryDate={entryDate}
									setup={setup}
									onSaved={onSaved}
								/>
							)}
							<FinDrawGrid
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
