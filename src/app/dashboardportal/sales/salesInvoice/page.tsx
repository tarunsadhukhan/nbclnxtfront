"use client";

import * as React from "react";
import { Alert, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
	SALES_STATUS_IDS,
	SalesStatusChip,
	SalesStatusFilter,
	asNumberOrNull,
	asString,
	buildSalesListQuery,
	formatListCurrency,
	formatListDate,
	parseListResponse,
} from "../utils/salesListShared";

type InvoiceRow = {
	id: string | number;
	invoice_no: string;
	branch_id?: string | number;
	invoice_date: string;
	invoice_date_raw?: string;
	customer_name: string;
	invoice_amount: number | null;
	branch_name: string;
	delivery_order_no: string | null;
	status: string;
	status_id?: number | null;
};

export default function SalesInvoiceIndexPage() {
	const router = useRouter();
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<InvoiceRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<number | null>(null);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const coId = selectedCompany?.co_id ?? null;

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "invoice_no",
			headerName: "Invoice No.",
			flex: 1,
			minWidth: 160,
			renderCell: (params: GridRenderCellParams<InvoiceRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "invoice_date",
			headerName: "Invoice Date",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<InvoiceRow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "customer_name",
			headerName: "Customer",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "invoice_amount",
			headerName: "Amount",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<InvoiceRow, number | null>) => (
				<Typography component="span" variant="body2">
					{formatListCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 140,
		},
		{
			field: "delivery_order_no",
			headerName: "DO No.",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<InvoiceRow, string | null>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<InvoiceRow, string>) => (
				<SalesStatusChip statusId={params.row.status_id} label={params.value} />
			),
		},
	], []);

	const fetchInvoices = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			const queryString = buildSalesListQuery({
				page: paginationModel.page,
				pageSize: paginationModel.pageSize,
				coId,
				branchIds: selectedBranches,
				search: searchValue,
				statusId: statusFilter,
			});

			const url = `${apiRoutesPortalMasters.SALES_INVOICE_TABLE}?${queryString}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const { rows: rawRows, total } = parseListResponse(data);
			const mappedRows: InvoiceRow[] = rawRows.map((row, index) => {
				const normalizedRaw = asString(row.invoice_date ?? row.created_at);
				return {
					id: asNumberOrNull(row.invoice_id) ?? asNumberOrNull(row.id) ?? `inv-${paginationModel.page}-${index}`,
					invoice_no: asString(row.invoice_no_string ?? row.invoice_no),
					branch_id: asNumberOrNull(row.branch_id) ?? undefined,
					invoice_date_raw: normalizedRaw,
					invoice_date: formatListDate(normalizedRaw),
					customer_name: asString(row.customer_name ?? row.party_name ?? row.supp_name),
					invoice_amount: asNumberOrNull(row.invoice_amount ?? row.grand_total ?? row.net_amount),
					branch_name: asString(row.branch_name),
					delivery_order_no: asString(row.delivery_order_no ?? row.do_no) || null,
					status: asString(row.status ?? row.status_name) || "Draft",
					status_id: asNumberOrNull(row.status_id ?? row.statusId),
				};
			});

			setRows(mappedRows);
			setTotalRows(total ?? mappedRows.length);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load sales invoices";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, statusFilter, coId, selectedBranches]);

	React.useEffect(() => {
		fetchInvoices();
	}, [fetchInvoices]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleStatusFilterChange = React.useCallback((statusId: number | null) => {
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setStatusFilter(statusId);
	}, []);

	const handleCreateInvoice = React.useCallback(() => {
		router.push("/dashboardportal/sales/salesInvoice/createSalesInvoice");
	}, [router]);

	const handleView = React.useCallback(
		(row: InvoiceRow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesInvoice/createSalesInvoice?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	const handleEdit = React.useCallback(
		(row: InvoiceRow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesInvoice/createSalesInvoice?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	return (
		<IndexWrapper
			title="Sales Invoices"
			subtitle="Review existing invoices or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by invoice no., customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateInvoice, label: "Create Invoice" }}
			toolbarContent={<SalesStatusFilter value={statusFilter} onChange={handleStatusFilterChange} />}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={(row) => Number(row.status_id) !== SALES_STATUS_IDS.APPROVED}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
