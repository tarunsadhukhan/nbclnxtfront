"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO, type AggKey, hyLtLabel } from "./utils/bagCheckCalc";
import { useBagCheckSetup } from "./hooks/useBagCheckSetup";
import { useBagCheckByDate } from "./hooks/useBagCheckByDate";
import BagCheckForm from "./_components/BagCheckForm";
import BagCheckGrid from "./_components/BagCheckGrid";
import type { BagCheckBag, BagCheckBlock, ColAggregate } from "./types/bagCheckTypes";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn, PrintSection } from "../_shared/printReport";

// Mirrors BagCheckGrid: the 8 per-bag detail columns (7 measures + server corr).
const PRINT_DETAIL_COLS: { key: keyof BagCheckBag; label: string }[] = [
	{ key: "length_cm", label: "Length" },
	{ key: "width_cm", label: "Width" },
	{ key: "ends_dm", label: "Ends" },
	{ key: "picks_dm", label: "Picks" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "bag_wt_gm", label: "Bag wt" },
	{ key: "stitch_dm", label: "Stitch" },
	{ key: "corr_wt_gm", label: "Corr wt" },
];

// The 8 aggregate columns + which std-snapshot header field each compares against.
const PRINT_AGG_COLS: { key: AggKey; label: string; std?: keyof BagCheckBlock }[] = [
	{ key: "length_cm", label: "Length", std: "std_length" },
	{ key: "width_cm", label: "Width", std: "std_width" },
	{ key: "ends_dm", label: "Ends", std: "std_ends" },
	{ key: "picks_dm", label: "Picks", std: "std_picks" },
	{ key: "mr_pct", label: "MR%", std: "std_mr_pct" },
	{ key: "bag_wt_gm", label: "Bag wt", std: "std_bag_weight" },
	{ key: "stitch_dm", label: "Stitch", std: "std_stitch" },
	{ key: "corr_wt_gm", label: "Corr wt" },
];

const PRINT_STAT_ROWS: { key: keyof ColAggregate; label: string }[] = [
	{ key: "avg", label: "Avg" },
	{ key: "stdev", label: "Std dev" },
	{ key: "cv_pct", label: "CV %" },
	{ key: "min", label: "Min" },
	{ key: "max", label: "Max" },
];

function printNum(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

export default function BagCheckSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useBagCheckSetup(coId, branchId);
	const {
		blocks,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useBagCheckByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: ALL of the date's loaded blocks in ONE consolidated report.
	// Each (date, bag type) block — the non-shift grouping the grid already uses —
	// becomes a meta section (vendor/id + std snapshot + HY/LT) plus a per-bag
	// detail table whose footer carries the Std + Avg/Std dev/CV/Min/Max rows,
	// mirroring BagCheckGrid. There is no shift dimension on this report.
	const printBranchName = selectedBranchName;
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (!blocks.length) return null;

		const sections: PrintSection[] = [];
		blocks.forEach((block) => {
			const label =
				block.item_name ??
				block.bag_type_label ??
				(block.item_id != null ? `Item #${block.item_id}` : "Bag type");
			const agg = block.aggregates ?? {};

			sections.push({
				kind: "meta",
				title: label,
				fields: [
					{ label: "Vendor", value: block.vendor_name ?? "" },
					{ label: "ID code", value: block.id_code ?? "" },
					{ label: "Std bag wt", value: printNum(block.std_bag_weight) },
					{ label: "Std MR%", value: printNum(block.std_mr_pct) },
					{ label: "OBS HY/LT %", value: hyLtLabel(block.obs_hy_lt_pct) },
					{ label: "CORR HY/LT %", value: hyLtLabel(block.corr_hy_lt_pct) },
				],
			});

			const detailColumns: PrintColumn[] = [
				{ key: "_n", label: "#", align: "right" },
				...PRINT_DETAIL_COLS.map(
					(c): PrintColumn => ({ key: c.key, label: c.label, align: "right" }),
				),
				{ key: "defects", label: "Defects" },
			];
			const detailRows = block.bags.map((b, i) => {
				const row: Record<string, string | number | null | undefined> = {
					_n: i + 1,
					defects: b.defects ?? "",
				};
				for (const c of PRINT_DETAIL_COLS) {
					row[c.key] = printNum(b[c.key] as number | null | undefined);
				}
				return row;
			});

			// Footer = Std snapshot row + the 5 aggregate stat rows, keyed by the
			// 8 aggregate columns (same as the grid's Aggregates table).
			const stdFooter: Record<string, string | number | null | undefined> = {
				_n: "Std",
				defects: "",
			};
			for (const c of PRINT_AGG_COLS) {
				stdFooter[c.key] = c.std
					? printNum(block[c.std] as number | null | undefined)
					: "—";
			}
			const statFooters = PRINT_STAT_ROWS.map((s) => {
				const row: Record<string, string | number | null | undefined> = {
					_n: s.label,
					defects: "",
				};
				for (const c of PRINT_AGG_COLS) {
					row[c.key] = printNum(agg[c.key]?.[s.key]);
				}
				return row;
			});

			sections.push({
				kind: "table",
				columns: detailColumns,
				rows: detailRows,
				footerRows: [stdFooter, ...statFooters],
				emptyText: "No bags recorded for this block.",
			});
		});

		return {
			reportTitle: "Bag Checking SQC",
			reportCode: "R-08-29",
			companyName: selectedCompany?.co_name,
			branchName: printBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [blocks, selectedCompany, printBranchName, entryDate]);

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
				Bag Checking SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-24 finished-bag acceptance inspection. Capture one (date, bag type) block at a time —
				its vendor name and ID code (free text) and 7 standards (std bag weight, length, width,
				ends, picks, stitch, and Std MR%, which defaults to 20, all editable and snapshotted at
				save) plus the per-bag inspection rows, each with 7 measured values (length, width, ends,
				picks, MR%, bag weight, stitch) and optional defects. The server corrects each bag weight
				to the std MR%, then computes the per-column avg / std dev / CV% / min / max and the OBS and
				CORR HY/LT% vs the std bag weight (positive = Heavy, negative = Light — display only).
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
				<Alert severity="info">Select a branch to load Bag Checking SQC data.</Alert>
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
								disabled={byDateLoading || blocks.length === 0}
							/>
						</Box>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<BagCheckForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<BagCheckGrid
						coId={coId}
						branchId={branchId}
						blocks={blocks}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
