"use client";

import * as React from "react";
import { Alert, Chip, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import DateRangeToolbar from "@/components/ui/DateRangeToolbar";
import { useRouter } from "next/navigation";
import { createStatusBasedEditCheck } from "@/utils/editability";
import { useExcelDownload } from "@/hooks/useExcelDownload";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

/**
 * @component JutePOIndexPage
 * @description Index page displaying list of Jute Purchase Orders with pagination and search.
 * Columns: PO Num, PO Date, Supplier Name, Broker Name, Mukam, Vehicle Type, Vehicle Qty, Status
 */

type JutePORow = {
	id: string | number;
	po_num: string;
	po_date: string;
	po_date_raw?: string;
	supplier_name: string;
	mukam: string;
	vehicle_type: string;
	vehicle_qty: number | null;
	received_lorries: number | null;
	pending_lorries: number | null;
	received_qty_qtl: number | null;
	pending_qty_qtl: number | null;
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

const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("approved") || normalized.includes("closed")) return "success";
	if (normalized.includes("rejected") || normalized.includes("cancelled")) return "error";
	if (normalized.includes("pending") || normalized.includes("open")) return "warning";
	if (normalized.includes("draft")) return "info";
	return "default";
};

// Jute PO status ids — from jutePO.py status-change endpoints
// (21=Draft, 1=Open, 20=Pending Approval, 3=Approved, 4=Rejected, 6=Cancelled).
const JUTE_PO_STATUS_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
	{ value: 21, label: "Draft" },
	{ value: 1, label: "Open" },
	{ value: 20, label: "Pending Approval" },
	{ value: 3, label: "Approved" },
	{ value: 4, label: "Rejected" },
	{ value: 6, label: "Cancelled" },
];

