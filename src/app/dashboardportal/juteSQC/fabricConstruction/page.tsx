"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/fabricConstructionCalc";
import { useFabricConstructionSetup } from "./hooks/useFabricConstructionSetup";
import { useFabricConstructionByDate } from "./hooks/useFabricConstructionByDate";
import FabricConstructionForm from "./_components/FabricConstructionForm";
import FabricConstructionGrid from "./_components/FabricConstructionGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type {
	SqcPrintReport,
	PrintColumn,
	PrintCell,
	PrintSection,
} from "../_shared/printReport";
import type {
	FabricConstructionBlock,
	FabricConstructionSampleRow,
} from "./types/fabricConstructionTypes";

// The 8 averaged sample columns, mirroring FabricConstructionGrid's SAMPLE_COLS.
const SAMPLE_COLS: { key: keyof FabricConstructionSampleRow; label: string }[] = [
	{ key: "length_yds", label: "Length (yds)" },
	{ key: "width_cms", label: "Width (cms)" },
	{ key: "ends_per_dm", label: "Ends/dm" },
	{ key: "picks_per_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "obs_wt_kg", label: "Obs wt (kg)" },
	{ key: "obs_ozs", label: "Obs oz/yd" },
	{ key: "crcted_oz", label: "Crcted oz" },
];

function fmtCell(n: number | null | undefined, dp = 2): PrintCell {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : null;
}

// Derive the Std-vs-Actual comparison the same way the grid does when the server
// omits the comparison array (deviation = actual - std).
function comparisonFor(block: FabricConstructionBlock) {
	if (block.comparison && block.comparison.length > 0) return block.comparison;
	const avg = block.averages ?? null;
	const dims: { dimension: string; std?: number | null; actual?: number | null }[] = [
		{ dimension: "Length (yds)", std: block.std_length_yds, actual: avg?.length_yds },
		{ dimension: "Width (cms)", std: block.std_width_cms, actual: avg?.width_cms },
		{ dimension: "Ends/dm", std: block.std_ends_dm, actual: avg?.ends_per_dm },
		{ dimension: "Picks/dm", std: block.std_picks_dm, actual: avg?.picks_per_dm },
		{ dimension: "MR%", std: block.std_mr_pct, actual: avg?.mr_pct },
		{ dimension: "Oz/yd", std: block.std_oz_per_yd, actual: avg?.crcted_oz },
	];
	return dims.map((d) => ({
		...d,
		deviation:
			d.std != null && d.actual != null && Number.isFinite(d.std) && Number.isFinite(d.actual)
				? Number(d.actual) - Number(d.std)
				: null,
	}));
}

export default function FabricConstructionSqcPage() {
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
	const {
		setup,
		loading: setupLoading,
		error: setupError,
	} = useFabricConstructionSetup(coId, branchId);
	const {
		blocks,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useFabricConstructionByDate(coId, branchId, entryDate);

	const onSaved = React.useCallback(() => {
		refreshByDate();
	}, [refreshByDate]);

	// Day-level print: one consolidated report covering every loaded block for the
	// selected date. Each quality block contributes a sample-rows table (with its
	// per-column AVG footer, mirroring the grid) and a Std-vs-Actual comparison
	// table — no shift/spell splitting (this report is date-only).
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (!blocks.length) return null;

		const sampleColumns: PrintColumn[] = [
			{ key: "idx", label: "#", align: "left" },
			...SAMPLE_COLS.map<PrintColumn>((c) => ({ key: c.key, label: c.label, align: "right" })),
		];
		const comparisonColumns: PrintColumn[] = [
			{ key: "dimension", label: "Dimension", align: "left" },
			{ key: "std", label: "Std", align: "right" },
			{ key: "actual", label: "Actual", align: "right" },
			{ key: "deviation", label: "Deviation", align: "right" },
		];

		const sections: PrintSection[] = [];
		blocks.forEach((block) => {
			const qualityLabel =
				block.item_name ??
				block.quality_text ??
				(block.item_id != null ? `Item #${block.item_id}` : "—");
			const titleSuffix = block.item_code ? ` (${block.item_code})` : "";
			const title = `${qualityLabel}${titleSuffix}`;
			const avg = block.averages ?? null;

			const rows = block.rows.map((r, i) => {
				const row: Record<string, PrintCell> = { idx: i + 1 };
				SAMPLE_COLS.forEach((c) => {
					row[c.key] = fmtCell(r[c.key]);
				});
				return row;
			});
			const avgRow: Record<string, PrintCell> = { idx: "Avg" };
			SAMPLE_COLS.forEach((c) => {
				avgRow[c.key] = fmtCell(avg ? avg[c.key] : null);
			});

			sections.push({
				kind: "table",
				title,
				columns: sampleColumns,
				rows,
				footerRows: [avgRow],
				emptyText: "No sample rows for this block.",
			});

			sections.push({
				kind: "table",
				title: `${title} — Std vs Actual`,
				columns: comparisonColumns,
				rows: comparisonFor(block).map((c) => ({
					dimension: c.dimension,
					std: fmtCell(c.std),
					actual: fmtCell(c.actual),
					deviation: fmtCell(c.deviation),
				})),
			});
		});

		return {
			reportTitle: "Fabric Construction SQC",
			reportCode: "R-08-27",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [blocks, selectedCompany, selectedBranchName, entryDate]);

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
				Fabric Construction SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-19 woven hessian cloth construction audit. Capture one cloth-quality block at a time —
				its 6 standards (Std MR% defaults to 16 for hessian, all editable and snapshotted at save)
				plus up to 5 measured sample rows. The server computes obs oz/yd and the MR-corrected oz per
				row, then a per-column average and a Std-vs-Actual deviation for the 6 dimensions.
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
				<Alert severity="info">Select a branch to load Fabric Construction SQC data.</Alert>
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
						<SqcPrintButton getReport={getReport} disabled={byDateLoading || blocks.length === 0} />
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<FabricConstructionForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<FabricConstructionGrid
						coId={coId}
						blocks={blocks}
						loading={byDateLoading}
						onDeleted={onSaved}
					/>
				</Box>
			)}
		</Box>
	);
}
