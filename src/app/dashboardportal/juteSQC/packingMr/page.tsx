"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/packingMrCalc";
import { usePackingMrSetup } from "./hooks/usePackingMrSetup";
import { usePackingMrByDate } from "./hooks/usePackingMrByDate";
import PackingMrForm from "./_components/PackingMrForm";
import PackingMrGrid from "./_components/PackingMrGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { PrintColumn, PrintSection, SqcPrintReport } from "../_shared/printReport";
import { QUALITY_GROUPS } from "./types/packingMrTypes";

export default function PackingMrSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = usePackingMrSetup(coId, branchId);
	const {
		columns,
		groupSummaries,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = usePackingMrByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// ─── Day-level print: ALL of the selected date's loaded columns in one report.
	// Mirrors the grid — quality columns grouped into HESSIAN / SACKING tables
	// (quality, construction, 10 readings, Avg MR%), each footed with the
	// server-weighted group average. No shift/spell split (this report is date-only).
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (columns.length === 0) return null;

		// Columns may carry different reading counts — size the report to the widest.
		const maxReadings = columns.reduce((m, c) => Math.max(m, c.readings?.length ?? 0), 0);
		const readingHeaders = Array.from({ length: maxReadings }, (_, i) => i);
		const tableColumns: PrintColumn[] = [
			{ key: "quality", label: "Quality" },
			{ key: "construction", label: "Construction" },
			...readingHeaders.map((i) => ({
				key: `r${i}`,
				label: String(i + 1),
				align: "right" as const,
			})),
			{ key: "avg_mr", label: "Avg MR%", align: "right" as const },
		];

		const sections: PrintSection[] = QUALITY_GROUPS.map((group) => {
			const groupCols = columns.filter((c) => c.quality_group === group);
			const summary = groupSummaries.find((s) => s.quality_group === group);
			const rows = groupCols.map((c) => {
				const row: Record<string, string | number | null | undefined> = {
					quality:
						c.item_name ??
						c.quality_label ??
						(c.item_id != null ? `Item #${c.item_id}` : null),
					construction: c.construction_code ?? null,
					avg_mr: c.avg_mr != null ? Number(c.avg_mr).toFixed(1) : null,
				};
				for (const i of readingHeaders) {
					const v = c.readings?.[i];
					row[`r${i}`] = v != null && Number.isFinite(Number(v)) ? Number(v).toFixed(1) : null;
				}
				return row;
			});
			const footerRows =
				summary?.group_avg_mr != null
					? [
							{
								quality: `Average ${group}${
									summary.column_count != null ? ` (${summary.column_count} column(s))` : ""
								}`,
								construction: "",
								avg_mr: Number(summary.group_avg_mr).toFixed(1),
							},
						]
					: undefined;
			return {
				kind: "table" as const,
				title: group,
				columns: tableColumns,
				rows,
				footerRows,
				emptyText: `No ${group} quality columns for this date.`,
			};
		});

		return {
			reportTitle: "Packing MR% SQC",
			reportCode: "R-08-26",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [columns, groupSummaries, selectedCompany, selectedBranchName, entryDate]);

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
				Packing MR% SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-25 finished-goods moisture at packing. Capture one quality column at a time — add as
				many MR% readings as needed for one quality (Hessian or Sacking), with an optional cloth
				quality and free-text construction. The server computes each column average and the weighted
				group average per quality group. The sheet shows averages only — no std, CV% or pass/fail.
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
				<Alert severity="info">Select a branch to load Packing MR% SQC data.</Alert>
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
								disabled={byDateLoading || columns.length === 0}
							/>
						</Box>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<PackingMrForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<PackingMrGrid
						coId={coId}
						branchId={branchId}
						columns={columns}
						groupSummaries={groupSummaries}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
