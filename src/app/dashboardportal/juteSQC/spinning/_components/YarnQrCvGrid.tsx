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
import type { SqcQrCvGroup, SqcQrCvReading } from "../types/sqcSpinningTypes";

type Props = {
	coId: string;
	groups: SqcQrCvGroup[];
	loading: boolean;
	onDeleted: () => void;
};

// Server-side id of a saved group, or null if not yet persisted. Used for delete —
// never as a grid key.
function serverId(g: SqcQrCvGroup): number | null {
	return g.spinning_sqc_qr_cv_id ?? null;
}

// Grid row = group + a guaranteed-unique key. Insert-only saves allow duplicate
// groups sharing every server-visible field, so the row's list index is the only
// collision-free key for DataGrid (mirrors CountGrid's _gridId).
type GridRow = SqcQrCvGroup & { _gridId: string };

// Render a numeric stat to fixed dp, or "—" for null/undefined.
function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Build the 6×5 reading matrix for one group: rows = spindle nos (in first-seen
// order), columns = reading_no 1..5.
function readingMatrix(readings: SqcQrCvReading[]): {
	spindles: number[];
	cell: (spindle: number, readingNo: number) => number | null;
} {
	const spindles: number[] = [];
	const map = new Map<string, number | null>();
	for (const r of readings) {
		if (!spindles.includes(r.spindle_no)) spindles.push(r.spindle_no);
		map.set(`${r.spindle_no}-${r.reading_no}`, r.reading_val);
	}
	return {
		spindles,
		cell: (spindle, readingNo) => map.get(`${spindle}-${readingNo}`) ?? null,
	};
}

function GroupDetail({ group }: { group: SqcQrCvGroup }) {
	const { spindles, cell } = readingMatrix(group.readings ?? []);
	if (spindles.length === 0) {
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
						<TableCell>Spindle No.</TableCell>
						<TableCell align="right">R1</TableCell>
						<TableCell align="right">R2</TableCell>
						<TableCell align="right">R3</TableCell>
						<TableCell align="right">R4</TableCell>
						<TableCell align="right">R5</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{spindles.map((spindle) => (
						<TableRow key={spindle}>
							<TableCell>{spindle}</TableCell>
							{[1, 2, 3, 4, 5].map((readingNo) => (
								<TableCell key={readingNo} align="right">
									{fmt(cell(spindle, readingNo), 3)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

export default function YarnQrCvGrid({ coId, groups, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	// Which group rows have their 6×5 reading matrix expanded (keyed by _gridId).
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
			if (!confirm(`Delete QR/CV group #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.SPINNING_SQC_QR_CV_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted QR/CV group #${id}`);
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
				width: 180,
				valueGetter: (_value, row) =>
					row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`,
			},
			{
				field: "machine_name",
				headerName: "MC No.",
				width: 150,
				valueGetter: (_value, row) =>
					row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
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
				field: "avg_bs",
				headerName: "AVG B/S",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => row.stats?.avg_bs ?? null,
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
		],
		[expanded, handleDelete, toggleExpand]
	);

	// Index is the only collision-free key when two identical groups exist.
	const gridRows = React.useMemo<GridRow[]>(
		() => groups.map((g, i) => ({ ...g, _gridId: `${serverId(g) ?? "new"}-${i}` })),
		[groups]
	);

	// Detail matrices render below the grid for any expanded rows (DataGrid has no
	// built-in master/detail in the free tier, so we toggle a separate panel).
	const expandedRows = React.useMemo(
		() => gridRows.filter((r) => expanded[r._gridId]),
		[gridRows, expanded]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-group QR/CV summary: observed count + MR% (from R-08-16) and computed stats */}
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
					sx={{ minWidth: 1100 }}
				/>
			</Box>

			{/* Expandable 6×5 reading matrices for any toggled-open groups */}
			{expandedRows.map((row) => (
				<Collapse key={row._gridId} in unmountOnExit>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
							Readings — {row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`}
							{" · "}
							{row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—")}
						</Typography>
						<GroupDetail group={row} />
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
