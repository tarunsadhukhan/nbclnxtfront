"use client";

import * as React from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { PivotRow } from "../types/reportTypes";

type Props = {
	title: string;
	entityHeader: string;
	rows: PivotRow[];
};

const SHIFT_COLS: Array<keyof PivotRow> = ["A1", "A2", "A", "B1", "B2", "B", "C", "Total"];

export default function PivotTable({ title, entityHeader, rows }: Props) {
	const totals = React.useMemo(() => {
		const t: Record<string, number> = { A1: 0, A2: 0, A: 0, B1: 0, B2: 0, B: 0, C: 0, Total: 0 };
		for (const r of rows) for (const col of SHIFT_COLS) t[col] += Number(r[col] ?? 0);
		return t;
	}, [rows]);

	return (
		<Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				{title}
			</Typography>
			<Box sx={{ overflowX: "auto", width: "100%" }}>
				<table
					style={{
						width: "100%",
						minWidth: 700,
						borderCollapse: "collapse",
						fontSize: 14,
					}}
				>
					<thead>
						<tr>
							<th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8, position: "sticky", left: 0, background: "#fafafa" }}>
								{entityHeader}
							</th>
							{SHIFT_COLS.map((c) => (
								<th key={String(c)} style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
									{String(c)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.entity_id}>
								<td style={{ padding: 8, borderBottom: "1px solid #eee", position: "sticky", left: 0, background: "#fff" }}>
									{r.entity_name}
								</td>
								{SHIFT_COLS.map((c) => (
									<td key={String(c)} style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
										{r[c]}
									</td>
								))}
							</tr>
						))}
						<tr style={{ fontWeight: 600, background: "#fafafa" }}>
							<td style={{ padding: 8, position: "sticky", left: 0, background: "#fafafa" }}>Total</td>
							{SHIFT_COLS.map((c) => (
								<td key={String(c)} style={{ textAlign: "right", padding: 8 }}>
									{totals[String(c)]}
								</td>
							))}
						</tr>
					</tbody>
				</table>
			</Box>
		</Paper>
	);
}
