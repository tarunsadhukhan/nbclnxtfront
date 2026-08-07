"use client";

import * as React from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingPlanningGridRow, WeavingShiftRollupRow } from "../types/weavingTypes";
import { useWeavingPlanningGrid } from "../hooks/useWeavingPlanningGrid";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
};

// Stable composite row id: a loom appears per spell + quality.
function planningRowId(r: WeavingPlanningGridRow): string {
	return `${r.machine_id}:${r.spell_id}:${r.weaving_quality_id}`;
}

// Rollup is keyed per (machine, quality, shift_bucket) server-side.
function rollupRowId(r: WeavingShiftRollupRow): string {
	return `${r.machine_id}:${r.weaving_quality_id}:${r.shift_bucket}`;
}

// Round every numeric cell to a whole number for display.
const roundInt = (value: number | string | null) =>
	value == null || value === "" ? "" : String(Math.round(Number(value)));
const numCol = { type: "number" as const, valueFormatter: roundInt };

const num = { ...numCol, width: 90 };

export default function WeavingPlanningGrid({ coId, branchId, date, spellId }: Props) {
	const { data, loading, error, refresh } = useWeavingPlanningGrid(coId, branchId, date, spellId);
	const [saving, setSaving] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);

	const rows = data?.rows ?? [];
	const rollup = data?.shift_rollup ?? [];

	// All numeric columns are computed server-side -> read-only display. Unit-labelled
	// (yards vs kg) so the kg figure is never mistaken for a comparable-to-standard value.
	const columns = React.useMemo<GridColDef<WeavingPlanningGridRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Loom", width: 100 },
			{ field: "std_speed", headerName: "Std Spd", ...num },
			{ field: "spell_code", headerName: "Spell", width: 80 },
			{ field: "item_code", headerName: "Item", width: 110 },
			{ field: "weaving_quality_code", headerName: "Quality", width: 140 },
			{ field: "ozs_yds", headerName: "Ozs/Yd", ...num },
			{ field: "std_picks", headerName: "Actual PPI", ...num },
			{ field: "finished_length", headerName: "FL", ...num },
			{ field: "open_jugar", headerName: "Open Jugar", ...num },
			{ field: "cuts", headerName: "Cuts", ...num },
			{ field: "close_jugar", headerName: "Close Jugar", ...num },
			{ field: "less_production", headerName: "Adj Jugar", ...num },
			{ field: "jugar", headerName: "Prod Jugar", ...num },
			{ field: "working_hours", headerName: "Working Hrs", width: 110, ...numCol },
			{ field: "std_prod_yds", headerName: "100% Prod (yd)", width: 120, ...numCol },
			{ field: "std_prod_eff", headerName: "Std Prod (yd)", width: 120, ...numCol },
			{ field: "production_yds", headerName: "Prod (yd)", width: 120, ...numCol },
			{ field: "production_kg", headerName: "Prod (kg)", width: 120, ...numCol },
			{ field: "std_eff", headerName: "Std Eff %", width: 100, ...numCol },
			{ field: "efficiency", headerName: "Act Eff %", width: 100, ...numCol },
		],
		[]
	);

	const rollupColumns = React.useMemo<GridColDef<WeavingShiftRollupRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Loom", width: 100 },
			{ field: "weaving_quality_code", headerName: "Quality", width: 140 },
			{ field: "shift_bucket", headerName: "Shift", width: 80 },
			{ field: "production_yds", headerName: "Prod (yd)", width: 120, ...numCol },
			{ field: "production_kg", headerName: "Prod (kg)", width: 120, ...numCol },
			{ field: "efficiency", headerName: "Eff %", width: 100, ...numCol },
		],
		[]
	);

	const handleSave = async () => {
		setSaving(true);
		try {
			const body = {
				co_id: Number(coId),
				branch_id: Number(branchId),
				tran_date: date,
				rows,
			};
			const { error: err } = await fetchWithCookie(
				apiRoutesPortalMasters.WEAVING_PLANNING_GRID_SAVE,
				"POST",
				body
			);
			if (err) {
				setSnack(err);
				return;
			}
			setSnack(`Saved ${rows.length} planning row(s).`);
			refresh();
		} catch (e) {
			setSnack(e instanceof Error ? e.message : "Failed to save planning grid.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Planning grid (per loom / quality / spell)</Typography>
				<Button
					variant="contained"
					size="small"
					startIcon={<SaveIcon size={16} />}
					onClick={handleSave}
					disabled={saving || loading || rows.length === 0}
				>
					{saving ? "Saving…" : "Save"}
				</Button>
				<Typography variant="caption" color="text.secondary">
					All values are computed server-side and shown read-only. Yards columns and kg columns are
					not comparable.
				</Typography>
			</Box>

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
					Shift rollup (loom / quality / shift)
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

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
