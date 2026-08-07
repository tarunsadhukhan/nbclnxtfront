"use client";

import * as React from "react";
import {
	Box,
	Collapse,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon, ChevronDown, ChevronRight } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { QrCv15aGroup } from "../types/qrCv15aTypes";

type Props = {
	coId: string;
	groups: QrCv15aGroup[];
	loading: boolean;
	onDeleted: () => void;
};

// Server-side id of a saved group, or null if not persisted. Used for delete only.
function serverId(g: QrCv15aGroup): number | null {
	return g.qr_cv_15a_id ?? null;
}

// Grid row = group + a guaranteed-unique key. Insert-only saves allow duplicate
// groups sharing every server-visible field, so the list index is the only
// collision-free key for DataGrid.
type GridRow = QrCv15aGroup & { _gridId: string };

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

function drawingLabel(row: QrCv15aGroup): string {
	return (
		row.drawing_mech_code ??
		row.drawing_machine_name ??
		(row.drawing_mc_id != null ? `MC #${row.drawing_mc_id}` : "—")
	);
}

function spinningLabel(row: QrCv15aGroup): string {
	return row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—");
}

function GroupDetail({ group }: { group: QrCv15aGroup }) {
	const readings = group.readings ?? [];
	if (readings.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
				No readings recorded for this group.
			</Typography>
		);
	}
	return (
		<TableContainer sx={{ my: 1 }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						{readings.map((_, i) => (
							<TableCell key={i} align="right">
								R{i + 1}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						{readings.map((v, i) => (
							<TableCell key={i} align="right">
								{fmt(v, 3)}
							</TableCell>
						))}
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
}

export default function QrCv15aGrid({ coId, groups, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

	const toggleExpand = React.useCallback((gridId: string) => {
		setExpanded((prev) => ({ ...prev, [gridId]: !prev[gridId] }));
	}, []);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This group cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete QR/CV (Special) group #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.QR_CV_15A_SQC_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted QR/CV (Special) group #${id}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	const columns = React.useMemo<GridColDef<GridRow>[]>(
		() => [
			{
				field: "expand",
				headerName: "",
				width: 50,
				sortable: false,
				filterable: false,
				renderCell: (params) => {
					const open = !!expanded[params.row._gridId];
					return (
						<Tooltip title={open ? "Hide readings" : "Show readings"}>
							<IconButton size="small" onClick={() => toggleExpand(params.row._gridId)}>
								{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
							</IconButton>
						</Tooltip>
					);
				},
			},
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete group">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(serverId(params.row))}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "item_name",
				headerName: "QUALITY",
				width: 170,
				valueGetter: (_value, row) => row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`,
			},
			{
				field: "drawing_mc",
				headerName: "3RD DRAWING",
				width: 140,
				valueGetter: (_value, row) => drawingLabel(row),
			},
			{
				field: "mc",
				headerName: "SPINNING FRAME",
				width: 150,
				valueGetter: (_value, row) => spinningLabel(row),
			},
			{
				field: "observed_count",
				headerName: "OBS COUNT",
				width: 120,
				type: "number",
				valueGetter: (_value, row) => row.observed_count ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "mr_pct",
				headerName: "MR %",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.mr_pct ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_bs",
				headerName: "AVG B/S",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => row.stats?.avg_bs ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "max",
				headerName: "MAX",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.max ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "min",
				headerName: "MIN",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.min ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "std_dev",
				headerName: "STD DEV",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => row.stats?.std_dev ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "qr_pct",
				headerName: "QR %",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.qr_pct ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "cv_pct",
				headerName: "CV %",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.cv_pct ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "qr_at_min",
				headerName: "QR % @MIN",
				width: 120,
				type: "number",
				valueGetter: (_value, row) => row.stats?.qr_at_min ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
		],
		[expanded, handleDelete, toggleExpand],
	);

	const gridRows = React.useMemo<GridRow[]>(
		() => groups.map((g, i) => ({ ...g, _gridId: `${serverId(g) ?? "new"}-${i}` })),
		[groups],
	);

	const expandedRows = React.useMemo(
		() => gridRows.filter((r) => expanded[r._gridId]),
		[gridRows, expanded],
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={gridRows}
					getRowId={(row) => row._gridId}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ minWidth: 1300 }}
				/>
			</Box>

			{expandedRows.map((row) => (
				<Collapse key={row._gridId} in unmountOnExit>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
							Readings — {row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`}
							{" · "}
							{spinningLabel(row)}
						</Typography>
						<GroupDetail group={row} />
					</Paper>
				</Collapse>
			))}

			<Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ""} />
		</Box>
	);
}
