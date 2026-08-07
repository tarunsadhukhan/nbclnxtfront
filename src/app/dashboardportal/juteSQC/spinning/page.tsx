"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { useSqcCountSetup } from "./hooks/useSqcCountSetup";
import { useSqcCountByDate } from "./hooks/useSqcCountByDate";
import { useSqcRhmrSetup } from "./hooks/useSqcRhmrSetup";
import { useSqcRhmrSearch } from "./hooks/useSqcRhmrSearch";
import { useSqcQrCvSetup } from "./hooks/useSqcQrCvSetup";
import { useSqcQrCvByDate } from "./hooks/useSqcQrCvByDate";
// Shared target-map editor reused across the juteProduction route boundary:
// the "Actual Speed / TPI" tab writes actuals into jute_prod_spng_target_map,
// the same table the spinning planning grid reads (value_role='actual').
import TargetMapEditor from "../../juteProduction/masters/spngTargetMap/_components/TargetMapEditor";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import CountForm from "./_components/CountForm";
import CountGrid from "./_components/CountGrid";
import RhmrForm from "./_components/RhmrForm";
import RhmrGrid from "./_components/RhmrGrid";
import YarnQrCvForm from "./_components/YarnQrCvForm";
import YarnQrCvGrid from "./_components/YarnQrCvGrid";

const TABS = ["R-08-16 Yarn Parameter", "Actual Speed / TPI", "RHMR", "R-08-15 Yarn QR & CV %"] as const;

