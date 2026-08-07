"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/interCardCalc";
import { useInterCardSetup } from "./hooks/useInterCardSetup";
import { useInterCardByDate } from "./hooks/useInterCardByDate";
import InterCardForm from "./_components/InterCardForm";
import InterCardGrid from "./_components/InterCardGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type { CardSection } from "./types/interCardTypes";

// Single-stage page; one tab for the multi-machine card-sliver SWT sheet.
const TABS = ["R-08-07A Inter Card & Tow Breaker"] as const;

export default function InterCardSqcPage() {
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

	// R-08-07A Inter Card & Tow Breaker: per (section, machine, spell, batch) bench readings by date.
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const {
		setup,
		loading: setupLoading,
		error: setupError,
	} = useInterCardSetup(coId, entryDate, branchId);
	const {
		rows,
		sectionAverages,
		grandAverages,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useInterCardByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level Print (R-08-07A). Mirrors the on-screen grid: one consolidated
	// readings table for the whole day (section/machine/spell/batch are ordinary
	// columns — never a per-shift split) plus the server-computed section-average
	// and per-batch grand-average summaries as their own tables.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;

		const SECTION_LABEL: Record<CardSection, string> = {
			INTER_CARD: "Inter Card",
			TOW_BREAKER: "Tow Breaker",
			HOPPER: "Hopper",
		};
		const SECTION_ORDER: CardSection[] = ["INTER_CARD", "TOW_BREAKER", "HOPPER"];
		const sectionLabel = (s: CardSection | null | undefined): string =>
			s ? SECTION_LABEL[s] ?? s : "—";
		const sectionRank = (s: CardSection | null | undefined): number => {
			const i = s ? SECTION_ORDER.indexOf(s) : -1;
			return i === -1 ? SECTION_ORDER.length : i;
		};
		const num = (v: number | null | undefined, digits: number): string =>
			v != null ? Number(v).toFixed(digits) : "";
		const pct = (v: number | null | undefined): string =>
			v != null ? `${(Number(v) * 100).toFixed(2)}%` : "";

		// Reading rows — grouped/sorted by section then batch, same as the grid.
		const sortedRows = [...rows].sort((a, b) => {
			const sr = sectionRank(a.section) - sectionRank(b.section);
			if (sr !== 0) return sr;
			const ba = a.batch_plan_name ?? (a.batch_plan_id != null ? `Batch #${a.batch_plan_id}` : "—");
			const bb = b.batch_plan_name ?? (b.batch_plan_id != null ? `Batch #${b.batch_plan_id}` : "—");
			return ba.localeCompare(bb);
		});

		const readingColumns: PrintColumn[] = [
			{ key: "section", label: "Section" },
			{ key: "machine", label: "Machine" },
			{ key: "spell", label: "Spell" },
			{ key: "batch", label: "Batch" },
			{ key: "std_mr_pct", label: "Std MR%", align: "right" },
			{ key: "calc_wt", label: "Obs Wt", align: "right" },
			{ key: "calc_mr_pct", label: "MR%", align: "right" },
			{ key: "calc_corr_wt", label: "Corr Wt", align: "right" },
			{ key: "calc_sdev", label: "StDev", align: "right" },
			{ key: "calc_cv_pct", label: "CV %", align: "right" },
			{ key: "band", label: "Band" },
		];

		const readingRows = sortedRows.map((r) => ({
			section: sectionLabel(r.section),
			machine: r.machine_name
				? `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`
				: r.mc_id != null
				? `MC #${r.mc_id}`
				: "—",
			spell: r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—"),
			batch: r.batch_plan_name ?? (r.batch_plan_id != null ? `Batch #${r.batch_plan_id}` : "—"),
			std_mr_pct: num(r.std_mr_pct, 2),
			calc_wt: num(r.calc_wt, 2),
			calc_mr_pct: num(r.calc_mr_pct, 2),
			calc_corr_wt: num(r.calc_corr_wt, 2),
			calc_sdev: num(r.calc_sdev, 4),
			calc_cv_pct: pct(r.calc_cv_pct),
			band: r.cv_within_band == null ? "—" : r.cv_within_band ? "PASS" : "FAIL",
		}));

		// Per-section averages (fixed display order).
		const sectionAvgColumns: PrintColumn[] = [
			{ key: "section", label: "Section" },
			{ key: "row_count", label: "Rows", align: "right" },
			{ key: "avg_obs", label: "Obs", align: "right" },
			{ key: "avg_mr_pct", label: "MR%", align: "right" },
			{ key: "avg_corr_wt", label: "Corr", align: "right" },
			{ key: "avg_sdev", label: "StDev", align: "right" },
			{ key: "avg_cv_pct", label: "CV %", align: "right" },
		];
		const sectionAvgRows = [...sectionAverages]
			.sort((a, b) => sectionRank(a.section) - sectionRank(b.section))
			.map((s) => ({
				section: sectionLabel(s.section),
				row_count: s.row_count ?? "—",
				avg_obs: s.avg_obs != null ? num(s.avg_obs, 2) : "—",
				avg_mr_pct: s.avg_mr_pct != null ? num(s.avg_mr_pct, 2) : "—",
				avg_corr_wt: s.avg_corr_wt != null ? num(s.avg_corr_wt, 2) : "—",
				avg_sdev: s.avg_sdev != null ? num(s.avg_sdev, 4) : "—",
				avg_cv_pct: s.avg_cv_pct != null ? pct(s.avg_cv_pct) : "—",
			}));

		// Per-batch grand averages.
		const grandAvgColumns: PrintColumn[] = [
			{ key: "batch", label: "Batch" },
			{ key: "row_count", label: "Rows", align: "right" },
			{ key: "grand_obs", label: "Obs", align: "right" },
			{ key: "grand_mr_pct", label: "MR%", align: "right" },
			{ key: "grand_corr_wt", label: "Corr", align: "right" },
			{ key: "grand_cv_pct", label: "CV %", align: "right" },
		];
		const grandAvgRows = grandAverages.map((g) => ({
			batch: g.batch_plan_name ?? (g.batch_plan_id != null ? `Batch #${g.batch_plan_id}` : "—"),
			row_count: g.row_count ?? "—",
			grand_obs: g.grand_obs != null ? num(g.grand_obs, 2) : "—",
			grand_mr_pct: g.grand_mr_pct != null ? num(g.grand_mr_pct, 2) : "—",
			grand_corr_wt: g.grand_corr_wt != null ? num(g.grand_corr_wt, 2) : "—",
			grand_cv_pct: g.grand_cv_pct != null ? pct(g.grand_cv_pct) : "—",
		}));

		return {
			reportTitle: "Card Sliver Weight SQC",
			reportCode: "R-08-07A",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					title: "Readings",
					columns: readingColumns,
					rows: readingRows,
				},
				{
					kind: "table",
					title: "Average by Section",
					columns: sectionAvgColumns,
					rows: sectionAvgRows,
					emptyText: "No section-average rows yet for this date.",
				},
				{
					kind: "table",
					title: "Grand Average by Batch",
					columns: grandAvgColumns,
					rows: grandAvgRows,
					emptyText: "No grand-average rows yet for this date.",
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
				Inter Card & Tow Breaker SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture card sliver weight (R-08-07A) across the three carding sub-sections — Inter Card,
				Tow Breaker and Hopper — one sheet, many (section, machine, spell, batch) reading sets, each linked to a batch (jute batch plan),
				each corrected to the quality&apos;s STD MR% 20 with per-section and per-batch grand averages.
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
				<Alert severity="info">Select a branch to load Inter Card & Tow Breaker SQC data.</Alert>
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
										label="Print"
									/>
								</Box>
							</Box>
							{setupError ? <Alert severity="error">{setupError}</Alert> : null}
							{setupLoading || !setup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<InterCardForm
									coId={coId}
									branchId={branchId}
									entryDate={entryDate}
									setup={setup}
									onSaved={onSaved}
								/>
							)}
							<InterCardGrid
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
