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
import type {
	FinDrawSection,
	FinDrawGrandAverage,
	FinDrawReadingRow,
	SectionAverage,
} from "../types/finDrawTypes";

type Props = {
	coId: string;
	rows: FinDrawReadingRow[];
	sectionAverages: SectionAverage[];
	grandAverages: FinDrawGrandAverage[];
	loading: boolean;
	onDeleted: () => void;
};

// Grid row = a saved reading set + a guaranteed-unique synthetic key. Two rows
// can share every server-visible label, so we pair the server id with the index.
type GridRow = FinDrawReadingRow & { _gridId: string };

// Human-friendly labels for the three finisher-drawing sub-sections.
const SECTION_LABEL: Record<FinDrawSection, string> = {
	HESS: "Hessian",
	SWP: "Sacking Warp (SWP)",
	SWT: "Sacking Warp/Twine (SWT)",
};
// Fixed display order so both the grid sort and the averages table are stable.
const SECTION_ORDER: FinDrawSection[] = ["HESS", "SWP", "SWT"];
const sectionLabel = (s: FinDrawSection | null | undefined): string =>
	s ? SECTION_LABEL[s] ?? s : "—";
const sectionRank = (s: FinDrawSection | null | undefined): number => {
	const i = s ? SECTION_ORDER.indexOf(s) : -1;
	return i === -1 ? SECTION_ORDER.length : i;
};

