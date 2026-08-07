"use client";

import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { WindingJugarRow } from "../types/windingTypes";
import { useJugarByDate } from "../hooks/useJugarByDate";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	refreshSignal: number;
};

// Read-only day grid of jugar entries (the BE exposes no jugar delete; edits go
// through the form's Save -> Update path).
export default function JugarGrid({ coId, branchId, date, spellId, refreshSignal }: Props) {
	const { rows, loading, error, refresh } = useJugarByDate(coId, date, branchId, spellId);

	React.useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshSignal]);

	const columns = React.useMemo<GridColDef<WindingJugarRow>[]>(
		() => [
			{ field: "winding_jugar_id", headerName: "ID", width: 70 },
			{ field: "tran_date", headerName: "Date", width: 110 },
			{ field: "spell_code", headerName: "Spell", width: 70 },
			{ field: "emp_code", headerName: "EB No", width: 100 },
			{ field: "worker_name", headerName: "Winder", width: 180 },
			{
				field: "open_close",
				headerName: "Type",
				width: 110,
				valueFormatter: (value: string | null) =>
					value === "O" ? "Opening" : value === "C" ? "Closing" : "",
			},
			{
				field: "weight",
				headerName: "Weight",
				width: 110,
				type: "number",
				valueFormatter: (value: number | null) => (value == null ? "" : value),
			},
		],
		[],
	);

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Jugar entries
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
					getRowId={(r) => r.winding_jugar_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
					sx={{ width: "100%" }}
				/>
			</Box>
		</Box>
	);
}
