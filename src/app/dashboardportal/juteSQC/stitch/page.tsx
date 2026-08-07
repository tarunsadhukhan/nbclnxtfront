"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/stitchCalc";
import { useStitchSetup } from "./hooks/useStitchSetup";
import { useStitchByDate } from "./hooks/useStitchByDate";
import StitchForm from "./_components/StitchForm";
import StitchGrid from "./_components/StitchGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import { STITCH_READINGS, type StitchRow } from "./types/stitchTypes";

export default function StitchSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useStitchSetup(coId, branchId);
	const {
		rows,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useStitchByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// ─── Day-level Print (R-08-22) ────────────────────────────────────────────
	// One consolidated report for the selected date — mirrors the "Reading-sets
	// for this date" detail grid (Machine, 5 stitch counts, Std, Avg, Flag,
	// Inspector). No shift/spell on this report; nothing to split.
	const fmtNum = React.useCallback((n: number | null | undefined, dp = 2): string => {
		return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "";
	}, []);
	const machineLabel = React.useCallback((r: StitchRow): string => {
		if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
		return r.mc_id != null ? `MC #${r.mc_id}` : "";
	}, []);

	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;
		const readingIdx = Array.from({ length: STITCH_READINGS }, (_, i) => i);
		const columns: PrintColumn[] = [
			{ key: "machine", label: "Machine" },
			...readingIdx.map<PrintColumn>((i) => ({
				key: `r${i}`,
				label: `#${i + 1}`,
				align: "right",
			})),
			{ key: "std", label: "Std", align: "right" },
			{ key: "avg", label: "Avg", align: "right" },
			{ key: "flag", label: "Flag", align: "center" },
			{ key: "inspector", label: "Inspector" },
		];
		const tableRows = rows.map((r) => {
			const row: Record<string, string> = {
				machine: machineLabel(r),
				std: fmtNum(r.std_stitch),
				avg: fmtNum(r.avg),
				flag: r.flag ?? "",
				inspector: r.inspector_name ?? "",
			};
			readingIdx.forEach((i) => {
				row[`r${i}`] = fmtNum(r.readings?.[i]);
			});
			return row;
		});
		return {
			reportTitle: "Stitch SQC",
			reportCode: "R-08-22",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					title: "Reading-sets for this date",
					columns,
					rows: tableRows,
					emptyText: "No stitch reading-sets for this date.",
				},
			],
		};
	}, [rows, machineLabel, fmtNum, selectedCompany, selectedBranchName, entryDate]);

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
				Stitch SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-22 finishing sewing-stitch-density QC. Capture one reading-set per (date, sewing machine)
				— 5 stitch counts (stitches/dm) and the std stitch (default 9, editable, snapshotted at save).
				The server computes the average and flags it OK / LOW / HIGH against the standard.
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
				<Alert severity="info">Select a branch to load Stitch SQC data.</Alert>
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
							disabled={byDateLoading || rows.length === 0}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<StitchForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<StitchGrid
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
