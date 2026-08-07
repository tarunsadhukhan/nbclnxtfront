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
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpreaderSliverWtReadingRow } from "../types/sqcSpreaderTypes";

type Props = {
	coId: string;
	readings: SpreaderSliverWtReadingRow[];
	loading: boolean;
	onDeleted: () => void;
};

// One computed summary line per saved entry. Unlike R-08-04 there is NO machine
// standard sliver weight to compare against (source tab prints no std / band
// column), so the summary is just the persisted stats: Avg Obs / Avg Corr /
// Avg MR% / StDev / CV%.
type SummaryRow = {
	gridId: string;
	serverId: number;
	entry_date: string;
	quality: string;
	machine: string;
	category: string;
	avgObs: number | null;
	avgCorr: number | null;
	avgMr: number | null;
	stdev: number | null;
	cv: number | null; // ratio (render ×100)
};

// Grid row = a saved entry + a guaranteed-unique key. Two entries can share every
// server-visible label, so we pair the server id with the list index.
type GridRow = SpreaderSliverWtReadingRow & { _gridId: string };

function machineLabel(r: SpreaderSliverWtReadingRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function qualityLabel(r: SpreaderSliverWtReadingRow): string {
	return r.item_name ?? r.item_code ?? (r.item_id != null ? `Quality #${r.item_id}` : "—");
}

function spellLabel(r: SpreaderSliverWtReadingRow): string {
	return r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

function categoryLabel(r: SpreaderSliverWtReadingRow): string {
	return r.category && r.category.trim() !== "" ? r.category : "—";
}

/**
 * R-08-03 Spreader Sliver Weight summary + readings grid.
 *
 * Renders a per-entry summary table (Avg Obs / Avg Corr / Avg MR% / StDev / CV%)
 * and a DataGrid of saved entries with a delete action. There is no machine
 * standard sliver weight to compare against (deferred owner item), so no
 * heavy/light or out-of-range flag. Server values are authoritative; this is a
 * date-driven read of jute_sqc_spreader_sliver_wt.
 */
export default function SliverWtGrid({ coId, readings, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	const summaryRows = React.useMemo<SummaryRow[]>(
		() =>
			readings.map((r, i) => ({
				gridId: `${r.spreader_sliver_wt_id}-${i}`,
				serverId: r.spreader_sliver_wt_id,
				entry_date: r.entry_date,
				quality: qualityLabel(r),
				machine: machineLabel(r),
				category: categoryLabel(r),
				avgObs: r.calc_avg_obs ?? null,
				avgCorr: r.calc_avg_corr ?? null,
				avgMr: r.calc_avg_mr ?? null,
				stdev: r.calc_stdev ?? null,
				cv: r.calc_cv_pct ?? null,
			})),
		[readings]
	);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This entry cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete sliver-weight entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPREADER_SLIVER_WT_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted sliver-weight entry #${id}`);
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
					<Tooltip title="Delete entry">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.spreader_sliver_wt_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "entry_date", headerName: "Date", width: 120 },
			{
				field: "spell_code",
				headerName: "Spell",
				width: 120,
				valueGetter: (_value, row) => spellLabel(row),
			},
			{
				field: "machine_name",
				headerName: "Machine",
				width: 180,
				valueGetter: (_value, row) => machineLabel(row),
			},
			{
				field: "item_name",
				headerName: "Quality",
				width: 180,
				valueGetter: (_value, row) => qualityLabel(row),
			},
			{
				field: "category",
				headerName: "Category",
				width: 140,
				valueGetter: (_value, row) => categoryLabel(row),
			},
			{
				field: "std_mr_pct",
				headerName: "Std MR%",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_avg_obs",
				headerName: "Avg Obs",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_avg_corr",
				headerName: "Avg Corr",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_avg_mr",
				headerName: "Avg MR%",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_stdev",
				headerName: "StDev",
				width: 120,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(4) : ""),
			},
			{
				field: "calc_cv_pct",
				headerName: "CV %",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? `${(Number(value) * 100).toFixed(2)}%` : ""),
			},
		],
		[handleDelete]
	);

	const gridRows = React.useMemo<GridRow[]>(
		() => readings.map((r, i) => ({ ...r, _gridId: `${r.spreader_sliver_wt_id}-${i}` })),
		[readings]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-entry summary: persisted stats only (no std comparison) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Sliver Weight Summary by Entry
				</Typography>
				{summaryRows.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No entries yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>QUALITY</TableCell>
									<TableCell>MACHINE</TableCell>
									<TableCell>CATEGORY</TableCell>
									<TableCell align="right">AVG OBS</TableCell>
									<TableCell align="right">AVG CORR</TableCell>
									<TableCell align="right">AVG MR%</TableCell>
									<TableCell align="right">STDEV</TableCell>
									<TableCell align="right">CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{summaryRows.map((r) => (
									<TableRow key={r.gridId}>
										<TableCell>{r.quality}</TableCell>
										<TableCell>{r.machine}</TableCell>
										<TableCell>{r.category}</TableCell>
										<TableCell align="right">
											{r.avgObs != null ? r.avgObs.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.avgCorr != null ? r.avgCorr.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.avgMr != null ? r.avgMr.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.stdev != null ? r.stdev.toFixed(4) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.cv != null ? `${(r.cv * 100).toFixed(2)}%` : "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Saved entries grid */}
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
					sx={{ minWidth: 1100 }}
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
