"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Box, Button, Snackbar, TextField, Typography } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { FileSpreadsheet } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

type DayMeta = { date: string; label: string; dow: number };

type ReportRow = {
	eb_id: number;
	emp_code: string | null;
	employee_name: string | null;
	days: string[];
	total_days: number;
	late_count: number;
	appr_days: number;
};

type GridRow = { id: number; [key: string]: unknown };

function monthStart(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function today(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Monthly In-Out report (legacy "Monthly InOut Report" layout): one row per
 * bio-linked employee, one column per day showing the IN and OUT punch times
 * stacked ("00:00" when the out punch is missing), WO on the employee's weekly
 * off, A when absent. Totals: Total Days, Late Count, Appr. Days.
 */
export default function BioInOutReportTab() {
	const [fromDate, setFromDate] = useState<string>(monthStart());
	const [toDate, setToDate] = useState<string>(today());
	const [days, setDays] = useState<DayMeta[]>([]);
	const [allRows, setAllRows] = useState<GridRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 25,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const getBranchIds = useCallback((): string => {
		const raw = localStorage.getItem("sidebar_selectedBranches");
		if (!raw) return "";
		try {
			const branches = JSON.parse(raw) as number[];
			return Array.isArray(branches) && branches.length > 0 ? branches.join(",") : "";
		} catch {
			return "";
		}
	}, []);

	const fetchReport = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");
			if (!fromDate || !toDate) throw new Error("Select a period");

			const params = new URLSearchParams({
				co_id,
				from_date: fromDate,
				to_date: toDate,
			});
			const branch_id = getBranchIds();
			if (branch_id) params.append("branch_id", branch_id);
			if (searchQuery) params.append("search", searchQuery);

			const { data, error } = await fetchWithCookie<{
				days: DayMeta[];
				data: ReportRow[];
			}>(`${apiRoutesPortalMasters.BIO_ATT_INOUT_REPORT}?${params}`, "GET");
			if (error || !data) throw new Error(error || "Failed to generate report");

			setDays(data.days || []);
			setAllRows(
				(data.data || []).map((r) => {
					const row: GridRow = {
						id: r.eb_id,
						emp_code: r.emp_code ?? "",
						employee_name: r.employee_name ?? "",
						total_days: r.total_days,
						late_count: r.late_count,
						appr_days: r.appr_days,
					};
					r.days.forEach((cell, i) => {
						row[`d${i}`] = cell;
					});
					return row;
				})
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to generate report";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [fromDate, toDate, searchQuery, getCoId, getBranchIds]);

	useEffect(() => {
		fetchReport();
	}, [fetchReport]);

	const pagedRows = useMemo(() => {
		const start = paginationModel.page * paginationModel.pageSize;
		return allRows.slice(start, start + paginationModel.pageSize);
	}, [allRows, paginationModel]);

	const handleExcel = useCallback(async () => {
		try {
			const blob = await fetchExcelBlob(apiRoutesPortalMasters.BIO_ATT_INOUT_REPORT_EXCEL, {
				coId: getCoId(),
				branchId: getBranchIds() || null,
				search: searchQuery || null,
				fromDate,
				toDate,
			});
			const { saveAs } = await import("file-saver");
			saveAs(blob, `MonthlyInOut_${fromDate}_${toDate}.xlsx`);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Excel export failed";
			setSnackbar({ open: true, message, severity: "error" });
		}
	}, [fromDate, toDate, searchQuery, getCoId, getBranchIds]);

	const columns = useMemo<GridColDef<GridRow>[]>(() => {
		const dayCols: GridColDef<GridRow>[] = days.map((day, i) => ({
			field: `d${i}`,
			headerName: day.label,
			description: day.date,
			width: 86,
			sortable: false,
			align: "center",
			headerAlign: "center",
			// Block element with its own line-height: an inline span inherits the
			// cell's 52px row line-height per line, hiding the second time.
			renderCell: (params: GridRenderCellParams<GridRow>) => (
				<div
					style={{
						whiteSpace: "pre-line",
						fontSize: 12,
						lineHeight: "16px",
						textAlign: "center",
						width: "100%",
						alignSelf: "center",
					}}
				>
					{String(params.value ?? "")}
				</div>
			),
		}));
		return [
			{ field: "emp_code", headerName: "Emp Code", width: 110 },
			{ field: "employee_name", headerName: "EMP Name", width: 180 },
			...dayCols,
			{ field: "total_days", headerName: "Total Days", width: 90, type: "number", align: "center", headerAlign: "center" },
			{ field: "late_count", headerName: "Late Count", width: 90, type: "number", align: "center", headerAlign: "center" },
			{ field: "appr_days", headerName: "Appr. Days", width: 90, type: "number", align: "center", headerAlign: "center" },
		];
	}, [days]);

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					alignItems: "center",
					mb: 1,
				}}
			>
				<TextField
					label="From Date"
					type="date"
					size="small"
					value={fromDate}
					onChange={(e) => {
						setFromDate(e.target.value);
						setPaginationModel((prev) => ({ ...prev, page: 0 }));
					}}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="To Date"
					type="date"
					size="small"
					value={toDate}
					onChange={(e) => {
						setToDate(e.target.value);
						setPaginationModel((prev) => ({ ...prev, page: 0 }));
					}}
					InputLabelProps={{ shrink: true }}
				/>
				<Button
					variant="outlined"
					startIcon={<FileSpreadsheet size={16} />}
					onClick={handleExcel}
					disabled={loading || allRows.length === 0}
				>
					Excel
				</Button>
			</Box>

			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
				Each day cell shows check-in over check-out (00:00 = no out punch) · WO = employee&apos;s weekly off · A = absent
			</Typography>

			<IndexWrapper
				title="Monthly In-Out Report"
				rows={pagedRows}
				columns={columns}
				rowCount={allRows.length}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
				showLoadingUntilLoaded
				search={{
					value: searchQuery,
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
						setSearchQuery(e.target.value);
						setPaginationModel((prev) => ({ ...prev, page: 0 }));
					},
					placeholder: "Search by emp code or name",
					debounceDelayMs: 500,
				}}
			/>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