export default function SpinningSqcPage() {
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

	// Tab 1 — Actual Speed / TPI (target-map actuals)
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());

	// Tab 2 — Count Observations
	const [countDate, setCountDate] = React.useState<string>(todayISO());
	const {
		setup: countSetup,
		loading: countSetupLoading,
		error: countSetupError,
	} = useSqcCountSetup(coId, countDate, branchId);
	const {
		readings: countReadings,
		averages: countAverages,
		loading: countLoading,
		refresh: refreshCount,
	} = useSqcCountByDate(coId, countDate, branchId);

	const onCountSaved = React.useCallback(() => {
		refreshCount();
	}, [refreshCount]);

	// Tab 3 — RHMR (Temperature / Humidity per date + spell)
	const { setup: rhmrSetup, loading: rhmrSetupLoading, error: rhmrSetupError } = useSqcRhmrSetup(coId, branchId);
	// Search filters: date defaults to today, spell defaults to all (both optional / clearable).
	const [rhmrFilterDate, setRhmrFilterDate] = React.useState<string>(todayISO());
	const [rhmrFilterSpell, setRhmrFilterSpell] = React.useState<number | "">("");
	const {
		rows: rhmrRows,
		loading: rhmrRowsLoading,
		refresh: refreshRhmr,
	} = useSqcRhmrSearch(coId, branchId, rhmrFilterDate || null, rhmrFilterSpell === "" ? null : Number(rhmrFilterSpell));

	const onRhmrSaved = React.useCallback(() => {
		refreshRhmr();
	}, [refreshRhmr]);

	// Tab 4 — R-08-15 Yarn QR% & CV%
	const [qrCvDate, setQrCvDate] = React.useState<string>(todayISO());
	const {
		setup: qrCvSetup,
		loading: qrCvSetupLoading,
		error: qrCvSetupError,
	} = useSqcQrCvSetup(coId, qrCvDate, branchId);
	const {
		groups: qrCvGroups,
		loading: qrCvLoading,
		refresh: refreshQrCv,
	} = useSqcQrCvByDate(coId, qrCvDate, branchId);

	const onQrCvSaved = React.useCallback(() => {
		refreshQrCv();
	}, [refreshQrCv]);

	// ── Day-level print: each tab prints its own currently-loaded day data as one
	// consolidated report. Spell/shift is rendered only as an ordinary data column,
	// never as a separate per-shift report.
	const companyName = selectedCompany?.co_name;

	const fmt = React.useCallback(
		(v: number | null | undefined, digits = 2): number | null =>
			v != null ? Number(Number(v).toFixed(digits)) : null,
		[]
	);

	// Tab 1 — R-08-16 Yarn Count
	const getCountReport = React.useCallback((): SqcPrintReport | null => {
		if (countReadings.length === 0) return null;

		const stdMap = new Map<number, number | null>();
		for (const y of countSetup?.yarn_items ?? []) stdMap.set(y.item_id, y.std_count ?? null);

		const readingColumns: PrintColumn[] = [
			{ key: "spell", label: "Spell" },
			{ key: "machine", label: "Machine" },
			{ key: "yarn", label: "Yarn" },
			{ key: "dp", label: "DP", align: "right" },
			{ key: "tp", label: "TP", align: "right" },
			{ key: "wt", label: "WT/450 (gms)", align: "right" },
			{ key: "mr", label: "MR %", align: "right" },
			{ key: "obs", label: "Observed Count", align: "right" },
			{ key: "corr", label: "Corrected Count", align: "right" },
		];

		const readingRows = countReadings.map((r) => ({
			spell: r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—"),
			machine: r.machine_name ?? (r.mc_id != null ? `MC #${r.mc_id}` : "—"),
			yarn: r.item_name ?? r.item_code ?? `Yarn #${r.item_id}`,
			dp: fmt(r.dp),
			tp: fmt(r.tp),
			wt: fmt(r.wt_450_gms, 3),
			mr: fmt(r.mr_pct),
			obs: fmt(r.observed_count),
			corr: fmt(r.corrected_count),
		}));

		const summaryColumns: PrintColumn[] = [
			{ key: "quality", label: "Quality" },
			{ key: "std", label: "Std (LB)", align: "right" },
			{ key: "obs", label: "Obs (LBS)", align: "right" },
			{ key: "corr", label: "Corr (LBS)", align: "right" },
			{ key: "hylt", label: "HY / LT", align: "right" },
			{ key: "heavyLight", label: "Heavy / Light", align: "center" },
			{ key: "range", label: "Range (±)", align: "center" },
		];

		const summaryRows = countAverages.map((a) => {
			const std = stdMap.get(a.item_id) ?? null;
			const obs = a.avg_count ?? null;
			const corr = a.avg_corrected ?? null;
			const canCompare = std != null && std !== 0 && corr != null;
			const hylt = canCompare ? ((corr - std) / std) * 100 : null;
			const tol = std != null ? (std < 16 ? 0.2 : 0.5) : null;
			const heavyLight = canCompare ? (corr > std ? "HEAVY" : corr < std ? "LIGHT" : "—") : "—";
			return {
				quality: a.item_name ?? a.item_code ?? `Yarn #${a.item_id}`,
				std: fmt(std),
				obs: fmt(obs),
				corr: fmt(corr),
				hylt: hylt != null ? `${hylt.toFixed(2)}%` : "—",
				heavyLight,
				range: tol != null ? `±${tol}` : "—",
			};
		});

		return {
			reportTitle: "Spinning SQC — Yarn Count",
			reportCode: "R-08-16",
			companyName,
			branchName: selectedBranchName,
			reportDate: countDate,
			sections: [
				{ kind: "table", title: "Count Observations", columns: readingColumns, rows: readingRows },
				{ kind: "table", title: "Average Count by Yarn", columns: summaryColumns, rows: summaryRows },
			],
		};
	}, [countReadings, countAverages, countSetup, countDate, companyName, selectedBranchName, fmt]);

	// Tab 3 — RHMR (whole loaded day; spell is an ordinary column, not a per-shift split)
	const getRhmrReport = React.useCallback((): SqcPrintReport | null => {
		if (rhmrRows.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "entry_date", label: "Date" },
			{ key: "spell", label: "Spell" },
			{ key: "temperature", label: "Temperature (°C)", align: "right" },
			{ key: "humidity", label: "Humidity (%)", align: "right" },
		];
		const rows = rhmrRows.map((r) => ({
			entry_date: r.entry_date,
			spell: r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—"),
			temperature: fmt(r.temperature, 1),
			humidity: fmt(r.humidity, 1),
		}));
		return {
			reportTitle: "Spinning SQC — RHMR (Temperature / Humidity)",
			reportCode: "R-08-16",
			companyName,
			branchName: selectedBranchName,
			reportDate: rhmrFilterDate,
			sections: [{ kind: "table", columns, rows }],
		};
	}, [rhmrRows, rhmrFilterDate, companyName, selectedBranchName, fmt]);

	// Tab 4 — R-08-15 Yarn QR & CV %
	const getQrCvReport = React.useCallback((): SqcPrintReport | null => {
		if (qrCvGroups.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "quality", label: "Quality" },
			{ key: "machine", label: "MC No." },
			{ key: "obs", label: "Obs Count", align: "right" },
			{ key: "mr", label: "MR %", align: "right" },
			{ key: "max", label: "Max", align: "right" },
			{ key: "min", label: "Min", align: "right" },
			{ key: "avg_bs", label: "Avg B/S", align: "right" },
			{ key: "std_dev", label: "Std Dev", align: "right" },
			{ key: "qr_pct", label: "QR %", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
		];
		const rows = qrCvGroups.map((g) => ({
			quality: g.item_name ?? g.item_code ?? `Yarn #${g.item_id}`,
			machine: g.mech_code ?? g.machine_name ?? (g.mc_id != null ? `MC #${g.mc_id}` : "—"),
			obs: fmt(g.observed_count),
			mr: fmt(g.mr_pct),
			max: fmt(g.stats?.max),
			min: fmt(g.stats?.min),
			avg_bs: fmt(g.stats?.avg_bs),
			std_dev: fmt(g.stats?.std_dev),
			qr_pct: fmt(g.stats?.qr_pct),
			cv_pct: fmt(g.stats?.cv_pct),
		}));
		return {
			reportTitle: "Spinning SQC — Yarn QR % & CV %",
			reportCode: "R-08-15",
			companyName,
			branchName: selectedBranchName,
			reportDate: qrCvDate,
			sections: [{ kind: "table", columns, rows }],
		};
	}, [qrCvGroups, qrCvDate, companyName, selectedBranchName, fmt]);

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
				Spinning SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Daily yarn parameter, actual speed/TPI entry and count observations.
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
				<Alert severity="info">Select a branch to load Spinning SQC data.</Alert>
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

					{/* Tab 2 — Actual Speed / TPI (writes target-map actuals) */}
					{tab === 1 ? (
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
							</Box>
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Machine
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="mcid"
									valueRole="actual"
									effectiveDate={entryDate}
								/>
							</Box>
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Yarn
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="qid"
									valueRole="actual"
									effectiveDate={entryDate}
								/>
							</Box>
						</Box>
					) : null}

					{/* Tab 1 — R-08-15 Yarn QR% & CV% (Count Observations) */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Observation date</Typography>
								<TextField
									type="date"
									size="small"
									value={countDate}
									onChange={(e) => setCountDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<SqcPrintButton
									getReport={getCountReport}
									disabled={countLoading || countReadings.length === 0}
								/>
							</Box>
							{countSetupError ? <Alert severity="error">{countSetupError}</Alert> : null}
							{countSetupLoading || !countSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<CountForm
									coId={coId}
									branchId={branchId}
									entryDate={countDate}
									setup={countSetup}
									onSaved={onCountSaved}
								/>
							)}
							<CountGrid
								coId={coId}
								readings={countReadings}
								averages={countAverages}
								yarnItems={countSetup?.yarn_items ?? []}
								loading={countLoading}
								onDeleted={onCountSaved}
							/>
						</Box>
					) : null}

					{/* Tab 3 — RHMR (Temperature / Humidity per date + spell) */}
					{tab === 2 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							{rhmrSetupError ? <Alert severity="error">{rhmrSetupError}</Alert> : null}
							{rhmrSetupLoading || !rhmrSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<RhmrForm coId={coId} branchId={branchId} setup={rhmrSetup} onSaved={onRhmrSaved} />
							)}

							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Search RHMR entries
								</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
									<TextField
										type="date"
										label="Filter date"
										size="small"
										value={rhmrFilterDate}
										onChange={(e) => setRhmrFilterDate(e.target.value)}
										InputLabelProps={{ shrink: true }}
									/>
									<TextField
										select
										label="Filter spell"
										size="small"
										value={rhmrFilterSpell}
										onChange={(e) =>
											setRhmrFilterSpell(e.target.value === "" ? "" : Number(e.target.value))
										}
										sx={{ minWidth: 180 }}
									>
										<MenuItem value="">
											<em>All spells</em>
										</MenuItem>
										{(rhmrSetup?.spells ?? []).map((s) => (
											<MenuItem key={s.spell_id} value={s.spell_id}>
												{s.spell_code}
											</MenuItem>
										))}
									</TextField>
									<SqcPrintButton
										getReport={getRhmrReport}
										disabled={rhmrRowsLoading || rhmrRows.length === 0}
									/>
								</Box>
								<RhmrGrid coId={coId} rows={rhmrRows} loading={rhmrRowsLoading} onDeleted={onRhmrSaved} />
							</Box>
						</Box>
					) : null}

					{/* Tab 4 — R-08-15 Yarn QR% & CV% */}
					{tab === 3 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Observation date</Typography>
								<TextField
									type="date"
									size="small"
									value={qrCvDate}
									onChange={(e) => setQrCvDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<SqcPrintButton
									getReport={getQrCvReport}
									disabled={qrCvLoading || qrCvGroups.length === 0}
								/>
							</Box>
							{qrCvSetupError ? <Alert severity="error">{qrCvSetupError}</Alert> : null}
							{qrCvSetupLoading || !qrCvSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<YarnQrCvForm
									coId={coId}
									branchId={branchId}
									entryDate={qrCvDate}
									setup={qrCvSetup}
									onSaved={onQrCvSaved}
								/>
							)}
							<YarnQrCvGrid
								coId={coId}
								groups={qrCvGroups}
								loading={qrCvLoading}
								onDeleted={onQrCvSaved}
							/>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
