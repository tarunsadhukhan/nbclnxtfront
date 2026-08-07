"use client";

import * as React from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { BeamingPlanningGridRow, BeamingShiftRollupRow } from "../types/beamingTypes";
import { useBeamingPlanningGrid } from "../hooks/useBeamingPlanningGrid";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
};

// Stable composite row id: a machine appears per spell + quality (SPEC §C.2 key).
function planningRowId(r: BeamingPlanningGridRow): string {
	return `${r.machine_id}:${r.spell_id}:${r.item_id}:${r.bm_quality_id}`;
}

// Rollup is keyed per (machine, item, quality, shift_bucket) server-side (SPEC §C.4).
function rollupRowId(r: BeamingShiftRollupRow): string {
	return `${r.machine_id}:${r.item_id}:${r.bm_quality_id}:${r.shift_bucket}`;
}

const num = { type: "number" as const, width: 90 };

export default function BeamingPlanningGrid({ coId, branchId, date, spellId }: Props) {
	const { data, loading, error, refresh } = useBeamingPlanningGrid(coId, branchId, date, spellId);
	const [saving, setSaving] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);

	const rows = data?.rows ?? [];
	const rollup = data?.shift_rollup ?? [];

	// All numeric columns are computed server-side -> read-only display.
	// Columns per SPEC §C.1, unit-labelled (yards vs kg) so the kg figure is never
	// mistaken for a comparable-to-standard value (SPEC §3).
	const columns = React.useMemo<GridColDef<BeamingPlanningGridRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Machine", width: 100 },
			{ field: "spell_code", headerName: "Spell", width: 80 },
			{ field: "item_code", headerName: "Item", width: 110 },
			{ field: "bm_quality_code", headerName: "bm_quality", width: 140 },
			{ field: "beam_no", headerName: "Beam No", width: 110 },
			{ field: "ends", headerName: "Ends", ...num },
			{ field: "std_count", headerName: "Std Count", ...num },
			{ field: "laid_length", headerName: "Laid Length", width: 110, type: "number" },
			{ field: "std_cuts_per_beam", headerName: "Std Cuts/Beam", width: 130, type: "number" },
			{ field: "act_cuts", headerName: "Act Cuts/Beam", width: 130, type: "number" },
			{ field: "std_speed", headerName: "Std Spd", ...num },
			{ field: "target_speed", headerName: "Tgt Spd", ...num },
			// Act Spd (and rpm_roller, if shown) are server-sourced read-only display.
			// They will be filled by the future Beaming SQC tab (like Spinning SQC) and
			// read 0/blank until that page exists — expected, NOT entered here.
			{ field: "act_speed", headerName: "Act Spd", ...num },
			{ field: "std_eff", headerName: "Std Eff %", width: 100, type: "number" },
			{ field: "target_eff", headerName: "Tgt Eff %", width: 100, type: "number" },
			{ field: "working_hours", headerName: "Working Hrs", width: 110, type: "number" },
			{ field: "p100prod", headerName: "P100 Prod (yd)", width: 130, type: "number" },
			{ field: "std_prod", headerName: "Std Prod (yd)", width: 120, type: "number" },
			{ field: "target_prod", headerName: "Tgt Prod (yd)", width: 120, type: "number" },
			{ field: "act_prod_kg", headerName: "Act Prod (kg)", width: 120, type: "number" },
			{ field: "act_prod_yards", headerName: "Act Prod (yd)", width: 120, type: "number" },
			{ field: "act_eff", headerName: "Act Eff %", width: 100, type: "number" },
		],
		[]
	);

	const rollupColumns = React.useMemo<GridColDef<BeamingShiftRollupRow>[]>(
		() => [
			{ field: "mech_code", headerName: "Machine", width: 100 },
			{ field: "item_code", headerName: "Item", width: 110 },
			{ field: "bm_quality_code", headerName: "bm_quality", width: 140 },
			{ field: "shift_bucket", headerName: "Shift", width: 80 },
			{ field: "act_prod_yards", headerName: "Prod (yd)", width: 120, type: "number" },
			{ field: "act_prod_kg", headerName: "Prod (kg)", width: 120, type: "number" },
			{ field: "act_eff", headerName: "Eff %", width: 100, type: "number" },
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
				apiRoutesPortalMasters.BEAMING_PLANNING_GRID_SAVE,
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
				<Typography variant="subtitle2">Planning grid (per machine / quality / spell)</Typography>
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
					Shift rollup (machine / quality / shift)
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
