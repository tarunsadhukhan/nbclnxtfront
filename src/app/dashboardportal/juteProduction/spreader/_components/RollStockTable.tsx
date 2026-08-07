"use client";

import * as React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { RollStockRow, QualitySummaryRow } from "../types/spreaderTypes";
import { maturityColorClass } from "../utils/maturityColor";

type Props = {
	rows: RollStockRow[];
	summary: QualitySummaryRow[];
	loading: boolean;
};

export default function RollStockTable({ rows, summary, loading }: Props) {
	const [selectedItems, setSelectedItems] = React.useState<number[]>([]);
	const availableItems = React.useMemo(() => {
		const seen = new Map<number, string>();
		for (const r of rows) seen.set(r.item_id, r.item_name);
		return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
	}, [rows]);

	const filtered = React.useMemo(
		() => (selectedItems.length === 0 ? rows : rows.filter((r) => selectedItems.includes(r.item_id))),
		[rows, selectedItems]
	);

	const filteredSummary = React.useMemo(
		() =>
			selectedItems.length === 0
				? summary
				: summary.filter((s) => selectedItems.includes(s.item_id)),
		[summary, selectedItems]
	);

	const columns = React.useMemo<GridColDef<RollStockRow>[]>(
		() => [
			{ field: "bin_code", headerName: "Bin", width: 100 },
			{ field: "entry_id_grp", headerName: "Group", width: 80 },
			{ field: "item_name", headerName: "Item", width: 200 },
			{ field: "current_rolls", headerName: "Rolls", width: 90, type: "number" },
			{
				field: "current_mt",
				headerName: "Qty (MT)",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : ""),
			},
			{
				field: "maturity_hrs",
				headerName: "Maturity (hrs)",
				width: 130,
				type: "number",
				renderCell: (params) => {
					const target = params.row.target_maturity_hrs;
					const cls = maturityColorClass(params.row.maturity_hrs, target);
					return (
						<span className={`px-2 py-1 rounded ${cls}`}>{params.row.maturity_hrs}</span>
					);
				},
			},
			{ field: "target_maturity_hrs", headerName: "Target (hrs)", width: 110, type: "number" },
		],
		[]
	);

	const summaryColumns = React.useMemo<GridColDef<QualitySummaryRow>[]>(
		() => [
			{ field: "item_name", headerName: "Item", flex: 1, minWidth: 200 },
			{ field: "closing_rolls", headerName: "Rolls", width: 100, type: "number" },
			{
				field: "closing_mt",
				headerName: "Qty (MT)",
				width: 110,
				type: "number",
				valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : ""),
			},
		],
		[]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
				{availableItems.map((it) => {
					const active = selectedItems.includes(it.id);
					return (
						<Chip
							key={it.id}
							label={it.name}
							color={active ? "primary" : "default"}
							variant={active ? "filled" : "outlined"}
							onClick={() =>
								setSelectedItems((prev) =>
									prev.includes(it.id) ? prev.filter((x) => x !== it.id) : [...prev, it.id]
								)
							}
							sx={{ minHeight: 32 }}
						/>
					);
				})}
				{selectedItems.length > 0 ? (
					<Chip label="Clear filters" onDelete={() => setSelectedItems([])} onClick={() => setSelectedItems([])} />
				) : null}
			</Stack>
			<Box sx={{ width: "100%" }}>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Current Roll Stock (Bin × Group × Item)
				</Typography>
				<DataGrid
					autoHeight
					rows={filtered.map((r, i) => ({ ...r, id: `${r.bin_id}-${r.entry_id_grp}-${i}` }))}
					columns={columns}
					loading={loading}
					density="comfortable"
					disableRowSelectionOnClick
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ width: "100%" }}
				/>
			</Box>
			<Box sx={{ width: "100%" }}>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Quality-wise Closing Stock
				</Typography>
				<DataGrid
					autoHeight
					rows={filteredSummary.map((r) => ({ ...r, id: r.item_id }))}
					columns={summaryColumns}
					loading={loading}
					density="comfortable"
					disableRowSelectionOnClick
					hideFooter
					sx={{ width: "100%" }}
				/>
			</Box>
		</Box>
	);
}
