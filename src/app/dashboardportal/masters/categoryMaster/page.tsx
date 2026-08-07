"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateCategoryPage from "./CreateCategoryPage";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type CategoryRow = {
	id: number | string;
	cata_id: number;
	cata_code: string;
	cata_desc: string;
	branch_name: string;
	[key: string]: unknown;
};

export default function CategoryMasterPage() {
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = useState<CategoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

	const fetchCategories = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			if (selectedBranches.length > 0) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.CATEGORY_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch categories");
			}

			const mapped: CategoryRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.cata_id as number,
					cata_id: r.cata_id as number,
					cata_code: (r.cata_code as string) ?? "",
					cata_desc: (r.cata_desc as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching categories";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: CategoryRow) => {
		setSelectedId(row.cata_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchCategories();
	}, [fetchCategories]);

	const columns = useMemo<GridColDef<CategoryRow>[]>(
		() => [
			{
				field: "cata_code",
				headerName: "Category Code",
				flex: 1.5,
				minWidth: 150,
			},
			{
				field: "cata_desc",
				headerName: "Category Name",
				flex: 2,
				minWidth: 200,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 120,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Worker Category Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search by category code or name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Category",
				onClick: handleCreate,
			}}
			onView={handleEdit}
			onEdit={handleEdit}
		>
			<CreateCategoryPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={handleSnackbarClose}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
