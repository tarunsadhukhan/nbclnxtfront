"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/qrCv15aCalc";
import { useQrCv15aSetup } from "./hooks/useQrCv15aSetup";
import { useQrCv15aByDate } from "./hooks/useQrCv15aByDate";
import QrCv15aForm from "./_components/QrCv15aForm";
import QrCv15aGrid from "./_components/QrCv15aGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn } from "../_shared/printReport";
import type { QrCv15aGroup } from "./types/qrCv15aTypes";

// Mirror the on-screen grid columns (summary, not the per-reading expand panel).
const QR_CV_15A_PRINT_COLUMNS: PrintColumn[] = [
	{ key: "quality", label: "QUALITY" },
	{ key: "drawing", label: "3RD DRAWING" },
	{ key: "spinning", label: "SPINNING FRAME" },
	{ key: "observed_count", label: "OBS COUNT", align: "right" },
	{ key: "mr_pct", label: "MR %", align: "right" },
	{ key: "avg_bs", label: "AVG B/S", align: "right" },
	{ key: "max", label: "MAX", align: "right" },
	{ key: "min", label: "MIN", align: "right" },
	{ key: "std_dev", label: "STD DEV", align: "right" },
	{ key: "qr_pct", label: "QR %", align: "right" },
	{ key: "cv_pct", label: "CV %", align: "right" },
	{ key: "qr_at_min", label: "QR % @MIN", align: "right" },
];

function printFmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

function printQualityLabel(row: QrCv15aGroup): string {
	return row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`;
}

function printDrawingLabel(row: QrCv15aGroup): string {
	return (
		row.drawing_mech_code ??
		row.drawing_machine_name ??
		(row.drawing_mc_id != null ? `MC #${row.drawing_mc_id}` : "—")
	);
}

function printSpinningLabel(row: QrCv15aGroup): string {
	return row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—");
}

export default function QrCv15aSqcPage() {
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
			setPageBranchId((prev) => (prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""));
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds],
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const { setup, loading: setupLoading, error: setupError } = useQrCv15aSetup(coId, entryDate, branchId);
	const { groups, loading: byDateLoading, refresh: refreshByDate } = useQrCv15aByDate(coId, entryDate, branchId);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: all of the selected date's loaded groups in one report.
	const getPrintReport = React.useCallback((): SqcPrintReport | null => {
		if (groups.length === 0) return null;
		const rows = groups.map((g) => ({
			quality: printQualityLabel(g),
			drawing: printDrawingLabel(g),
			spinning: printSpinningLabel(g),
			observed_count: printFmt(g.observed_count),
			mr_pct: printFmt(g.mr_pct),
			avg_bs: printFmt(g.stats?.avg_bs),
			max: printFmt(g.stats?.max),
			min: printFmt(g.stats?.min),
			std_dev: printFmt(g.stats?.std_dev),
			qr_pct: printFmt(g.stats?.qr_pct),
			cv_pct: printFmt(g.stats?.cv_pct),
			qr_at_min: printFmt(g.stats?.qr_at_min),
		}));
		return {
			reportTitle: "Yarn QR% & CV% (15A) SQC",
			reportCode: "R-08-15A",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections: [
				{
					kind: "table",
					columns: QR_CV_15A_PRINT_COLUMNS,
					rows,
					emptyText: "No groups recorded for this day.",
				},
			],
		};
	}, [groups, selectedCompany, selectedBranchName, entryDate]);

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
				Yarn QR-CV Special SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-15A Yarn QR% &amp; CV% (Special Purpose) — capture a header (3rd Drawing machine, Spinning
				Frame, yarn quality, observed count and MR%) and 12 breaking-strength readings per group; the
				server computes Avg B/S, Max, Min, Std Dev, QR%, CV% and QR%@min.
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
				<Alert severity="info">Select a branch to load Yarn QR-CV (Special) SQC data.</Alert>
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
							getReport={getPrintReport}
							disabled={byDateLoading || groups.length === 0}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<QrCv15aForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<QrCv15aGrid coId={coId} groups={groups} loading={byDateLoading} onDeleted={onSaved} />
				</Box>
			)}
		</Box>
	);
}
