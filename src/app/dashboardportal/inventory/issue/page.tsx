"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";

type IssueRow = {
	id: string | number;
	issue_no: string;
	issue_date: string;
	issue_date_raw?: string;
	branch_name: string;
	expense_type: string;
	department: string;
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
	if (normalized.includes("approved") || normalized.includes("complete")) return "success";
	if (normalized.includes("rejected") || normalized.includes("cancelled")) return "error";
	if (normalized.includes("pending") || normalized.includes("open")) return "warning";
	if (normalized.includes("draft")) return "default";
	return "info";
};

export default function InventoryIssueIndexPage() {
	const router = useRouter();
	const [rows, setRows] = React.useState<IssueRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const columns = React.useMemo<GridColDef[]>(
		() => [
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 140,
			},
			{
				field: "issue_no",
				headerName: "Issue No.",
				flex: 1,
				minWidth: 130,
				renderCell: (params: GridRenderCellParams<IssueRow, string>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "issue_date",
				headerName: "Issue Date",
				minWidth: 130,
				renderCell: (params: GridRenderCellParams<IssueRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || formatDate(typeof params.row.issue_date_raw === "string" ? params.row.issue_date_raw : "") || "-"}
					</Typography>
				),
			},
			{
				field: "expense_type",
				headerName: "Expense Type",
				flex: 1,
				minWidth: 150,
			},
			{
				field: "department",
				headerName: "Department",
				flex: 1,
				minWidth: 150,
			},
			{
				field: "status",
				headerName: "Status",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<IssueRow, string>) => (
					<Chip
						size="small"
						color={getStatusColor(params.value ?? "")}
						label={params.value || "Pending"}
					/>
				),
			},
		],
		[]
	);

	const fetchIssues = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.ISSUE_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as Record<string, unknown>)?.data)
				? ((data as Record<string, unknown>).data as Record<string, unknown>[])
				: Array.isArray(data)
					? (data as Record<string, unknown>[])
					: [];

			const mappedRows: IssueRow[] = rawRows.map((row) => {
				const rawDate = (row.issue_date ?? row.issueDate ?? row.created_at ?? "") as string;
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				return {
					id: (row.issue_id ?? row.id ?? row.issueId ?? `issue-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					issue_no: (row.issue_no ?? row.issueNo ?? "") as string,
					issue_date_raw: normalizedRaw,
					issue_date: formatDate(normalizedRaw),
					branch_name: (row.branch_name ?? row.branchName ?? row.branch ?? "") as string,
					expense_type: (row.expense_type ?? row.expenseType ?? row.expense_type_name ?? "") as string,
					department: (row.department ?? row.dept_name ?? row.department_name ?? "") as string,
					status: (row.status ?? row.status_name ?? row.current_status ?? "Pending") as string,
				};
			});

			setRows(mappedRows);
			const total = Number((data as Record<string, unknown>)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load issues";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		void fetchIssues();
	}, [fetchIssues]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreateIssue = React.useCallback(() => {
		router.push("/dashboardportal/inventory/issue/createIssue");
	}, [router]);

	const handleView = React.useCallback(
		(row: IssueRow) => {
			const id = row.id ?? row.issue_no;
			if (!id) return;
			router.push(`/dashboardportal/inventory/issue/createIssue?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: IssueRow) => {
			const id = row.id ?? row.issue_no;
			if (!id) return;
			router.push(`/dashboardportal/inventory/issue/createIssue?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Inventory Issues"
			subtitle="View and manage material issues from stores."
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
				placeholder: "Search by issue no., branch, department...",
				debounceDelayMs: 1000,
			}}
			createAction={{ onClick: handleCreateIssue, label: "Create Issue" }}
			onView={handleView}
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
