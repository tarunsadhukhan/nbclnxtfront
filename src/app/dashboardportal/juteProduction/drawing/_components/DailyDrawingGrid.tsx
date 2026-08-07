"use client";

import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Pencil as EditIcon, Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DrawingEntryRow } from "../types/drawingTypes";

type Props = {
	coId: string;
	rows: DrawingEntryRow[];
	loading: boolean;
	onEdit: (row: DrawingEntryRow) => void;
	onDeleted: () => void;
};

export default function DailyDrawingGrid({ coId, rows, loading, onEdit, onDeleted }: Props) {
	const handleDelete = React.useCallback(
		async (entryId: number) => {
			if (!confirm(`Delete drawing entry #${entryId}?`)) return;
			const url = `${apiRoutesPortalMasters.DRAWING_ENTRY_DELETE}/${entryId}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				alert(error);
				return;
			}
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<DrawingEntryRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 100,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<>
						<Tooltip title="Edit">
							<IconButton
								size="small"
								onClick={() => onEdit(params.row)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<EditIcon size={16} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete">
							<IconButton
								size="small"
								color="error"
								onClick={() => handleDelete(params.row.drawing_entry_id)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</>
				),
			},
			{ field: "drawing_entry_id", headerName: "ID", width: 70 },
			{ field: "tran_date", headerName: "Date", width: 110 },
			{ field: "spell", headerName: "Spell", width: 70 },
			{ field: "mech_code", headerName: "Mc Code", width: 100 },
			{ field: "machine_name", headerName: "Machine", width: 180 },
			{ field: "const_meter", headerName: "Const", width: 90, type: "number" },
			{ field: "open_meter", headerName: "Open", width: 90, type: "number" },
			{ field: "close_meter", headerName: "Close", width: 90, type: "number" },
			{ field: "diff_meter", headerName: "Diff", width: 90, type: "number" },
			{
				field: "actual_eff",
				headerName: "Eff (%)",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{ field: "wrk_hours", headerName: "Hrs", width: 70, type: "number" },
			{ field: "remarks", headerName: "Remarks", flex: 1, minWidth: 140 },
		],
		[handleDelete, onEdit]
	);

	return (
		<Box sx={{ width: "100%" }}>
			<DataGrid
				autoHeight
				rows={rows}
				getRowId={(r) => r.drawing_entry_id}
				columns={columns}
				loading={loading}
				disableRowSelectionOnClick
				density="comfortable"
				pageSizeOptions={[10, 25, 50]}
				initialState={{
					pagination: { paginationModel: { pageSize: 25, page: 0 } },
				}}
				sx={{ width: "100%" }}
			/>
		</Box>
	);
}
