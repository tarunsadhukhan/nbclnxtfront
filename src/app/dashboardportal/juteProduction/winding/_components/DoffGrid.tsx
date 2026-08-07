"use client";

import * as React from "react";
import { Alert, Box, IconButton, Snackbar, Tooltip, Typography } from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingDoffRow } from "../types/windingTypes";
import { useDoffByDate } from "../hooks/useDoffByDate";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	refreshSignal: number;
	onChanged: () => void;
};

export default function DoffGrid({ coId, branchId, date, spellId, refreshSignal, onChanged }: Props) {
	const { rows, loading, error, refresh } = useDoffByDate(coId, date, branchId, spellId);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Re-fetch when the parent reports a new doff was saved.
	React.useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshSignal]);

	// Delete removes the whole WEIGHING, not just the clicked share — say so, or
	// a shared trolly loses three rows on a confirm that mentioned one.
	const handleDelete = React.useCallback(
		async (row: WindingDoffRow) => {
			const id = row.winding_doff_id;
			const shares = rows.filter((r) => r.weighing_id === row.weighing_id).length;
			const prompt =
				shares > 1
					? `This weighing is shared by ${shares} winders. Delete all ${shares} rows?`
					: `Delete winding doff #${id}?`;
			if (!window.confirm(prompt)) return;
			const url = `${apiRoutesPortalMasters.WINDING_DOFF_DELETE}/${id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "DELETE");
			if (err) {
				setSnack(err);
				return;
			}
			setSnack(shares > 1 ? `Deleted weighing (${shares} rows)` : `Deleted doff #${id}`);
			refresh();
			onChanged();
		},
		[coId, rows, refresh, onChanged],
	);

	const columns = React.useMemo<GridColDef<WindingDoffRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "winding_doff_id", headerName: "ID", width: 70 },
			{ field: "tran_date", headerName: "Date", width: 110 },
			{ field: "spell_code", headerName: "Spell", width: 70 },
			{ field: "emp_code", headerName: "EB No", width: 100 },
			{ field: "worker_name", headerName: "Winder", width: 180 },
			{ field: "item_code", headerName: "Yarn", width: 110 },
			{ field: "trolly_name", headerName: "Trolly", width: 120 },
			{ field: "spool_name", headerName: "Spool", width: 120 },
			{
				field: "gross_input_wt",
				headerName: "Gross",
				width: 90,
				type: "number",
				valueFormatter: (value: number | null) => (value == null ? "" : value),
			},
			{
				field: "production_qty",
				headerName: "Net",
				width: 90,
				type: "number",
				valueFormatter: (value: number | null) => (value == null ? "" : value),
			},
		],
		[handleDelete],
	);

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Doff entries
			</Typography>
			{error ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					{error}
				</Alert>
			) : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(r) => r.winding_doff_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
					sx={{ width: "100%" }}
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
