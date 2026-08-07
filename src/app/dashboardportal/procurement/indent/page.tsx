"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import { useMenuId } from "@/hooks/useMenuId";

type IndentRow = {
	id: string | number;
	indent_no: string;
	indent_date: string;
	indent_date_raw?: string;
	branch_name: string;
	expense_type: string;
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

export default function ProcurementIndentIndexPage() {
	const router = useRouter();
	const { getMenuId } = useMenuId({ transactionType: "indent" });
	const [rows, setRows] = React.useState<IndentRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const handleView = React.useCallback(
		(row: IndentRow) => {
			const id = row.id ?? row.indent_no;
			if (!id) return;
			const menuId = getMenuId();
			const menuParam = menuId ? `&menu_id=${encodeURIComponent(menuId)}` : "";
			router.push(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(String(id))}${menuParam}`);
		},
		[router, getMenuId]
	);

	const handleEdit = React.useCallback(
		(row: IndentRow) => {
			const id = row.id ?? row.indent_no;
			if (!id) return;
			const menuId = getMenuId();
			const menuParam = menuId ? `&menu_id=${encodeURIComponent(menuId)}` : "";
			router.push(`/dashboardportal/procurement/indent/createIndent?mode=edit&id=${encodeURIComponent(String(id))}${menuParam}`);
		},
		[router, getMenuId]
	);

	/** Non-editable statuses — everything else gets the Edit icon */
	const isRowEditable = React.useCallback(
		(row: IndentRow) => {
			const s = String(row.status ?? "").toLowerCase().trim();
			return s !== "approved" && s !== "closed";
		},
		[]
	);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "indent_no",
			headerName: "Indent No.",
			flex: 1,
			minWidth: 140,
			renderCell: (params) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "indent_date",
			headerName: "Indent Date",
			minWidth: 140,
			renderCell: (params) => (
				<Typography component="span" variant="body2">
					{params.value || formatDate(typeof params.row.indent_date_raw === "string" ? params.row.indent_date_raw : "") || "-"}
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
			field: "expense_type",
			headerName: "Expense Type",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 130,
			renderCell: (params) => (
				<Chip size="small" color={params.value?.toLowerCase() === "approved" ? "success" : params.value?.toLowerCase() === "rejected" ? "error" : "default"} label={params.value || "Pending"} />
			),
		},
	], []);

	const fetchIndents = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.INDENT_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : [];
			const mappedRows: IndentRow[] = rawRows.map((row: any) => {
				const rawDate = row.indent_date ?? row.indentDate ?? row.created_at ?? "";
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				return {
					id: row.indent_id ?? row.id ?? row.indentId ?? `${row.indent_no ?? "indent"}-${Math.random().toString(36).slice(2, 8)}`,
					indent_no: row.indent_no ?? row.indentNo ?? "",
					indent_date_raw: normalizedRaw,
					indent_date: formatDate(normalizedRaw),
					branch_name: row.branch_name ?? row.branchName ?? row.branch ?? "",
					expense_type: row.expense_type ?? row.expenseType ?? row.expense_type_name ?? "",
					status: row.status ?? row.status_name ?? row.current_status ?? "Pending",
				};
			});

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load indents";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		fetchIndents();
	}, [fetchIndents]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreateIndent = React.useCallback(() => {
		const menuId = getMenuId();
		const menuParam = menuId ? `?menu_id=${encodeURIComponent(menuId)}` : "";
		router.push(`/dashboardportal/procurement/indent/createIndent${menuParam}`);
	}, [router, getMenuId]);

	return (
		<IndexWrapper
			title="Procurement Indents"
			subtitle="Review existing indents or raise a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by indent no., branch, or expense type", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateIndent, label: "Create Indent" }}
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
