"use client";

import * as React from "react";
import { Alert, Box, Button, Chip, IconButton, Snackbar, Tooltip, Typography } from "@mui/material";
import { Pencil as EditIcon, Trash2 as DeleteIcon, Layers as DedupIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DoffEntryRow } from "../types/spinningTypes";
import { useDoffEntriesByDate } from "../hooks/useDoffEntriesByDate";
import DoffSyncButton from "./DoffSyncButton";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	onEdit: (row: DoffEntryRow) => void;
	// Bumps the SpinningProcessBar refreshKey after delete/dedup/sync (spec 5.6.1).
	onMutated?: () => void;
	// Bumped by the page (doff save, Process) so the grid re-fetches.
	refreshKey?: number;
};

const sourceChip = (source: string | null) =>
	source ? (
		<Chip
			size="small"
			variant="outlined"
			color={source === "manual" ? "info" : "default"}
			label={source}
		/>
	) : null;

export default function DailyDoffGrid({
	coId,
	branchId,
	date,
	spellId,
	onEdit,
	onMutated,
	refreshKey = 0,
}: Props) {
	// access_type: 1 read, 2 print, 3 write, 4 edit. Modifying an EXISTING doff
	// (edit / delete / dedup-deactivate) needs level 4; write-only users create
	// new doffs via the form but must not see these.
	const pathname = usePathname();
	const { hasMenuAccess } = useSidebarContext();
	const canEdit = hasMenuAccess(pathname, "edit");

	const { rows, unsynced, loading, error, refresh } = useDoffEntriesByDate(
		coId,
		date,
		branchId,
		spellId,
		null,
		refreshKey
	);
	const [snack, setSnack] = React.useState<string | null>(null);
	const [busy, setBusy] = React.useState(false);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete doff entry #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPINNING_DOFF_DELETE}/${id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "DELETE");
			if (err) {
				setSnack(err);
				return;
			}
			setSnack(`Deleted doff #${id}`);
			refresh();
			onMutated?.();
		},
		[coId, refresh, onMutated]
	);

	const handleDedup = React.useCallback(async () => {
		if (spellId == null) {
			setSnack("Select a spell to dedup.");
			return;
		}
		setBusy(true);
		// D8: preview first (confirm:false lists candidates, deactivates nothing),
		// then an explicit confirm before the destructive call.
		const base = { co_id: Number(coId), tran_date: date, spell_id: spellId };
		const { data: prev, error: prevErr } = await fetchWithCookie<{
			data: {
				preview: boolean;
				candidates: { daily_doff_tbl_id: number; net_weight: number }[];
			};
		}>(apiRoutesPortalMasters.SPINNING_DOFF_DEDUP, "POST", { ...base, confirm: false });
		if (prevErr) {
			setBusy(false);
			setSnack(prevErr);
			return;
		}
		const candidates = prev?.data?.candidates ?? [];
		if (candidates.length === 0) {
			setBusy(false);
			setSnack("No exact duplicates found.");
			return;
		}
		const listing = candidates
			.map((c) => `#${c.daily_doff_tbl_id} (net ${c.net_weight})`)
			.join(", ");
		if (!confirm(`Deactivate ${candidates.length} exact-duplicate doff(s)?\n${listing}`)) {
			setBusy(false);
			return;
		}
		const { data: res, error: err } = await fetchWithCookie<{
			data: { deactivated: number };
		}>(apiRoutesPortalMasters.SPINNING_DOFF_DEDUP, "POST", { ...base, confirm: true });
		setBusy(false);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack(`Deactivated ${res?.data?.deactivated ?? 0} duplicate doff(s).`);
		refresh();
		onMutated?.();
	}, [coId, date, spellId, refresh, onMutated]);

	const columns = React.useMemo<GridColDef<DoffEntryRow>[]>(
		() => [
			...(canEdit
				? [
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
											onClick={() => handleDelete(params.row.daily_doff_tbl_id)}
											sx={{ minWidth: 40, minHeight: 40 }}
										>
											<DeleteIcon size={16} />
										</IconButton>
									</Tooltip>
								</>
							),
						} as GridColDef<DoffEntryRow>,
					]
				: []),
			{ field: "daily_doff_tbl_id", headerName: "ID", width: 70 },
			{ field: "doff_date", headerName: "Date", width: 110 },
			{ field: "spell_code", headerName: "Spell", width: 70 },
			{ field: "mech_code", headerName: "Mc Code", width: 100 },
			{ field: "machine_name", headerName: "Machine", width: 170 },
			{ field: "trolly_name", headerName: "Trolly", width: 130 },
			{ field: "item_code", headerName: "Yarn", width: 110 },
			{ field: "eb_name", headerName: "Operator", width: 150 },
			{
				field: "sources",
				headerName: "Source",
				width: 150,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box sx={{ display: "flex", gap: 0.5, alignItems: "center", height: "100%" }}>
						{sourceChip(params.row.item_source)}
						{sourceChip(params.row.eb_source)}
					</Box>
				),
			},
			{ field: "gross_weight", headerName: "Gross", width: 90, type: "number" },
			{ field: "tare_weight", headerName: "Tare", width: 90, type: "number" },
			{ field: "net_weight", headerName: "Net", width: 90, type: "number" },
		],
		[canEdit, handleDelete, onEdit]
	);

	return (
		<Box>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Doff entries</Typography>
				{canEdit ? (
					<Button
						variant="outlined"
						size="small"
						startIcon={<DedupIcon size={16} />}
						onClick={handleDedup}
						disabled={busy || spellId == null}
					>
						Dedup
					</Button>
				) : null}
				<DoffSyncButton
					coId={coId}
					branchId={branchId}
					date={date}
					spellId={spellId}
					onSynced={() => {
						refresh();
						onMutated?.();
					}}
				/>
				{/* Spec 5.6.4: the DOFF table itself is not fully stamped — Sync fixes it. */}
				{unsynced && unsynced.no_item > 0 ? (
					<Chip
						size="small"
						color="warning"
						variant="outlined"
						label={`${unsynced.no_item} doff(s) without quality`}
					/>
				) : null}
				{unsynced && unsynced.no_eb > 0 ? (
					<Chip
						size="small"
						color="warning"
						variant="outlined"
						label={`${unsynced.no_eb} without operator`}
					/>
				) : null}
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
					getRowId={(r) => r.daily_doff_tbl_id}
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
