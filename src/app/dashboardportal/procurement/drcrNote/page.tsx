"use client";

import * as React from "react";
import { Alert, Chip, Typography, ToggleButtonGroup, ToggleButton, Box } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";

/**
 * Row type for DRCR Note Index
 */
type DrcrNoteRow = {
	id: string | number;
	drcr_note_id: number;
	note_no: string;
	note_date: string;
	adjustment_type: number;
	adjustment_type_label: string;
	inward_id: number;
	inward_no: string;
	sr_no: string;
	inward_date: string;
	supplier_name: string;
	gross_amount: number;
	net_amount: number;
	status_id: number;
	status_name: string;
	auto_create: boolean;
	remarks: string;
};

// Adjustment types
const TYPE_DEBIT = 1;
const TYPE_CREDIT = 2;

// Status IDs
const STATUS_DRAFT = 21;
const STATUS_OPEN = 1;
const STATUS_APPROVED = 3;
const STATUS_REJECTED = 4;

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
 * Format currency
 */
const formatCurrency = (value?: number) => {
	if (value === undefined || value === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

/**
 * Get status chip color
 */
const getStatusColor = (statusId: number): "default" | "info" | "warning" | "success" | "error" => {
	switch (statusId) {
		case STATUS_DRAFT:
			return "default";
		case STATUS_OPEN:
			return "info";
		case STATUS_APPROVED:
			return "success";
		case STATUS_REJECTED:
			return "error";
		default:
			return "default";
	}
};

/**
 * DRCR Note Index Page
 * Lists all Debit/Credit Notes with filtering.
 */
export default function DrcrNoteIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<DrcrNoteRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [typeFilter, setTypeFilter] = React.useState<string>("all"); // "all", "1" (debit), "2" (credit)

	// Column definitions
	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "note_no",
			headerName: "Note No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "note_date",
			headerName: "Date",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, string>) => (
				<Typography component="span" variant="body2">
					{formatDate(params.value)}
				</Typography>
			),
		},
		{
			field: "adjustment_type_label",
			headerName: "Type",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, string>) => (
				<Chip
					size="small"
					color={params.row.adjustment_type === TYPE_DEBIT ? "warning" : "info"}
					label={params.value || "-"}
				/>
			),
		},
		{
			field: "inward_no",
			headerName: "Inward No",
			flex: 1,
			minWidth: 140,
		},
		{
			field: "sr_no",
			headerName: "SR No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "supplier_name",
			headerName: "Supplier",
			flex: 1.5,
			minWidth: 180,
		},
		{
			field: "net_amount",
			headerName: "Amount",
			type: "number",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, number>) => (
				<Typography variant="body2" fontWeight={600}>
					{formatCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "auto_create",
			headerName: "Auto",
			minWidth: 80,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, boolean>) => (
				<Chip
					size="small"
					variant="outlined"
					color={params.value ? "secondary" : "default"}
					label={params.value ? "Auto" : "Manual"}
				/>
			),
		},
		{
			field: "status_name",
			headerName: "Status",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DrcrNoteRow, string>) => (
				<Chip
					size="small"
					color={getStatusColor(params.row.status_id)}
					label={params.value || "Draft"}
				/>
			),
		},
	], []);

	/**
	 * Fetch DRCR Notes from API
	 */
	const fetchNotes = React.useCallback(async () => {
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
			if (typeFilter !== "all") query.set("adjustment_type", typeFilter);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);

			const url = `${apiRoutesPortalMasters.DRCR_NOTE_LIST}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : [];
			const mappedRows: DrcrNoteRow[] = rawRows.map((row: any) => ({
				id: row.drcr_note_id ?? row.id ?? Math.random().toString(36).slice(2, 8),
				drcr_note_id: row.drcr_note_id,
				note_no: row.note_no ?? "",
				note_date: row.note_date ?? "",
				adjustment_type: row.adjustment_type ?? 0,
				adjustment_type_label: row.adjustment_type_label ?? "",
				inward_id: row.inward_id,
				inward_no: row.inward_no ?? "",
				sr_no: row.sr_no ?? "",
				inward_date: row.inward_date ?? "",
				supplier_name: row.supplier_name ?? "",
				gross_amount: row.gross_amount ?? 0,
				net_amount: row.net_amount ?? 0,
				status_id: row.status_id ?? 0,
				status_name: row.status_name ?? "Draft",
				auto_create: row.auto_create ?? false,
				remarks: row.remarks ?? "",
			}));

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load DRCR Notes";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, typeFilter]);

	React.useEffect(() => {
		fetchNotes();
	}, [fetchNotes]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	/**
	 * Handle type filter change
	 */
	const handleTypeFilterChange = React.useCallback(
		(_event: React.MouseEvent<HTMLElement>, newValue: string | null) => {
			if (newValue === null) return; // Prevent deselection
			setPaginationModel(prev => ({ ...prev, page: 0 }));
			setTypeFilter(newValue);
		},
		[]
	);

	/**
	 * Navigate to view page
	 */
	const handleView = React.useCallback(
		(row: DrcrNoteRow) => {
			const id = row.drcr_note_id;
			if (!id) return;
			router.push(`/dashboardportal/procurement/drcrNote/view?id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	/**
	 * Navigate to edit page
	 */
	const handleEdit = React.useCallback(
		(row: DrcrNoteRow) => {
			const id = row.drcr_note_id;
			if (!id) return;
			router.push(`/dashboardportal/procurement/drcrNote/view?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Debit / Credit Notes"
			subtitle="View and manage debit and credit notes for rate differences and rejections."
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
				placeholder: "Search by note number, inward, or supplier",
				debounceDelayMs: 1000,
			}}
			onEdit={handleEdit}
			onView={handleView}
		>
			{/* Type Filter */}
			<Box sx={{ mb: 2 }}>
				<ToggleButtonGroup
					value={typeFilter}
					exclusive
					onChange={handleTypeFilterChange}
					size="small"
				>
					<ToggleButton value="all">All</ToggleButton>
					<ToggleButton value="1">Debit Notes</ToggleButton>
					<ToggleButton value="2">Credit Notes</ToggleButton>
				</ToggleButtonGroup>
			</Box>

			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
