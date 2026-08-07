"use client";

import * as React from "react";
import { Alert, Box } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { MaturityReportRow } from "../types/reportTypes";
import { maturityColorClass } from "../../spreader/utils/maturityColor";

type Props = {
	rows: MaturityReportRow[];
	loading: boolean;
	error?: string | null;
};

export default function MaturityReportTable({ rows, loading, error }: Props) {
	const columns = React.useMemo<GridColDef<MaturityReportRow>[]>(
		() => [
			{ field: "issue_time", headerName: "Hr", width: 60 },
			{ field: "issue_spell", headerName: "Spell", width: 70 },
			{ field: "entry_id_grp", headerName: "Group", width: 80 },
			{ field: "bin_code", headerName: "Bin", width: 100 },
			{ field: "item_name", headerName: "Item", width: 180 },
			{ field: "wt_per_roll", headerName: "Wt/Roll", width: 90, type: "number" },
			{ field: "issue_rolls", headerName: "Issue Rolls", width: 110, type: "number" },
			{ field: "prod_entry_date", headerName: "Prod Date", width: 110 },
			{ field: "prod_entry_time", headerName: "Prod Hr", width: 90 },
			{ field: "prod_rolls", headerName: "Prod Rolls", width: 100, type: "number" },
			{
				field: "maturity_hrs",
				headerName: "Maturity (hrs)",
				width: 140,
				renderCell: (params) => {
					const m = params.row.maturity_hrs ?? 0;
					const t = params.row.target_maturity_hrs ?? 48;
					const cls = maturityColorClass(m, t);
					return <span className={`px-2 py-1 rounded ${cls}`}>{m}</span>;
				},
			},
			{ field: "target_maturity_hrs", headerName: "Target (hrs)", width: 110, type: "number" },
		],
		[]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{error ? <Alert severity="error">{error}</Alert> : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows.map((r, i) => ({ ...r, id: `${r.spreader_roll_issue_id}-${i}` }))}
					columns={columns}
					loading={loading}
					density="comfortable"
					disableRowSelectionOnClick
					pageSizeOptions={[10, 25, 50, 100]}
					initialState={{ pagination: { paginationModel: { pageSize: 50, page: 0 } } }}
					sx={{ width: "100%" }}
				/>
			</Box>
		</Box>
	);
}
