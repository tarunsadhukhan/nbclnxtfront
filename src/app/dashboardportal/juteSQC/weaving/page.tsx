"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { useWeavingPickSetup } from "./hooks/useWeavingPickSetup";
import { useWeavingPickByDate } from "./hooks/useWeavingPickByDate";
// Shared target-map editor reused across the juteProduction route boundary:
// the "Actual Speed" tab writes actuals into jute_prod_weaving_target_map (the same
// table the weaving planning grid reads, value_role='actual'). The editor reuses
// the existing WEAVING_TARGET_MAP_* endpoints (setup/grid/bulk_save) exactly like
// Weaving Standards / Targets — only the role differs (actual). Actual loom
// speed is machine-linked (id_type='mcid'); the actual param captured here is
// 'speed' (loom speed, picks/min) per loom. Actual picks (PPI) are now captured
// per loom on the Loom Width & Picks tab (R-08-21).
import TargetMapEditor from "../../juteProduction/masters/weavingTargetMap/_components/TargetMapEditor";
import PickForm from "./_components/PickForm";
import PickGrid from "./_components/PickGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";

const TABS = ["Loom Width & Picks (R-08-21)", "Actual Speed"] as const;

export default function WeavingSqcPage() {
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

	// Tab 0 — Loom Width & Picks (R-08-21): per-loom actual picks/width observations.
	const [pickDate, setPickDate] = React.useState<string>(todayISO());
	const {
		setup: pickSetup,
		loading: pickSetupLoading,
		error: pickSetupError,
	} = useWeavingPickSetup(coId, pickDate, branchId);
	const {
		readings: pickReadings,
		summary: pickSummary,
		loading: pickLoading,
		refresh: refreshPick,
	} = useWeavingPickByDate(coId, pickDate, branchId);

	const onPickSaved = React.useCallback(() => {
		refreshPick();
	}, [refreshPick]);

	// Day-level print (R-08-21). Mirrors the on-screen PickGrid: one consolidated
	// report for the whole selected date (never split by shift/spell). The readings
	// table reproduces the grid columns; the per-quality summary (server-computed
	// averages from vw_weaving_pick_act) is rendered as a second table.
	const buildPickReport = React.useCallback((): SqcPrintReport | null => {
		if (pickLoading || pickReadings.length === 0) return null;

		const fmt = (value: number | null | undefined, dp = 2): string =>
			value != null ? Number(value).toFixed(dp) : "";
		const qualityLabel = (r: {
			weaving_quality_code: string | null;
			weaving_quality_name: string | null;
			weaving_quality_id: number;
		}): string => {
			const label = `${r.weaving_quality_code ?? ""} — ${r.weaving_quality_name ?? ""}`.trim();
			return label === "—" ? `Quality #${r.weaving_quality_id}` : label;
		};

		const readingColumns: PrintColumn[] = [
			{ key: "entry_date", label: "Date" },
			{ key: "quality", label: "Quality" },
			{ key: "loom", label: "Loom" },
			{ key: "width", label: "Width", align: "right" },
			{ key: "picks", label: "Pick / PPI", align: "right" },
		];
		const readingRows = pickReadings.map((r) => {
			const loom = `${r.mech_code ?? ""} ${r.machine_name ?? ""}`.trim();
			return {
				entry_date: r.entry_date,
				quality: qualityLabel(r),
				loom: loom === "" ? `Loom #${r.machine_id}` : loom,
				width: fmt(r.width),
				picks: fmt(r.picks),
			};
		});

		const summaryColumns: PrintColumn[] = [
			{ key: "quality", label: "Quality" },
			{ key: "avg_picks", label: "Avg PPI", align: "right" },
			{ key: "std_picks", label: "Std Dev", align: "right" },
			{ key: "min_picks", label: "Min", align: "right" },
			{ key: "max_picks", label: "Max", align: "right" },
			{ key: "n_obs", label: "N", align: "right" },
			{ key: "avg_width", label: "Avg Width", align: "right" },
		];
		const summaryRows = pickSummary.map((r) => ({
			quality: qualityLabel(r),
			avg_picks: fmt(r.avg_picks),
			std_picks: fmt(r.std_picks),
			min_picks: fmt(r.min_picks),
			max_picks: fmt(r.max_picks),
			n_obs: r.n_obs,
			avg_width: fmt(r.avg_width),
		}));

		return {
			reportTitle: "Weaving (Loom Width & Picks) SQC",
			reportCode: "R-08-21",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: pickDate,
			sections: [
				{
					kind: "table",
					title: "Loom Width & Pick Readings",
					columns: readingColumns,
					rows: readingRows,
				},
				{
					kind: "table",
					title: "Pick / PPI Summary by Quality",
					columns: summaryColumns,
					rows: summaryRows,
					emptyText: "No readings yet for this date.",
				},
			],
		};
	}, [pickLoading, pickReadings, pickSummary, selectedCompany, selectedBranchName, pickDate]);

	// Tab 1 — Actual Speed (target-map actuals; id_type is 'mcid' — loom-linked).
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

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
				Weaving SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Capture per-loom width &amp; actual picks (R-08-21) and the actual loom speed per weaving quality.
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
				<Alert severity="info">Select a branch to load Weaving SQC data.</Alert>
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

					{/* Tab 0 — Loom Width & Picks (R-08-21): per-loom actual picks/width */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Effective date</Typography>
								<TextField
									type="date"
									size="small"
									value={pickDate}
									onChange={(e) => setPickDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<SqcPrintButton
									getReport={buildPickReport}
									disabled={pickLoading || pickReadings.length === 0}
								/>
							</Box>
							{pickSetupError ? <Alert severity="error">{pickSetupError}</Alert> : null}
							{pickSetupLoading || !pickSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<PickForm
									coId={coId}
									branchId={branchId}
									entryDate={pickDate}
									setup={pickSetup}
									onSaved={onPickSaved}
								/>
							)}
							<PickGrid
								readings={pickReadings}
								summary={pickSummary}
								loading={pickLoading}
								onDeleted={onPickSaved}
							/>
						</Box>
					) : null}

					{/* Tab 1 — Actual Speed (writes weaving target-map actuals: speed) */}
					{tab === 1 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Effective date</Typography>
								<TextField
									type="date"
									size="small"
									value={effectiveDate}
									onChange={(e) => setEffectiveDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Box>
							<Typography variant="body2" color="text.secondary">
								Enter the actual loom speed (picks/min) per loom and date. Saving here writes
								the actual values into the weaving target map (value_role=&apos;actual&apos;). Actual picks
								(PPI) are now captured per loom on the Loom Width &amp; Picks tab.
							</Typography>
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Loom
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="mcid"
									refLabel="Loom"
									valueRole="actual"
									effectiveDate={effectiveDate}
									paramLabels={{ speed: "Speed (picks/min)" }}
								/>
							</Box>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
