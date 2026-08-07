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
import { createNotEqualEditCheck } from "@/utils/editability";
import { useExcelDownload } from "@/hooks/useExcelDownload";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

/**
 * @component JuteBillPassIndexPage
 * @description Index page displaying list of Jute Bill Passes (approved MRs) with pagination and search.
 * Columns: Bill Pass No, Bill Pass Date, MR No, Supplier, Party, Invoice No, Invoice Date, Amount
 */

type JuteBillPassRow = {
	id: string | number;
	bill_pass_no: string | null;
	bill_pass_date: string;
	bill_pass_date_raw?: string;
	mr_no: string | null;
	mr_date: string;
	supplier_name: string;
	party_name: string | null;
	invoice_no: string | null;
	invoice_date: string | null;
	invoice_date_raw?: string;
	amount: number | null;
	status: string;
	bill_pass_complete: number | null;
};

/**
 * Formats a date string to DD-MMM-YYYY format
 */
const formatDate = (value?: string | null): string => {
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

/**
 * Formats currency amount
 */
const formatAmount = (value?: number | null): string => {
	if (value == null) return "-";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

/**
 * Gets status chip color based on status string
 */
const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("approved") || normalized.includes("closed")) return "success";
	if (normalized.includes("rejected") || normalized.includes("cancelled")) return "error";
	if (normalized.includes("pending") || normalized.includes("open")) return "warning";
	if (normalized.includes("draft")) return "info";
	return "default";
};

export default function JuteBillPassIndexPage() {
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<JuteBillPassRow[]>([]);
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
			fetchExcelBlob(apiRoutesPortalMasters.JUTE_BILL_PASS_DOWNLOAD, {
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
	} = useExcelDownload(downloadFetcher, "jute_bill_pass");

	const handleView = React.useCallback(
		(row: JuteBillPassRow) => {
			const id = row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/billPass/view?id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JuteBillPassRow) => {
			const id = row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/billPass/edit?id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	// Row is editable when bill_pass_complete is not 1
	const isRowEditable = React.useMemo(
		() => createNotEqualEditCheck<JuteBillPassRow>("bill_pass_complete", 1),
		[]
	);

	const columns = React.useMemo<GridColDef<JuteBillPassRow>[]>(
		() => [
			{
				field: "bill_pass_no",
				headerName: "Bill Pass No",
				flex: 0.8,
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string | null>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "bill_pass_date",
				headerName: "Bill Pass Date",
				minWidth: 130,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || formatDate(params.row.bill_pass_date_raw) || "-"}
					</Typography>
				),
			},
			{
				field: "mr_no",
				headerName: "MR No",
				flex: 0.7,
				minWidth: 100,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "supplier_name",
				headerName: "Supplier",
				flex: 1.2,
				minWidth: 150,
			},
			{
				field: "party_name",
				headerName: "Party",
				flex: 1.2,
				minWidth: 140,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "invoice_no",
				headerName: "Invoice No",
				flex: 0.9,
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "invoice_date",
				headerName: "Invoice Date",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || formatDate(params.row.invoice_date_raw) || "-"}
					</Typography>
				),
			},
			{
				field: "amount",
				headerName: "Amount",
				minWidth: 130,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, number | null>) => (
					<Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
						{formatAmount(params.value)}
					</Typography>
				),
			},
			{
				field: "status",
				headerName: "Status",
				minWidth: 110,
				renderCell: (params: GridRenderCellParams<JuteBillPassRow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Approved"} />
				),
			},
		],
		[]
	);

	const fetchBillPasses = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.JUTE_BILL_PASS_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const response = data as {
				data?: Array<Record<string, unknown>>;
				total?: number;
			};

			const rawRows = Array.isArray(response?.data) ? response.data : [];

			const mappedRows: JuteBillPassRow[] = rawRows.map((r: Record<string, unknown>) => {
				const rawBillPassDate = (r.bill_pass_date ?? "") as string;
				const rawInvoiceDate = (r.invoice_date ?? "") as string;

				return {
					id: (r.jute_mr_id ?? `bill-pass-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					bill_pass_no: ((r.bill_pass_num ?? r.bill_pass_no ?? null) as string | null),
					bill_pass_date_raw: typeof rawBillPassDate === "string" ? rawBillPassDate : String(rawBillPassDate || ""),
					bill_pass_date: formatDate(rawBillPassDate),
					mr_no: ((r.mr_num ?? r.mr_no ?? null) as string | null),
					mr_date: formatDate((r.mr_date ?? "") as string),
					supplier_name: (r.supplier_name ?? "") as string,
					party_name: (r.party_name ?? null) as string | null,
					invoice_no: (r.invoice_no ?? null) as string | null,
					invoice_date_raw: typeof rawInvoiceDate === "string" ? rawInvoiceDate : String(rawInvoiceDate || ""),
					invoice_date: formatDate(rawInvoiceDate),
					amount: (r.amount ?? null) as number | null,
					status: (r.status ?? "Approved") as string,
					bill_pass_complete: (r.bill_pass_complete ?? 0) as number | null,
				};
			});

			setRows(mappedRows);
			const total = Number(response?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Jute Bill Passes";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, paginationModel.page, paginationModel.pageSize, searchValue, fromDate, toDate]);

	React.useEffect(() => {
		if (coId) {
			fetchBillPasses();
		}
	}, [fetchBillPasses, coId]);

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

	const searchConfig = React.useMemo(
		() => ({
			value: searchValue,
			onChange: handleSearchChange,
			placeholder: "Search by bill pass no, MR no, supplier, party, invoice...",
		}),
		[searchValue, handleSearchChange]
	);

	return (
		<IndexWrapper
			title="Jute Bill Pass"
			subtitle="View approved Jute Material Receipts with bill pass and invoice details"
			rows={rows}
			columns={columns}
			loading={loading}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			rowCount={totalRows}
			search={searchConfig}
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
			isRowEditable={isRowEditable}
		>
			{errorMessage && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{errorMessage}
				</Alert>
			)}
			{downloadError ? (
				<Alert severity="error" sx={{ mb: 2 }} onClose={clearDownloadError}>
					{downloadError}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
