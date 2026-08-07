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
	TablePagination,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { type AggKey, hyLtLabel } from "../utils/bagCheckCalc";
import type {
	BagCheckBag,
	BagCheckBlock,
	BagCheckHistoryRow,
	BagCheckTableResponse,
	ColAggregate,
} from "../types/bagCheckTypes";

type Props = {
	coId: string;
	branchId: number;
	blocks: BagCheckBlock[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

// The 7 measured detail columns + corr, in display order.
const DETAIL_COLS: { key: keyof BagCheckBag; label: string }[] = [
	{ key: "length_cm", label: "Length" },
	{ key: "width_cm", label: "Width" },
	{ key: "ends_dm", label: "Ends" },
	{ key: "picks_dm", label: "Picks" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "bag_wt_gm", label: "Bag wt" },
	{ key: "stitch_dm", label: "Stitch" },
	{ key: "corr_wt_gm", label: "Corr wt" },
];

// The 8 aggregate columns, keyed by the numeric column + which std header field
// (if any) it is compared against.
const AGG_COLS: { key: AggKey; label: string; std?: keyof BagCheckBlock }[] = [
	{ key: "length_cm", label: "Length", std: "std_length" },
	{ key: "width_cm", label: "Width", std: "std_width" },
	{ key: "ends_dm", label: "Ends", std: "std_ends" },
	{ key: "picks_dm", label: "Picks", std: "std_picks" },
	{ key: "mr_pct", label: "MR%", std: "std_mr_pct" },
	{ key: "bag_wt_gm", label: "Bag wt", std: "std_bag_weight" },
	{ key: "stitch_dm", label: "Stitch", std: "std_stitch" },
	{ key: "corr_wt_gm", label: "Corr wt" },
];

const STAT_ROWS: { key: keyof ColAggregate; label: string }[] = [
	{ key: "avg", label: "Avg" },
	{ key: "stdev", label: "Std dev" },
	{ key: "cv_pct", label: "CV %" },
	{ key: "min", label: "Min" },
	{ key: "max", label: "Max" },
];

/**
 * R-08-24 Bag Checking grid.
 *
 * Two views:
 *  1. By-date detail — one card per saved (date, bag type) block: the per-bag
 *     inspection rows (7 measures + server corr_wt + defects), an aggregates
 *     table (avg/stdev/cv/min/max per column) with the snapshot STD row for
 *     comparison, and the OBS/CORR HY/LT%. Block delete POSTs {bag_check_id,
 *     co_id} to delete_bag_check.
 *  2. Paginated history (trend) — get_bag_check_table, one row per save. Server
 *     values are authoritative.
 */
export default function BagCheckGrid({
	coId,
	branchId,
	blocks,
	loading,
	onDeleted,
	reloadKey,
}: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<BagCheckHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.BAG_CHECK_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<BagCheckTableResponse>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			if (error) {
				setSnack(error);
				setHistory([]);
				setTotal(0);
			} else {
				setHistory(data?.data ?? []);
				setTotal(data?.total ?? 0);
			}
			setHistoryLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, page, rowsPerPage, reloadKey]);

	const handleDelete = React.useCallback(
		async (bagCheckId: number) => {
			if (!confirm(`Delete bag-checking block #${bagCheckId}?`)) return;
			setDeletingId(bagCheckId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.BAG_CHECK_DELETE, "POST", {
				bag_check_id: bagCheckId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted bag-checking block #${bagCheckId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{/* ── By-date detail ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Blocks for this date
				</Typography>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : blocks.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No bag-checking blocks for this date.
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{blocks.map((block) => {
							const label =
								block.item_name ??
								block.bag_type_label ??
								(block.item_id != null ? `Item #${block.item_id}` : "—");
							const agg = block.aggregates ?? {};
							return (
								<Paper key={block.bag_check_id} variant="outlined" sx={{ p: 1.5 }}>
									<Box
										sx={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "baseline",
											flexWrap: "wrap",
											gap: 1,
											mb: 1,
										}}
									>
										<Box>
											<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
												{label}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{block.vendor_name ? `Vendor: ${block.vendor_name}` : "Vendor: —"}
												{block.id_code ? ` · ID: ${block.id_code}` : ""} · Std bag wt{" "}
												{fmt(block.std_bag_weight)} · Std MR% {fmt(block.std_mr_pct)}
											</Typography>
										</Box>
										<Tooltip title="Delete block">
											<span>
												<IconButton
													size="small"
													color="error"
													disabled={deletingId === block.bag_check_id}
													onClick={() => handleDelete(block.bag_check_id)}
													sx={{ minWidth: 40, minHeight: 40 }}
												>
													<DeleteOutlineIcon size={16} />
												</IconButton>
											</span>
										</Tooltip>
									</Box>

									{/* Per-bag detail rows */}
									<TableContainer sx={{ overflowX: "auto" }}>
										<Table size="small" sx={{ minWidth: 820 }}>
											<TableHead>
												<TableRow>
													<TableCell sx={{ width: 40 }}>#</TableCell>
													{DETAIL_COLS.map((c) => (
														<TableCell key={c.key} align="right" sx={{ minWidth: 80 }}>
															{c.label}
														</TableCell>
													))}
													<TableCell sx={{ minWidth: 120 }}>Defects</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{block.bags.map((b, i) => (
													<TableRow key={`${block.bag_check_id}-b-${i}`} hover>
														<TableCell>{i + 1}</TableCell>
														{DETAIL_COLS.map((c) => (
															<TableCell key={c.key} align="right">
																{fmt(b[c.key] as number | null | undefined)}
															</TableCell>
														))}
														<TableCell>{b.defects ?? "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>

									{/* Aggregates (std + avg/stdev/cv/min/max per column) */}
									<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
										Aggregates
									</Typography>
									<TableContainer sx={{ overflowX: "auto" }}>
										<Table size="small" sx={{ minWidth: 760 }}>
											<TableHead>
												<TableRow>
													<TableCell sx={{ minWidth: 80 }} />
													{AGG_COLS.map((c) => (
														<TableCell key={c.key} align="right" sx={{ minWidth: 80 }}>
															{c.label}
														</TableCell>
													))}
												</TableRow>
											</TableHead>
											<TableBody>
												<TableRow>
													<TableCell sx={{ fontWeight: 600 }}>Std</TableCell>
													{AGG_COLS.map((c) => (
														<TableCell key={c.key} align="right">
															{c.std
																? fmt(block[c.std] as number | null | undefined)
																: "—"}
														</TableCell>
													))}
												</TableRow>
												{STAT_ROWS.map((s) => (
													<TableRow key={s.key}>
														<TableCell sx={{ fontWeight: 600 }}>{s.label}</TableCell>
														{AGG_COLS.map((c) => (
															<TableCell key={c.key} align="right">
																{fmt(agg[c.key]?.[s.key])}
															</TableCell>
														))}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>

									<Box
										sx={{
											display: "grid",
											gridTemplateColumns: "repeat(2, 1fr)",
											gap: 1,
											mt: 1.5,
										}}
									>
										<Stat label="OBS HY/LT %" value={hyLtLabel(block.obs_hy_lt_pct)} />
										<Stat label="CORR HY/LT %" value={hyLtLabel(block.corr_hy_lt_pct)} />
									</Box>
								</Paper>
							);
						})}
					</Box>
				)}
			</Paper>

			{/* ── Paginated history (trend) ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					History (trend)
				</Typography>

				{historyLoading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : (
					<>
						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 980 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Bag type</TableCell>
										<TableCell sx={{ minWidth: 120 }}>Vendor</TableCell>
										<TableCell align="right" sx={{ minWidth: 70 }}>
											Std
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Avg bag wt
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Avg corr
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
											Std dev
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 70 }}>
											CV %
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 120 }}>
											Obs HY/LT %
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 120 }}>
											Corr HY/LT %
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.length === 0 ? (
										<TableRow>
											<TableCell colSpan={10}>
												<Typography variant="body2" color="text.secondary">
													No history yet.
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.map((h, idx) => (
											<TableRow key={h.bag_check_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.item_name ?? h.bag_type_label ?? "—"}</TableCell>
												<TableCell>{h.vendor_name ?? "—"}</TableCell>
												<TableCell align="right">{fmt(h.std_bag_weight)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg_bag_wt)}
												</TableCell>
												<TableCell align="right">{fmt(h.avg_corr_wt)}</TableCell>
												<TableCell align="right">{fmt(h.bag_wt_stdev)}</TableCell>
												<TableCell align="right">{fmt(h.bag_wt_cv_pct)}</TableCell>
												<TableCell align="right">{hyLtLabel(h.obs_hy_lt_pct)}</TableCell>
												<TableCell align="right">{hyLtLabel(h.corr_hy_lt_pct)}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={total}
							page={page}
							onPageChange={(_, p) => setPage(p)}
							rowsPerPage={rowsPerPage}
							onRowsPerPageChange={(e) => {
								setRowsPerPage(parseInt(e.target.value, 10));
								setPage(0);
							}}
							rowsPerPageOptions={[10, 25, 50]}
						/>
					</>
				)}
			</Paper>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="body2" sx={{ fontWeight: 600 }}>
				{value}
			</Typography>
		</Box>
	);
}