export default function JutePOIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<JutePORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<number | null>(null);
	const [fromDate, setFromDate] = React.useState("");
	const [toDate, setToDate] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [coIdState, setCoIdState] = React.useState<string>("");
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const downloadFetcher = React.useCallback(
		(p: { coId: string; search: string; fromDate: string; toDate: string; statusId: number | null }) =>
			fetchExcelBlob(apiRoutesPortalMasters.JUTE_PO_DOWNLOAD, {
				coId: p.coId,
				search: p.search,
				fromDate: p.fromDate || null,
				toDate: p.toDate || null,
				statusId: p.statusId,
			}),
		[]
	);
	const {
		download,
		downloading,
		error: downloadError,
		clearError: clearDownloadError,
	} = useExcelDownload(downloadFetcher, "jute_po");

	const columns = React.useMemo<GridColDef<JutePORow>[]>(
		() => [
			{
				field: "po_num",
				headerName: "PO Number",
				flex: 1,
				minWidth: 130,
				renderCell: (params: GridRenderCellParams<JutePORow, string>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "po_date",
				headerName: "PO Date",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JutePORow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || formatDate(params.row.po_date_raw) || "-"}
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
				field: "mukam",
				headerName: "Mukam",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JutePORow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "vehicle_type",
				headerName: "Vehicle Type",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JutePORow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "vehicle_qty",
				headerName: "Vehicle Qty",
				minWidth: 100,
				type: "number",
				renderCell: (params: GridRenderCellParams<JutePORow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "received_lorries",
				headerName: "Lorries Received",
				minWidth: 120,
				type: "number",
				renderCell: (params: GridRenderCellParams<JutePORow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "pending_lorries",
				headerName: "Lorries Pending",
				minWidth: 120,
				type: "number",
				renderCell: (params: GridRenderCellParams<JutePORow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "received_qty_qtl",
				headerName: "Qty Received (Qtl)",
				minWidth: 130,
				type: "number",
				renderCell: (params: GridRenderCellParams<JutePORow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "pending_qty_qtl",
				headerName: "Qty Pending (Qtl)",
				minWidth: 130,
				type: "number",
				renderCell: (params: GridRenderCellParams<JutePORow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "status",
				headerName: "Status",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JutePORow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Pending"} />
				),
			},
		],
		[]
	);

	const fetchJutePOs = React.useCallback(async () => {
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
			setCoIdState(co_id);

			const query = new URLSearchParams({
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (co_id) query.set("co_id", co_id);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);
			if (statusFilter !== null) query.set("status_id", String(statusFilter));
			if (fromDate) query.set("from_date", fromDate);
			if (toDate) query.set("to_date", toDate);

			const url = `${apiRoutesPortalMasters.JUTE_PO_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as Record<string, unknown>)?.data)
				? ((data as Record<string, unknown>).data as unknown[])
				: Array.isArray(data)
					? data
					: [];

			const mappedRows: JutePORow[] = rawRows.map((row: unknown) => {
				const r = row as Record<string, unknown>;
				const rawDate = (r.po_date ?? r.poDate ?? r.created_at ?? "") as string;
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";

				return {
					id: (r.jute_po_id ?? r.id ?? r.po_id ?? `jute-po-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					po_num: (r.po_num ?? r.po_no ?? r.poNum ?? "") as string,
					po_date_raw: normalizedRaw,
					po_date: formatDate(normalizedRaw),
					supplier_name: (r.supplier_name ?? r.supp_name ?? r.supplierName ?? "") as string,
					mukam: (r.mukam ?? r.mukam_name ?? "") as string,
					vehicle_type: (r.vehicle_type ?? r.vehicleType ?? "") as string,
					vehicle_qty: (r.vehicle_qty ?? r.vehicleQty ?? r.no_of_vehicles ?? null) as number | null,
					received_lorries: (r.received_lorries ?? null) as number | null,
					pending_lorries: (r.pending_lorries ?? null) as number | null,
					received_qty_qtl: (r.received_qty_qtl ?? null) as number | null,
					pending_qty_qtl: (r.pending_qty_qtl ?? null) as number | null,
					status: (r.status ?? r.status_name ?? r.po_status ?? "Pending") as string,
				};
			});

			setRows(mappedRows);
			const total = Number((data as Record<string, unknown>)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Jute Purchase Orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, statusFilter, fromDate, toDate]);

	React.useEffect(() => {
		fetchJutePOs();
	}, [fetchJutePOs]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleStatusFilterChange = React.useCallback((event: SelectChangeEvent<string>) => {
		const raw = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setStatusFilter(raw === "" ? null : Number(raw));
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
		download({ coId: coIdState, search: searchValue, fromDate, toDate, statusId: statusFilter });
	}, [download, coIdState, searchValue, fromDate, toDate, statusFilter]);

	const handleCreateJutePO = React.useCallback(() => {
		router.push("/dashboardportal/jutePurchase/po/createPO");
	}, [router]);

	const handleView = React.useCallback(
		(row: JutePORow) => {
			const id = row.id ?? row.po_num;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/po/createPO?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JutePORow) => {
			const id = row.id ?? row.po_num;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/po/createPO?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	// Row is editable only in Draft or Open status
	const isRowEditable = React.useMemo(
		() => createStatusBasedEditCheck<JutePORow>({
			statusField: "status",
			editableStatuses: ["Draft", "Drafted", "Open"],
			caseInsensitive: true,
		}),
		[]
	);

	return (
		<IndexWrapper
			title="Jute Purchase Orders"
			subtitle="Review existing jute purchase orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			autoHeight
			search={{
				value: searchValue,
				onChange: handleSearchChange,
				placeholder: "Search by PO number, supplier, or mukam",
				debounceDelayMs: 500,
			}}
			createAction={{ onClick: handleCreateJutePO, label: "Create Jute PO" }}
			toolbarContent={
				<>
					<FormControl size="small" sx={{ minWidth: 180 }}>
						<InputLabel id="jute-po-status-filter-label">Status</InputLabel>
						<Select<string>
							labelId="jute-po-status-filter-label"
							label="Status"
							value={statusFilter === null ? "" : String(statusFilter)}
							onChange={handleStatusFilterChange}
						>
							<MenuItem value="">All statuses</MenuItem>
							{JUTE_PO_STATUS_OPTIONS.map((option) => (
								<MenuItem key={option.value} value={String(option.value)}>
									{option.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<DateRangeToolbar
						fromDate={fromDate}
						toDate={toDate}
						onFromDateChange={handleFromDateChange}
						onToDateChange={handleToDateChange}
						onClearDates={handleClearDates}
						onDownload={handleDownload}
						downloading={downloading}
						downloadDisabled={!coIdState || loading}
						mounted={mounted}
					/>
				</>
			}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={isRowEditable}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
			{downloadError ? (
				<Alert severity="error" sx={{ mt: 2 }} onClose={clearDownloadError}>
					{downloadError}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
