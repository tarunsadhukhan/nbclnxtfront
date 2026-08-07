"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import { createBooleanFieldEditCheck } from "@/utils/editability";

type InwardRow = {
	id: string | number;
	branch_name: string;
	inward_no: string;
	inward_date: string;
	inward_date_raw?: string;
	supplier_name: string;
	inspection_check: boolean;
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

export default function InwardIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<InwardRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const handleEdit = React.useCallback(
		(row: InwardRow) => {
			const id = row.id ?? row.inward_no;
			if (!id) return;
			router.push(`/dashboardportal/procurement/inward/createInward?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleView = React.useCallback(
		(row: InwardRow) => {
			const id = row.id ?? row.inward_no;
			if (!id) return;
			router.push(`/dashboardportal/procurement/inward/createInward?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	// Row is editable until material inspection is completed
	const isRowEditable = React.useMemo(
		() => createBooleanFieldEditCheck<InwardRow>("inspection_check", false),
		[]
	);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "inward_no",
			headerName: "Inward No.",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<InwardRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "inward_date",
			headerName: "Inward Date",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<InwardRow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || formatDate(typeof params.row.inward_date_raw === "string" ? params.row.inward_date_raw : "") || "-"}
				</Typography>
			),
		},
		{
			field: "supplier_name",
			headerName: "Supplier",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "inspection_check",
			headerName: "Inspection",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<InwardRow, boolean>) => (
				<Chip
					size="small"
					color={params.value ? "success" : "warning"}
					label={params.value ? "Checked" : "Pending"}
				/>
			),
		},
		{
			field: "status",
			headerName: "Inward Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<InwardRow, string>) => (
				<Chip
					size="small"
					color={
						params.value === "Approved" ? "success" :
						params.value === "Rejected" ? "error" :
						params.value === "Open" ? "info" :
						"default"
					}
					label={params.value || "Draft"}
				/>
			),
		},
	], []);

	const fetchInwards = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.INWARD_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : [];
			const mappedRows: InwardRow[] = rawRows.map((row: any) => {
				const rawDate = row.inward_date ?? row.inwardDate ?? row.created_at ?? "";
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				return {
					id: row.inward_id ?? row.id ?? row.inwardId ?? `${row.inward_no ?? "inward"}-${Math.random().toString(36).slice(2, 8)}`,
					branch_name: row.branch_name ?? row.branchName ?? row.branch ?? "",
					inward_no: row.inward_no ?? row.inwardNo ?? "",
					inward_date_raw: normalizedRaw,
					inward_date: formatDate(normalizedRaw),
					supplier_name: row.supplier_name ?? row.supplierName ?? row.supp_name ?? "",
					inspection_check: Boolean(row.inspection_check ?? row.inspectionCheck ?? false),
					status: row.status ?? row.status_name ?? row.current_status ?? "Draft",
				};
			});

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load inwards";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		fetchInwards();
	}, [fetchInwards]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreateInward = React.useCallback(() => {
		router.push("/dashboardportal/procurement/inward/createInward");
	}, [router]);

	return (
		<IndexWrapper
			title="Inwards"
			subtitle="Review existing inwards or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by inward no., PO no., supplier, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateInward, label: "Create Inward" }}
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
