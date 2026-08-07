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

type QuotationRow = {
	id: string | number;
	quotation_no: string;
	quotation_date: string;
	quotation_date_raw?: string;
	party_name: string;
	net_amount: number | null;
	branch_id?: string | number;
	branch_name: string;
	status: string;
	status_id?: number | null;
};

export default function SalesQuotationIndexPage() {
	const router = useRouter();
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<QuotationRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<number | null>(null);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const coId = selectedCompany?.co_id ?? null;

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "quotation_no",
			headerName: "Quotation No.",
			flex: 1,
			minWidth: 160,
			renderCell: (params: GridRenderCellParams<QuotationRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "quotation_date",
			headerName: "Quotation Date",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<QuotationRow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "party_name",
			headerName: "Customer",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "net_amount",
			headerName: "Net Amount",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<QuotationRow, number | null>) => (
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
			field: "status",
			headerName: "Status",
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<QuotationRow, string>) => (
				<SalesStatusChip statusId={params.row.status_id} label={params.value} />
			),
		},
	], []);

	const fetchQuotations = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.QUOTATION_TABLE}?${queryString}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const { rows: rawRows, total } = parseListResponse(data);
			const mappedRows: QuotationRow[] = rawRows.map((row, index) => {
				const normalizedRaw = asString(row.quotation_date ?? row.created_at);
				return {
					id: asNumberOrNull(row.sales_quotation_id) ?? asNumberOrNull(row.id) ?? `sq-${paginationModel.page}-${index}`,
					quotation_no: asString(row.quotation_no),
					quotation_date_raw: normalizedRaw,
					quotation_date: formatListDate(normalizedRaw),
					party_name: asString(row.party_name ?? row.customer_name),
					net_amount: asNumberOrNull(row.net_amount ?? row.gross_amount),
					branch_id: asNumberOrNull(row.branch_id) ?? undefined,
					branch_name: asString(row.branch_name),
					status: asString(row.status_name ?? row.status) || "Pending",
					status_id: asNumberOrNull(row.status_id ?? row.statusId),
				};
			});

			setRows(mappedRows);
			setTotalRows(total ?? mappedRows.length);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load quotations";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, statusFilter, coId, selectedBranches]);

	React.useEffect(() => {
		fetchQuotations();
	}, [fetchQuotations]);

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

	const handleCreateQuotation = React.useCallback(() => {
		router.push("/dashboardportal/sales/quotation/createQuotation");
	}, [router]);

	const handleView = React.useCallback(
		(row: QuotationRow) => {
			const id = row.id ?? row.quotation_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/quotation/createQuotation?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: QuotationRow) => {
			const id = row.id ?? row.quotation_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/quotation/createQuotation?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Sales Quotations"
			subtitle="Review existing quotations or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by quotation no., customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateQuotation, label: "Create Quotation" }}
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
