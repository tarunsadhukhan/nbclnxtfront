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
 * @component JuteIssueIndexPage
 * @description Index page displaying aggregated Jute Issue records by date and branch.
 * Shows total weight per day/branch and aggregated status (Approved/Partial Approved/Draft).
 */

type JuteIssueSummaryRow = {
	id: string;
	issue_date: string;
	issue_date_raw?: string;
	branch_id: number;
	branch_name: string;
	total_weight: number;
	total_entries: number;
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

export default function JuteIssueIndexPage() {
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<JuteIssueSummaryRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [fromDate, setFromDate] = React.useState("");
	const [toDate, setToDate] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const downloadFetcher = React.useCallback(
		(p: { coId: string; search: string; fromDate: string; toDate: string }) =>
			fetchExcelBlob(apiRoutesPortalMasters.JUTE_ISSUE_DOWNLOAD, {
				coId: p.coId,
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
	} = useExcelDownload(downloadFetcher, "jute_issue");

	const columns = React.useMemo<GridColDef<JuteIssueSummaryRow>[]>(
		() => [
			{
				field: "issue_date",
				headerName: "Date",
				flex: 1,
				minWidth: 150,
				renderCell: (params: GridRenderCellParams<JuteIssueSummaryRow, string>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value || formatDate(params.row.issue_date_raw) || "-"}
					</Typography>
				),
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 180,
				renderCell: (params: GridRenderCellParams<JuteIssueSummaryRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "total_weight",
				headerName: "Weight (kg)",
				flex: 1,
				minWidth: 150,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteIssueSummaryRow, number>) => (
					<Typography component="span" variant="body2">
						{params.value != null ? params.value.toFixed(2) : "-"}
					</Typography>
				),
			},
			{
				field: "status",
				headerName: "Status",
				flex: 1,
				minWidth: 150,
				renderCell: (params: GridRenderCellParams<JuteIssueSummaryRow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Draft"} />
				),
			},
		],
		[]
	);

	const fetchJuteIssues = React.useCallback(async () => {
		if (!coId) {
			setErrorMessage("Company ID not available");
			return;
		}

		setLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams({
				co_id: coId,
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);
			if (fromDate) query.set("from_date", fromDate);
			if (toDate) query.set("to_date", toDate);

			const url = `${apiRoutesPortalMasters.JUTE_ISSUE_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const response = data as {
				data?: Array<Record<string, unknown>>;
				total?: number;
			};

			const rawRows = Array.isArray(response?.data) ? response.data : [];

			const mappedRows: JuteIssueSummaryRow[] = rawRows.map((r: Record<string, unknown>) => {
				const rawDate = (r.issue_date ?? "") as string;
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				const branchId = (r.branch_id ?? 0) as number;

				return {
					id: `${normalizedRaw}-${branchId}` || `jute-issue-${Math.random().toString(36).slice(2, 8)}`,
					issue_date_raw: normalizedRaw,
					issue_date: formatDate(normalizedRaw),
					branch_id: branchId,
					branch_name: (r.branch_name ?? "") as string,
					total_weight: (r.total_weight ?? 0) as number,
					total_entries: (r.total_entries ?? 0) as number,
					status: (r.status ?? "Draft") as string,
				};
			});

			setRows(mappedRows);
			const total = Number(response?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Jute Issues";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, paginationModel.page, paginationModel.pageSize, searchValue, fromDate, toDate]);

	React.useEffect(() => {
		if (coId) {
			fetchJuteIssues();
		}
	}, [fetchJuteIssues, coId]);

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
		download({ coId: String(coId ?? ""), search: searchValue, fromDate, toDate });
	}, [download, coId, searchValue, fromDate, toDate]);

	const handleView = React.useCallback(
		(row: JuteIssueSummaryRow) => {
			const dateParam = row.issue_date_raw;
			const branchId = row.branch_id;
			if (!dateParam || !branchId) return;
			router.push(`/dashboardportal/jutePurchase/juteIssue/edit?mode=view&date=${encodeURIComponent(dateParam)}&branch_id=${branchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JuteIssueSummaryRow) => {
			const dateParam = row.issue_date_raw;
			const branchId = row.branch_id;
			if (!dateParam || !branchId) return;
			router.push(`/dashboardportal/jutePurchase/juteIssue/edit?mode=edit&date=${encodeURIComponent(dateParam)}&branch_id=${branchId}`);
		},
		[router]
	);

	const handleCreate = React.useCallback(() => {
		router.push("/dashboardportal/jutePurchase/juteIssue/edit?mode=create");
	}, [router]);

	return (
		<IndexWrapper
			title="Jute Issue"
			subtitle="Daily summary of jute issues with total weight and status."
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
				placeholder: "Search by date",
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
					downloadDisabled={!coId || loading}
					mounted={mounted}
				/>
			}
			onView={handleView}
			onEdit={handleEdit}
			createAction={{
				label: "New Issue",
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
