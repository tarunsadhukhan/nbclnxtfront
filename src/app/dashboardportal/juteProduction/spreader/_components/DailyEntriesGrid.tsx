"use client";

import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpreaderEntryRow } from "../types/spreaderTypes";

type Props = {
	coId: string;
	rows: SpreaderEntryRow[];
	loading: boolean;
	onDeleted: () => void;
};

export default function DailyEntriesGrid({ coId, rows, loading, onDeleted }: Props) {
	const handleDelete = React.useCallback(
		async (entryId: number) => {
			if (!confirm(`Delete production entry #${entryId}?`)) return;
			const url = `${apiRoutesPortalMasters.SPREADER_ENTRY_DELETE}/${entryId}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				alert(error);
				return;
			}
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<SpreaderEntryRow>[]>(
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
							onClick={() => handleDelete(params.row.spreader_prod_entry_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "spreader_prod_entry_id", headerName: "ID", width: 80 },
			{ field: "entry_id_grp", headerName: "Group", width: 80 },
			{ field: "bin_code", headerName: "Bin", width: 100 },
			{ field: "entry_time", headerName: "Hr", width: 60 },
			{ field: "spell", headerName: "Spell", width: 70 },
			{ field: "machine_name", headerName: "Spreader", width: 140 },
			{ field: "item_name", headerName: "Item", width: 180 },
			{ field: "no_of_rolls", headerName: "Rolls", width: 80, type: "number" },
			{ field: "wt_per_roll", headerName: "Wt/Roll", width: 90, type: "number" },
			{
				field: "produced_kg",
				headerName: "Prod (kg)",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{ field: "trolley_no", headerName: "Trolley", width: 80 },
		],
		[handleDelete]
	);

	return (
		<Box sx={{ width: "100%" }}>
			<DataGrid
				autoHeight
				rows={rows}
				getRowId={(r) => r.spreader_prod_entry_id}
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
