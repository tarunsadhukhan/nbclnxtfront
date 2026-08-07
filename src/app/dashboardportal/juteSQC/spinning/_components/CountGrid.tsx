"use client";

import * as React from "react";
import {
	Box,
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
	alpha,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcCountReadingRow, SqcCountAverageRow, YarnItemOption } from "../types/sqcSpinningTypes";

type Props = {
	coId: string;
	readings: SqcCountReadingRow[];
	averages: SqcCountAverageRow[];
	yarnItems: YarnItemOption[];
	loading: boolean;
	onDeleted: () => void;
};

// One computed summary line per yarn (joins averages with the standard count).
type SummaryRow = {
	item_id: number;
	quality: string;
	std: number | null;
	obs: number | null;
	corr: number | null;
	hylt: number | null; // (corr - std) / std, as a percentage
	heavyLight: "HEAVY" | "LIGHT" | "—";
	tol: number | null; // ±0.2 if std count < 16, else ±0.5 (LB/count units)
	outOfRange: boolean; // |corr - std| > tol → highlight red
};

// Range tolerance switches on the standard count: <16 → ±0.2, else ±0.5.
function rangeTolerance(std: number): number {
	return std < 16 ? 0.2 : 0.5;
}

// Server-side id of a reading (whichever id field the backend sends), or null if
// this row hasn't been persisted with one. Used for delete — never as a grid key.
function serverId(r: SqcCountReadingRow): number | null {
	return r.jute_sqc_spinning_count_id ?? r.sqc_spinning_count_id ?? r.id ?? null;
}

// Grid row = reading + a guaranteed-unique key. Two identical observations (same
// date/item/machine/spell/count) share every server-visible field, so the row's
// list index is the only collision-free key for DataGrid.
type GridRow = SqcCountReadingRow & { _gridId: string };

export default function CountGrid({ coId, readings, averages, yarnItems, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	// Standard count per yarn (averages don't carry it; it lives in the setup).
	const stdMap = React.useMemo(() => {
		const m = new Map<number, number | null>();
		for (const y of yarnItems) m.set(y.item_id, y.std_count ?? null);
		return m;
	}, [yarnItems]);

	const summaryRows = React.useMemo<SummaryRow[]>(
		() =>
			averages.map((a) => {
				const std = stdMap.get(a.item_id) ?? null;
				const obs = a.avg_count ?? null;
				const corr = a.avg_corrected ?? null;

				const canCompare = std != null && std !== 0 && corr != null;
				const hylt = canCompare ? ((corr - std) / std) * 100 : null;
				const tol = std != null ? rangeTolerance(std) : null;
				const outOfRange = canCompare && tol != null ? Math.abs(corr - std) > tol : false;
				const heavyLight: SummaryRow["heavyLight"] = canCompare
					? corr > std
						? "HEAVY"
						: corr < std
						? "LIGHT"
						: "—"
					: "—";

				return {
					item_id: a.item_id,
					quality: a.item_name ?? a.item_code ?? `Yarn #${a.item_id}`,
					std,
					obs,
					corr,
					hylt,
					heavyLight,
					tol,
					outOfRange,
				};
			}),
		[averages, stdMap]
	);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This reading cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete count reading #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPINNING_SQC_COUNT_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted count reading #${id}`);
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<GridRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete reading">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(serverId(params.row))}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "spell_code",
				headerName: "Spell",
				width: 120,
				valueGetter: (_value, row) =>
					row.spell_code ?? row.spell_name ?? (row.spell_id != null ? `Spell #${row.spell_id}` : "—"),
			},
			{
				field: "machine_name",
				headerName: "Machine",
				width: 170,
				valueGetter: (_value, row) =>
					row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "item_name",
				headerName: "Yarn",
				width: 180,
				valueGetter: (_value, row) =>
					row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`,
			},
			{
				field: "dp",
				headerName: "DP",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "tp",
				headerName: "TP",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "wt_450_gms",
				headerName: "WT/450 (gms)",
				width: 130,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : ""),
			},
			{
				field: "mr_pct",
				headerName: "MR %",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "observed_count",
				headerName: "Observed Count",
				width: 140,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "corrected_count",
				headerName: "Corrected Count",
				width: 140,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
		],
		[handleDelete]
	);

	// Index is the only collision-free key when two identical observations exist.
	const gridRows = React.useMemo<GridRow[]>(
		() => readings.map((r, i) => ({ ...r, _gridId: `${serverId(r) ?? "new"}-${i}` })),
		[readings]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-quality summary: avg observed/corrected count vs standard, with heavy/light + range check */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Average Count by Yarn
				</Typography>
				{summaryRows.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No readings yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>QUALITY</TableCell>
									<TableCell align="right">STD (LB)</TableCell>
									<TableCell align="right">OBS (LBS)</TableCell>
									<TableCell align="right">CORR (LBS)</TableCell>
									<TableCell align="right">HY / LT</TableCell>
									<TableCell align="center">HEAVY / LIGHT</TableCell>
									<TableCell align="center">RANGE&nbsp;(±)</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{summaryRows.map((r) => (
									<TableRow key={r.item_id}>
										<TableCell>{r.quality}</TableCell>
										<TableCell align="right">
											{r.std != null ? r.std.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.obs != null ? r.obs.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.corr != null ? r.corr.toFixed(2) : "—"}
										</TableCell>
										<TableCell
											align="right"
											sx={
												r.outOfRange
													? {
															color: "error.main",
															fontWeight: 700,
															bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
													  }
													: undefined
											}
										>
											{r.hylt != null ? `${r.hylt.toFixed(2)}%` : "—"}
										</TableCell>
										<TableCell align="center">{r.heavyLight}</TableCell>
										<TableCell align="center">
											{r.tol != null ? `±${r.tol}` : "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Readings grid */}
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={gridRows}
					getRowId={(row) => row._gridId}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ minWidth: 900 }}
				/>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
