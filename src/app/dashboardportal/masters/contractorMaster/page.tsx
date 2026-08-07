"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateContractorPage from "./CreateContractorPage";
import type { MuiFormMode } from "@/components/ui/muiform";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type ContractorRow = {
	id: number | string;
	cont_id: number;
	contractor_name: string;
	phone_no: string;
	email_id: string;
	pan_no: string;
	branch_name: string;
	[key: string]: unknown;
};

export default function ContractorMasterPage() {
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = useState<ContractorRow[]>([]);
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

	const fetchContractors = useCallback(async () => {
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
				`${apiRoutesPortalMasters.CONTRACTOR_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch contractors");
			}

			const mapped: ContractorRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.cont_id as number,
					cont_id: r.cont_id as number,
					contractor_name: (r.contractor_name as string) ?? "",
					phone_no: (r.phone_no as string) ?? "",
					email_id: (r.email_id as string) ?? "",
					pan_no: (r.pan_no as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching contractors";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

	useEffect(() => {
		fetchContractors();
	}, [fetchContractors]);

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
		setDialogMode("create");
		setDialogOpen(true);
	}, []);

	const handleView = useCallback((row: ContractorRow) => {
		setSelectedId(row.cont_id);
		setDialogMode("view");
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: ContractorRow) => {
		setSelectedId(row.cont_id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchContractors();
	}, [fetchContractors]);

	const columns = useMemo<GridColDef<ContractorRow>[]>(
		() => [
			{
				field: "contractor_name",
				headerName: "Contractor Name",
				flex: 1.5,
				minWidth: 180,
			},
			{
				field: "phone_no",
				headerName: "Phone",
				flex: 1,
				minWidth: 130,
			},
			{
				field: "email_id",
				headerName: "Email",
				flex: 1.2,
				minWidth: 180,
			},
			{
				field: "pan_no",
				headerName: "PAN No",
				flex: 0.8,
				minWidth: 120,
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
			title="Contractor Master"
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
				placeholder: "Search by name, phone, email or PAN",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Contractor",
				onClick: handleCreate,
			}}
			onView={handleView}
			onEdit={handleEdit}
		>
			<CreateContractorPage
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
