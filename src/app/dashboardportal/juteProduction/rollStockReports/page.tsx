"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Card,
	CardContent,
	MenuItem,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { todayISO } from "../spreader/utils/shift";
import { useMaturityReport, useProductionSummary } from "./hooks/useReports";
import MaturityReportTable from "./_components/MaturityReportTable";
import PivotTable from "./_components/PivotTable";

const TABS = ["Maturity Time", "Spreader Production"] as const;
const SHIFTS = ["A1", "B1", "A2", "B2", "C"] as const;

export default function RollStockReportsPage() {
	const { coId } = useSelectedCompanyCoId();
	const [tab, setTab] = React.useState(0);

	// Tab 1
	const [issueDate, setIssueDate] = React.useState<string>(todayISO());
	const maturity = useMaturityReport(coId, issueDate);

	// Tab 2
	const [reportDate, setReportDate] = React.useState<string>(todayISO());
	const [selSpreaders, setSelSpreaders] = React.useState<number[]>([]);
	const [selItems, setSelItems] = React.useState<number[]>([]);
	const [selShifts, setSelShifts] = React.useState<string[]>([]);
	const summary = useProductionSummary(coId, reportDate, selSpreaders, selItems, selShifts);

	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const availableSpreaders = React.useMemo(() => {
		if (!summary.data) return [] as Array<{ id: number; name: string }>;
		const map = new Map<number, string>();
		for (const r of summary.data.rows) map.set(r.machine_id, r.machine_name);
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [summary.data]);

	const availableItems = React.useMemo(() => {
		if (!summary.data) return [] as Array<{ id: number; name: string }>;
		const map = new Map<number, string>();
		for (const r of summary.data.rows) map.set(r.item_id, r.item_name);
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [summary.data]);

	if (!mounted) {
		return null;
	}

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Roll Stock Reports
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Maturity time by issue & spreader production summary.
			</Typography>

			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				variant="scrollable"
				scrollButtons="auto"
				allowScrollButtonsMobile
				sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
			>
				{TABS.map((label) => (
					<Tab key={label} label={label} sx={{ minHeight: 44 }} />
				))}
			</Tabs>

			{tab === 0 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<TextField
						type="date"
						size="small"
						label="Issue Date"
						value={issueDate}
						onChange={(e) => setIssueDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
						sx={{ maxWidth: 220 }}
					/>
					<MaturityReportTable
						rows={maturity.rows}
						loading={maturity.loading}
						error={maturity.error}
					/>
				</Box>
			) : null}

			{tab === 1 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Box
						sx={{
							display: "grid",
							gap: 2,
							gridTemplateColumns: {
								xs: "1fr",
								sm: "repeat(2, minmax(0, 1fr))",
								md: "repeat(4, minmax(0, 1fr))",
							},
						}}
					>
						<TextField
							type="date"
							size="small"
							label="Production Date"
							value={reportDate}
							onChange={(e) => setReportDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							select
							size="small"
							label="Spreaders"
							SelectProps={{ multiple: true, value: selSpreaders, onChange: (e) => setSelSpreaders(e.target.value as unknown as number[]) }}
						>
							{availableSpreaders.map((s) => (
								<MenuItem key={s.id} value={s.id}>
									{s.name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							size="small"
							label="Items"
							SelectProps={{ multiple: true, value: selItems, onChange: (e) => setSelItems(e.target.value as unknown as number[]) }}
						>
							{availableItems.map((i) => (
								<MenuItem key={i.id} value={i.id}>
									{i.name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							size="small"
							label="Shifts"
							SelectProps={{ multiple: true, value: selShifts, onChange: (e) => setSelShifts(e.target.value as unknown as string[]) }}
						>
							{SHIFTS.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</TextField>
					</Box>

					{summary.error ? <Alert severity="error">{summary.error}</Alert> : null}

					{summary.data ? (
						<>
							<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
								<Card variant="outlined" sx={{ minWidth: 160 }}>
									<CardContent>
										<Typography variant="caption" color="text.secondary">
											Total Rolls
										</Typography>
										<Typography variant="h6">{summary.data.totals.rolls}</Typography>
									</CardContent>
								</Card>
								<Card variant="outlined" sx={{ minWidth: 160 }}>
									<CardContent>
										<Typography variant="caption" color="text.secondary">
											Weight (MT)
										</Typography>
										<Typography variant="h6">{summary.data.totals.weight_mt.toFixed(3)}</Typography>
									</CardContent>
								</Card>
								<Card variant="outlined" sx={{ minWidth: 160 }}>
									<CardContent>
										<Typography variant="caption" color="text.secondary">
											Spreaders
										</Typography>
										<Typography variant="h6">{summary.data.totals.unique_spreaders}</Typography>
									</CardContent>
								</Card>
								<Card variant="outlined" sx={{ minWidth: 160 }}>
									<CardContent>
										<Typography variant="caption" color="text.secondary">
											Items
										</Typography>
										<Typography variant="h6">{summary.data.totals.unique_items}</Typography>
									</CardContent>
								</Card>
							</Stack>
							<PivotTable
								title="Spreader-wise Production (Rolls)"
								entityHeader="Spreader"
								rows={summary.data.spreader_pivot}
							/>
							<PivotTable
								title="Quality-wise Production (Rolls)"
								entityHeader="Item"
								rows={summary.data.quality_pivot}
							/>
						</>
					) : null}
				</Box>
			) : null}
		</Box>
	);
}
