"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import DateRangeToolbar from "@/components/ui/DateRangeToolbar";
import { useRouter } from "next/navigation";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useExcelDownload } from "@/hooks/useExcelDownload";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

/**
 * @component BatchPlanIndexPage
 * @description Index page displaying Batch Plan Daily Assignments grouped by date and branch.
 * Shows total assignments per day/branch and aggregated status (Approved/Partial/Draft).
 */

type BatchAssignSummaryRow = {
	id: string;
	assign_date: string;
	assign_date_raw: string;
	branch_id: number;
	branch_name: string;
	total_assignments: number;
	status: string;
};

const formatDate = (value?: string) => {
	if (!value) return "-";
	const trimmed = value.trim();
	let date: Date | null = null;
	const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (ymdMatch) {
		const [, year, month, day] = ymdMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			date = parsed;
		}
	}
	if (!date || Number.isNaN(date.getTime())) {
		return trimmed;
	}
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
};

const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized === "approved") return "success";
	if (normalized.includes("partial")) return "warning";
	if (normalized.includes("draft")) return "info";
	return "default";
};

export default function BatchPlanIndexPage() {
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<BatchAssignSummaryRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [fromDate, setFromDate] = React.useState("");
	const [toDate, setToDate] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [branchIdState, setBranchIdState] = React.useState<string>("");
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const downloadFetcher = React.useCallback(
		(p: { branchId: string; search: string; fromDate: string; toDate: string }) =>
			fetchExcelBlob(apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_DOWNLOAD, {
				branchId: p.branchId,
				search: p.search,
				fromDate: p.fromDate || null,
				toDate: p.toDate || null,
			}),
		[]
	);
	const {
		download,
		downloading,
		error: downloadError,
		clearError: clearDownloadError,
	} = useExcelDownload(downloadFetcher, "batch_daily_assign");

	const columns = React.useMemo<GridColDef<BatchAssignSummaryRow>[]>(
		() => [
			{
				field: "assign_date",
				headerName: "Date",
				flex: 1,
				minWidth: 150,
				renderCell: (params: GridRenderCellParams<BatchAssignSummaryRow, string>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value || formatDate(params.row.assign_date_raw) || "-"}
					</Typography>
				),
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 180,
				renderCell: (params: GridRenderCellParams<BatchAssignSummaryRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "total_assignments",
				headerName: "Assignments",
				flex: 1,
				minWidth: 150,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<BatchAssignSummaryRow, number>) => (
					<Typography component="span" variant="body2">
						{params.value != null ? params.value : "-"}
					</Typography>
				),
			},
			{
				field: "status",
				headerName: "Status",
				flex: 1,
				minWidth: 150,
				renderCell: (params: GridRenderCellParams<BatchAssignSummaryRow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Draft"} />
				),
			},
		],
		[]
	);

	const fetchBatchAssignments = React.useCallback(async () => {
		if (!coId) {
			setErrorMessage("Company ID not available");
			return;
		}

		let branchId: string | undefined;
		try {
			const storedBranches = localStorage.getItem("sidebar_selectedBranches");
			if (storedBranches) {
				const parsed: unknown = JSON.parse(storedBranches);
				if (Array.isArray(parsed) && parsed.length > 0) {
					branchId = String(parsed[0]);
				}
			}
		} catch {
			// ignore parse errors — branchId remains undefined
		}
		setBranchIdState(branchId ?? "");

		setLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams({
				co_id: coId,
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (branchId) query.set("branch_id", branchId);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);
			if (fromDate) query.set("from_date", fromDate);
			if (toDate) query.set("to_date", toDate);

			const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const response = data as {
				data?: Array<Record<string, unknown>>;
				total?: number;
			};

			const rawRows = Array.isArray(response?.data) ? response.data : [];

			const mappedRows: BatchAssignSummaryRow[] = rawRows.map((r: Record<string, unknown>) => {
				const rawDate = (r.assign_date ?? "") as string;
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				const bId = (r.branch_id ?? 0) as number;

				return {
					id: `${normalizedRaw}-${bId}` || `batch-assign-${Math.random().toString(36).slice(2, 8)}`,
					assign_date_raw: normalizedRaw,
					assign_date: formatDate(normalizedRaw),
					branch_id: bId,
					branch_name: (r.branch_name ?? "") as string,
					total_assignments: (r.total_assignments ?? 0) as number,
					status: (r.status ?? "Draft") as string,
				};
			});

			setRows(mappedRows);
			const total = Number(response?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Batch Assignments";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, paginationModel.page, paginationModel.pageSize, searchValue, fromDate, toDate]);

	React.useEffect(() => {
		if (coId) {
			fetchBatchAssignments();
		}
	}, [fetchBatchAssignments, coId]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleFromDateChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setFromDate(event.target.value);
	}, []);

	const handleToDateChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setToDate(event.target.value);
	}, []);

	const handleClearDates = React.useCallback(() => {
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setFromDate("");
		setToDate("");
	}, []);

	const handleDownload = React.useCallback(() => {
		download({ branchId: branchIdState, search: searchValue, fromDate, toDate });
	}, [download, branchIdState, searchValue, fromDate, toDate]);

	const handleView = React.useCallback(
		(row: BatchAssignSummaryRow) => {
			const dateParam = row.assign_date_raw;
			const rowBranchId = row.branch_id;
			if (!dateParam || !rowBranchId) return;
			router.push(`/dashboardportal/jutePurchase/batchPlan/edit?mode=view&date=${encodeURIComponent(dateParam)}&branch_id=${rowBranchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: BatchAssignSummaryRow) => {
			const dateParam = row.assign_date_raw;
			const rowBranchId = row.branch_id;
			if (!dateParam || !rowBranchId) return;
			router.push(`/dashboardportal/jutePurchase/batchPlan/edit?mode=edit&date=${encodeURIComponent(dateParam)}&branch_id=${rowBranchId}`);
		},
		[router]
	);

	const handleCreate = React.useCallback(() => {
		router.push("/dashboardportal/jutePurchase/batchPlan/edit?mode=create");
	}, [router]);

	return (
		<IndexWrapper
			title="Batch Plan Daily Assignment"
			subtitle="Daily summary of batch plan assignments by date and branch."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchValue,
				onChange: handleSearchChange,
				placeholder: "Search by date or branch",
				debounceDelayMs: 500,
			}}
			toolbarContent={
				<DateRangeToolbar
					fromDate={fromDate}
					toDate={toDate}
					onFromDateChange={handleFromDateChange}
					onToDateChange={handleToDateChange}
					onClearDates={handleClearDates}
					onDownload={handleDownload}
					downloading={downloading}
					downloadDisabled={!branchIdState || loading}
					mounted={mounted}
				/>
			}
			onView={handleView}
			onEdit={handleEdit}
			createAction={{
				label: "New Assignment",
				onClick: handleCreate,
			}}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
			{downloadError ? (
				<Alert severity="error" sx={{ mt: 2 }} onClose={clearDownloadError}>
					{downloadError}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
