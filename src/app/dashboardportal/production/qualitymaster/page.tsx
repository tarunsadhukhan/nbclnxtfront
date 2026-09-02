"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateQualityPage from "./CreateQualityPage";

type QualityRow = {
	id: number;
	quality_id: number;
	dept_name: string;
	quality_code: string;
	quality_desc: string;
	quality_rate: number | null;
	conv_factor: number | null;
	status_id: number | null;
	status_name: string;
	active_label: "Yes" | "No";
};

// Standard status contract (instructions.md): 1 Open, 3 Approved, 4 Rejected
const STATUS_OPEN = 1;
// Legacy imported rows have no status yet — treat as Open
const isOpen = (row: QualityRow) => row.status_id === null || row.status_id === STATUS_OPEN;

export default function QualityMasterPage() {
	const [rows, setRows] = useState<QualityRow[]>([]);
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

	const fetchQualities = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.QUALITY_TABLE}?${queryParams}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to fetch qualities");

			const mapped: QualityRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					id: r.quality_id as number,
					quality_id: r.quality_id as number,
					dept_name: (r.dept_name as string) ?? "",
					quality_code: (r.quality_code as string) ?? "",
					quality_desc: (r.quality_desc as string) ?? "",
					quality_rate: r.quality_rate == null ? null : Number(r.quality_rate),
					conv_factor: r.conv_factor == null ? null : Number(r.conv_factor),
					status_id: r.status_id == null ? null : Number(r.status_id),
					status_name: (r.status_name as string) ?? "",
					active_label: r.active === 0 ? "No" : "Yes",
				})
			);
			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching qualities";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchQualities();
	}, [fetchQualities]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: QualityRow) => {
		setSelectedId(row.quality_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const columns = useMemo<GridColDef<QualityRow>[]>(
		() => [
			{ field: "dept_name", headerName: "Department", flex: 1.5, minWidth: 140 },
			{ field: "quality_code", headerName: "Quality Code", flex: 1, minWidth: 120 },
			{ field: "quality_desc", headerName: "Quality Description", flex: 2, minWidth: 200 },
			{
				field: "quality_rate",
				headerName: "Rate",
				flex: 1,
				minWidth: 110,
				type: "number",
				valueFormatter: (value: number | null) =>
					value != null ? String(parseFloat(value.toFixed(6))) : "",
			},
			{ field: "conv_factor", headerName: "Conv. Factor", flex: 1, minWidth: 120, type: "number" },
			{ field: "status_name", headerName: "Status", flex: 0.8, minWidth: 100 },
			{ field: "active_label", headerName: "Active", flex: 0.6, minWidth: 80 },
		],
		[]
	);

	return (
		<IndexWrapper
			title="Quality Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search by code, description or department",
				debounceDelayMs: 500,
			}}
			createAction={{ label: "Create Quality", onClick: handleCreate }}
			onEdit={handleEdit}
			onView={handleEdit}
			isRowEditable={isOpen}
		>
			<CreateQualityPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={fetchQualities}
				editId={selectedId}
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
