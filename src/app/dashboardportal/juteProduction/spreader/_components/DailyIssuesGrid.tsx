"use client";

import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpreaderIssueRow } from "../types/spreaderTypes";

type Props = {
	coId: string;
	rows: SpreaderIssueRow[];
	loading: boolean;
	onDeleted: () => void;
};

export default function DailyIssuesGrid({ coId, rows, loading, onDeleted }: Props) {
	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete issue #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPREADER_ISSUE_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				alert(error);
				return;
			}
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<SpreaderIssueRow>[]>(
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
							onClick={() => handleDelete(params.row.spreader_roll_issue_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "spreader_roll_issue_id", headerName: "ID", width: 80 },
			{ field: "entry_id_grp", headerName: "Group", width: 80 },
			{ field: "issue_time", headerName: "Hr", width: 60 },
			{ field: "spell", headerName: "Spell", width: 70 },
			{ field: "bin_code", headerName: "Bin", width: 100 },
			{ field: "item_name", headerName: "Item", width: 180 },
			{ field: "no_of_rolls", headerName: "Rolls", width: 80, type: "number" },
			{ field: "wt_per_roll", headerName: "Wt/Roll", width: 90, type: "number" },
			{
				field: "issued_kg",
				headerName: "Issued (kg)",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(2) : ""),
			},
			{ field: "breaker_inter_no", headerName: "Breaker", width: 120 },
		],
		[handleDelete]
	);

	return (
		<Box sx={{ width: "100%" }}>
			<DataGrid
				autoHeight
				rows={rows}
				getRowId={(r) => r.spreader_roll_issue_id}
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
