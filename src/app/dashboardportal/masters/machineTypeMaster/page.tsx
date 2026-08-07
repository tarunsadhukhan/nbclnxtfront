"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateMachineTypePage from "./CreateMachineTypePage";
import type { MuiFormMode } from "@/components/ui/muiform";

type MachineTypeRow = {
	id: number | string;
	machine_type_id: number;
	machine_type_name: string;
	active: number;
	[key: string]: unknown;
};

export default function MachineTypeMasterPage() {
	const [rows, setRows] = useState<MachineTypeRow[]>([]);
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
	const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

	const fetchMachineTypes = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.MACHINE_TYPE_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch machine types");
			}

			const mapped: MachineTypeRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.machine_type_id as number,
					machine_type_id: r.machine_type_id as number,
					machine_type_name: (r.machine_type_name as string) ?? "",
					active: (r.active as number) ?? 1,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching machine types";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchMachineTypes();
	}, [fetchMachineTypes]);

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

	const handleEdit = useCallback((row: MachineTypeRow) => {
		setSelectedId(row.machine_type_id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchMachineTypes();
	}, [fetchMachineTypes]);

	const columns = useMemo<GridColDef<MachineTypeRow>[]>(
		() => [
			{
				field: "machine_type_name",
				headerName: "Machine Type Name",
				flex: 2,
				minWidth: 200,
			},
			{
				field: "active",
				headerName: "Status",
				width: 100,
				renderCell: (params) => (
					<span style={{ color: params.value === 1 ? "green" : "red" }}>
						{params.value === 1 ? "Active" : "Inactive"}
					</span>
				),
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Machine Type Master"
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
				placeholder: "Search by machine type name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Machine Type",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateMachineTypePage
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
