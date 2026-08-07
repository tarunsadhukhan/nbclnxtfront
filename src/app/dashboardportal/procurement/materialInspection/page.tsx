"use client";

import * as React from "react";
import { Alert, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";

/**
 * Row type for Material Inspection Index
 */
type InspectionRow = {
	id: string | number;
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_name: string;
	supplier_name: string;
};

/**
 * Format date to dd-MMM-yyyy
 */
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

/**
 * Material Inspection Index Page
 * Lists all inwards that have been approved but pending material inspection.
 */
export default function MaterialInspectionIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<InspectionRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	// Column definitions
	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "inward_no",
			headerName: "Inward No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<InspectionRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "inward_date",
			headerName: "Inward Date",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<InspectionRow, string>) => (
				<Typography component="span" variant="body2">
					{formatDate(params.value)}
				</Typography>
			),
		},
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "supplier_name",
			headerName: "Supplier",
			flex: 1,
			minWidth: 180,
		},
	], []);

	/**
	 * Fetch pending inspections from the API
	 */
	const fetchInspections = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			// Get company ID from localStorage
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

			// Build query params
			const query = new URLSearchParams({
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (co_id) query.set("co_id", co_id);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);

			const url = `${apiRoutesPortalMasters.INSPECTION_PENDING_LIST}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : [];
			const mappedRows: InspectionRow[] = rawRows.map((row: any) => ({
				id: row.inward_id ?? row.id ?? Math.random().toString(36).slice(2, 8),
				inward_id: row.inward_id,
				inward_no: row.inward_no ?? "",
				inward_date: row.inward_date ?? "",
				branch_name: row.branch_name ?? "",
				supplier_name: row.supplier_name ?? "",
			}));

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load pending inspections";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	// Fetch on mount and when dependencies change
	React.useEffect(() => {
		fetchInspections();
	}, [fetchInspections]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	/**
	 * Navigate to inspection edit page
	 */
	const handleEdit = React.useCallback(
		(row: InspectionRow) => {
			const id = row.inward_id;
			if (!id) return;
			router.push(`/dashboardportal/procurement/materialInspection/inspect?id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Material Inspection"
			subtitle="Inspect received materials and record rejected/approved quantities."
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
				placeholder: "Search by Inward number, supplier, or branch",
				debounceDelayMs: 1000,
			}}
			onEdit={handleEdit}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
