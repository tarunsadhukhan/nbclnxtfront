"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/beamMrCalc";
import { useBeamMrSetup } from "./hooks/useBeamMrSetup";
import { useBeamMrByDate } from "./hooks/useBeamMrByDate";
import BeamMrForm from "./_components/BeamMrForm";
import BeamMrGrid from "./_components/BeamMrGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn, PrintSection } from "../_shared/printReport";
import {
	QUALITY_GROUPS,
	type BeamMrRow,
	type QualityGroup,
} from "./types/beamMrTypes";

function machineLabel(r: BeamMrRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function spellLabel(r: BeamMrRow): string {
	return r.spell_code ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

export default function BeamMrSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useBeamMrSetup(coId, branchId);
	const {
		rows,
		groupSummaries,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useBeamMrByDate(coId, branchId, entryDate);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: ONE consolidated report covering the whole entry date.
	// Mirrors the on-screen grid — two table sub-sections (HESSIAN, SACKING) with
	// the same columns/labels; spell is an ordinary data column (never a filter).
	// The per-group overall_avg_mr summary is rendered as a bold footer row.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (rows.length === 0) return null;

		// Reading columns follow the widest reading-set on this date (sets can carry
		// different numbers of readings). At least one column so the table holds shape.
		const maxReadings = Math.max(1, ...rows.map((r) => r.readings?.length ?? 0));
		const readingCols: PrintColumn[] = Array.from(
			{ length: maxReadings },
			(_, i) => ({ key: `mr_${i}`, label: `MR% ${i + 1}`, align: "right" as const }),
		);
		const columns: PrintColumn[] = [
			{ key: "machine", label: "Machine" },
			{ key: "quality", label: "Quality" },
			{ key: "spell", label: "Spell" },
			...readingCols,
			{ key: "avg_mr", label: "Avg MR%", align: "right" },
			{ key: "std", label: "Std", align: "right" },
			{ key: "deviation", label: "Deviation", align: "right" },
		];

		const summaryByGroup = new Map(groupSummaries.map((s) => [s.quality_group, s]));

		const sections: PrintSection[] = QUALITY_GROUPS.map((group: QualityGroup) => {
			const groupRows = rows.filter((r) => r.quality_group === group);
			const summary = summaryByGroup.get(group);
			const footerRows =
				summary != null
					? [
							{
								machine: "Overall Avg MR%",
								avg_mr: fmt(summary.overall_avg_mr),
								std: fmt(summary.std_mr_pct),
							},
						]
					: undefined;
			return {
				kind: "table" as const,
				title: group,
				columns,
				rows: groupRows.map((r) => {
					const row: Record<string, string> = {
						machine: machineLabel(r),
						quality: r.item_name ?? (r.item_id != null ? `Item #${r.item_id}` : "—"),
						spell: spellLabel(r),
						avg_mr: fmt(r.avg_mr),
						std: fmt(r.std_mr_pct),
						deviation: fmt(r.deviation),
					};
					for (let i = 0; i < maxReadings; i++) {
						row[`mr_${i}`] = fmt(r.readings?.[i]);
					}
					return row;
				}),
				footerRows,
				emptyText: `No ${group} reading-sets for this date.`,
			};
		});

		return {
			reportTitle: "Beam MR% SQC",
			reportCode: "R-08-18",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [rows, groupSummaries, selectedCompany, selectedBranchName, entryDate]);

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
				Beam MR% SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-18 warp-beam moisture-regain QC. Capture one reading-set at a time — one or more MR%
				readings per (quality, beam machine, spell) — split across the two quality groups, Hessian and Sacking.
				Each set carries its own Std MR% (default 16 Hessian / 20 Sacking) snapshotted at save; the
				deviation is the average MR% minus that standard.
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
				<Alert severity="info">Select a branch to load Beam MR% SQC data.</Alert>
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
						<BeamMrForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<BeamMrGrid
						coId={coId}
						rows={rows}
						groupSummaries={groupSummaries}
						loading={byDateLoading}
						onDeleted={onSaved}
					/>
				</Box>
			)}
		</Box>
	);
}