function machineLabel(r: FinDrawReadingRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function batchLabel(r: FinDrawReadingRow | FinDrawGrandAverage): string {
	return r.batch_plan_name ?? (r.batch_plan_id != null ? `Batch #${r.batch_plan_id}` : "—");
}

function spellLabel(r: FinDrawReadingRow): string {
	return r.spell_code ?? r.spell_name ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

// The 4 per-cut DLV numbers joined for display; blanks render as a dash.
function dlvLabel(r: FinDrawReadingRow): string {
	const dlv = Array.isArray(r.dlv_nos) ? r.dlv_nos : [];
	if (dlv.length === 0) return "—";
	return dlv.map((d) => (d == null ? "—" : String(d))).join(", ");
}

/**
 * R-08-12/13/14 Finisher Drawing summary + readings grid.
 *
 * Renders the per-section AVERAGE block and the per-batch GRAND-AVERAGE block
 * (both recomputed server-side at read, CV% tinted by the band) above a DataGrid
 * of saved reading rows — grouped/sorted by section — with a DLV column and a
 * per-row delete action. Server values are authoritative; this is a date-driven
 * read of jute_sqc_fin_draw_sliver_wt.
 */
export default function FinDrawGrid({
	coId,
	rows,
	sectionAverages,
	grandAverages,
	loading,
	onDeleted,
}: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This row cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete fin-draw row #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted fin-draw row #${id}`);
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
					<Tooltip title="Delete row">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.fin_draw_sliver_wt_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "entry_date", headerName: "Date", width: 120 },
			{
				field: "section",
				headerName: "Section",
				width: 150,
				valueGetter: (_value, row) => sectionLabel(row.section),
			},
			{
				field: "machine_name",
				headerName: "Machine",
				width: 170,
				valueGetter: (_value, row) => machineLabel(row),
			},
			{
				field: "spell_code",
				headerName: "Spell",
				width: 110,
				valueGetter: (_value, row) => spellLabel(row),
			},
			{
				field: "batch_plan_name",
				headerName: "Batch",
				width: 170,
				valueGetter: (_value, row) => batchLabel(row),
			},
			{
				field: "dlv_nos",
				headerName: "DLV Nos",
				width: 140,
				sortable: false,
				valueGetter: (_value, row) => dlvLabel(row),
			},
			{
				field: "std_mr_pct",
				headerName: "Std MR%",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_wt",
				headerName: "Obs Wt",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_mr_pct",
				headerName: "MR%",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_corr_wt",
				headerName: "Corr Wt",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "calc_sdev",
				headerName: "StDev",
				width: 100,
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
			{
				field: "cv_within_band",
				headerName: "Band",
				width: 90,
				valueGetter: (_value, row) =>
					row.cv_within_band == null ? "—" : row.cv_within_band ? "PASS" : "FAIL",
			},
		],
		[handleDelete]
	);

	// Group/sort by section (fixed order), then by batch, for a clean grouped read.
	const gridRows = React.useMemo<GridRow[]>(() => {
		const sorted = [...rows].sort((a, b) => {
			const sr = sectionRank(a.section) - sectionRank(b.section);
			if (sr !== 0) return sr;
			return batchLabel(a).localeCompare(batchLabel(b));
		});
		return sorted.map((r, i) => ({ ...r, _gridId: `${r.fin_draw_sliver_wt_id}-${i}` }));
	}, [rows]);

	// Section-average rows in fixed display order (sections the server didn't return drop out).
	const orderedSectionAverages = React.useMemo<SectionAverage[]>(
		() => [...sectionAverages].sort((a, b) => sectionRank(a.section) - sectionRank(b.section)),
		[sectionAverages]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-section average block (recomputed server-side at read) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Average by Section
				</Typography>
				{orderedSectionAverages.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No section-average rows yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>SECTION</TableCell>
									<TableCell align="right">ROWS</TableCell>
									<TableCell align="right">OBS</TableCell>
									<TableCell align="right">MR%</TableCell>
									<TableCell align="right">CORR</TableCell>
									<TableCell align="right">StDev</TableCell>
									<TableCell align="right">CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{orderedSectionAverages.map((s) => (
									<TableRow key={s.section}>
										<TableCell>{sectionLabel(s.section)}</TableCell>
										<TableCell align="right">{s.row_count ?? "—"}</TableCell>
										<TableCell align="right">
											{s.avg_obs != null ? Number(s.avg_obs).toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{s.avg_mr_pct != null ? Number(s.avg_mr_pct).toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{s.avg_corr_wt != null ? Number(s.avg_corr_wt).toFixed(2) : "—"}
										</TableCell>
										<TableCell align="right">
											{s.avg_sdev != null ? Number(s.avg_sdev).toFixed(4) : "—"}
										</TableCell>
										<TableCell align="right">
											{s.avg_cv_pct != null ? `${(Number(s.avg_cv_pct) * 100).toFixed(2)}%` : "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Per-batch grand-average block (recomputed server-side at read) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Grand Average by Batch
				</Typography>
				{grandAverages.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No grand-average rows yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>BATCH</TableCell>
									<TableCell align="right">ROWS</TableCell>
									<TableCell align="right">OBS</TableCell>
									<TableCell align="right">MR%</TableCell>
									<TableCell align="right">CORR</TableCell>
									<TableCell align="right">CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{grandAverages.map((g, i) => {
									const cvPass = g.cv_within_band;
									return (
										<TableRow key={`${g.batch_plan_id ?? "b"}-${i}`}>
											<TableCell>{batchLabel(g)}</TableCell>
											<TableCell align="right">{g.row_count ?? "—"}</TableCell>
											<TableCell align="right">
												{g.grand_obs != null ? Number(g.grand_obs).toFixed(2) : "—"}
											</TableCell>
											<TableCell align="right">
												{g.grand_mr_pct != null ? Number(g.grand_mr_pct).toFixed(2) : "—"}
											</TableCell>
											<TableCell align="right">
												{g.grand_corr_wt != null ? Number(g.grand_corr_wt).toFixed(2) : "—"}
											</TableCell>
											<TableCell
												align="right"
												sx={
													g.grand_cv_pct == null || cvPass == null
														? undefined
														: cvPass
														? {
																color: "success.main",
																fontWeight: 700,
																bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
														  }
														: {
																color: "error.main",
																fontWeight: 700,
																bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
														  }
												}
											>
												{g.grand_cv_pct != null
													? `${(Number(g.grand_cv_pct) * 100).toFixed(2)}%`
													: "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Saved reading rows grid (grouped/sorted by section) */}
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
					sx={{ minWidth: 1420 }}
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
