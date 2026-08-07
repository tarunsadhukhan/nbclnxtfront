"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/cuttingLengthCalc";
import { useCuttingLengthSetup } from "./hooks/useCuttingLengthSetup";
import { useCuttingLengthByDate } from "./hooks/useCuttingLengthByDate";
import CuttingLengthForm from "./_components/CuttingLengthForm";
import CuttingLengthGrid from "./_components/CuttingLengthGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import { CUTTING_LENGTH_READINGS } from "./types/cuttingLengthTypes";

// Format a numeric value for the printout; em-dash placeholder for empty.
function fmtPrint(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

export default function CuttingLengthSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useCuttingLengthSetup(coId, branchId);
	const {
		rows,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useCuttingLengthByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: ONE consolidated report of every reading-set loaded for the
	// selected date. No shift/spell split (this report has none). Mirrors the
	// on-screen by-date detail: quality, std, the 20 readings, then the server
	// avg / sample-stdev / cv% / deviation.
	const printColumns = React.useMemo<PrintColumn[]>(() => {
		const readingCols: PrintColumn[] = Array.from({ length: CUTTING_LENGTH_READINGS }, (_, i) => ({
			key: `r${i + 1}`,
			label: `R${i + 1}`,
			align: "right" as const,
		}));
		return [
			{ key: "quality", label: "Quality" },
			{ key: "std_length", label: "Std", align: "right" },
			...readingCols,
			{ key: "avg", label: "Avg", align: "right" },
			{ key: "stdev", label: "Std dev", align: "right" },
			{ key: "cv_pct", label: "CV %", align: "right" },
			{ key: "deviation", label: "Deviation", align: "right" },
		];
	}, []);

	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;
		const reportRows = rows.map((r) => {
			const row: Record<string, string> = {
				quality: r.item_name ?? (r.item_id != null ? `Item #${r.item_id}` : "No quality"),
				std_length: fmtPrint(r.std_length),
				avg: fmtPrint(r.avg),
				stdev: fmtPrint(r.stdev, 4),
				cv_pct: fmtPrint(r.cv_pct, 4),
				deviation: fmtPrint(r.deviation),
			};
			for (let i = 0; i < CUTTING_LENGTH_READINGS; i++) {
				row[`r${i + 1}`] = fmtPrint(r.readings?.[i]);
			}
			return row;
		});
		return {
			reportTitle: "Cutting Length SQC",
			reportCode: "R-08-20",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					columns: printColumns,
					rows: reportRows,
					emptyText: "No cutting-length reading-sets for this date.",
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
				Cutting Length SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-20 daily cut-piece length consistency. Capture one reading-set per date — 20 cut-length
				readings (inches), an optional cloth quality, and the std length (default 78, editable,
				snapshotted at save). The server computes the average, the SAMPLE standard deviation (n-1),
				CV% (= stdev/avg×100) and the deviation (avg − std).
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
				<Alert severity="info">Select a branch to load Cutting Length SQC data.</Alert>
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
						<CuttingLengthForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<CuttingLengthGrid
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
