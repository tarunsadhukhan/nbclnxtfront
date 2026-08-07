"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";

type PORow = {
	id: string | number;
	po_no: string;
	branch_id?: string | number;
	po_date: string;
	po_date_raw?: string;
	supplier_name: string;
	po_value: number | null;
	branch_name: string;
	project_name: string | null;
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

const formatCurrency = (value: number | null | undefined) => {
	if (value === null || value === undefined) return "-";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

export default function PurchaseOrderIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<PORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	/** Non-editable statuses — everything else gets the Edit icon */
	const isRowEditable = React.useCallback(
		(row: PORow) => {
			const s = String(row.status ?? "").toLowerCase().trim();
			return s !== "approved" && s !== "closed";
		},
		[]
	);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "po_no",
			headerName: "PO Number",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<PORow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "po_date",
			headerName: "PO Date",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<PORow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || formatDate(typeof params.row.po_date_raw === "string" ? params.row.po_date_raw : "") || "-"}
				</Typography>
			),
		},
		{
			field: "supplier_name",
			headerName: "Supplier Name",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "po_value",
			headerName: "PO Value",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<PORow, number | null>) => (
				<Typography component="span" variant="body2">
					{formatCurrency(params.value)}
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
			field: "project_name",
			headerName: "Project Name",
			flex: 1,
			minWidth: 160,
			renderCell: (params: GridRenderCellParams<PORow, string | null>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<PORow, string>) => (
				<Chip size="small" color={params.value === "Approved" ? "success" : params.value === "Rejected" ? "error" : "default"} label={params.value || "Pending"} />
			),
		},
	], []);

	const fetchPOs = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			let co_id = "";
			try {
				const storedCompany = localStorage.getItem("sidebar_selectedCompany");
				if (storedCompany) {
					const parsed = JSON.parse(storedCompany);
					co_id = parsed?.co_id ? String(parsed.co_id) : "";
				}
			} catch {
				co_id = "";
			}

			const query = new URLSearchParams({
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (co_id) query.set("co_id", co_id);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);

			const url = `${apiRoutesPortalMasters.PO_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : [];
			const mappedRows: PORow[] = rawRows.map((row: any) => {
				const rawDate = row.po_date ?? row.poDate ?? row.created_at ?? "";
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				return {
					id: row.po_id ?? row.id ?? row.poId ?? `${row.po_no ?? "po"}-${Math.random().toString(36).slice(2, 8)}`,
					po_no: row.po_no ?? row.poNo ?? "",
					branch_id: row.branch_id ?? row.branchId ?? row.branch ?? undefined,
					po_date_raw: normalizedRaw,
					po_date: formatDate(normalizedRaw),
					supplier_name: row.supplier_name ?? row.supplierName ?? row.supp_name ?? "",
					po_value: row.po_value ?? row.poValue ?? row.total_amount ?? null,
					branch_name: row.branch_name ?? row.branchName ?? row.branch ?? "",
					project_name: row.project_name ?? row.projectName ?? row.prj_name ?? null,
					status: row.status ?? row.status_name ?? row.current_status ?? "Pending",
				};
			});

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load purchase orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		fetchPOs();
	}, [fetchPOs]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreatePO = React.useCallback(() => {
		router.push("/dashboardportal/procurement/purchaseOrder/createPO");
	}, [router]);

	const handleView = React.useCallback(
		(row: PORow) => {
			const id = row.id ?? row.po_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/procurement/purchaseOrder/createPO?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: PORow) => {
			const id = row.id ?? row.po_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/procurement/purchaseOrder/createPO?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Purchase Orders"
			subtitle="Review existing purchase orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by PO number, supplier, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreatePO, label: "Create Purchase Order" }}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={isRowEditable}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}

