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
import type {
	CuttingLengthHistoryRow,
	CuttingLengthRow,
	CuttingLengthTableResponse,
} from "../types/cuttingLengthTypes";

type Props = {
	coId: string;
	branchId: number;
	rows: CuttingLengthRow[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-20 Cutting Length grid.
 *
 * Two views:
 *  1. By-date detail — one card per saved reading-set for the selected date,
 *     showing the 20 readings plus server avg / sample-stdev / cv% / deviation /
 *     std. Per-row delete POSTs {cutting_length_id, co_id} to delete_cutting_length.
 *  2. Paginated history (trend view) — get_cutting_length_table, one row per
 *     save (date, quality, std, avg, stdev, cv%, deviation). Server values are
 *     authoritative.
 */
export default function CuttingLengthGrid({
	coId,
	branchId,
	rows,
	loading,
	onDeleted,
	reloadKey,
}: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<CuttingLengthHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.CUTTING_LENGTH_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<CuttingLengthTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (cuttingLengthId: number) => {
			if (!confirm(`Delete cutting-length row #${cuttingLengthId}?`)) return;
			setDeletingId(cuttingLengthId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.CUTTING_LENGTH_DELETE, "POST", {
				cutting_length_id: cuttingLengthId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted cutting-length row #${cuttingLengthId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{/* ── By-date detail ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Reading-sets for this date
				</Typography>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : rows.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No cutting-length reading-sets for this date.
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{rows.map((r) => (
							<Paper key={r.cutting_length_id} variant="outlined" sx={{ p: 1.5 }}>
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
									<Typography variant="body2">
										<strong>
											{r.item_name ?? (r.item_id != null ? `Item #${r.item_id}` : "No quality")}
										</strong>{" "}
										· Std {fmt(r.std_length)} · Avg <strong>{fmt(r.avg)}</strong> · Std dev{" "}
										{fmt(r.stdev, 4)} · CV% {fmt(r.cv_pct, 4)} · Dev {fmt(r.deviation)}
									</Typography>
									<Tooltip title="Delete row">
										<span>
											<IconButton
												size="small"
												color="error"
												disabled={deletingId === r.cutting_length_id}
												onClick={() => handleDelete(r.cutting_length_id)}
												sx={{ minWidth: 40, minHeight: 40 }}
											>
												<DeleteOutlineIcon size={16} />
											</IconButton>
										</span>
									</Tooltip>
								</Box>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: {
											xs: "repeat(5, 1fr)",
											sm: "repeat(10, 1fr)",
										},
										gap: 0.5,
									}}
								>
									{(r.readings ?? []).map((v, i) => (
										<Box
											key={`${r.cutting_length_id}-r-${i}`}
											sx={{
												border: "1px solid",
												borderColor: "divider",
												borderRadius: 1,
												px: 0.5,
												py: 0.25,
												textAlign: "center",
											}}
										>
											<Typography variant="caption" color="text.secondary" display="block">
												{i + 1}
											</Typography>
											<Typography variant="body2">{fmt(v)}</Typography>
										</Box>
									))}
								</Box>
							</Paper>
						))}
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
							<Table size="small" sx={{ minWidth: 700 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Quality</TableCell>
										<TableCell align="right" sx={{ minWidth: 70 }}>
											Std
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
											Avg
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Std dev
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
											CV %
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Deviation
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7}>
												<Typography variant="body2" color="text.secondary">
													No history yet.
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.map((h, idx) => (
											<TableRow key={h.cutting_length_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.item_name ?? "—"}</TableCell>
												<TableCell align="right">{fmt(h.std_length)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg)}
												</TableCell>
												<TableCell align="right">{fmt(h.stdev, 4)}</TableCell>
												<TableCell align="right">{fmt(h.cv_pct, 4)}</TableCell>
												<TableCell align="right">{fmt(h.deviation)}</TableCell>
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
