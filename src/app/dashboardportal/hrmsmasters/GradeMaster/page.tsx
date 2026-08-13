"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateGradePage from "./CreateGradePage";

type GradeRow = {
	id: number | string;
	grade_id: number;
	grade_code: string;
	grade_name: string;
	grade_type_name: string;
	[key: string]: unknown;
};

export default function GradeMasterPage() {
	const [rows, setRows] = useState<GradeRow[]>([]);
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

	const fetchGrades = useCallback(async () => {
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
				`${apiRoutesPortalMasters.GRADE_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch grades");
			}

			const mapped: GradeRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.grade_id as number,
					grade_id: r.grade_id as number,
					grade_code: (r.grade_code as string) ?? "",
					grade_name: (r.grade_name as string) ?? "",
					grade_type_name: (r.grade_type_name as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching grades";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchGrades();
	}, [fetchGrades]);

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

	const handleEdit = useCallback((row: GradeRow) => {
		setSelectedId(row.grade_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchGrades();
	}, [fetchGrades]);

	const columns = useMemo<GridColDef<GradeRow>[]>(
		() => [
			{
				field: "grade_code",
				headerName: "Grade Code",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "grade_name",
				headerName: "Grade Name",
				flex: 2,
				minWidth: 200,
			},
			{
				field: "grade_type_name",
				headerName: "Grade Type",
				flex: 1,
				minWidth: 120,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Grade Master"
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
				placeholder: "Search by grade code or name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Grade",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateGradePage
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
