"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Snackbar,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";

type DayRow = { id: number | string; [key: string]: unknown };

type RunSummary = {
	from_date: string;
	to_date: string;
	dates_processed: number;
	basic_inserted: number;
	process_inserted: number;
	failed: string[];
	punch_sync?: { inserted?: number; error?: string };
};

function today(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDT(value: unknown): string {
	if (!value) return "";
	const s = String(value);
	return s.length >= 19 ? s.slice(0, 19).replace("T", " ") : s;
}

function fmtD(value: unknown): string {
	if (!value) return "";
	return String(value).slice(0, 10);
}

/**
 * Bio Data Process tab — pick a period, run the processing chain over every
 * date in it (bio_attendance_basic + bio_attendance_process; daily_attendance
 * untouched), then browse either result table for the period.
 */
export default function BioProcessTab() {
	const [fromDate, setFromDate] = useState<string>(today());
	const [toDate, setToDate] = useState<string>(today());
	const [view, setView] = useState<"basic" | "process">("basic");
	const [rows, setRows] = useState<DayRow[]>([]);
	const [totalRows, setTotalRows] = useState(0);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
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

	const fetchRows = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");
			if (!fromDate || !toDate) throw new Error("Select a period");

			const params = new URLSearchParams({
				co_id,
				from_date: fromDate,
				to_date: toDate,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) params.append("search", searchQuery);

			const url =
				view === "basic"
					? apiRoutesPortalMasters.BIO_ATT_BASIC_LIST
					: apiRoutesPortalMasters.BIO_ATT_PROCESS_LIST;
			const { data, error } = await fetchWithCookie(`${url}?${params}`, "GET");
			if (error || !data) throw new Error(error || "Failed to fetch rows");

			const idField = view === "basic" ? "id" : "bio_att_process_id";
			const mapped: DayRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r[idField] as number,
					tran_date: fmtD(r.tran_date),
					attendance_date: fmtD(r.attendance_date),
					actual_in: fmtDT(r.actual_in),
					actual_out: fmtDT(r.actual_out),
					check_in: fmtDT(r.check_in),
					check_out: fmtDT(r.check_out),
				})
			);
			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching rows";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [fromDate, toDate, view, paginationModel.page, paginationModel.pageSize, searchQuery, getCoId]);

	useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	const handleRun = useCallback(async () => {
		setRunning(true);
		setRunSummary(null);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");
			if (!fromDate || !toDate) throw new Error("Select a period");

			const { data, error } = await fetchWithCookie<{
				status: string;
				result: RunSummary;
			}>(
				`${apiRoutesPortalMasters.BIO_ATT_PROCESS_RUN}?co_id=${co_id}`,
				"POST",
				{ from_date: fromDate, to_date: toDate }
			);
			if (error || !data) throw new Error(error || "Process failed");

			setRunSummary(data.result);
			setSnackbar({
				open: true,
				message: `Processed ${data.result.dates_processed} day(s): ${data.result.basic_inserted} basic, ${data.result.process_inserted} process row(s)`,
				severity: data.result.failed?.length ? "error" : "success",
			});
			fetchRows();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Process failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setRunning(false);
		}
	}, [fromDate, toDate, getCoId, fetchRows]);

	const basicColumns = useMemo<GridColDef<DayRow>[]>(
		() => [
			{ field: "tran_date", headerName: "Date", flex: 0.8, minWidth: 105 },
			{ field: "emp_code", headerName: "Emp Code", flex: 0.8, minWidth: 100 },
			{ field: "employee_name", headerName: "Employee", flex: 1.4, minWidth: 170 },
			{ field: "shift", headerName: "Shift", flex: 0.5, minWidth: 70 },
			{ field: "actual_in", headerName: "In", flex: 1.1, minWidth: 150 },
			{ field: "actual_out", headerName: "Out", flex: 1.1, minWidth: 150 },
			{ field: "work_dur_minutes", headerName: "Work (min)", flex: 0.7, minWidth: 95, type: "number" },
			{ field: "ot_minutes", headerName: "OT (min)", flex: 0.6, minWidth: 85, type: "number" },
			{ field: "break_minutes", headerName: "Break (min)", flex: 0.6, minWidth: 95, type: "number" },
			{ field: "late_by_minutes", headerName: "Late (min)", flex: 0.6, minWidth: 90, type: "number" },
			{ field: "status", headerName: "Status", flex: 1.1, minWidth: 150 },
		],
		[]
	);

	const processColumns = useMemo<GridColDef<DayRow>[]>(
		() => [
			{ field: "attendance_date", headerName: "Date", flex: 0.8, minWidth: 105 },
			{ field: "emp_code", headerName: "Emp Code", flex: 0.8, minWidth: 100 },
			{ field: "employee_name", headerName: "Employee", flex: 1.4, minWidth: 170 },
			{ field: "spell_name", headerName: "Spell", flex: 0.5, minWidth: 70 },
			{ field: "attendance_type", headerName: "Type", flex: 0.5, minWidth: 70 },
			{ field: "check_in", headerName: "Check In", flex: 1.1, minWidth: 150 },
			{ field: "check_out", headerName: "Check Out", flex: 1.1, minWidth: 150 },
			{ field: "Working_hours", headerName: "Working Hrs", flex: 0.7, minWidth: 100, type: "number" },
			{ field: "Ot_hours", headerName: "OT Hrs", flex: 0.6, minWidth: 85, type: "number" },
			{ field: "Time_duration", headerName: "Total Hrs", flex: 0.6, minWidth: 90, type: "number" },
		],
		[]
	);

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					alignItems: "center",
					mb: 2,
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
					variant="contained"
					onClick={handleRun}
					disabled={running || !fromDate || !toDate}
					startIcon={running ? <CircularProgress size={16} color="inherit" /> : undefined}
				>
					{running ? "Processing..." : "Run Process"}
				</Button>
				<ToggleButtonGroup
					size="small"
					exclusive
					value={view}
					onChange={(_e, v: "basic" | "process" | null) => {
						if (v) {
							setView(v);
							setPaginationModel((prev) => ({ ...prev, page: 0 }));
						}
					}}
				>
					<ToggleButton value="basic">Basic</ToggleButton>
					<ToggleButton value="process">Process</ToggleButton>
				</ToggleButtonGroup>
			</Box>

			{runSummary && (
				<Alert
					severity={runSummary.failed?.length ? "warning" : "success"}
					sx={{ mb: 2 }}
					onClose={() => setRunSummary(null)}
				>
					{runSummary.punch_sync?.inserted
						? `Fetched ${runSummary.punch_sync.inserted} new punch(es) from device log. `
						: ""}
					{`Processed ${runSummary.from_date} → ${runSummary.to_date} (${runSummary.dates_processed} day(s), incl. prior day): `}
					{`${runSummary.basic_inserted} basic row(s), ${runSummary.process_inserted} process row(s)`}
					{runSummary.failed?.length
						? ` — FAILED dates: ${runSummary.failed.join(", ")}`
						: ""}
					{runSummary.punch_sync?.error
						? ` — device log sync failed: ${runSummary.punch_sync.error}`
						: ""}
				</Alert>
			)}

			<IndexWrapper
				title={view === "basic" ? "Bio Attendance Basic" : "Bio Attendance Process"}
				rows={rows}
				columns={view === "basic" ? basicColumns : processColumns}
				rowCount={totalRows}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
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
