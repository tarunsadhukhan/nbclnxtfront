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
import {
	QUALITY_GROUPS,
	type PackingMrColumn,
	type PackingMrGroupSummary,
	type PackingMrHistoryRow,
	type PackingMrTableResponse,
	type QualityGroup,
} from "../types/packingMrTypes";

type Props = {
	coId: string;
	branchId: number;
	columns: PackingMrColumn[];
	groupSummaries: PackingMrGroupSummary[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function fmt(n: number | null | undefined, dp = 1): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-25 Packing MR% grid.
 *
 * Two views:
 *  1. By-date — quality columns grouped into HESSIAN / SACKING tables (each:
 *     quality, construction, 10 readings, avg_mr), with a footer per group
 *     showing the server-weighted group_avg_mr + column_count. Per-column delete
 *     POSTs {packing_mr_id, co_id} to delete_packing_mr.
 *  2. Paginated history (trend) — get_packing_mr_table, one row per save
 *     (date, group, quality, construction, avg_mr). Server values are
 *     authoritative.
 */
export default function PackingMrGrid({
	coId,
	branchId,
	columns,
	groupSummaries,
	loading,
	onDeleted,
	reloadKey,
}: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<PackingMrHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const url = `${apiRoutesPortalMasters.PACKING_MR_TABLE}?co_id=${coId}&branch_id=${branchId}&page=${page + 1}&limit=${rowsPerPage}`;
		void fetchWithCookie<PackingMrTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (packingMrId: number) => {
			if (!confirm(`Delete packing MR% column #${packingMrId}?`)) return;
			setDeletingId(packingMrId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.PACKING_MR_DELETE, "POST", {
				packing_mr_id: packingMrId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted packing MR% column #${packingMrId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	const columnsByGroup = React.useMemo(() => {
		const m = new Map<QualityGroup, PackingMrColumn[]>();
		for (const g of QUALITY_GROUPS) m.set(g, []);
		for (const c of columns) {
			const list = m.get(c.quality_group);
			if (list) list.push(c);
		}
		return m;
	}, [columns]);

	const summaryByGroup = React.useMemo(() => {
		const m = new Map<QualityGroup, PackingMrGroupSummary>();
		for (const s of groupSummaries) m.set(s.quality_group, s);
		return m;
	}, [groupSummaries]);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
					<CircularProgress size={28} />
				</Box>
			) : null}

			{/* ── By-date quality columns, grouped ── */}
			{QUALITY_GROUPS.map((group) => {
				const groupCols = columnsByGroup.get(group) ?? [];
				const summary = summaryByGroup.get(group);
					// Columns may carry different reading counts — size the table to the widest.
					const maxReadings = groupCols.reduce((m, c) => Math.max(m, c.readings?.length ?? 0), 0);
					const readingHeaders = Array.from({ length: maxReadings }, (_, i) => i);
				return (
					<Paper key={group} variant="outlined" sx={{ p: 2 }}>
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
								{group}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Average {group}: <strong>{fmt(summary?.group_avg_mr)}</strong>
								{summary?.column_count != null ? ` · ${summary.column_count} column(s)` : ""}
							</Typography>
						</Box>

						{groupCols.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No {group} quality columns for this date.
							</Typography>
						) : (
							<TableContainer sx={{ overflowX: "auto" }}>
								<Table size="small" sx={{ minWidth: 980 }}>
									<TableHead>
										<TableRow>
											<TableCell sx={{ minWidth: 160 }}>Quality</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Construction</TableCell>
											{readingHeaders.map((i) => (
												<TableCell key={`mr-h-${i}`} align="right" sx={{ minWidth: 56 }}>
													{i + 1}
												</TableCell>
											))}
											<TableCell align="right" sx={{ minWidth: 80 }}>
												Avg MR%
											</TableCell>
											<TableCell align="center" sx={{ width: 56 }} />
										</TableRow>
									</TableHead>
									<TableBody>
										{groupCols.map((c) => (
											<TableRow key={c.packing_mr_id} hover>
												<TableCell>
													{c.item_name ??
														c.quality_label ??
														(c.item_id != null ? `Item #${c.item_id}` : "—")}
												</TableCell>
												<TableCell>{c.construction_code ?? "—"}</TableCell>
												{readingHeaders.map((i) => (
													<TableCell key={`${c.packing_mr_id}-mr-${i}`} align="right">
														{fmt(c.readings?.[i])}
													</TableCell>
												))}
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(c.avg_mr)}
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Delete column">
														<span>
															<IconButton
																size="small"
																color="error"
																disabled={deletingId === c.packing_mr_id}
																onClick={() => handleDelete(c.packing_mr_id)}
																sx={{ minWidth: 40, minHeight: 40 }}
															>
																<DeleteOutlineIcon size={16} />
															</IconButton>
														</span>
													</Tooltip>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Paper>
				);
			})}

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
										<TableCell sx={{ minWidth: 100 }}>Group</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Quality</TableCell>
										<TableCell sx={{ minWidth: 130 }}>Construction</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
											Avg MR%
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
											<TableRow key={h.packing_mr_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.quality_group ?? "—"}</TableCell>
												<TableCell>{h.item_name ?? h.quality_label ?? "—"}</TableCell>
												<TableCell>{h.construction_code ?? "—"}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg_mr)}
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
