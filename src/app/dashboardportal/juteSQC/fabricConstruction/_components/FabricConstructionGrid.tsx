"use client";

import * as React from "react";
import {
	Box,
	CircularProgress,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	FabricConstructionBlock,
	FabricConstructionComparison,
	FabricConstructionSampleRow,
} from "../types/fabricConstructionTypes";

type Props = {
	coId: string;
	blocks: FabricConstructionBlock[];
	loading: boolean;
	onDeleted: () => void;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

// The 8 averaged sample columns, in display order.
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

// Fall back to the std snapshot on the block header to derive the comparison
// when the server omits the comparison array (deviation = actual - std).
function comparisonFor(block: FabricConstructionBlock): FabricConstructionComparison[] {
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

/**
 * R-08-19 Fabric Construction by-date summary grid.
 *
 * One Paper per saved quality block: the (up to 5) sample rows with their
 * server-computed obs_ozs / crcted_oz, a per-column AVG footer row, then a
 * Std-vs-Actual comparison table (6 dimensions: std, actual = block avg,
 * deviation = actual - std). Block delete POSTs {fabric_const_id, co_id} to
 * delete_fabric_construction. Server values are authoritative.
 */
export default function FabricConstructionGrid({ coId, blocks, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	const handleDelete = React.useCallback(
		async (fabricConstId: number) => {
			if (!confirm(`Delete fabric construction block #${fabricConstId}?`)) return;
			setDeletingId(fabricConstId);
			const { error } = await fetchWithCookie(
				apiRoutesPortalMasters.FABRIC_CONSTRUCTION_DELETE,
				"POST",
				{ fabric_const_id: fabricConstId, co_id: Number(coId) },
			);
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted block #${fabricConstId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
					<CircularProgress size={28} />
				</Box>
			) : null}

			{!loading && blocks.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					No fabric construction blocks for this date.
				</Typography>
			) : null}

			{blocks.map((block) => {
				const qualityLabel =
					block.item_name ??
					block.quality_text ??
					(block.item_id != null ? `Item #${block.item_id}` : "—");
				const avg = block.averages ?? null;
				const comparison = comparisonFor(block);
				return (
					<Paper key={block.fabric_const_id} variant="outlined" sx={{ p: 2 }}>
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "baseline",
								flexWrap: "wrap",
								mb: 1,
							}}
						>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								{qualityLabel}
								{block.item_code ? ` (${block.item_code})` : ""}
							</Typography>
							<Tooltip title="Delete block">
								<span>
									<IconButton
										size="small"
										color="error"
										disabled={deletingId === block.fabric_const_id}
										onClick={() => handleDelete(block.fabric_const_id)}
										sx={{ minWidth: 40, minHeight: 40 }}
									>
										<DeleteOutlineIcon size={16} />
									</IconButton>
								</span>
							</Tooltip>
						</Box>

						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 760 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ width: 40 }}>#</TableCell>
										{SAMPLE_COLS.map((c) => (
											<TableCell key={c.key} align="right" sx={{ minWidth: 90 }}>
												{c.label}
											</TableCell>
										))}
									</TableRow>
								</TableHead>
								<TableBody>
									{block.rows.map((r, i) => (
										<TableRow key={`${block.fabric_const_id}-row-${i}`} hover>
											<TableCell>{i + 1}</TableCell>
											{SAMPLE_COLS.map((c) => (
												<TableCell key={c.key} align="right">
													{fmt(r[c.key])}
												</TableCell>
											))}
										</TableRow>
									))}
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Avg</TableCell>
										{SAMPLE_COLS.map((c) => (
											<TableCell key={c.key} align="right" sx={{ fontWeight: 600 }}>
												{fmt(avg ? avg[c.key] : null)}
											</TableCell>
										))}
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>

						<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
							Std vs Actual
						</Typography>
						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 420 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 140 }}>Dimension</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Std
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Actual
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Deviation
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{comparison.map((c) => (
										<TableRow key={`${block.fabric_const_id}-cmp-${c.dimension}`}>
											<TableCell>{c.dimension}</TableCell>
											<TableCell align="right">{fmt(c.std)}</TableCell>
											<TableCell align="right">{fmt(c.actual)}</TableCell>
											<TableCell align="right">{fmt(c.deviation)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Paper>
				);
			})}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
