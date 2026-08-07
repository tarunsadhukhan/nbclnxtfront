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

type DORow = {
	id: string | number;
	delivery_order_no: string;
	branch_id?: string | number;
	do_date: string;
	do_date_raw?: string;
	expected_delivery_date?: string;
	customer_name: string;
	sales_no: string | null;
	net_amount: number | null;
	branch_name: string;
	status: string;
	status_id?: number | null;
};

export default function DeliveryOrderIndexPage() {
	const router = useRouter();
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<DORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<number | null>(null);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const coId = selectedCompany?.co_id ?? null;

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "delivery_order_no",
			headerName: "DO Number",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "do_date",
			headerName: "DO Date",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "expected_delivery_date",
			headerName: "Expected Delivery",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
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
			field: "sales_no",
			headerName: "SO Number",
			flex: 1,
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<DORow, string | null>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "net_amount",
			headerName: "Amount",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DORow, number | null>) => (
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
			field: "status",
			headerName: "Status",
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<SalesStatusChip statusId={params.row.status_id} label={params.value} />
			),
		},
	], []);

	const fetchDOs = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.DELIVERY_ORDER_TABLE}?${queryString}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const { rows: rawRows, total } = parseListResponse(data);
			const mappedRows: DORow[] = rawRows.map((row, index) => {
				const normalizedRaw = asString(row.delivery_order_date ?? row.do_date ?? row.created_at);
				return {
					id: asNumberOrNull(row.sales_delivery_order_id) ?? asNumberOrNull(row.id) ?? `do-${paginationModel.page}-${index}`,
					delivery_order_no: asString(row.delivery_order_no ?? row.do_no),
					branch_id: asNumberOrNull(row.branch_id) ?? undefined,
					do_date_raw: normalizedRaw,
					do_date: formatListDate(normalizedRaw),
					expected_delivery_date: formatListDate(asString(row.expected_delivery_date)),
					customer_name: asString(row.customer_name ?? row.party_name ?? row.supp_name),
					sales_no: asString(row.sales_no) || null,
					net_amount: asNumberOrNull(row.net_amount ?? row.total_amount),
					branch_name: asString(row.branch_name),
					status: asString(row.status ?? row.status_name) || "Draft",
					status_id: asNumberOrNull(row.status_id ?? row.statusId),
				};
			});

			setRows(mappedRows);
			setTotalRows(total ?? mappedRows.length);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load delivery orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, statusFilter, coId, selectedBranches]);

	React.useEffect(() => {
		fetchDOs();
	}, [fetchDOs]);

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

	const handleCreateDO = React.useCallback(() => {
		router.push("/dashboardportal/sales/deliveryOrder/createDeliveryOrder");
	}, [router]);

	const handleView = React.useCallback(
		(row: DORow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/deliveryOrder/createDeliveryOrder?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	const handleEdit = React.useCallback(
		(row: DORow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/deliveryOrder/createDeliveryOrder?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	return (
		<IndexWrapper
			title="Delivery Orders"
			subtitle="Review existing delivery orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by DO number, customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateDO, label: "Create Delivery Order" }}
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
