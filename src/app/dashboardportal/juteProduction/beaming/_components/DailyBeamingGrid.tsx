"use client";

import * as React from "react";
import { Alert, Box, IconButton, Snackbar, Tooltip, Typography } from "@mui/material";
import { Pencil as EditIcon, Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { BeamingEntryRow } from "../types/beamingTypes";
import { useBeamingEntriesByDate } from "../hooks/useBeamingEntriesByDate";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	// Bumped by the parent after a save to auto-refresh the grid.
	refreshKey?: number;
	onEdit: (row: BeamingEntryRow) => void;
};

export default function DailyBeamingGrid({ coId, branchId, date, spellId, refreshKey, onEdit }: Props) {
	const { rows, loading, error, refresh } = useBeamingEntriesByDate(
		coId,
		date,
		branchId,
		spellId,
		undefined,
		refreshKey
	);
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete beaming entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.BEAMING_ENTRY_DELETE}/${id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "DELETE");
			if (err) {
				setSnack(err);
				return;
			}
			setSnack(`Deleted beaming entry #${id}`);
			refresh();
		},
		[coId, refresh]
	);

	const columns = React.useMemo<GridColDef<BeamingEntryRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 100,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<>
						<Tooltip title="Edit">
							<IconButton
								size="small"
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
								onClick={() => handleDelete(params.row.beaming_daily_id)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</>
				),
			},
			{ field: "beaming_daily_id", headerName: "ID", width: 70 },
			{ field: "tran_date", headerName: "Date", width: 110 },
			{ field: "spell_code", headerName: "Spell", width: 70 },
			{ field: "mech_code", headerName: "Mc Code", width: 100 },
			{ field: "machine_name", headerName: "Machine", width: 160 },
			{ field: "item_code", headerName: "Item", width: 110 },
			{ field: "bm_quality_code", headerName: "bm_quality", width: 140 },
			{ field: "beam_no", headerName: "Beam No", width: 110 },
			{ field: "act_cuts", headerName: "Act Cuts/Beam", width: 120, type: "number" },
			{ field: "no_of_beam", headerName: "No. Beams", width: 100, type: "number" },
			// RPM / Act Spd are read-only here — sourced from the server and filled by
			// the future Beaming SQC tab (like Spinning SQC); 0/blank until then.
			{ field: "rpm_roller", headerName: "RPM", width: 80, type: "number" },
			{ field: "dia_roller", headerName: "Dia", width: 80, type: "number" },
			{ field: "act_speed", headerName: "Act Spd", width: 90, type: "number" },
			{ field: "kg_per_beam", headerName: "kg/Beam", width: 100, type: "number" },
			{ field: "act_prod_yards", headerName: "Act Prod (yd)", width: 120, type: "number" },
			{ field: "act_prod_kg", headerName: "Act Prod (kg)", width: 120, type: "number" },
			{ field: "act_eff", headerName: "Act Eff %", width: 100, type: "number" },
		],
		[handleDelete, onEdit]
	);

	return (
		<Box>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Beaming entries</Typography>
			</Box>
			{error ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					{error}
				</Alert>
			) : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(r) => r.beaming_daily_id}
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
			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
