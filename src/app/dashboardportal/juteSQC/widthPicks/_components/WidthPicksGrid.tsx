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
import type {
	WidthPicksBlock,
	WidthPicksTableResponse,
	WidthPicksTableRow,
} from "../types/widthPicksTypes";

type Props = {
	coId: string;
	branchId: number;
	blocks: WidthPicksBlock[];
	loading: boolean;
	onDeleted: () => void;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-21 Width & Picks by-date summary grid + paginated history.
 *
 * One Paper per saved (date, quality) block: the loom reading rows (loom,
 * width_cm, picks_dm), then the WIDTH summary (avg, tol_low, tol_high, remark)
 * and the PICKS summary (avg, stdev, max, min, count). Block delete POSTs
 * {width_picks_id, co_id} to delete_width_picks. Server values are authoritative.
 * Below the blocks, a co-scoped paginated history via get_width_picks_table.
 */
export default function WidthPicksGrid({ coId, branchId, blocks, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	const handleDelete = React.useCallback(
		async (widthPicksId: number) => {
			if (!confirm(`Delete width & picks group #${widthPicksId}?`)) return;
			setDeletingId(widthPicksId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.WIDTH_PICKS_DELETE, "POST", {
				width_picks_id: widthPicksId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted group #${widthPicksId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	// History is a co-scoped sibling of the by-date blocks; it must re-fetch when
	// a save/delete changes the data. `blocks` is the existing signal that the
	// parent refreshes on every save and delete, so its length doubles as the
	// reload trigger (no extra plumbing). ponytail: reuse blocks, not a new counter.
	const reloadKey = blocks.length;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
					<CircularProgress size={28} />
				</Box>
			) : null}

			{!loading && blocks.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					No width &amp; picks groups for this date.
				</Typography>
			) : null}

			{blocks.map((block) => {
				const qualityLabel =
					block.item_name ?? (block.item_id != null ? `Item #${block.item_id}` : "—");
				const ws = block.width_summary ?? null;
				const ps = block.picks_summary ?? null;
				return (
					<Paper key={block.width_picks_id} variant="outlined" sx={{ p: 2 }}>
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "baseline",
								flexWrap: "wrap",
								mb: 1,
							}}
						>
							<Box>
								<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
									{qualityLabel}
									{block.item_code ? ` (${block.item_code})` : ""}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Std width {fmt(block.std_width_cm)} · Std picks {fmt(block.std_picks, 0)}
									{block.inspector_name ? ` · Inspector: ${block.inspector_name}` : ""}
								</Typography>
							</Box>
							<Tooltip title="Delete group">
								<span>
									<IconButton
										size="small"
										color="error"
										disabled={deletingId === block.width_picks_id}
										onClick={() => handleDelete(block.width_picks_id)}
										sx={{ minWidth: 40, minHeight: 40 }}
									>
										<DeleteOutlineIcon size={16} />
									</IconButton>
								</span>
							</Tooltip>
						</Box>

						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 520 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ width: 40 }}>#</TableCell>
										<TableCell sx={{ minWidth: 200 }}>Loom</TableCell>
										<TableCell align="right" sx={{ minWidth: 110 }}>
											Width (cm)
										</TableCell>
										<TableCell align="right" sx={{ minWidth: 110 }}>
											Picks/dm
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{block.rows.map((r, i) => (
										<TableRow key={`${block.width_picks_id}-row-${i}`} hover>
											<TableCell>{i + 1}</TableCell>
											<TableCell>
												{r.loom_name ?? (r.loom_id != null ? `Loom #${r.loom_id}` : "—")}
												{r.mech_code ? ` (${r.mech_code})` : ""}
											</TableCell>
											<TableCell align="right">{fmt(r.width_cm)}</TableCell>
											<TableCell align="right">
												{r.picks_dm != null && Number.isFinite(Number(r.picks_dm))
													? fmt(r.picks_dm, 0)
													: "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>

						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
								gap: 2,
								mt: 2,
							}}
						>
							<Paper variant="outlined" sx={{ p: 1.5 }}>
								<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
									Width summary
								</Typography>
								<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
									<Typography variant="body2">
										Avg: <strong>{fmt(ws?.avg_width)}</strong>
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Tol: {fmt(ws?.tol_low)} – {fmt(ws?.tol_high)}
									</Typography>
									{ws?.remark === "$" ? (
										<Chip size="small" color="error" label="$ out of ±0.5%" />
									) : (
										<Chip size="small" color="success" label="within ±0.5%" />
									)}
								</Box>
							</Paper>
							<Paper variant="outlined" sx={{ p: 1.5 }}>
								<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
									Picks summary
								</Typography>
								<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
									<Typography variant="body2">
										Avg: <strong>{fmt(ps?.avg_picks)}</strong>
									</Typography>
									<Typography variant="body2">Stdev: {fmt(ps?.stdev, 4)}</Typography>
									<Typography variant="body2">Max: {fmt(ps?.max_picks, 0)}</Typography>
									<Typography variant="body2">Min: {fmt(ps?.min_picks, 0)}</Typography>
									<Typography variant="body2" color="text.secondary">
										n={ps?.pick_count ?? 0}
									</Typography>
								</Box>
							</Paper>
						</Box>
					</Paper>
				);
			})}

			<WidthPicksHistory coId={coId} branchId={branchId} reloadKey={reloadKey} />

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}

// Co-scoped paginated history via get_width_picks_table. Kept inline (single
// caller) — no separate hook needed.
function WidthPicksHistory({
	coId,
	branchId,
	reloadKey,
}: {
	coId: string;
	branchId: number;
	reloadKey: number;
}) {
	const [rows, setRows] = React.useState<WidthPicksTableRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [page, setPage] = React.useState(0); // 0-based for TablePagination
	const [limit, setLimit] = React.useState(10);
	const [search, setSearch] = React.useState("");
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;
		setLoading(true);
		const params = new URLSearchParams({
			co_id: String(coId),
			branch_id: String(branchId),
			page: String(page + 1), // backend is 1-based
			limit: String(limit),
		});
		if (search.trim()) params.set("search", search.trim());
		const url = `${apiRoutesPortalMasters.WIDTH_PICKS_TABLE}?${params.toString()}`;
		void fetchWithCookie<WidthPicksTableResponse>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setRows([]);
				setTotal(0);
			} else {
				setRows(data.data ?? []);
				setTotal(Number(data.total ?? 0));
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, page, limit, search, reloadKey]);

	return (
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
					value={search}
					onChange={(e) => {
						setPage(0);
						setSearch(e.target.value);
					}}
					sx={{ minWidth: 220 }}
				/>
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 640 }}>
					<TableHead>
						<TableRow>
							<TableCell>Date</TableCell>
							<TableCell>Cloth quality</TableCell>
							<TableCell align="right">Std width (cm)</TableCell>
							<TableCell align="right">Std picks</TableCell>
							<TableCell>Inspector</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={5} align="center">
									<CircularProgress size={22} />
								</TableCell>
							</TableRow>
						) : rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5}>
									<Typography variant="body2" color="text.secondary">
										No history.
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							rows.map((r) => (
								<TableRow key={r.width_picks_id} hover>
									<TableCell>{r.entry_date ?? "—"}</TableCell>
									<TableCell>
										{r.item_name ?? (r.item_id != null ? `Item #${r.item_id}` : "—")}
										{r.item_code ? ` (${r.item_code})` : ""}
									</TableCell>
									<TableCell align="right">{fmt(r.std_width_cm)}</TableCell>
									<TableCell align="right">{fmt(r.std_picks, 0)}</TableCell>
									<TableCell>{r.inspector_name ?? "—"}</TableCell>
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
				rowsPerPage={limit}
				onRowsPerPageChange={(e) => {
					setLimit(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50]}
			/>
		</Paper>
	);
}
