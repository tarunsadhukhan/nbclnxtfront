"use client";

import * as React from "react";
import {
	Box,
	Chip,
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
	HumidityDept,
	HumidityHistoryRow,
	HumidityRound,
	HumidityTableResponse,
} from "../types/humidityTypes";

type Props = {
	coId: string;
	branchId: number;
	departments: HumidityDept[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

const ROUND_LABELS: Record<number, string> = { 1: "Morning", 2: "Noon", 3: "Evening" };
const roundLabel = (r: HumidityRound) =>
	r.round_label ?? ROUND_LABELS[r.round_no] ?? `Round ${r.round_no}`;

/**
 * Humidity Recording grid.
 *
 * Two views:
 *  1. By-date detail — grouped by department; each department card lists its
 *     rounds (Morning/Noon/Evening), and each round shows its spot rows
 *     (spot_label, time, temp, rh) plus the server avg_temp/avg_rh. Round delete
 *     POSTs {humidity_id, co_id} to delete_humidity.
 *  2. Paginated history (trend) — get_humidity_table, one row per saved
 *     (date, dept, round): report_date, dept_desc, round, avg_temp, avg_rh.
 *     Server values are authoritative.
 */
export default function HumidityGrid({
	coId,
	branchId,
	departments,
	loading,
	onDeleted,
	reloadKey,
}: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<HumidityHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.HUMIDITY_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<HumidityTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (humidityId: number) => {
			if (!confirm(`Delete humidity reading-set #${humidityId}?`)) return;
			setDeletingId(humidityId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.HUMIDITY_DELETE, "POST", {
				humidity_id: humidityId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted reading-set #${humidityId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{/* ── By-date detail (grouped by department) ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Departments for this date
				</Typography>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : departments.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No humidity readings for this date.
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{departments.map((dept) => (
							<Paper key={dept.dept_id} variant="outlined" sx={{ p: 1.5 }}>
								<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
									{dept.dept_desc}
								</Typography>

								<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
									{dept.rounds.map((round) => (
										<Box key={round.humidity_id}>
											<Box
												sx={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													flexWrap: "wrap",
													gap: 1,
													mb: 0.5,
												}}
											>
												<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
													<Chip size="small" label={roundLabel(round)} />
													<Typography variant="body2" sx={{ fontWeight: 600 }}>
														Avg temp {fmt(round.avg_temp)} °C · Avg RH {fmt(round.avg_rh)} %
													</Typography>
													{round.prepared_by ? (
														<Typography variant="caption" color="text.secondary">
															by {round.prepared_by}
														</Typography>
													) : null}
												</Box>
												<Tooltip title="Delete reading-set">
													<span>
														<IconButton
															size="small"
															color="error"
															disabled={deletingId === round.humidity_id}
															onClick={() => handleDelete(round.humidity_id)}
															sx={{ minWidth: 40, minHeight: 40 }}
														>
															<DeleteOutlineIcon size={16} />
														</IconButton>
													</span>
												</Tooltip>
											</Box>

											<TableContainer sx={{ overflowX: "auto" }}>
												<Table size="small" sx={{ minWidth: 420 }}>
													<TableHead>
														<TableRow>
															<TableCell sx={{ width: 40 }}>#</TableCell>
															<TableCell sx={{ minWidth: 130 }}>Spot</TableCell>
															<TableCell sx={{ minWidth: 90 }}>Time</TableCell>
															<TableCell align="right" sx={{ minWidth: 90 }}>
																Temp (°C)
															</TableCell>
															<TableCell align="right" sx={{ minWidth: 90 }}>
																RH %
															</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{round.spots.map((s, i) => (
															<TableRow key={`${round.humidity_id}-s-${i}`} hover>
																<TableCell>{i + 1}</TableCell>
																<TableCell>{s.spot_label ?? "—"}</TableCell>
																<TableCell>{s.reading_time ?? "—"}</TableCell>
																<TableCell align="right">{fmt(s.temp_c)}</TableCell>
																<TableCell align="right">{fmt(s.rh_pct)}</TableCell>
															</TableRow>
														))}
														<TableRow>
															<TableCell sx={{ fontWeight: 600 }} colSpan={3}>
																Avg
															</TableCell>
															<TableCell align="right" sx={{ fontWeight: 600 }}>
																{fmt(round.avg_temp)}
															</TableCell>
															<TableCell align="right" sx={{ fontWeight: 600 }}>
																{fmt(round.avg_rh)}
															</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</TableContainer>
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
							<Table size="small" sx={{ minWidth: 560 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Department</TableCell>
										<TableCell sx={{ minWidth: 100 }}>Round</TableCell>
										<TableCell align="right" sx={{ minWidth: 100 }}>
											Avg temp (°C)
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 100 }}>
											Avg RH %
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5}>
												<Typography variant="body2" color="text.secondary">
													No history yet.
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.map((h, idx) => (
											<TableRow
												key={h.humidity_id ?? `${h.report_date}-${h.dept_desc}-${h.round_no}-${idx}`}
												hover
											>
												<TableCell>{h.report_date ?? "—"}</TableCell>
												<TableCell>{h.dept_desc ?? "—"}</TableCell>
												<TableCell>
													{h.round_no != null
														? ROUND_LABELS[h.round_no] ?? `Round ${h.round_no}`
														: "—"}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg_temp)}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg_rh)}
												</TableCell>
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
