"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateDesignationPage from "./CreateDesignationPage";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type DesignationRow = {
	id: number | string;
	designation_id: number;
	desig: string;
	dept_name: string;
	branch_name: string;
	norms: string;
	time_piece: string;
	active: number;
	[key: string]: unknown;
};

export default function DesignationMasterPage() {
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = useState<DesignationRow[]>([]);
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

	const fetchDesignations = useCallback(async () => {
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
				`${apiRoutesPortalMasters.DESIGNATION_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch designations");
			}

			const mapped: DesignationRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.designation_id as number,
					designation_id: r.designation_id as number,
					desig: (r.desig as string) ?? "",
					dept_name: (r.dept_name as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
					norms: (r.norms as string) ?? "",
					time_piece: (r.time_piece as string) ?? "",
					active: (r.active as number) ?? 1,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching designations";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

	useEffect(() => {
		fetchDesignations();
	}, [fetchDesignations]);

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

	const handleEdit = useCallback((row: DesignationRow) => {
		setSelectedId(row.designation_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchDesignations();
	}, [fetchDesignations]);

	const columns = useMemo<GridColDef<DesignationRow>[]>(
		() => [
			{
				field: "desig",
				headerName: "Designation Name",
				flex: 2,
				minWidth: 200,
			},
			{
				field: "dept_name",
				headerName: "Department",
				flex: 1.5,
				minWidth: 150,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "norms",
				headerName: "Norms",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "time_piece",
				headerName: "Time/Piece",
				flex: 1,
				minWidth: 100,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Designation Master"
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
				placeholder: "Search by designation, department, or norms",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Designation",
				onClick: handleCreate,
			}}
			onView={handleEdit}
			onEdit={handleEdit}
		>
			<CreateDesignationPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={handleSnackbarClose}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
