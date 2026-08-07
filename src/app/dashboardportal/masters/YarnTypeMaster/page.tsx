"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateYarnType from "./createYarnType";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Yarn Type row in the data grid
 */
type YarnTypeRow = {
	id: number | string;
	item_grp_id: number;
	item_grp_name: string;
	item_grp_code: string;
	active?: string;
	updated_by?: number;
	updated_date_time?: string;
	[key: string]: unknown;
};

/**
 * @component YarnTypeMasterPage
 * @description Index page for Yarn Type Master - displays a paginated list of yarn types.
 */
export default function YarnTypeMasterPage() {
	const [rows, setRows] = useState<YarnTypeRow[]>([]);
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

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
	const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

	/**
	 * Fetch yarn types from the API
	 */
	const fetchYarnTypes = useCallback(async () => {
		setLoading(true);
		try {
			const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
			const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

			if (!co_id) {
				throw new Error("No company selected");
			}

			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
				co_id,
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.YARN_TYPE_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch yarn types");
			}

			// Map response data to grid rows
			const mapped: YarnTypeRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
				...r,
				id: r.item_grp_id as number,
				item_grp_id: r.item_grp_id as number,
				item_grp_name: (r.item_grp_name as string) ?? "",
				item_grp_code: (r.item_grp_code as string) ?? "",
				updated_date_time: r.updated_date_time
					? new Date(r.updated_date_time as string).toLocaleDateString()
					: "-",
			}));

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching yarn types";
			setSnackbar({
				open: true,
				message,
				severity: "error",
			});
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchYarnTypes();
	}, [fetchYarnTypes]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
		// Reset to first page on search
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	/**
	 * Handle create button click
	 */
	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogMode("create");
		setDialogOpen(true);
	}, []);

	/**
	 * Handle view action - opens view dialog
	 */
	const handleView = useCallback((row: YarnTypeRow) => {
		setSelectedId(row.item_grp_id);
		setDialogMode("view");
		setDialogOpen(true);
	}, []);

	/**
	 * Handle edit action - opens edit dialog
	 */
	const handleEdit = useCallback((row: YarnTypeRow) => {
		setSelectedId(row.item_grp_id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	/**
	 * Handle dialog close
	 */
	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	/**
	 * Handle successful save - refresh list
	 */
	const handleSaved = useCallback(() => {
		fetchYarnTypes();
	}, [fetchYarnTypes]);

	/**
	 * Column definitions for the data grid
	 */
	const columns = useMemo<GridColDef<YarnTypeRow>[]>(
		() => [
			{
				field: "item_grp_code",
				headerName: "Yarn Type Code",
				flex: 1,
				minWidth: 150,
			},
			{
				field: "item_grp_name",
				headerName: "Yarn Type Name",
				flex: 2,
				minWidth: 250,
			},
			{
				field: "updated_date_time",
				headerName: "Last Updated",
				flex: 1,
				minWidth: 150,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Yarn Type Master"
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
				placeholder: "Search by yarn type name or code",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Yarn Type",
				onClick: handleCreate,
			}}
			onView={handleView}
			onEdit={handleEdit}
		>
			<CreateYarnType
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
				initialMode={dialogMode}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
