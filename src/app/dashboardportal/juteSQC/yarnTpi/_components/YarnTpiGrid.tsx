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
import { computeTpiPreview } from "../utils/yarnTpiCalc";
import type { YarnTpiGroup, YarnTpiStats } from "../types/yarnTpiTypes";

type Props = {
	coId: string;
	groups: YarnTpiGroup[];
	loading: boolean;
	onDeleted: () => void;
};

// Server-side id of a saved test, or null. Used for delete — never as a grid key.
function serverId(g: YarnTpiGroup): number | null {
	return g.yarn_tpi_id ?? null;
}

// Grid row = group + a guaranteed-unique key. Insert-only saves allow duplicate
// tests sharing every server-visible field, so the row's list index is the only
// collision-free key for DataGrid.
type GridRow = YarnTpiGroup & { _gridId: string };

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Stats come from the server; fall back to client compute if absent (e.g. an
// optimistic render before a refresh lands).
function statsFor(g: YarnTpiGroup): YarnTpiStats {
	if (g.stats) return g.stats;
	const p = computeTpiPreview(g.readings ?? []);
	const stdTpi = g.std_tpi ?? null;
	return {
		...p,
		std_tpi: stdTpi,
		tpi_diff: p.avg_tpi != null && stdTpi != null ? Math.round((p.avg_tpi - stdTpi) * 100) / 100 : null,
	};
}

function ReadingsDetail({ group }: { group: YarnTpiGroup }) {
	const readings = (group.readings ?? []).filter((r) => r != null);
	if (readings.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
				No readings recorded for this test.
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
								#{i + 1}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						{readings.map((r, i) => (
							<TableCell key={i} align="right">
								{fmt(r as number, 2)}
							</TableCell>
						))}
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
}

export default function YarnTpiGrid({ coId, groups, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

	const toggleExpand = React.useCallback((gridId: string) => {
		setExpanded((prev) => ({ ...prev, [gridId]: !prev[gridId] }));
	}, []);

	const handleDelete = React.useCallback(
		async (id: number | null) => {
			if (typeof id !== "number") {
				setSnack("This test cannot be deleted (no server id).");
				return;
			}
			if (!confirm(`Delete TPI test #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.YARN_TPI_SQC_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted TPI test #${id}`);
			onDeleted();
		},
		[coId, onDeleted]
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
					<Tooltip title="Delete test">
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
				width: 180,
				valueGetter: (_value, row) => row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`,
			},
			{
				field: "machine_name",
				headerName: "SPINNING FRAME",
				width: 170,
				valueGetter: (_value, row) =>
					row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "count_lbs",
				headerName: "COUNT (lbs)",
				width: 120,
				type: "number",
				valueGetter: (_value, row) => row.count_lbs ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "std_tpi",
				headerName: "STD.TPI",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).std_tpi,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_tpi",
				headerName: "AVG TPI",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).avg_tpi,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "tpi_diff",
				headerName: "AVG − STD",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).tpi_diff,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "std_dev",
				headerName: "STD DEV",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).std_dev,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "cv_pct",
				headerName: "CV %",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).cv_pct,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "min_tpi",
				headerName: "MIN",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).min_tpi,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "max_tpi",
				headerName: "MAX",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => statsFor(row).max_tpi,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "prepared_by",
				headerName: "PREPARED BY",
				width: 150,
				valueGetter: (_value, row) => row.prepared_by ?? "—",
			},
		],
		[expanded, handleDelete, toggleExpand]
	);

	const gridRows = React.useMemo<GridRow[]>(
		() => groups.map((g, i) => ({ ...g, _gridId: `${serverId(g) ?? "new"}-${i}` })),
		[groups]
	);

	const expandedRows = React.useMemo(
		() => gridRows.filter((r) => expanded[r._gridId]),
		[gridRows, expanded]
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
							{row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—")}
						</Typography>
						<ReadingsDetail group={row} />
					</Paper>
				</Collapse>
			))}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
