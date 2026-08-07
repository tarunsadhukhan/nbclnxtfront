"use client";

import * as React from "react";
import { Box, IconButton, Snackbar, Tooltip } from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcRhmrRow } from "../types/sqcSpinningTypes";

type Props = {
	coId: string;
	rows: SqcRhmrRow[];
	loading: boolean;
	onDeleted: () => void;
};

function rowKey(r: SqcRhmrRow): number | string {
	return r.spinning_sqc_rhmr_id ?? `${r.entry_date}-${r.spell_id}`;
}

const fmt1 = (v: number | null | undefined) => (v != null ? Number(v).toFixed(1) : "—");

export default function RhmrGrid({ coId, rows, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number | string) => {
			if (typeof id !== "number") {
				setSnack("This row cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete RHMR entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPINNING_SQC_RHMR_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted RHMR entry #${id}`);
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<SqcRhmrRow>[]>(
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
							onClick={() => handleDelete(rowKey(params.row))}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "entry_date", headerName: "Date", width: 150 },
			{
				field: "spell_code",
				headerName: "Spell",
				width: 120,
				valueGetter: (_value, row) =>
					row.spell_code ?? row.spell_name ?? (row.spell_id != null ? `Spell #${row.spell_id}` : "—"),
			},
			{
				field: "temperature",
				headerName: "Temperature (°C)",
				width: 170,
				type: "number",
				valueFormatter: (value) => fmt1(value as number | null),
			},
			{
				field: "humidity",
				headerName: "Humidity (%)",
				width: 150,
				type: "number",
				valueFormatter: (value) => fmt1(value as number | null),
			},
		],
		[handleDelete]
	);

	return (
		<Box sx={{ width: "100%", overflowX: "auto" }}>
			<DataGrid
				autoHeight
				rows={rows}
				getRowId={rowKey}
				columns={columns}
				loading={loading}
				disableRowSelectionOnClick
				density="comfortable"
				pageSizeOptions={[10, 25, 50]}
				initialState={{
					pagination: { paginationModel: { pageSize: 25, page: 0 } },
				}}
				sx={{ minWidth: 760 }}
			/>
			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
