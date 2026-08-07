"use client";

import * as React from "react";
import { Alert, Box, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { PrintColumn, PrintCell, SqcPrintReport } from "../_shared/printReport";
import {
	PARAM_LABELS,
} from "../../juteProduction/masters/beamingTargetMap/_components/TargetMapEditor";
import type { TargetGridData } from "../../juteProduction/masters/beamingTargetMap/_components/TargetGrid";
// Shared target-map editor reused across the juteProduction route boundary:
// the "Actual RPM" tab writes actuals into jute_prod_beaming_target_map (the same
// table the beaming planning grid reads, value_role='actual'). The editor reuses
// the existing BEAMING_TARGET_MAP_* endpoints (setup/grid/bulk_save) exactly like
// Beaming Standards / Targets — only the role differs (actual) and the only param
// is 'speed' (RPM).
import TargetMapEditor from "../../juteProduction/masters/beamingTargetMap/_components/TargetMapEditor";

// Single tab today; modelled as a tab shell to mirror the spinning SQC page and to
// leave room for additional beaming SQC observations later.
const TABS = ["Actual RPM"] as const;

export default function BeamingSqcPage() {
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

	// Effective date for the actual-RPM snapshot (id_type is fixed 'mcid' for beaming).
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

	// Day-level print data: mirror the rows TargetMapEditor renders for the Actual
	// RPM tab (id_type='mcid', value_role='actual') at the selected effective date.
	// The editor owns its own fetch internally; we read the same grid endpoint here
	// purely to feed the day-level Print button (no shift split — the date is the day).
	const PRINT_PARAM_LABELS: Record<string, string> = React.useMemo(
		() => ({ ...PARAM_LABELS, speed: "RPM" }),
		[]
	);
	const [printGrid, setPrintGrid] = React.useState<TargetGridData>({ params: [], rows: [] });
	const [printLoading, setPrintLoading] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;
		if (!coId || branchId == null || !effectiveDate) {
			setPrintGrid({ params: [], rows: [] });
			return;
		}
		const load = async () => {
			setPrintLoading(true);
			const params = new URLSearchParams({
				co_id: String(coId),
				id_type: "mcid",
				value_role: "actual",
				effective_date: effectiveDate,
				branch_id: String(branchId),
			});
			const { data } = await fetchWithCookie<{ data: TargetGridData }>(
				`${apiRoutesPortalMasters.BEAMING_TARGET_MAP_GRID}?${params.toString()}`,
				"GET"
			);
			if (!cancelled) {
				setPrintGrid(data?.data ?? { params: [], rows: [] });
				setPrintLoading(false);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, effectiveDate]);

	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (printGrid.rows.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "ref_code", label: "Code" },
			{ key: "ref_name", label: "Machine" },
			...printGrid.params.map<PrintColumn>((p) => ({
				key: p,
				label: PRINT_PARAM_LABELS[p] ?? p,
				align: "right",
			})),
		];
		const rows = printGrid.rows.map((r) => {
			const row: Record<string, PrintCell> = {
				ref_code: r.ref_code ?? "",
				ref_name: r.ref_name ?? r.ref_id,
			};
			printGrid.params.forEach((p) => {
				row[p] = r.cells[p]?.value ?? null;
			});
			return row;
		});
		return {
			reportTitle: "Beaming SQC",
			reportCode: "R-08-BEAM",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: effectiveDate,
			sections: [{ kind: "table", title: "Actual RPM", columns, rows }],
		};
	}, [printGrid, PRINT_PARAM_LABELS, selectedCompany, selectedBranchName, effectiveDate]);

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
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }}>
					Beaming SQC
				</Typography>
				<SqcPrintButton
					getReport={getReport}
					disabled={printLoading || printGrid.rows.length === 0}
				/>
			</Box>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Enter the actual machine RPM per beaming machine and date. Saving here writes the actual RPM
				into the beaming target map (value_role=&apos;actual&apos;); the beaming production planning grid
				will then populate act_speed (RPM × dia × π/36) and act_eff once an actual RPM exists for a
				machine on its transaction date. Until an actual RPM is saved here, those columns stay at 0.
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
				<Alert severity="info">Select a branch to load Beaming SQC data.</Alert>
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

					{/* Tab 1 — Actual RPM (writes beaming target-map actuals) */}
					{tab === 0 ? (
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
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Machine
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="mcid"
									valueRole="actual"
									effectiveDate={effectiveDate}
									paramLabels={{ speed: "RPM" }}
								/>
							</Box>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
