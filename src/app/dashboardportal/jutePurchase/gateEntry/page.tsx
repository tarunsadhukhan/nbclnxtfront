"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import DateRangeToolbar from "@/components/ui/DateRangeToolbar";
import { useRouter } from "next/navigation";
import { createBooleanFieldEditCheck } from "@/utils/editability";
import { useExcelDownload } from "@/hooks/useExcelDownload";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

/**
 * @component JuteGateEntryIndexPage
 * @description Index page displaying list of Jute Gate Entries with pagination and search.
 * Uses jute_mr table (merged gate entry + MR).
 * If OUT is completed, user can only view (not edit) the entry.
 */

type JuteGateEntryRow = {
	id: string | number;
	jute_mr_id: number;
	gate_entry_num: string | null;
	jute_gate_entry_no: number | null;
	jute_gate_entry_date: string;
	in_time: string | null;
	out_time: string | null;
	challan_no: string | null;
	vehicle_no: string | null;
	challan_weight: number | null;
	gross_weight: number | null;
	status: string;
	isOutCompleted: boolean;
};

/**
 * Formats a date string to DD-MMM-YYYY format
 */
const formatDate = (value?: string | null): string => {
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
 * Formats a time string to HH:MM format
 */
const formatTime = (value?: string | null): string => {
	if (!value) return "-";
	const trimmed = value.trim();
	
	// Handle datetime format (e.g., "2025-01-15 14:30:00" or ISO format)
	if (trimmed.includes(" ") || trimmed.includes("T")) {
		const timePart = trimmed.split(/[ T]/)[1];
		if (timePart) {
			const [hours, minutes] = timePart.split(":");
			if (hours && minutes) {
				return `${hours}:${minutes}`;
			}
		}
	}
	
	// Handle time-only format (e.g., "14:30:00" or "14:30")
	const [hours, minutes] = trimmed.split(":");
	if (hours && minutes) {
		return `${hours}:${minutes}`;
	}
	
	return trimmed;
};

/**
 * Formats weight values with proper number formatting
 */
const formatWeight = (value?: number | null): string => {
	if (value === null || value === undefined) return "-";
	return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

/**
 * Checks if OUT is completed (has out_time)
 */
const isOutComplete = (outTime: string | null | undefined): boolean => {
	return Boolean(outTime && outTime.trim() !== "");
};

export default function JuteGateEntryIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<JuteGateEntryRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [fromDate, setFromDate] = React.useState("");
	const [toDate, setToDate] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [coIdState, setCoIdState] = React.useState<string>("");
	const [branchIdsState, setBranchIdsState] = React.useState<string>("");
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const downloadFetcher = React.useCallback(
		(p: { coId: string; branchIds: string; search: string; fromDate: string; toDate: string }) =>
			fetchExcelBlob(apiRoutesPortalMasters.JUTE_GATE_ENTRY_DOWNLOAD, {
				coId: p.coId,
				branchIds: p.branchIds || null,
				search: p.search,
				fromDate: p.fromDate || null,
				toDate: p.toDate || null,
			}),
		[]
	);
	const {
		download,
		downloading,
		error: downloadError,
		clearError: clearDownloadError,
	} = useExcelDownload(downloadFetcher, "jute_gate_entry");

	const handleView = React.useCallback(
		(row: JuteGateEntryRow) => {
			const id = row.jute_mr_id ?? row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/gateEntry/createGateEntry?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JuteGateEntryRow) => {
			const id = row.jute_mr_id ?? row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/gateEntry/createGateEntry?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	// Row is editable when OUT is not completed (isOutCompleted is false)
	const isRowEditable = React.useMemo(
		() => createBooleanFieldEditCheck<JuteGateEntryRow>("isOutCompleted", false),
		[]
	);

	const columns = React.useMemo<GridColDef<JuteGateEntryRow>[]>(
		() => [
			{
				field: "gate_entry_num",
				headerName: "Gate Entry No",
				flex: 1,
				minWidth: 160,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string | null>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value || `GE-${params.row.jute_gate_entry_no ?? "-"}`}
					</Typography>
				),
			},
			{
				field: "jute_gate_entry_date",
				headerName: "Gate Entry Date",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string>) => (
					<Typography component="span" variant="body2">
						{formatDate(params.value)}
					</Typography>
				),
			},
			{
				field: "in_time",
				headerName: "In Time",
				minWidth: 90,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string | null>) => (
					<Typography component="span" variant="body2">
						{formatTime(params.value)}
					</Typography>
				),
			},
			{
				field: "out_time",
				headerName: "Out Time",
				minWidth: 90,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string | null>) => (
					<Typography component="span" variant="body2">
						{formatTime(params.value)}
					</Typography>
				),
			},
			{
				field: "challan_no",
				headerName: "Challan No",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "vehicle_no",
				headerName: "Vehicle No",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "challan_weight",
				headerName: "Challan Weight",
				minWidth: 120,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, number | null>) => (
					<Typography component="span" variant="body2">
						{formatWeight(params.value)}
					</Typography>
				),
			},
			{
				field: "gross_weight",
				headerName: "Gross Weight",
				minWidth: 120,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, number | null>) => (
					<Typography component="span" variant="body2">
						{formatWeight(params.value)}
					</Typography>
				),
			},
			{
				field: "isOutCompleted",
				headerName: "OUT Completed",
				minWidth: 120,
				align: "center",
				headerAlign: "center",
				renderCell: (params: GridRenderCellParams<JuteGateEntryRow, boolean>) => (
					<Chip
						size="small"
						color={params.value ? "success" : "warning"}
						label={params.value ? "Yes" : "No"}
						variant={params.value ? "filled" : "outlined"}
					/>
				),
			},
		],
		[]
	);

	const fetchGateEntries = React.useCallback(async () => {
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

			let branchIdsCsv = "";
			try {
				const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
				if (selectedBranches) {
					const branchesArr = JSON.parse(selectedBranches);
					if (Array.isArray(branchesArr) && branchesArr.length > 0) {
						branchIdsCsv = branchesArr.join(",");
						query.set("branch_ids", branchIdsCsv);
					}
				}
			} catch {
				/* swallow malformed branch cache */
			}
			setBranchIdsState(branchIdsCsv);

			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);
			if (fromDate) query.set("from_date", fromDate);
			if (toDate) query.set("to_date", toDate);

			const url = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as Record<string, unknown>)?.data)
				? ((data as Record<string, unknown>).data as unknown[])
				: Array.isArray(data)
					? data
					: [];

			const mappedRows: JuteGateEntryRow[] = rawRows.map((row: unknown) => {
				const r = row as Record<string, unknown>;
				const outTime = (r.out_time ?? null) as string | null;

				return {
					id: (r.jute_mr_id ?? r.id ?? `ge-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					jute_mr_id: (r.jute_mr_id ?? 0) as number,
					gate_entry_num: (r.gate_entry_num ?? null) as string | null,
					jute_gate_entry_no: (r.jute_gate_entry_no ?? null) as number | null,
					jute_gate_entry_date: (r.jute_gate_entry_date ?? "") as string,
					in_time: (r.in_time ?? null) as string | null,
					out_time: outTime,
					challan_no: (r.challan_no ?? null) as string | null,
					vehicle_no: (r.vehicle_no ?? null) as string | null,
					challan_weight: (r.challan_weight ?? null) as number | null,
					gross_weight: (r.gross_weight ?? null) as number | null,
					status: (r.status ?? "IN") as string,
					isOutCompleted: isOutComplete(outTime),
				};
			});

			setRows(mappedRows);
			const total = Number((data as Record<string, unknown>)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Jute Gate Entries";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, fromDate, toDate]);

	React.useEffect(() => {
		fetchGateEntries();
	}, [fetchGateEntries]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setSearchValue(value);
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
		download({ coId: coIdState, branchIds: branchIdsState, search: searchValue, fromDate, toDate });
	}, [download, coIdState, branchIdsState, searchValue, fromDate, toDate]);

	const handleCreateGateEntry = React.useCallback(() => {
		router.push("/dashboardportal/jutePurchase/gateEntry/createGateEntry");
	}, [router]);

	return (
		<IndexWrapper
			title="Jute Gate Entry"
			subtitle="Manage gate entries for jute procurement. Track vehicle arrivals, weights, and departures."
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
				placeholder: "Search by gate entry no, challan no, or vehicle no",
				debounceDelayMs: 500,
			}}
			createAction={{ onClick: handleCreateGateEntry, label: "Create Gate Entry" }}
			toolbarContent={
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
