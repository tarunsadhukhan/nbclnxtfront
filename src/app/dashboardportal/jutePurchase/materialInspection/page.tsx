"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import DateRangeToolbar from "@/components/ui/DateRangeToolbar";
import { useRouter } from "next/navigation";
import { useExcelDownload } from "@/hooks/useExcelDownload";
import { fetchExcelBlob } from "@/utils/fetchExcelBlob";

/**
 * @component JuteQualityCheckIndexPage
 * @description Index page displaying list of Jute MR entries pending Quality Check.
 * Shows entries where qc_check IS NULL or qc_check = 0.
 * 
 * Updated 2026-01-16: Renamed from "Jute Gate Entries" to "Jute Quality Check".
 * Now uses jute_mr table instead of deleted jute_gate_entry table.
 * 
 * Columns: Gate Entry No, Entry Date, Branch, Mukam, Vehicle No, Challan No, 
 *          Challan Weight, Gross Weight, Supplier, Status
 */

type JuteQualityCheckRow = {
	id: string | number;
	jute_mr_id: number;
	gate_entry_num: string | null;
	jute_gate_entry_date: string;
	branch_name: string;
	mukam: string;
	vehicle_no: string;
	challan_no: string;
	challan_weight: number | null;
	gross_weight: number | null;
	net_weight: number | null;
	supplier_name: string;
	party_name: string;
	status: string;
};

const formatDate = (value?: string | null) => {
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

const formatWeight = (value?: number | null) => {
	if (value == null) return "-";
	return new Intl.NumberFormat("en-IN", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	}).format(value);
};

const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("completed") || normalized.includes("closed")) return "success";
	if (normalized.includes("rejected") || normalized.includes("cancelled")) return "error";
	if (normalized.includes("pending") || normalized.includes("qc")) return "warning";
	if (normalized.includes("draft") || normalized.includes("open")) return "info";
	return "default";
};

export default function JuteQualityCheckIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<JuteQualityCheckRow[]>([]);
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
			fetchExcelBlob(apiRoutesPortalMasters.JUTE_MATERIAL_INSPECTION_DOWNLOAD, {
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
	} = useExcelDownload(downloadFetcher, "jute_material_inspection");

	const columns = React.useMemo<GridColDef<JuteQualityCheckRow>[]>(
		() => [
			{
				field: "gate_entry_num",
				headerName: "Gate Entry No",
				minWidth: 160,
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, string | null>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "jute_gate_entry_date",
				headerName: "Entry Date",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "branch_name",
				headerName: "Branch",
				minWidth: 140,
				flex: 0.5,
			},
			{
				field: "mukam",
				headerName: "Mukam",
				minWidth: 130,
				flex: 0.5,
			},
			{
				field: "vehicle_no",
				headerName: "Vehicle No",
				minWidth: 110,
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "challan_no",
				headerName: "Challan No",
				minWidth: 110,
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "challan_weight",
				headerName: "Challan Wt",
				minWidth: 100,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, number | null>) => (
					<Typography component="span" variant="body2">
						{formatWeight(params.value)}
					</Typography>
				),
			},
			{
				field: "gross_weight",
				headerName: "Gross Wt",
				minWidth: 100,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, number | null>) => (
					<Typography component="span" variant="body2">
						{formatWeight(params.value)}
					</Typography>
				),
			},
			{
				field: "supplier_name",
				headerName: "Supplier",
				flex: 1,
				minWidth: 150,
			},
			{
				field: "status",
				headerName: "Status",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteQualityCheckRow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Pending QC"} />
				),
			},
		],
		[]
	);

	const fetchQualityCheckEntries = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			// Get co_id from localStorage
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

			// Get branch_ids from localStorage for multi-branch filtering
			let branch_ids = "";
			try {
				const storedBranches = localStorage.getItem("sidebar_selectedBranches");
				if (storedBranches) {
					const parsed = JSON.parse(storedBranches);
					if (Array.isArray(parsed) && parsed.length > 0) {
						// Sidebar stores number[]; legacy caches stored [{ branch_id }] — accept both
						branch_ids = parsed
							.map((b: number | { branch_id?: number }) => (typeof b === "object" && b !== null ? b.branch_id : b))
							.filter((v) => v !== null && v !== undefined)
							.join(",");
					}
				}
			} catch {
				branch_ids = "";
			}
			setBranchIdsState(branch_ids);

			const query = new URLSearchParams({
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (co_id) query.set("co_id", co_id);
			if (branch_ids) query.set("branch_ids", branch_ids);
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);
			if (fromDate) query.set("from_date", fromDate);
			if (toDate) query.set("to_date", toDate);

			// Use the material inspection table endpoint which returns entries pending QC
			const url = `${apiRoutesPortalMasters.JUTE_MATERIAL_INSPECTION_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as Record<string, unknown>)?.data)
				? ((data as Record<string, unknown>).data as unknown[])
				: Array.isArray(data)
					? data
					: [];

			const mappedRows: JuteQualityCheckRow[] = rawRows.map((row: unknown) => {
				const r = row as Record<string, unknown>;
				const rawDate = (r.jute_gate_entry_date ?? "") as string;

				return {
					id: (r.jute_mr_id ?? r.id ?? `qc-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					jute_mr_id: (r.jute_mr_id ?? 0) as number,
					gate_entry_num: (r.gate_entry_num ?? null) as string | null,
					jute_gate_entry_date: formatDate(rawDate),
					branch_name: (r.branch_name ?? "") as string,
					mukam: (r.mukam ?? r.mukam_name ?? "") as string,
					vehicle_no: (r.vehicle_no ?? "") as string,
					challan_no: (r.challan_no ?? "") as string,
					challan_weight: r.challan_weight != null ? Number(r.challan_weight) : null,
					gross_weight: r.gross_weight != null ? Number(r.gross_weight) : null,
					net_weight: r.net_weight != null ? Number(r.net_weight) : null,
					supplier_name: (r.supplier_name ?? "") as string,
					party_name: (r.party_name ?? "") as string,
					status: (r.status ?? "Pending QC") as string,
				};
			});

			setRows(mappedRows);
			const total = Number((data as Record<string, unknown>)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Quality Check entries";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, fromDate, toDate]);

	React.useEffect(() => {
		fetchQualityCheckEntries();
	}, [fetchQualityCheckEntries]);

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

	const handleView = React.useCallback(
		(row: JuteQualityCheckRow) => {
			const id = row.jute_mr_id;
			if (!id) return;
			// Navigate to material inspection view page
			router.push(`/dashboardportal/jutePurchase/materialInspection/createMaterialInspection?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JuteQualityCheckRow) => {
			const id = row.jute_mr_id;
			if (!id) return;
			// Navigate to material inspection edit page for performing quality check
			router.push(`/dashboardportal/jutePurchase/materialInspection/createMaterialInspection?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Jute Quality Check"
			subtitle="Review and perform quality checks on incoming jute shipments."
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
				placeholder: "Search by gate entry no, mukam, vehicle no, or challan no",
				debounceDelayMs: 500,
			}}
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
