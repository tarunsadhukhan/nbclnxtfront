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
import type { SqcMachine, SpreaderRollWtReadingRow } from "../types/sqcSpreaderTypes";

type Props = {
	coId: string;
	readings: SpreaderRollWtReadingRow[];
	machines: SqcMachine[];
	loading: boolean;
	onDeleted: () => void;
};

// One computed summary line per saved entry: avg corrected roll weight vs the
// machine standard roll weight (wt_per_roll), with heavy/light + out-of-range.
type SummaryRow = {
	gridId: string;
	serverId: number;
	entry_date: string;
	quality: string;
	machine: string;
	std: number | null; // machine std roll weight (wt_per_roll)
	avgObs: number | null;
	avgCorr: number | null;
	cv: number | null;
	heavyLight: "HEAVY" | "LIGHT" | "—";
	hylt: number | null; // (corr - std) / std, as a percentage
	outOfRange: boolean; // |corr - std| / std > 5% → highlight
};

// A saved entry is out-of-range when the corrected average deviates from the
// machine standard roll weight by more than this fraction (advisory display).
const RANGE_TOLERANCE_PCT = 5;

// Grid row = a saved entry + a guaranteed-unique key. Two entries can share every
// server-visible label, so we pair the server id with the list index.
type GridRow = SpreaderRollWtReadingRow & { _gridId: string };

function machineLabel(r: SpreaderRollWtReadingRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function qualityLabel(r: SpreaderRollWtReadingRow): string {
	return r.item_name ?? r.item_code ?? (r.item_id != null ? `Quality #${r.item_id}` : "—");
}

function spellLabel(r: SpreaderRollWtReadingRow): string {
	return r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

/**
 * R-08-04 Spreader Roll Weight summary + readings grid.
 *
 * Renders a per-entry summary table (avg corrected weight vs machine standard,
 * heavy/light + out-of-range flag via theme tokens) and a DataGrid of saved
 * entries with a delete action. Server values are authoritative; this is a
 * date-driven read of jute_sqc_spreader_roll_wt.
 */
export default function RollWtGrid({ coId, readings, machines, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	// Machine standard roll weight (wt_per_roll) keyed by machine_id.
	const stdMap = React.useMemo(() => {
		const m = new Map<number, number | null>();
		for (const mc of machines) m.set(mc.machine_id, mc.wt_per_roll ?? null);
		return m;
	}, [machines]);

	const summaryRows = React.useMemo<SummaryRow[]>(
		() =>
			readings.map((r, i) => {
				const mcId = r.machine_id ?? r.mc_id ?? null;
				const std = mcId != null ? stdMap.get(mcId) ?? null : null;
				const avgObs = r.calc_avg_obs ?? null;
				const avgCorr = r.calc_avg_corr ?? null;
				const cv = r.calc_cv_pct ?? null;

				const canCompare = std != null && std !== 0 && avgCorr != null;
				const hylt = canCompare ? ((avgCorr - std) / std) * 100 : null;
				const outOfRange = canCompare && hylt != null ? Math.abs(hylt) > RANGE_TOLERANCE_PCT : false;
				const heavyLight: SummaryRow["heavyLight"] = canCompare
					? avgCorr > std
						? "HEAVY"
						: avgCorr < std
						? "LIGHT"
						: "—"
					: "—";

				return {
					gridId: `${r.spreader_roll_wt_id}-${i}`,
					serverId: r.spreader_roll_wt_id,
					entry_date: r.entry_date,
					quality: qualityLabel(r),
					machine: machineLabel(r),
					std,
					avgObs,
					avgCorr,
					cv,
					heavyLight,
					hylt,
					outOfRange,
				};
			}),
		[readings, stdMap]
	);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This entry cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete roll-weight entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPREADER_SQC_ROLL_WT_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted roll-weight entry #${id}`);
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
							onClick={() => handleDelete(params.row.spreader_roll_wt_id)}
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
				field: "feeder_name",
				headerName: "Feeder",
				width: 140,
				valueGetter: (_value, row) => row.feeder_name ?? "—",
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
				field: "calc_avg_mr_pct",
				headerName: "Avg MR%",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_stdev_corr",
				headerName: "Stdev Corr",
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
		() => readings.map((r, i) => ({ ...r, _gridId: `${r.spreader_roll_wt_id}-${i}` })),
		[readings]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-entry summary: avg corrected vs machine standard roll weight */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Roll Weight Summary by Entry
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
									<TableCell align="right">STD</TableCell>
									<TableCell align="right">AVG OBS</TableCell>
									<TableCell align="right">AVG CORR</TableCell>
									<TableCell align="right">HY / LT</TableCell>
									<TableCell align="center">HEAVY / LIGHT</TableCell>
									<TableCell align="right">CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{summaryRows.map((r) => (
									<TableRow key={r.gridId}>
										<TableCell>{r.quality}</TableCell>
										<TableCell>{r.machine}</TableCell>
										<TableCell align="right">{r.std != null ? r.std.toFixed(2) : "—"}</TableCell>
										<TableCell align="right">
											{r.avgObs != null ? r.avgObs.toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{r.avgCorr != null ? r.avgCorr.toFixed(2) : "—"}
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
										<TableCell
											align="center"
											sx={
												r.heavyLight === "HEAVY"
													? { color: "error.main", fontWeight: 600 }
													: r.heavyLight === "LIGHT"
													? { color: "warning.main", fontWeight: 600 }
													: undefined
											}
										>
											{r.heavyLight}
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
