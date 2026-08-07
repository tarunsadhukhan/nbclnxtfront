"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/widthPicksCalc";
import { useWidthPicksSetup } from "./hooks/useWidthPicksSetup";
import { useWidthPicksByDate } from "./hooks/useWidthPicksByDate";
import WidthPicksForm from "./_components/WidthPicksForm";
import WidthPicksGrid from "./_components/WidthPicksGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { PrintColumn, PrintSection, SqcPrintReport } from "../_shared/printReport";

function fmtNum(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

const LOOM_COLUMNS: PrintColumn[] = [
	{ key: "sno", label: "#", align: "right" },
	{ key: "loom", label: "Loom" },
	{ key: "width_cm", label: "Width (cm)", align: "right" },
	{ key: "picks_dm", label: "Picks/dm", align: "right" },
];

export default function WidthPicksSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useWidthPicksSetup(coId, branchId);
	const {
		blocks,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useWidthPicksByDate(coId, branchId, entryDate);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: one consolidated report covering EVERY (date, quality) block
	// loaded for the selected date. No shift/spell split — this report is date-only.
	// Per block we render the loom-reading table mirroring the grid, then the
	// server-computed width + picks summaries as a meta section.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (branchId == null || blocks.length === 0) return null;
		const sections: PrintSection[] = [];
		for (const block of blocks) {
			const qualityLabel =
				block.item_name ?? (block.item_id != null ? `Item #${block.item_id}` : "—");
			const title = `${qualityLabel}${block.item_code ? ` (${block.item_code})` : ""} · Std width ${fmtNum(
				block.std_width_cm,
			)} · Std picks ${fmtNum(block.std_picks, 0)}${
				block.inspector_name ? ` · Inspector: ${block.inspector_name}` : ""
			}`;
			sections.push({
				kind: "table",
				title,
				columns: LOOM_COLUMNS,
				rows: block.rows.map((r, i) => ({
					sno: i + 1,
					loom:
						(r.loom_name ?? (r.loom_id != null ? `Loom #${r.loom_id}` : "—")) +
						(r.mech_code ? ` (${r.mech_code})` : ""),
					width_cm: fmtNum(r.width_cm),
					picks_dm:
						r.picks_dm != null && Number.isFinite(Number(r.picks_dm))
							? fmtNum(r.picks_dm, 0)
							: "—",
				})),
				emptyText: "No loom readings.",
			});
			const ws = block.width_summary ?? null;
			const ps = block.picks_summary ?? null;
			sections.push({
				kind: "meta",
				title: "Width summary",
				fields: [
					{ label: "Avg", value: fmtNum(ws?.avg_width) },
					{ label: "Tol", value: `${fmtNum(ws?.tol_low)} – ${fmtNum(ws?.tol_high)}` },
					{
						label: "Remark",
						value: ws?.remark === "$" ? "$ out of ±0.5%" : "within ±0.5%",
					},
				],
			});
			sections.push({
				kind: "meta",
				title: "Picks summary",
				fields: [
					{ label: "Avg", value: fmtNum(ps?.avg_picks) },
					{ label: "Stdev", value: fmtNum(ps?.stdev, 4) },
					{ label: "Max", value: fmtNum(ps?.max_picks, 0) },
					{ label: "Min", value: fmtNum(ps?.min_picks, 0) },
					{ label: "n", value: ps?.pick_count ?? 0 },
				],
			});
		}
		return {
			reportTitle: "Width & Picks SQC",
			reportCode: "R-08-30",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [blocks, branchId, entryDate, selectedBranchName, selectedCompany]);

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
				Width &amp; Picks SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-21 on-loom dimensional QC of woven cloth. Capture one (date, cloth-quality) group at a
				time — its std width (cm) and std picks (both editable and snapshotted at save) plus N loom
				readings (width required per loom, picks/dm optional — only a sampled subset is pick-checked).
				The server computes the width tolerance band (±0.5%) and remark, and the picks avg / sample
				stdev / max / min over the entered picks.
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
				<Alert severity="info">Select a branch to load Width &amp; Picks SQC data.</Alert>
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
						<SqcPrintButton
							getReport={getReport}
							disabled={byDateLoading || blocks.length === 0}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<WidthPicksForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<WidthPicksGrid
						coId={coId}
						branchId={branchId}
						blocks={blocks}
						loading={byDateLoading}
						onDeleted={onSaved}
					/>
				</Box>
			)}
		</Box>
	);
}
