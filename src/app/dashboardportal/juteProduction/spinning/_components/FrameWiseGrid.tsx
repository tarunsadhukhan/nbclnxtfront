"use client";

import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useDoffEntriesByDate } from "../hooks/useDoffEntriesByDate";
import { groupFrameWise, prevShiftRef, type FrameWiseRow } from "../utils/spinningCalc";
import type { SpinningSpellOption } from "../types/spinningTypes";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	spells: SpinningSpellOption[];
	refreshKey: number;
};

// ponytail: rolled up client-side from the doff rows already fetched for the
// spell — no new endpoint. The previous shift costs one extra fetch of the same
// endpoint. Move to SQL only if a spell's doff count outgrows the grid.
export default function FrameWiseGrid({
	coId,
	branchId,
	date,
	spellId,
	spells,
	refreshKey,
}: Props) {
	const { rows, loading, error } = useDoffEntriesByDate(
		coId,
		date,
		branchId,
		spellId,
		null,
		refreshKey,
	);

	// Previous shift: preceding spell same day, rolling back to the previous
	// date's last spell on the day's first spell.
	const prev = React.useMemo(() => prevShiftRef(spells, spellId, date), [spells, spellId, date]);
	const { rows: prevRows, loading: prevLoading } = useDoffEntriesByDate(
		coId,
		prev?.date ?? "",
		branchId,
		prev?.spellId ?? null,
		null,
		refreshKey,
	);

	const gridRows = React.useMemo(() => groupFrameWise(rows, prevRows), [rows, prevRows]);

	const prevSpellLabel = prev
		? `${spells.find((s) => s.spell_id === prev.spellId)?.spell_code ?? prev.spellId}` +
			(prev.date === date ? "" : ` ${prev.date}`)
		: null;

	const columns = React.useMemo<GridColDef<FrameWiseRow>[]>(
		() => [
			{ field: "frame", headerName: "Frame", flex: 0.7, minWidth: 90 },
			{ field: "item_code", headerName: "Yarn Quality", flex: 0.7, minWidth: 90 },
			{ field: "operators", headerName: "Operator(s)", flex: 1.2, minWidth: 130 },
			{ field: "doffs", headerName: "Doffs", type: "number", flex: 0.4, minWidth: 70 },
			{
				field: "weights",
				headerName: "Production (kg)",
				flex: 1.4,
				minWidth: 140,
				valueGetter: (_v, row) => `${row.weights} = ${row.total}`,
			},
			{
				field: "avg_doff",
				headerName: "Avg Doff (kg)",
				type: "number",
				flex: 0.6,
				minWidth: 100,
			},
			{
				field: "prev_avg_doff",
				headerName: prevSpellLabel ? `Prev Shift Avg (${prevSpellLabel})` : "Prev Shift Avg",
				type: "number",
				flex: 0.8,
				minWidth: 130,
				valueFormatter: (v) => (v == null ? "—" : String(v)),
			},
		],
		[prevSpellLabel],
	);

	const spellTotal = gridRows.reduce((a, r) => a + r.total, 0);

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Frame wise production — total {Math.round(spellTotal * 1000) / 1000} kg
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
				loading={loading || prevLoading}
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
