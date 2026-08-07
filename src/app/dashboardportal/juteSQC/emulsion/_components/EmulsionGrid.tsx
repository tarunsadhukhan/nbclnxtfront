"use client";

import * as React from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Collapse,
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
import { ChevronDown, ChevronRight, Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { statusChipColor } from "../utils/emulsionCalc";
import {
	ADDITIVE_FIELDS,
	ADDITIVE_LABELS,
	type EmulsionHistoryRow,
	type EmulsionRow,
	type EmulsionTableResponse,
} from "../types/emulsionTypes";

type Props = {
	coId: string;
	branchId: number;
	rows: EmulsionRow[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page on save/delete so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

function StatusChip({ status }: { status: EmulsionRow["oil_pct_status"] }) {
	if (!status) return <>—</>;
	return <Chip size="small" label={String(status)} color={statusChipColor(status)} />;
}

/**
 * R-08-02 Emulsion grid.
 *
 * Two views:
 *  1. By-date detail — get_emulsion_by_date: one row per saved date's record
 *     (machine, oil used, tank, MEASURED oil %, server theoretical oil %, the std
 *     band, the status chip), each expandable to show the additive columns. Row
 *     delete POSTs {emulsion_id, co_id} to delete_emulsion.
 *  2. Paginated history (trend) — get_emulsion_table, one row per save (date,
 *     machine, oil used, tank, measured oil %, status chip). Server values are
 *     authoritative.
 */
export default function EmulsionGrid({ coId, branchId, rows, loading, onDeleted, reloadKey }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);
	const [expanded, setExpanded] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<EmulsionHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.EMULSION_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<EmulsionTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (emulsionId: number) => {
			if (!confirm(`Delete emulsion record #${emulsionId}?`)) return;
			setDeletingId(emulsionId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.EMULSION_DELETE, "POST", {
				emulsion_id: emulsionId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted emulsion record #${emulsionId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{/* ── By-date detail ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Records for this date
				</Typography>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : rows.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No emulsion records for this date.
					</Typography>
				) : (
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 860 }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ width: 40 }} />
									<TableCell sx={{ minWidth: 140 }}>Machine</TableCell>
									<TableCell align="right" sx={{ minWidth: 90 }}>
										Oil used
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 90 }}>
										Tank
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 110 }}>
										Oil % (meas.)
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 110 }}>
										Theoretical %
									</TableCell>
									<TableCell align="center" sx={{ minWidth: 100 }}>
										Band
									</TableCell>
									<TableCell align="center" sx={{ minWidth: 90 }}>
										Status
									</TableCell>
									<TableCell align="center" sx={{ width: 56 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((r) => {
									const open = expanded === r.emulsion_id;
									return (
										<React.Fragment key={r.emulsion_id}>
											<TableRow hover>
												<TableCell>
													<IconButton
														size="small"
														onClick={() => setExpanded(open ? null : r.emulsion_id)}
														aria-label={open ? "Collapse additives" : "Expand additives"}
													>
														{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
													</IconButton>
												</TableCell>
												<TableCell>{r.machine_name ?? "—"}</TableCell>
												<TableCell align="right">{fmt(r.oil_used_ltr)}</TableCell>
												<TableCell align="right">{fmt(r.tank_capacity_ltr)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(r.oil_pct_in_emulsion)}
												</TableCell>
												<TableCell align="right">{fmt(r.theoretical_oil_pct)}</TableCell>
												<TableCell align="center">
													{fmt(r.std_oil_pct_low)}–{fmt(r.std_oil_pct_high)}
												</TableCell>
												<TableCell align="center">
													<StatusChip status={r.oil_pct_status} />
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Delete record">
														<span>
															<IconButton
																size="small"
																color="error"
																disabled={deletingId === r.emulsion_id}
																onClick={() => handleDelete(r.emulsion_id)}
																sx={{ minWidth: 40, minHeight: 40 }}
															>
																<DeleteOutlineIcon size={16} />
															</IconButton>
														</span>
													</Tooltip>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell colSpan={9} sx={{ py: 0, border: 0 }}>
													<Collapse in={open} timeout="auto" unmountOnExit>
														<Box sx={{ py: 1.5 }}>
															<Typography
																variant="caption"
																color="text.secondary"
																sx={{ display: "block", mb: 1 }}
															>
																Additives & recipe
															</Typography>
															<Box
																sx={{
																	display: "grid",
																	gridTemplateColumns: {
																		xs: "repeat(2, 1fr)",
																		sm: "repeat(3, 1fr)",
																		md: "repeat(4, 1fr)",
																	},
																	gap: 1,
																}}
															>
																{ADDITIVE_FIELDS.map((f) => (
																	<Detail key={f} label={ADDITIVE_LABELS[f]} value={fmt(r[f])} />
																))}
																<Detail
																	label="Spreader rolls made"
																	value={
																		r.spreader_rolls_made != null
																			? String(r.spreader_rolls_made)
																			: "—"
																	}
																/>
																<Detail label="Others" value={r.others || "—"} />
																<Detail label="Prepared by" value={r.prepared_by || "—"} />
															</Box>
														</Box>
													</Collapse>
												</TableCell>
											</TableRow>
										</React.Fragment>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
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
							<Table size="small" sx={{ minWidth: 720 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 140 }}>Machine</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Oil used
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Tank
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 110 }}>
											Oil % (meas.)
										</TableCell>
										<TableCell align="center" sx={{ minWidth: 90 }}>
											Status
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6}>
												<Typography variant="body2" color="text.secondary">
													No history yet.
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.map((h, idx) => (
											<TableRow key={h.emulsion_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.machine_name ?? "—"}</TableCell>
												<TableCell align="right">{fmt(h.oil_used_ltr)}</TableCell>
												<TableCell align="right">{fmt(h.tank_capacity_ltr)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.oil_pct_in_emulsion)}
												</TableCell>
												<TableCell align="center">
													<StatusChip status={h.oil_pct_status} />
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

function Detail({ label, value }: { label: string; value: string }) {
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
