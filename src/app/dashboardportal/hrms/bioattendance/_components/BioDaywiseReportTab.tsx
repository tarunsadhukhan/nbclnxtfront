"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Box, Button, Snackbar, TextField, Typography } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { FileSpreadsheet } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

type DayMeta = { date: string; day: number; dow: number };

type ReportRow = {
	eb_id: number;
	emp_code: string | null;
	employee_name: string | null;
	days: string[];
	total_present: number;
	total_half: number;
	total_wop: number;
	total_woa: number;
	total_absent: number;
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
 * Day-wise attendance report: one row per bio-linked employee, one column per
 * day of the period. Cell legend: P (>5h), 1/2P (2–5h), A (absent),
 * WO (weekly off), WOP (present on weekly off), WOA (off day sandwiched by
 * absences). Totals per employee.
 */
export default function BioDaywiseReportTab() {
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
			}>(`${apiRoutesPortalMasters.BIO_ATT_DAYWISE_REPORT}?${params}`, "GET");
			if (error || !data) throw new Error(error || "Failed to generate report");

			setDays(data.days || []);
			setAllRows(
				(data.data || []).map((r) => {
					const row: GridRow = {
						id: r.eb_id,
						emp_code: r.emp_code ?? "",
						employee_name: r.employee_name ?? "",
						total_present: r.total_present,
						total_half: r.total_half,
						total_wop: r.total_wop,
						total_woa: r.total_woa,
						total_absent: r.total_absent,
					};
					r.days.forEach((status, i) => {
						row[`d${i}`] = status;
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

	// Report comes back whole; page it client-side behind IndexWrapper's
	// server-style pagination props.
	const pagedRows = useMemo(() => {
		const start = paginationModel.page * paginationModel.pageSize;
		return allRows.slice(start, start + paginationModel.pageSize);
	}, [allRows, paginationModel]);

	// Server-generated register: company + period title block, bordered table,
	// day/month column headers — styling the client-side xlsx lib can't do.
	const handleExcel = useCallback(async () => {
		try {
			const blob = await fetchExcelBlob(apiRoutesPortalMasters.BIO_ATT_DAYWISE_REPORT_EXCEL, {
				coId: getCoId(),
				branchId: getBranchIds() || null,
				search: searchQuery || null,
				fromDate,
				toDate,
			});
			const { saveAs } = await import("file-saver");
			saveAs(blob, `AttendanceRegister_${fromDate}_${toDate}.xlsx`);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Excel export failed";
			setSnackbar({ open: true, message, severity: "error" });
		}
	}, [fromDate, toDate, searchQuery, getCoId, getBranchIds]);

	const columns = useMemo<GridColDef<GridRow>[]>(() => {
		const dayCols: GridColDef<GridRow>[] = days.map((day, i) => ({
			field: `d${i}`,
			headerName: String(day.day),
			description: day.date,
			width: 58,
			sortable: false,
			align: "center",
			headerAlign: "center",
		}));
		return [
			{ field: "emp_code", headerName: "Emp Code", width: 110 },
			{ field: "employee_name", headerName: "Name", width: 180 },
			...dayCols,
			{ field: "total_present", headerName: "P", width: 60, type: "number", align: "center", headerAlign: "center" },
			{ field: "total_half", headerName: "1/2P", width: 65, type: "number", align: "center", headerAlign: "center" },
			{ field: "total_wop", headerName: "WOP", width: 65, type: "number", align: "center", headerAlign: "center" },
			{ field: "total_woa", headerName: "WOA", width: 65, type: "number", align: "center", headerAlign: "center" },
			{ field: "total_absent", headerName: "A", width: 60, type: "number", align: "center", headerAlign: "center" },
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
				P = present (&gt;5h) · 1/2P = half day (2–5h) · A = absent · WO = employee&apos;s weekly off · WOP = present on weekly off · WOA = weekly off with absence before &amp; after
			</Typography>

			<IndexWrapper
				title="Day Wise Report"
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
