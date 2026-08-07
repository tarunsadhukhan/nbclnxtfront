"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/humidityCalc";
import { useHumiditySetup } from "./hooks/useHumiditySetup";
import { useHumidityByDate } from "./hooks/useHumidityByDate";
import HumidityForm from "./_components/HumidityForm";
import HumidityGrid from "./_components/HumidityGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { PrintCell, PrintColumn, PrintSection, SqcPrintReport } from "../_shared/printReport";

const ROUND_LABELS: Record<number, string> = { 1: "Morning", 2: "Noon", 3: "Evening" };

function fmtPrint(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

export default function HumiditySqcPage() {
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

	const [reportDate, setReportDate] = React.useState<string>(todayISO());
	const { setup, loading: setupLoading, error: setupError } = useHumiditySetup(coId, branchId);
	const {
		departments,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useHumidityByDate(coId, branchId, reportDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: one consolidated report for the selected report_date.
	// Mirrors the grid's by-date view — one table per department; rows are the
	// spot readings of each round (round shown as an ordinary column), and a bold
	// footer row per round carries the server-computed avg temp/RH.
	const totalRounds = React.useMemo(
		() => departments.reduce((acc, d) => acc + d.rounds.length, 0),
		[departments],
	);

	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (departments.length === 0) return null;

		const columns: PrintColumn[] = [
			{ key: "round", label: "Round" },
			{ key: "spot", label: "Spot" },
			{ key: "time", label: "Time" },
			{ key: "temp", label: "Temp (°C)", align: "right" },
			{ key: "rh", label: "RH %", align: "right" },
		];

		const sections: PrintSection[] = departments.map((dept) => {
			const rows: Array<Record<string, PrintCell>> = [];
			const footerRows: Array<Record<string, PrintCell>> = [];
			for (const round of dept.rounds) {
				const label = round.round_label ?? ROUND_LABELS[round.round_no] ?? `Round ${round.round_no}`;
				round.spots.forEach((s, i) => {
					rows.push({
						round: label,
						spot: s.spot_label ?? `Spot ${i + 1}`,
						time: s.reading_time ?? "—",
						temp: fmtPrint(s.temp_c),
						rh: fmtPrint(s.rh_pct),
					});
				});
				footerRows.push({
					round: `${label} — Avg`,
					spot: "",
					time: "",
					temp: fmtPrint(round.avg_temp),
					rh: fmtPrint(round.avg_rh),
				});
			}
			return { kind: "table", title: dept.dept_desc, columns, rows, footerRows };
		});

		return {
			reportTitle: "Humidity Recording SQC",
			reportCode: "R-08-HUM",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate,
			sections,
		};
	}, [departments, selectedCompany, selectedBranchName, reportDate]);

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
				Humidity Recording SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Plant-wide department temperature / RH log. Capture one (date, department, round) reading-set
				at a time — pick the round (Morning / Noon / Evening) and record 1..3 spot readings, each a
				temperature and relative-humidity %. The server averages the spots into avg_temp and avg_rh.
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
				<Alert severity="info">Select a branch to load Humidity Recording data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Report date</Typography>
						<TextField
							type="date"
							size="small"
							value={reportDate}
							onChange={(e) => setReportDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<SqcPrintButton
							getReport={getReport}
							disabled={byDateLoading || totalRounds === 0}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<HumidityForm
							coId={coId}
							branchId={branchId}
							reportDate={reportDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<HumidityGrid
						coId={coId}
						branchId={branchId}
						departments={departments}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
