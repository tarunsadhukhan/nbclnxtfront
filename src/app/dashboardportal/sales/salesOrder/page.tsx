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

type SORow = {
	id: string | number;
	sales_no: string;
	branch_id?: string | number;
	sales_order_date: string;
	sales_order_date_raw?: string;
	customer_name: string;
	order_value: number | null;
	branch_name: string;
	quotation_no: string | null;
	status: string;
	status_id?: number | null;
};

export default function SalesOrderIndexPage() {
	const router = useRouter();
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<SORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<number | null>(null);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const coId = selectedCompany?.co_id ?? null;

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "sales_no",
			headerName: "SO Number",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "sales_order_date",
			headerName: "Order Date",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
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
			field: "order_value",
			headerName: "Order Value",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<SORow, number | null>) => (
				<Typography component="span" variant="body2">
					{formatListCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "quotation_no",
			headerName: "Quotation No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string | null>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
				<SalesStatusChip statusId={params.row.status_id} label={params.value} />
			),
		},
	], []);

	const fetchSalesOrders = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.SALES_ORDER_TABLE}?${queryString}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const { rows: rawRows, total } = parseListResponse(data);
			const mappedRows: SORow[] = rawRows.map((row, index) => {
				const normalizedRaw = asString(row.sales_order_date ?? row.salesOrderDate ?? row.created_at);
				return {
					id: asNumberOrNull(row.sales_order_id) ?? asNumberOrNull(row.id) ?? asNumberOrNull(row.salesOrderId) ?? `so-${paginationModel.page}-${index}`,
					sales_no: asString(row.sales_no ?? row.salesNo),
					branch_id: asNumberOrNull(row.branch_id ?? row.branchId) ?? undefined,
					sales_order_date_raw: normalizedRaw,
					sales_order_date: formatListDate(normalizedRaw),
					customer_name: asString(row.customer_name ?? row.customerName ?? row.party_name ?? row.partyName),
					order_value: asNumberOrNull(row.order_value ?? row.orderValue ?? row.net_amount ?? row.netAmount),
					branch_name: asString(row.branch_name ?? row.branchName),
					quotation_no: asString(row.quotation_no ?? row.quotationNo) || null,
					status: asString(row.status ?? row.status_name ?? row.current_status) || "Pending",
					status_id: asNumberOrNull(row.status_id ?? row.statusId),
				};
			});

			setRows(mappedRows);
			setTotalRows(total ?? mappedRows.length);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load sales orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, statusFilter, coId, selectedBranches]);

	React.useEffect(() => {
		fetchSalesOrders();
	}, [fetchSalesOrders]);

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

	const handleCreateSO = React.useCallback(() => {
		router.push("/dashboardportal/sales/salesOrder/createSalesOrder");
	}, [router]);

	const handleView = React.useCallback(
		(row: SORow) => {
			const id = row.id ?? row.sales_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: SORow) => {
			const id = row.id ?? row.sales_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Sales Orders"
			subtitle="Review existing sales orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by SO number, customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateSO, label: "Create Sales Order" }}
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
