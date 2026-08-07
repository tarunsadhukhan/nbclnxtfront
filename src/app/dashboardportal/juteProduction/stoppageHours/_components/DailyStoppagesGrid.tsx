"use client";

import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Pencil as EditIcon, Trash2 as Trash2Icon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { StoppageEntryRow } from "../types/stoppageTypes";
import { STOPPAGE_REASON_LABELS, type StoppageReasonCode } from "../types/stoppageTypes";

type Props = {
	coId: string;
	rows: StoppageEntryRow[];
	loading: boolean;
	onEdit: (row: StoppageEntryRow) => void;
	onDeleted: () => void;
};

export default function DailyStoppagesGrid({ coId, rows, loading, onEdit, onDeleted }: Props) {
	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete stoppage entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.STOPPAGE_ENTRY_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				alert(error);
				return;
			}
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<StoppageEntryRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 96,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box>
						<Tooltip title="Edit">
							<IconButton
								size="small"
								color="primary"
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
								onClick={() => handleDelete(params.row.stoppage_hours_id)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<Trash2Icon size={16} />
							</IconButton>
						</Tooltip>
					</Box>
				),
			},
			{ field: "tran_date", headerName: "Date", width: 120 },
			{ field: "spell_code", headerName: "Spell", width: 90 },
			{ field: "dept_name", headerName: "Department", width: 160 },
			{ field: "machine_name", headerName: "Machine", width: 160 },
			{
				field: "stoppage_hours",
				headerName: "Hours",
				width: 90,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{
				field: "reason_code",
				headerName: "Reason",
				width: 130,
				valueFormatter: (value) =>
					value != null
						? (STOPPAGE_REASON_LABELS[value as StoppageReasonCode] ?? String(value))
						: "",
			},
			{ field: "remarks", headerName: "Remarks", flex: 1, minWidth: 160 },
		],
		[handleDelete, onEdit]
	);

	return (
		<Box sx={{ width: "100%" }}>
			<DataGrid
				autoHeight
				rows={rows}
				getRowId={(r) => r.stoppage_hours_id}
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
