"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateShiftPage from "./CreateShiftPage";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type ShiftRow = {
	id: number | string;
	shift_id: number;
	shift_name: string;
	branch_name: string;
	starting_time: string;
	end_time: string;
	working_hours: number;
	status: number;
	[key: string]: unknown;
};

const DAYS_MAP: Record<number, string> = {
	1: "Sunday",
	2: "Monday",
	3: "Tuesday",
	4: "Wednesday",
	5: "Thursday",
	6: "Friday",
	7: "Saturday",
};

export default function ShiftMasterPage() {
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = useState<ShiftRow[]>([]);
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

	const fetchShifts = useCallback(async () => {
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
				`${apiRoutesPortalMasters.SHIFT_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch shifts");
			}

			const mapped: ShiftRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.shift_id as number,
					shift_id: r.shift_id as number,
					shift_name: (r.shift_name as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
					starting_time: (r.starting_time as string) ?? "",
					end_time: (r.end_time as string) ?? "",
					working_hours: (r.working_hours as number) ?? 0,
					status: (r.status as number) ?? 1,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching shifts";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

	useEffect(() => {
		fetchShifts();
	}, [fetchShifts]);

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

	const handleEdit = useCallback((row: ShiftRow) => {
		setSelectedId(row.shift_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchShifts();
	}, [fetchShifts]);

	const columns = useMemo<GridColDef<ShiftRow>[]>(
		() => [
			{
				field: "shift_name",
				headerName: "Shift Name",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "starting_time",
				headerName: "Start Time",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "end_time",
				headerName: "End Time",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "working_hours",
				headerName: "Working Hours",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "week_off_day",
				headerName: "Week Off",
				flex: 1,
				minWidth: 100,
				valueGetter: (_value: unknown, row: ShiftRow) => {
					const dayNum = row.week_off_day as unknown as number;
					return DAYS_MAP[dayNum] ?? "";
				},
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Shift Master"
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
				placeholder: "Search by shift name or branch",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Shift",
				onClick: handleCreate,
			}}
			onView={handleEdit}
			onEdit={handleEdit}
		>
			<CreateShiftPage
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
