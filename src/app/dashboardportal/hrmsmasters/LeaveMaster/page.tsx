"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateLeaveTypePage from "./CreateLeaveTypePage";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type LeaveTypeRow = {
	id: number | string;
	leave_type_id: number;
	leave_type_code: string;
	leave_type_description: string;
	payable: string;
	[key: string]: unknown;
};

export default function LeaveMasterPage() {
	const [rows, setRows] = useState<LeaveTypeRow[]>([]);
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

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const fetchLeaveTypes = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.LEAVE_TYPE_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch leave types");
			}

			const mapped: LeaveTypeRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.leave_type_id as number,
					leave_type_id: r.leave_type_id as number,
					leave_type_code: (r.leave_type_code as string) ?? "",
					leave_type_description: (r.leave_type_description as string) ?? "",
					payable: (r.payable as string) === "Y" ? "Yes" : "No",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching leave types";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId]);

	useEffect(() => {
		fetchLeaveTypes();
	}, [fetchLeaveTypes]);

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

	const handleEdit = useCallback((row: LeaveTypeRow) => {
		setSelectedId(row.leave_type_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchLeaveTypes();
	}, [fetchLeaveTypes]);

	const columns = useMemo<GridColDef<LeaveTypeRow>[]>(
		() => [
			{
				field: "leave_type_code",
				headerName: "Leave Type Code",
				flex: 1.5,
				minWidth: 150,
			},
			{
				field: "leave_type_description",
				headerName: "Leave Description",
				flex: 2,
				minWidth: 200,
			},
			{
				field: "payable",
				headerName: "Payable",
				flex: 1,
				minWidth: 100,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Leave Type Master"
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
				placeholder: "Search by leave type code or description",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Leave Type",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateLeaveTypePage
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
