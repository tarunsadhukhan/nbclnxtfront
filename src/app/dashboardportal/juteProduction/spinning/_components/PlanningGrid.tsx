"use client";

import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { PlanningGridRow, ShiftRollupRow } from "../types/spinningTypes";
import { usePlanningGrid } from "../hooks/usePlanningGrid";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	// Bumped after Process so a locked unit re-fetches the frozen log.
	refreshKey?: number;
};

// Stable composite row id: a frame can appear per spell + yarn item.
function planningRowId(r: PlanningGridRow): string {
	return `${r.machine_id}:${r.spell_id}:${r.item_id}`;
}

function rollupRowId(r: ShiftRollupRow): string {
	return `${r.machine_id}:${r.item_id}:${r.shift_bucket}`;
}

const num = { type: "number" as const, width: 90 };

export default function PlanningGrid({ coId, branchId, date, spellId, refreshKey = 0 }: Props) {
	const { data, loading, error, locked } = usePlanningGrid(coId, branchId, date, spellId, refreshKey);

	const rows = data?.rows ?? [];
	const rollup = data?.shift_rollup ?? [];

	// All numeric columns are computed server-side -> read-only display.
	const columns = React.useMemo<GridColDef<PlanningGridRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Frame", width: 100 },
			{ field: "spell_code", headerName: "Spell", width: 80 },
			{ field: "item_code", headerName: "Yarn", width: 110 },
			{ field: "spindles", headerName: "Spindles", ...num },
			{ field: "minutes", headerName: "Minutes", ...num },
			{ field: "act_count", headerName: "Act Cnt", ...num },
			{ field: "std_count", headerName: "Std Cnt", ...num },
			{ field: "std_speed", headerName: "Std Spd", ...num },
			{ field: "actual_speed", headerName: "Act Spd", ...num },
			{ field: "target_speed", headerName: "Tgt Spd", ...num },
			{ field: "std_tpi", headerName: "Std TPI", ...num },
			{ field: "actual_tpi", headerName: "Act TPI", ...num },
			{ field: "target_tpi", headerName: "Tgt TPI", ...num },
			{ field: "std_eff", headerName: "Std Eff", ...num },
			{ field: "target_eff", headerName: "Tgt Eff", ...num },
			{ field: "p100prod", headerName: "P100 Prod", width: 100, type: "number" },
			{ field: "std_prod", headerName: "Std Prod", width: 100, type: "number" },
			{ field: "target_prod", headerName: "Tgt Prod", width: 100, type: "number" },
			{ field: "act_prod_doff", headerName: "Act Prod (Doff)", width: 130, type: "number" },
			{ field: "winding_total", headerName: "Wind Total", width: 110, type: "number" },
			{ field: "act_prod_wind", headerName: "Act Prod (Wind)", width: 130, type: "number" },
			{ field: "eff_doff", headerName: "Eff Doff %", width: 110, type: "number" },
			{ field: "eff_winding", headerName: "Eff Wind %", width: 110, type: "number" },
		],
		[]
	);

	const rollupColumns = React.useMemo<GridColDef<ShiftRollupRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Machine", width: 100 },
			{ field: "item_code", headerName: "Yarn", width: 110 },
			{ field: "shift_bucket", headerName: "Shift", width: 80 },
			{ field: "prod_doff", headerName: "Prod (Doff)", width: 120, type: "number" },
			{ field: "prod_wind", headerName: "Prod (Wind)", width: 120, type: "number" },
			{ field: "doff_eff", headerName: "Doff Eff %", width: 110, type: "number" },
			{ field: "wind_eff", headerName: "Wind Eff %", width: 110, type: "number" },
		],
		[]
	);

	// G1: the old Save button posted to the removed planning_grid_save route —
	// the SpinningProcessBar's Process button owns freezing now.
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Planning grid (per frame / spell)</Typography>
				<Typography variant="caption" color="text.secondary">
					All values are computed server-side and shown read-only. Use Process to freeze + lock.
				</Typography>
			</Box>

			{locked ? (
				<Alert severity="info">
					This day + spell is processed and locked — the grid shows the frozen log.
				</Alert>
			) : null}

			{error ? <Alert severity="error">{error}</Alert> : null}

			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={planningRowId}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="compact"
					pageSizeOptions={[10, 25, 50, 100]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ width: "100%" }}
				/>
			</Box>

			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Shift rollup (machine / yarn / shift)
				</Typography>
				<Box sx={{ width: "100%" }}>
					<DataGrid
						autoHeight
						rows={rollup}
						getRowId={rollupRowId}
						columns={rollupColumns}
						loading={loading}
						disableRowSelectionOnClick
						density="compact"
						pageSizeOptions={[10, 25, 50]}
						initialState={{
							pagination: { paginationModel: { pageSize: 25, page: 0 } },
						}}
						sx={{ width: "100%" }}
					/>
				</Box>
			</Box>
		</Box>
	);
}
