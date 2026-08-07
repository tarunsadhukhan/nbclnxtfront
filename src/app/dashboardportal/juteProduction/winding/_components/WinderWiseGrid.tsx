"use client";

import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useDoffByDate } from "../hooks/useDoffByDate";
import { groupWinderWise, type WinderWiseRow } from "../utils/windingCalc";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	refreshSignal: number;
};

// ponytail: rolled up client-side from the doff rows already fetched for the day
// — no new endpoint. Move to SQL only if a day's doff count outgrows the grid.
export default function WinderWiseGrid({ coId, branchId, date, spellId, refreshSignal }: Props) {
	const { rows, loading, error, refresh } = useDoffByDate(coId, date, branchId, spellId);

	React.useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshSignal]);

	const gridRows = React.useMemo(() => groupWinderWise(rows), [rows]);

	const columns = React.useMemo<GridColDef<WinderWiseRow>[]>(
		() => [
			// Small minWidths + flex so the three columns fit a phone without
			// horizontal scroll; text wraps instead (see getRowHeight/sx below).
			{ field: "winder", headerName: "Winder (EB No)", flex: 1.2, minWidth: 110 },
			{ field: "item_code", headerName: "Yarn Quality", flex: 0.6, minWidth: 80 },
			// ponytail: entries + total in one cell ("30 + 40 = 70") — trial layout;
			// re-add the separate `total` column if the merged cell reads poorly.
			{
				field: "weights",
				headerName: "Production (kg)",
				flex: 1.4,
				minWidth: 130,
				valueGetter: (_v, row) => `${row.weights} = ${row.total}`,
			},
		],
		[],
	);

	const dayTotal = gridRows.reduce((a, r) => a + r.total, 0);

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Winder wise production — total {Math.round(dayTotal * 1000) / 1000} kg
			</Typography>
			{error ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					{error}
				</Alert>
			) : null}
			<DataGrid
				autoHeight
				rows={gridRows}
				columns={columns}
				loading={loading}
				disableRowSelectionOnClick
				density="comfortable"
				getRowHeight={() => "auto"}
				pageSizeOptions={[10, 25, 50]}
				initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
				sx={{
					width: "100%",
					// Wrap instead of truncating/scrolling — rows auto-size to fit.
					"& .MuiDataGrid-cell": {
						whiteSpace: "normal",
						wordBreak: "break-word",
						lineHeight: 1.4,
						alignItems: "flex-start",
						py: 1,
					},
					"& .MuiDataGrid-columnHeaderTitle": {
						whiteSpace: "normal",
						lineHeight: 1.2,
					},
				}}
			/>
		</Box>
	);
}
