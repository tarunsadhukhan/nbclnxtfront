"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";

/**
 * Row type for Stores Receipt Index
 */
type SRRow = {
	id: string | number;
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_name: string;
	supplier_name: string;
	material_inspection_date: string;
	sr_no: string;
	sr_date: string;
	sr_status: number;
	sr_status_name: string;
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
 * Get status chip color
 */
const getStatusColor = (statusId: number): "default" | "info" | "warning" | "success" | "error" => {
	switch (statusId) {
		case 21: // Draft
			return "default";
		case 1: // Open
			return "info";
		case 20: // Pending Approval
			return "warning";
		case 3: // Approved
			return "success";
		case 4: // Rejected
			return "error";
		default:
			return "default";
	}
};

/**
 * Stores Receipt Index Page
 * Lists all inwards that have completed material inspection and are ready for SR.
 */
export default function SRIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<SRRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	// Column definitions
	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "sr_no",
			headerName: "SR No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
				<Typography component="span" variant="body2" color="secondary">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "sr_date",
			headerName: "SR Date",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
				<Typography component="span" variant="body2">
					{formatDate(params.value)}
				</Typography>
			),
		},
		{
			field: "inward_no",
			headerName: "Inward No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "inward_date",
			headerName: "Inward Date",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
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
		{
			field: "material_inspection_date",
			headerName: "Inspection Date",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
				<Typography component="span" variant="body2">
					{formatDate(params.value)}
				</Typography>
			),
		},
		{
			field: "sr_status_name",
			headerName: "SR Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<SRRow, string>) => (
				<Chip
					size="small"
					color={getStatusColor(params.row.sr_status)}
					label={params.value || "Pending"}
				/>
			),
		},
	], []);

	/**
	 * Fetch SR pending list from API
	 */
	const fetchSRs = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.SR_PENDING_LIST}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : [];
			const mappedRows: SRRow[] = rawRows.map((row: any) => ({
				id: row.inward_id ?? row.id ?? Math.random().toString(36).slice(2, 8),
				inward_id: row.inward_id,
				inward_no: row.inward_no ?? "",
				inward_date: row.inward_date ?? "",
				branch_name: row.branch_name ?? "",
				supplier_name: row.supplier_name ?? "",
				material_inspection_date: row.material_inspection_date ?? "",
				sr_no: row.sr_no ?? "",
				sr_date: row.sr_date ?? "",
				sr_status: row.sr_status ?? 0,
				sr_status_name: row.sr_status_name ?? "Pending",
			}));

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load stores receipts";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		fetchSRs();
	}, [fetchSRs]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	/**
	 * Navigate to SR edit page
	 */
	const handleEdit = React.useCallback(
		(row: SRRow) => {
			const id = row.inward_id;
			if (!id) return;
			router.push(`/dashboardportal/procurement/sr/createSR?id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	/**
	 * Navigate to SR view page
	 */
	const handleView = React.useCallback(
		(row: SRRow) => {
			const id = row.inward_id;
			if (!id) return;
			router.push(`/dashboardportal/procurement/sr/createSR?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Stores Receipt (SR)"
			subtitle="Enter rates and approve stores receipts for inspected goods."
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
				placeholder: "Search by Inward number, SR number, supplier, or branch",
				debounceDelayMs: 1000,
			}}
			onEdit={handleEdit}
			onView={handleView}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
