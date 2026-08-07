"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/emulsionCalc";
import { useEmulsionSetup } from "./hooks/useEmulsionSetup";
import { useEmulsionByDate } from "./hooks/useEmulsionByDate";
import EmulsionForm from "./_components/EmulsionForm";
import EmulsionGrid from "./_components/EmulsionGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import { ADDITIVE_FIELDS, ADDITIVE_LABELS } from "./types/emulsionTypes";

// Format a numeric cell to 2dp, mirroring the grid's fmt() (em-dash for blanks).
function fmtCell(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

export default function EmulsionSqcPage() {
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
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : "",
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() =>
			(selectedCompany?.branches ?? []).filter((b) =>
				sidebarBranchIds.includes(Number(b.branch_id)),
			),
		[selectedCompany, sidebarBranchIds],
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const { setup, loading: setupLoading, error: setupError } = useEmulsionSetup(coId, branchId);
	const {
		rows,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useEmulsionByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: ONE consolidated report of all of the selected date's loaded
	// rows (never per-shift). Columns mirror the by-date grid (machine, oil used,
	// tank, MEASURED oil %, server theoretical %, the snapshotted band, status) plus
	// the additive recipe columns the grid shows in its expand row.
	const printColumns = React.useMemo<PrintColumn[]>(
		() => [
			{ key: "machine", label: "Machine" },
			{ key: "oil_used", label: "Oil used", align: "right" },
			{ key: "tank", label: "Tank", align: "right" },
			{ key: "oil_pct", label: "Oil % (meas.)", align: "right" },
			{ key: "theoretical", label: "Theoretical %", align: "right" },
			{ key: "band", label: "Band", align: "center" },
			{ key: "status", label: "Status", align: "center" },
			...ADDITIVE_FIELDS.map((f) => ({
				key: f,
				label: ADDITIVE_LABELS[f],
				align: "right" as const,
			})),
			{ key: "spreader_rolls_made", label: "Spreader rolls made", align: "right" },
			{ key: "others", label: "Others" },
			{ key: "prepared_by", label: "Prepared by" },
		],
		[],
	);

	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;
		return {
			reportTitle: "Emulsion SQC",
			reportCode: "R-08-02",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					columns: printColumns,
					rows: rows.map((r) => ({
						machine: r.machine_name ?? "—",
						oil_used: fmtCell(r.oil_used_ltr),
						tank: fmtCell(r.tank_capacity_ltr),
						oil_pct: fmtCell(r.oil_pct_in_emulsion),
						theoretical: fmtCell(r.theoretical_oil_pct),
						band: `${fmtCell(r.std_oil_pct_low)}–${fmtCell(r.std_oil_pct_high)}`,
						status: r.oil_pct_status ?? "—",
						...Object.fromEntries(ADDITIVE_FIELDS.map((f) => [f, fmtCell(r[f])])),
						spreader_rolls_made:
							r.spreader_rolls_made != null ? String(r.spreader_rolls_made) : "—",
						others: r.others || "—",
						prepared_by: r.prepared_by || "—",
					})),
					emptyText: "No emulsion records for this date.",
				},
			],
		};
	}, [rows, selectedCompany, selectedBranchName, entryDate, printColumns]);

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
				Emulsion SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-02 daily batching jute-oil recipe log. Capture ONE flat record per date: the oil used,
				tank capacity and MEASURED oil % in the emulsion, plus the target band (std oil % low/high,
				default 16/17, editable and snapshotted at save) and the optional additive recipe. The server
				computes the theoretical oil % (oil/tank, reference only) and the OK/LOW/HIGH status of the
				measured oil % vs the band (display only).
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
				<Alert severity="info">Select a branch to load Emulsion SQC data.</Alert>
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
						<EmulsionForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<EmulsionGrid
						coId={coId}
						branchId={branchId}
						rows={rows}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
