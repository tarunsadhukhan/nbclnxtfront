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
import { hyLtLabel } from "../utils/bagWeightCalc";
import type {
	BagWeightBlock,
	BagWeightHistoryRow,
	BagWeightTableResponse,
} from "../types/bagWeightTypes";

type Props = {
	coId: string;
	branchId: number;
	blocks: BagWeightBlock[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-23 Bag Weight grid.
 *
 * Two views:
 *  1. By-date detail — one card per saved (date, bag type) block: the N reading
 *     rows (mr, obs, server corr) plus the block stats (avg_mr/avg_obs/avg_corr,
 *     obs stdev/CV%, OBS+CORR HY/LT%). Block delete POSTs {bag_weight_id, co_id}
 *     to delete_bag_weight.
 *  2. Paginated history (trend) — get_bag_weight_table, one row per save (date,
 *     bag type, std, avg_obs/avg_corr, stdev, CV%, HY/LT obs+corr). Server values
 *     are authoritative.
 */
export default function BagWeightGrid({
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
	const [history, setHistory] = React.useState<BagWeightHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.BAG_WEIGHT_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<BagWeightTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (bagWeightId: number) => {
			if (!confirm(`Delete bag-weight block #${bagWeightId}?`)) return;
			setDeletingId(bagWeightId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.BAG_WEIGHT_DELETE, "POST", {
				bag_weight_id: bagWeightId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted bag-weight block #${bagWeightId}`);
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
						No bag-weight blocks for this date.
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{blocks.map((block) => {
							const label =
								block.item_name ??
								block.bag_type_label ??
								(block.item_id != null ? `Item #${block.item_id}` : "—");
							return (
								<Paper key={block.bag_weight_id} variant="outlined" sx={{ p: 1.5 }}>
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
										<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
											{label} · Std {fmt(block.std_bag_weight)} gm · Std MR%{" "}
											{fmt(block.std_mr_pct)}
										</Typography>
										<Tooltip title="Delete block">
											<span>
												<IconButton
													size="small"
													color="error"
													disabled={deletingId === block.bag_weight_id}
													onClick={() => handleDelete(block.bag_weight_id)}
													sx={{ minWidth: 40, minHeight: 40 }}
												>
													<DeleteOutlineIcon size={16} />
												</IconButton>
											</span>
										</Tooltip>
									</Box>

									<TableContainer sx={{ overflowX: "auto" }}>
										<Table size="small" sx={{ minWidth: 360 }}>
											<TableHead>
												<TableRow>
													<TableCell sx={{ width: 40 }}>#</TableCell>
													<TableCell align="right" sx={{ minWidth: 90 }}>
														MR%
													</TableCell>
													<TableCell align="right" sx={{ minWidth: 110 }}>
														Obs (gm)
													</TableCell>
													<TableCell align="right" sx={{ minWidth: 110 }}>
														Corr (gm)
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{block.readings.map((r, i) => (
													<TableRow key={`${block.bag_weight_id}-r-${i}`} hover>
														<TableCell>{i + 1}</TableCell>
														<TableCell align="right">{fmt(r.mr)}</TableCell>
														<TableCell align="right">{fmt(r.obs)}</TableCell>
														<TableCell align="right">{fmt(r.corr)}</TableCell>
													</TableRow>
												))}
												<TableRow>
													<TableCell sx={{ fontWeight: 600 }}>Avg</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{fmt(block.avg_mr)}
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{fmt(block.avg_obs)}
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{fmt(block.avg_corr)}
													</TableCell>
												</TableRow>
											</TableBody>
										</Table>
									</TableContainer>

									<Box
										sx={{
											display: "grid",
											gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
											gap: 1,
											mt: 1.5,
										}}
									>
										<Stat label="Obs std dev" value={fmt(block.obs_stdev, 4)} />
										<Stat label="Obs CV %" value={fmt(block.obs_cv_pct, 4)} />
										<Stat label="Obs HY/LT %" value={hyLtLabel(block.obs_hy_lt_pct)} />
										<Stat label="Corr HY/LT %" value={hyLtLabel(block.corr_hy_lt_pct)} />
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
							<Table size="small" sx={{ minWidth: 860 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Bag type</TableCell>
										<TableCell align="right" sx={{ minWidth: 70 }}>
											Std
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Avg obs
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Avg corr
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Std dev
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
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
											<TableCell colSpan={9}>
												<Typography variant="body2" color="text.secondary">
													No history yet.
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.map((h, idx) => (
											<TableRow key={h.bag_weight_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.item_name ?? h.bag_type_label ?? "—"}</TableCell>
												<TableCell align="right">{fmt(h.std_bag_weight)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg_obs)}
												</TableCell>
												<TableCell align="right">{fmt(h.avg_corr)}</TableCell>
												<TableCell align="right">{fmt(h.obs_stdev, 4)}</TableCell>
												<TableCell align="right">{fmt(h.obs_cv_pct, 4)}</TableCell>
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
