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

// ---- Shared-contract reading + summary shapes ----
export type WeavingPickReadingRow = {
	weaving_sqc_pick_id: number;
	co_id: number;
	branch_id: number | null;
	entry_date: string;
	weaving_quality_id: number;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	item_code: string | null;
	item_name: string | null;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	line_no: number | null;
	width: number | null;
	picks: number;
};

export type WeavingPickSummaryRow = {
	weaving_quality_id: number;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	avg_picks: number;
	std_picks: number;
	min_picks: number;
	max_picks: number;
	avg_width: number | null;
	min_width: number | null;
	max_width: number | null;
	n_obs: number;
};

type Props = {
	readings: WeavingPickReadingRow[];
	summary: WeavingPickSummaryRow[];
	onDeleted: () => void;
	loading?: boolean;
};

function fmt(value: number | null | undefined, dp = 2): string {
	return value != null ? Number(value).toFixed(dp) : "—";
}

function qualityLabel(r: {
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	weaving_quality_id: number;
}): string {
	const code = r.weaving_quality_code ?? "";
	const name = r.weaving_quality_name ?? "";
	const label = `${code} — ${name}`.trim();
	return label === "—" ? `Quality #${r.weaving_quality_id}` : label;
}

function loomLabel(r: WeavingPickReadingRow): string {
	const label = `${r.mech_code ?? ""} ${r.machine_name ?? ""}`.trim();
	return label === "" ? `Loom #${r.machine_id}` : label;
}

export default function PickGrid({ readings, summary, onDeleted, loading = false }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This reading cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete pick reading #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.WEAVING_SQC_PICK_DELETE}/${id}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted pick reading #${id}`);
			onDeleted();
		},
		[onDeleted]
	);

	const columns = React.useMemo<GridColDef<WeavingPickReadingRow>[]>(
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
							onClick={() => handleDelete(params.row.weaving_sqc_pick_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "entry_date",
				headerName: "Date",
				width: 120,
			},
			{
				field: "weaving_quality_id",
				headerName: "Quality",
				width: 200,
				valueGetter: (_value, row) => qualityLabel(row),
			},
			{
				field: "machine_id",
				headerName: "Loom",
				width: 170,
				valueGetter: (_value, row) => loomLabel(row),
			},
			{
				field: "width",
				headerName: "Width",
				width: 120,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "picks",
				headerName: "Pick / PPI",
				width: 120,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
		],
		[handleDelete]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Saved readings grid */}
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					loading={loading}
					rows={readings}
					getRowId={(row) => row.weaving_sqc_pick_id}
					columns={columns}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ minWidth: 760 }}
				/>
			</Box>

			{/* Per-quality summary from vw_weaving_pick_act */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Pick / PPI Summary by Quality
				</Typography>
				{summary.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No readings yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>QUALITY</TableCell>
									<TableCell align="right">AVG PPI</TableCell>
									<TableCell align="right">STD DEV</TableCell>
									<TableCell align="right">MIN</TableCell>
									<TableCell align="right">MAX</TableCell>
									<TableCell align="right">N</TableCell>
									<TableCell align="right">AVG WIDTH</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{summary.map((r) => (
									<TableRow key={r.weaving_quality_id}>
										<TableCell>{qualityLabel(r)}</TableCell>
										<TableCell align="right">{fmt(r.avg_picks)}</TableCell>
										<TableCell align="right">{fmt(r.std_picks)}</TableCell>
										<TableCell align="right">{fmt(r.min_picks)}</TableCell>
										<TableCell align="right">{fmt(r.max_picks)}</TableCell>
										<TableCell align="right">{r.n_obs}</TableCell>
										<TableCell align="right">{fmt(r.avg_width)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
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
