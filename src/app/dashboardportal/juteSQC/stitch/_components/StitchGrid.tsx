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
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	STITCH_READINGS,
	type StitchHistoryRow,
	type StitchRow,
	type StitchTableResponse,
} from "../types/stitchTypes";
import { flagChipColor } from "../utils/stitchCalc";

type Props = {
	coId: string;
	branchId: number;
	rows: StitchRow[];
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function machineLabel(r: { machine_name?: string | null; mech_code?: string | null; mc_id?: number | null }): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-22 Stitch grid.
 *
 * Two views:
 *  1. By-date detail — one row per saved reading-set for the selected date,
 *     showing the 5 stitch counts plus server avg, OK/LOW/HIGH flag chip and
 *     inspector. Per-row delete POSTs {stitch_id, co_id} to delete_stitch.
 *  2. Paginated history (trend view) — get_stitch_table, one row per save
 *     (date, machine, std, avg, flag, inspector), with a search box. Server
 *     values are authoritative.
 */
export default function StitchGrid({ coId, branchId, rows, loading, onDeleted, reloadKey }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	// ─── Paginated history (trend view) ──────────────────────────────────────
	const [history, setHistory] = React.useState<StitchHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);
	const [search, setSearch] = React.useState("");
	// Debounced search term actually sent to the server.
	const [searchQuery, setSearchQuery] = React.useState("");
	React.useEffect(() => {
		const t = setTimeout(() => {
			setSearchQuery(search.trim());
			setPage(0);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistoryLoading(true);
		const params = new URLSearchParams({
			co_id: String(coId),
			branch_id: String(branchId),
			page: String(page + 1),
			limit: String(rowsPerPage),
		});
		if (searchQuery) params.set("search", searchQuery);
		const url = `${apiRoutesPortalMasters.STITCH_TABLE}?${params.toString()}`;
		void fetchWithCookie<StitchTableResponse>(url, "GET").then(({ data, error }) => {
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
	}, [coId, branchId, page, rowsPerPage, searchQuery, reloadKey]);

	const handleDelete = React.useCallback(
		async (stitchId: number) => {
			if (!confirm(`Delete stitch row #${stitchId}?`)) return;
			setDeletingId(stitchId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.STITCH_DELETE, "POST", {
				stitch_id: stitchId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted stitch row #${stitchId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	const readingHeaders = Array.from({ length: STITCH_READINGS }, (_, i) => i);

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
						No stitch reading-sets for this date.
					</Typography>
				) : (
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 800 }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ minWidth: 160 }}>Machine</TableCell>
									{readingHeaders.map((i) => (
										<TableCell key={`st-h-${i}`} align="right" sx={{ minWidth: 60 }}>
											#{i + 1}
										</TableCell>
									))}
									<TableCell align="right" sx={{ minWidth: 70 }}>
										Std
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 80 }}>
										Avg
									</TableCell>
									<TableCell align="center" sx={{ minWidth: 80 }}>
										Flag
									</TableCell>
									<TableCell sx={{ minWidth: 130 }}>Inspector</TableCell>
									<TableCell align="center" sx={{ width: 56 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((r) => (
									<TableRow key={r.stitch_id} hover>
										<TableCell>{machineLabel(r)}</TableCell>
										{readingHeaders.map((i) => (
											<TableCell key={`${r.stitch_id}-st-${i}`} align="right">
												{fmt(r.readings?.[i])}
											</TableCell>
										))}
										<TableCell align="right">{fmt(r.std_stitch)}</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600 }}>
											{fmt(r.avg)}
										</TableCell>
										<TableCell align="center">
											{r.flag ? (
												<Chip size="small" label={r.flag} color={flagChipColor(r.flag)} />
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>{r.inspector_name ?? "—"}</TableCell>
										<TableCell align="center">
											<Tooltip title="Delete row">
												<span>
													<IconButton
														size="small"
														color="error"
														disabled={deletingId === r.stitch_id}
														onClick={() => handleDelete(r.stitch_id)}
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

			{/* ── Paginated history (trend) ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: 1,
						mb: 1,
					}}
				>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						History (trend)
					</Typography>
					<TextField
						size="small"
						label="Search"
						placeholder="Machine, inspector…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						sx={{ minWidth: 220 }}
					/>
				</Box>

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
										<TableCell sx={{ minWidth: 160 }}>Machine</TableCell>
										<TableCell align="right" sx={{ minWidth: 70 }}>
											Std
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 80 }}>
											Avg
										</TableCell>
										<TableCell align="center" sx={{ minWidth: 80 }}>
											Flag
										</TableCell>
										<TableCell sx={{ minWidth: 130 }}>Inspector</TableCell>
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
											<TableRow key={h.stitch_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{machineLabel(h)}</TableCell>
												<TableCell align="right">{fmt(h.std_stitch)}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(h.avg)}
												</TableCell>
												<TableCell align="center">
													{h.flag ? (
														<Chip size="small" label={h.flag} color={flagChipColor(h.flag)} />
													) : (
														"—"
													)}
												</TableCell>
												<TableCell>{h.inspector_name ?? "—"}</TableCell>
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
