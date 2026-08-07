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
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	FAULT_TYPES,
	type FabricFaultByDateResponse,
	type FabricFaultHistoryRow,
	type FabricFaultPiece,
	type FabricFaultTableResponse,
} from "../types/fabricFaultTypes";

type Props = {
	coId: string;
	branchId: number;
	byDate: FabricFaultByDateResponse;
	loading: boolean;
	onDeleted: () => void;
	// Bumped by the page whenever a save/delete happens so the history table reloads.
	reloadKey: number;
};

function pieceLabel(p: FabricFaultPiece): string {
	const loom = p.loom_name ? `${p.loom_name}${p.mech_code ? ` (${p.mech_code})` : ""}` : null;
	const quality = p.item_name ?? null;
	return loom ?? quality ?? `Piece #${p.fabric_fault_id}`;
}

function fmt(n: number | null | undefined, dp = 4): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-28 Fabric Fault grid.
 *
 * Two views:
 *  1. Day fault MATRIX — one row per fault type (15) and one column per inspected
 *     piece (loom/quality), cells = counts, plus a TOTAL column (fault_total) and a
 *     SCORE column (fault_score, 4dp), a final grand row (grand_total / grand_score)
 *     and pieces_inspected. Per-piece (column) delete POSTs {fabric_fault_id, co_id}.
 *     Server values are authoritative.
 *  2. Paginated history — get_fabric_fault_table, one row per save
 *     (date, quality, loom, spell, piece_total), with a search box.
 */
export default function FabricFaultGrid({ coId, branchId, byDate, loading, onDeleted, reloadKey }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	const faultLabels = byDate.fault_types?.length === FAULT_TYPES.length ? byDate.fault_types : FAULT_TYPES;
	const pieces = byDate.pieces ?? [];

	// ─── Paginated history ───────────────────────────────────────────────────
	const [history, setHistory] = React.useState<FabricFaultHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for MUI; server is 1-based
	const [rowsPerPage, setRowsPerPage] = React.useState(10);
	const [historyLoading, setHistoryLoading] = React.useState(false);
	const [search, setSearch] = React.useState("");
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
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_TABLE}?${params.toString()}`;
		void fetchWithCookie<FabricFaultTableResponse>(url, "GET").then(({ data, error }) => {
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
		async (faultId: number) => {
			if (!confirm(`Delete inspected piece #${faultId}?`)) return;
			setDeletingId(faultId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.FABRIC_FAULT_DELETE, "POST", {
				fabric_fault_id: faultId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted piece #${faultId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{/* ── Day fault matrix ── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Day fault matrix
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Pieces inspected (N): <strong>{byDate.pieces_inspected ?? pieces.length}</strong>
					</Typography>
				</Box>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
						<CircularProgress size={28} />
					</Box>
				) : pieces.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No inspected pieces for this date.
					</Typography>
				) : (
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 720 }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ minWidth: 200, position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>
										Fault type
									</TableCell>
									{pieces.map((p) => (
										<TableCell key={`col-${p.fabric_fault_id}`} align="right" sx={{ minWidth: 90 }}>
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
												<span>{pieceLabel(p)}</span>
												<Tooltip title="Delete this piece (column)">
													<span>
														<IconButton
															size="small"
															color="error"
															disabled={deletingId === p.fabric_fault_id}
															onClick={() => handleDelete(p.fabric_fault_id)}
															sx={{ minWidth: 32, minHeight: 32 }}
														>
															<DeleteOutlineIcon size={14} />
														</IconButton>
													</span>
												</Tooltip>
											</Box>
										</TableCell>
									))}
									<TableCell align="right" sx={{ minWidth: 80, fontWeight: 600 }}>
										Total
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 90, fontWeight: 600 }}>
										Score
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{faultLabels.map((name, i) => (
									<TableRow key={`fault-row-${i}`} hover>
										<TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>
											{name}
										</TableCell>
										{pieces.map((p) => (
											<TableCell key={`${p.fabric_fault_id}-f-${i}`} align="right">
												{p.fault_counts?.[i] ?? 0}
											</TableCell>
										))}
										<TableCell align="right" sx={{ fontWeight: 600 }}>
											{byDate.fault_totals?.[i] ?? 0}
										</TableCell>
										<TableCell align="right">{fmt(byDate.fault_scores?.[i])}</TableCell>
									</TableRow>
								))}
								{/* Grand row */}
								<TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" } }}>
									<TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>
										Grand total
									</TableCell>
									{pieces.map((p) => (
										<TableCell key={`${p.fabric_fault_id}-pt`} align="right">
											{p.piece_total ?? "—"}
										</TableCell>
									))}
									<TableCell align="right">{byDate.grand_total ?? 0}</TableCell>
									<TableCell align="right">{fmt(byDate.grand_score)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* ── Paginated history ── */}
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
						History
					</Typography>
					<TextField
						size="small"
						label="Search"
						placeholder="Quality, loom, spell…"
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
							<Table size="small" sx={{ minWidth: 640 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 110 }}>Date</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Quality</TableCell>
										<TableCell sx={{ minWidth: 140 }}>Loom</TableCell>
										<TableCell sx={{ minWidth: 80 }}>Spell</TableCell>
										<TableCell align="right" sx={{ minWidth: 90 }}>
											Piece total
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
											<TableRow key={h.fabric_fault_id ?? `${h.entry_date}-${idx}`} hover>
												<TableCell>{h.entry_date ?? "—"}</TableCell>
												<TableCell>{h.item_name ?? "—"}</TableCell>
												<TableCell>{h.loom_name ?? "—"}</TableCell>
												<TableCell>{h.spell_code ?? "—"}</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{h.piece_total ?? "—"}
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
