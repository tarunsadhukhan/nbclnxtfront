"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/spreaderCalc";
import { useSqcRollWtSetup } from "./hooks/useSqcRollWtSetup";
import { useSqcRollWtByDate } from "./hooks/useSqcRollWtByDate";
import { useSqcSliverWtSetup } from "./hooks/useSqcSliverWtSetup";
import { useSqcSliverWtByDate } from "./hooks/useSqcSliverWtByDate";
import RollWtForm from "./_components/RollWtForm";
import RollWtGrid from "./_components/RollWtGrid";
import SliverWtForm from "./_components/SliverWtForm";
import SliverWtGrid from "./_components/SliverWtGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";

// Two Spreader SQC reports share this page as tabs.
const TABS = ["R-08-04 Roll Weight", "R-08-03 Sliver Weight"] as const;

export default function SpreaderSqcPage() {
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

	// Tab 0 — R-08-04 Roll Weight: per-machine/quality bench readings by date.
	const [rollWtDate, setRollWtDate] = React.useState<string>(todayISO());
	const {
		setup: rollWtSetup,
		loading: rollWtSetupLoading,
		error: rollWtSetupError,
	} = useSqcRollWtSetup(coId, rollWtDate, branchId);
	const {
		readings: rollWtReadings,
		loading: rollWtLoading,
		refresh: refreshRollWt,
	} = useSqcRollWtByDate(coId, rollWtDate, branchId);

	const onRollWtSaved = React.useCallback(() => {
		refreshRollWt();
	}, [refreshRollWt]);

	// R-08-04 day print: every loaded row for the date, spell as an ordinary
	// column. Mirrors the grid's columns + server-computed calc_* averages.
	const rollWtStdMap = React.useMemo(() => {
		const m = new Map<number, number | null>();
		for (const mc of rollWtSetup?.machines ?? []) m.set(mc.machine_id, mc.wt_per_roll ?? null);
		return m;
	}, [rollWtSetup]);

	const getRollWtReport = React.useCallback((): SqcPrintReport | null => {
		if (rollWtReadings.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "spell", label: "Spell" },
			{ key: "machine", label: "Machine" },
			{ key: "quality", label: "Quality" },
			{ key: "feeder", label: "Feeder" },
			{ key: "std_mr_pct", label: "Std MR%", align: "right" },
			{ key: "std", label: "Std Roll Wt", align: "right" },
			{ key: "avg_obs", label: "Avg Obs", align: "right" },
			{ key: "avg_corr", label: "Avg Corr", align: "right" },
			{ key: "avg_mr_pct", label: "Avg MR%", align: "right" },
			{ key: "stdev_corr", label: "Stdev Corr", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
			{ key: "heavy_light", label: "Heavy / Light", align: "center" },
		];
		const rows = rollWtReadings.map((r) => {
			const mcId = r.machine_id ?? r.mc_id ?? null;
			const std = mcId != null ? rollWtStdMap.get(mcId) ?? null : null;
			const avgCorr = r.calc_avg_corr ?? null;
			const canCompare = std != null && std !== 0 && avgCorr != null;
			const heavyLight = canCompare
				? avgCorr > std
					? "HEAVY"
					: avgCorr < std
					? "LIGHT"
					: "—"
				: "—";
			return {
				spell: r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—"),
				machine: r.machine_name
					? `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`
					: r.mc_id != null
					? `MC #${r.mc_id}`
					: "—",
				quality: r.item_name ?? r.item_code ?? (r.item_id != null ? `Quality #${r.item_id}` : "—"),
				feeder: r.feeder_name ?? "—",
				std_mr_pct: r.std_mr_pct != null ? r.std_mr_pct.toFixed(2) : "—",
				std: std != null ? std.toFixed(2) : "—",
				avg_obs: r.calc_avg_obs != null ? r.calc_avg_obs.toFixed(2) : "—",
				avg_corr: avgCorr != null ? avgCorr.toFixed(2) : "—",
				avg_mr_pct: r.calc_avg_mr_pct != null ? r.calc_avg_mr_pct.toFixed(2) : "—",
				stdev_corr: r.calc_stdev_corr != null ? r.calc_stdev_corr.toFixed(4) : "—",
				cv_pct: r.calc_cv_pct != null ? `${(r.calc_cv_pct * 100).toFixed(2)}%` : "—",
				heavy_light: heavyLight,
			};
		});
		return {
			reportTitle: "Spreader SQC — Roll Weight",
			reportCode: "R-08-04",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: rollWtDate,
			sections: [{ kind: "table", columns, rows }],
		};
	}, [rollWtReadings, rollWtStdMap, selectedCompany, selectedBranchName, rollWtDate]);

	// Tab 1 — R-08-03 Sliver Weight: per-machine/quality variable 1–12 readings by date.
	const [sliverWtDate, setSliverWtDate] = React.useState<string>(todayISO());
	const {
		setup: sliverWtSetup,
		loading: sliverWtSetupLoading,
		error: sliverWtSetupError,
	} = useSqcSliverWtSetup(coId, sliverWtDate, branchId);
	const {
		readings: sliverWtReadings,
		loading: sliverWtLoading,
		refresh: refreshSliverWt,
	} = useSqcSliverWtByDate(coId, sliverWtDate, branchId);

	const onSliverWtSaved = React.useCallback(() => {
		refreshSliverWt();
	}, [refreshSliverWt]);

	// R-08-03 day print: every loaded row for the date, spell as an ordinary
	// column. Mirrors the grid's columns + server-computed calc_* averages
	// (no machine std comparison, matching the on-screen grid).
	const getSliverWtReport = React.useCallback((): SqcPrintReport | null => {
		if (sliverWtReadings.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "spell", label: "Spell" },
			{ key: "machine", label: "Machine" },
			{ key: "quality", label: "Quality" },
			{ key: "category", label: "Category" },
			{ key: "std_mr_pct", label: "Std MR%", align: "right" },
			{ key: "avg_obs", label: "Avg Obs", align: "right" },
			{ key: "avg_corr", label: "Avg Corr", align: "right" },
			{ key: "avg_mr", label: "Avg MR%", align: "right" },
			{ key: "stdev", label: "StDev", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
		];
		const rows = sliverWtReadings.map((r) => ({
			spell: r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—"),
			machine: r.machine_name
				? `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`
				: r.mc_id != null
				? `MC #${r.mc_id}`
				: "—",
			quality: r.item_name ?? r.item_code ?? (r.item_id != null ? `Quality #${r.item_id}` : "—"),
			category: r.category && r.category.trim() !== "" ? r.category : "—",
			std_mr_pct: r.std_mr_pct != null ? r.std_mr_pct.toFixed(2) : "—",
			avg_obs: r.calc_avg_obs != null ? r.calc_avg_obs.toFixed(2) : "—",
			avg_corr: r.calc_avg_corr != null ? r.calc_avg_corr.toFixed(2) : "—",
			avg_mr: r.calc_avg_mr != null ? r.calc_avg_mr.toFixed(2) : "—",
			stdev: r.calc_stdev != null ? r.calc_stdev.toFixed(4) : "—",
			cv_pct: r.calc_cv_pct != null ? `${(r.calc_cv_pct * 100).toFixed(2)}%` : "—",
		}));
		return {
			reportTitle: "Spreader SQC — Sliver Weight",
			reportCode: "R-08-03",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: sliverWtDate,
			sections: [{ kind: "table", columns, rows }],
		};
	}, [sliverWtReadings, selectedCompany, selectedBranchName, sliverWtDate]);

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
				Spreader SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture spreader roll-weight (R-08-04) and sliver-weight (R-08-03) bench readings per
				machine and raw-jute quality.
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
				<Alert severity="info">Select a branch to load Spreader SQC data.</Alert>
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

					{/* Tab 0 — R-08-04 Roll Weight */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Entry date</Typography>
								<TextField
									type="date"
									size="small"
									value={rollWtDate}
									onChange={(e) => setRollWtDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<Box sx={{ ml: "auto" }}>
									<SqcPrintButton
										getReport={getRollWtReport}
										disabled={rollWtLoading || rollWtReadings.length === 0}
									/>
								</Box>
							</Box>
							{rollWtSetupError ? <Alert severity="error">{rollWtSetupError}</Alert> : null}
							{rollWtSetupLoading || !rollWtSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<RollWtForm
									coId={coId}
									branchId={branchId}
									entryDate={rollWtDate}
									setup={rollWtSetup}
									onSaved={onRollWtSaved}
								/>
							)}
							<RollWtGrid
								coId={coId}
								readings={rollWtReadings}
								machines={rollWtSetup?.machines ?? []}
								loading={rollWtLoading}
								onDeleted={onRollWtSaved}
							/>
						</Box>
					) : null}

					{/* Tab 1 — R-08-03 Sliver Weight */}
					{tab === 1 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Entry date</Typography>
								<TextField
									type="date"
									size="small"
									value={sliverWtDate}
									onChange={(e) => setSliverWtDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<Box sx={{ ml: "auto" }}>
									<SqcPrintButton
										getReport={getSliverWtReport}
										disabled={sliverWtLoading || sliverWtReadings.length === 0}
									/>
								</Box>
							</Box>
							{sliverWtSetupError ? <Alert severity="error">{sliverWtSetupError}</Alert> : null}
							{sliverWtSetupLoading || !sliverWtSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<SliverWtForm
									coId={coId}
									branchId={branchId}
									entryDate={sliverWtDate}
									setup={sliverWtSetup}
									onSaved={onSliverWtSaved}
								/>
							)}
							<SliverWtGrid
								coId={coId}
								readings={sliverWtReadings}
								loading={sliverWtLoading}
								onDeleted={onSliverWtSaved}
							/>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
