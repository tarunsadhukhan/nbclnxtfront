"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/breakerCardCalc";
import { useBreakerCardSetup } from "./hooks/useBreakerCardSetup";
import { useBreakerCardByDate } from "./hooks/useBreakerCardByDate";
import BreakerCardForm from "./_components/BreakerCardForm";
import BreakerCardGrid from "./_components/BreakerCardGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type {
	BreakerCardGrandAverage,
	BreakerCardReadingRow,
} from "./types/breakerCardTypes";

// Single-stage page; one tab for the multi-machine breaker-card SWT sheet.
const TABS = ["R-08-05/06/07 Breaker Card"] as const;

export default function BreakerCardSqcPage() {
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

	// R-08-05/06/07 Breaker Card: per (machine, spell, batch) bench readings by date.
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const {
		setup,
		loading: setupLoading,
		error: setupError,
	} = useBreakerCardSetup(coId, entryDate, branchId);
	const {
		rows,
		grandAverages,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useBreakerCardByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print (R-08-05/06/07). Mirrors the on-screen grid columns/labels
	// and the per-batch grand-average block. Spell is an ordinary column — the
	// printout is ONE consolidated day report, never split by shift/spell.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;

		const machineLabel = (r: BreakerCardReadingRow): string =>
			r.machine_name
				? `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`
				: r.mc_id != null
				? `MC #${r.mc_id}`
				: "—";
		const spellLabel = (r: BreakerCardReadingRow): string =>
			r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
		const batchLabel = (r: BreakerCardReadingRow | BreakerCardGrandAverage): string =>
			r.batch_plan_name ?? (r.batch_plan_id != null ? `Batch #${r.batch_plan_id}` : "—");
		const num = (v: number | null | undefined, digits: number): string =>
			v != null ? Number(v).toFixed(digits) : "";
		const pct = (v: number | null | undefined): string =>
			v != null ? `${(Number(v) * 100).toFixed(2)}%` : "";
		const band = (v: number | null | undefined): string =>
			v == null ? "—" : v ? "PASS" : "FAIL";

		const readingColumns: PrintColumn[] = [
			{ key: "entry_date", label: "Date" },
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

		const readingRows = rows.map((r) => ({
			entry_date: r.entry_date,
			machine: machineLabel(r),
			spell: spellLabel(r),
			batch: batchLabel(r),
			std_mr_pct: num(r.std_mr_pct, 2),
			calc_wt: num(r.calc_wt, 2),
			calc_mr_pct: num(r.calc_mr_pct, 2),
			calc_corr_wt: num(r.calc_corr_wt, 2),
			calc_sdev: num(r.calc_sdev, 4),
			calc_cv_pct: pct(r.calc_cv_pct),
			cv_within_band: band(r.cv_within_band),
		}));

		const grandColumns: PrintColumn[] = [
			{ key: "batch", label: "Batch" },
			{ key: "row_count", label: "Rows", align: "right" },
			{ key: "std_mr_pct", label: "Std MR%", align: "right" },
			{ key: "grand_obs", label: "Obs", align: "right" },
			{ key: "grand_mr_pct", label: "MR%", align: "right" },
			{ key: "grand_corr_wt", label: "Corr", align: "right" },
			{ key: "grand_cv_pct", label: "CV %", align: "right" },
		];

		const grandRows = grandAverages.map((g) => ({
			batch: batchLabel(g),
			row_count: g.row_count ?? "—",
			std_mr_pct: num(g.std_mr_pct, 2),
			grand_obs: num(g.grand_obs, 2),
			grand_mr_pct: num(g.grand_mr_pct, 2),
			grand_corr_wt: num(g.grand_corr_wt, 2),
			grand_cv_pct: pct(g.grand_cv_pct),
		}));

		return {
			reportTitle: "Breaker Card Sliver Weight SQC",
			reportCode: "R-08-05",
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
					title: "Grand Average by Batch",
					columns: grandColumns,
					rows: grandRows,
					emptyText: "No grand-average rows yet for this date.",
				},
			],
		};
	}, [rows, grandAverages, selectedCompany, selectedBranchName, entryDate]);

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
				Breaker Card SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture breaker-card coarse-side sliver weight (R-08-05/06/07) — one sheet, many (machine,
				spell, batch) reading sets, each linked to a batch (jute batch plan) and corrected to the
				breaker STD MR% 16 with a per-batch grand average.
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
				<Alert severity="info">Select a branch to load Breaker Card SQC data.</Alert>
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
								<BreakerCardForm
									coId={coId}
									branchId={branchId}
									entryDate={entryDate}
									setup={setup}
									onSaved={onSaved}
								/>
							)}
							<BreakerCardGrid
								coId={coId}
								rows={rows}
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
