"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import {
	Box,
	TextField,
	Snackbar,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	MenuItem,
} from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CreateDepartmentPage from "./CreateDepartmentPage";
import { DEPT_FOR, deptForLabel } from "./constants";

// Reads the sidebar company/branch selection cached in localStorage.
const readScope = (): { co_id: string; branchIds: string } => {
	const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
	const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	let branchIds = "";
	try {
		const parsed = JSON.parse(localStorage.getItem("sidebar_selectedBranches") ?? "null");
		if (Array.isArray(parsed)) {
			branchIds = parsed
				.map((b: any) => (b && typeof b === "object" ? b.branch_id ?? b.id ?? b.value ?? "" : b ?? ""))
				.map((value: any) => String(value))
				.filter((value: string) => value.length > 0)
				.join(",");
		}
	} catch {
		/* ignore branch cache parse errors */
	}
	return { co_id, branchIds };
};

type DeptRow = {
	id?: number | string;
	dept_master_id?: number;
	dept_code?: string;
	dept_name?: string;
	order_id?: number | string;
	worker_staff?: number | string;
	active?: number | boolean | string;
	branch_display?: string;
	branch_id?: string | number;
	[key: string]: any;
};

export default function DepartmentMasterPage() {
	const [rows, setRows] = useState<DeptRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
	const [totalRows, setTotalRows] = useState<number>(0);
	const [searchQuery, setSearchQuery] = useState<string>("");

	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
		{ open: false, message: "", severity: "success" }
	);

	// Create dialog state
	const [createOpen, setCreateOpen] = useState<boolean>(false);

	// Branch options
	const [branchOptions, setBranchOptions] = useState<any[]>([]);

	// View/Edit states
	const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
	const [viewData, setViewData] = useState<DeptRow | null>(null);

	const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
	const [editLoading, setEditLoading] = useState<boolean>(false);
	const [editDeptId, setEditDeptId] = useState<number | string | null>(null);
	const [editDeptName, setEditDeptName] = useState<string>("");
	const [editDeptCode, setEditDeptCode] = useState<string>("");
	const [editBranchId, setEditBranchId] = useState<string>("");
	const [editOrderId, setEditOrderId] = useState<string>("");
	const [editWorkerStaff, setEditWorkerStaff] = useState<string>("1");
	const [editNameError, setEditNameError] = useState<string | null>(null);
	const [editCodeError, setEditCodeError] = useState<string | null>(null);

	const fetchDepartments = async (): Promise<void> => {
		setLoading(true);
		try {
			const { co_id, branchIds } = readScope();
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
				co_id,
				branch_id: branchIds,
			});
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.DEPT_MASTER_TABLE}?${queryParams}`, "GET");
			if (error || !data) throw new Error(error || "Failed to fetch departments");

			const mapped = (data.data || []).map((r: any) => ({
				...r,
				id: r.dept_master_id ?? r.dept_id ?? r.id,
				branch_display: r.branch_name ?? r.branch_desc ?? r.branch_display ?? r.branch ?? "",
				branch_id: r.branch_id ?? r.branch ?? r.b_id ?? r.branchId ?? null,
			}));
			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: any) {
			setSnackbar({ open: true, message: err?.message || "Error fetching departments", severity: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDepartments();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);







	const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		setSearchQuery(v);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};



	const openCreate = (): void => {
		setCreateOpen(true);
	};
	const closeCreate = (): void => {
		setCreateOpen(false);
	};

	const closeEdit = (): void => {
		setEditDialogOpen(false);
		setEditNameError(null);
		setEditCodeError(null);
	};



	// ponytail: no dept_master_view endpoint exists on the backend — the grid row
	// already carries every field view/edit render, so read from it instead.
	const handleOpenView = (row: DeptRow): void => {
		setViewData(row);
		setViewDialogOpen(true);
	};

	const handleOpenEdit = async (row: DeptRow): Promise<void> => {
		setEditDialogOpen(true);
		setEditLoading(true);
		setEditDeptId(row.id ?? row.dept_master_id ?? null);
		setEditDeptName(String(row.dept_name ?? ""));
		setEditDeptCode(String(row.dept_code ?? ""));
		setEditBranchId(row.branch_id != null ? String(row.branch_id) : "");
		setEditOrderId(row.order_id != null ? String(row.order_id) : "");
		setEditWorkerStaff(String(row.worker_staff ?? "1"));
		setEditNameError(null);
		setEditCodeError(null);
		try {
			const { co_id, branchIds } = readScope();
			const params = new URLSearchParams({ co_id });
			if (branchIds) params.append("branch_id", branchIds);
			const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.DEPT_MASTER_CREATE_SETUP}?${params}`, "GET");
			if (error || !data) throw new Error(error || "Failed to load branches");
			const branches = Array.isArray(data.data) ? data.data : [];
			setBranchOptions(branches.map((b: any) => ({ id: String(b.branch_id), label: b.branch_name ?? String(b.branch_id) })));
		} catch (err: any) {
			setSnackbar({ open: true, message: err?.message || "Failed to load branches", severity: "error" });
		} finally {
			setEditLoading(false);
		}
	};

	const handleSaveEdit = async (): Promise<void> => {
		if (!editDeptId) return;
		setEditLoading(true);
		try {
			const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
			const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
			const payload = {
				co_id,
				dept_master_id: editDeptId,
				dept_name: editDeptName,
				dept_code: editDeptCode,
				branch_id: editBranchId,
				order_id: editOrderId,
				worker_staff: editWorkerStaff,
			};
			const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.DEPT_MASTER_CREATE, "POST", payload) as any;
			if (error || !data) throw new Error(error || "Failed to save department");
			setSnackbar({ open: true, message: data?.message || "Department updated", severity: "success" });
			setEditDialogOpen(false);
			fetchDepartments();
		} catch (err: any) {
			setSnackbar({ open: true, message: err?.message || "Update failed", severity: "error" });
		} finally {
			setEditLoading(false);
		}
	};

	const columns = useMemo<GridColDef<DeptRow>[]>(() => [
		{ field: "dept_code", headerName: "Dept Code", flex: 1, minWidth: 140 },
		{ field: "dept_name", headerName: "Department", flex: 1, minWidth: 220 },
		{ field: "branch_display", headerName: "Branch", flex: 1, minWidth: 180 },
		{ field: "order_id", headerName: "Order", width: 100, type: "number" },
		{
			field: "worker_staff",
			headerName: "Department For",
			width: 150,
			renderCell: (params: GridRenderCellParams<DeptRow>) => <span>{deptForLabel(params.value)}</span>,
		},
	], []);

	const editRowHandler = (row: DeptRow) => {
		void handleOpenEdit(row);
	};

	return (
		<IndexWrapper
			title="Department Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search departments", debounceDelayMs: 1000 }}
			createAction={{ onClick: openCreate }}
			onView={handleOpenView}
			onEdit={editRowHandler}
		>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>

			<CreateDepartmentPage
				open={createOpen}
				onClose={() => {
					closeCreate();
					fetchDepartments();
				}}
				existingRows={rows}
			/>

			<Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Department Details</DialogTitle>
				<DialogContent>
					{viewData ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
							<div><b>Dept Code:</b> {viewData.dept_code ?? "-"}</div>
							<div><b>Department:</b> {viewData.dept_name ?? "-"}</div>
							<div><b>Branch:</b> {viewData.branch_display || "-"}</div>
							<div><b>Order:</b> {viewData.order_id ?? "-"}</div>
							<div><b>Department For:</b> {deptForLabel(viewData.worker_staff)}</div>
						</Box>
					) : <div>No details</div>}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setViewDialogOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={editDialogOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
				<DialogTitle>Edit Department</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
						<TextField
							label="Department Name"
							value={editDeptName}
							onChange={(e) => {
								setEditDeptName(e.target.value);
								if (editNameError) setEditNameError(null);
							}}
							error={!!editNameError}
							helperText={editNameError ?? undefined}
							fullWidth
						/>
						<TextField
							label="Department Code"
							value={editDeptCode}
							onChange={(e) => {
								setEditDeptCode(e.target.value);
								if (editCodeError) setEditCodeError(null);
							}}
							error={!!editCodeError}
							helperText={editCodeError ?? undefined}
							fullWidth
						/>
						<TextField select label="Branch" value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)} fullWidth>
							{branchOptions.map((b: { id: string; label: string }) => (
								<MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>
							))}
						</TextField>
						<TextField
							label="Order"
							type="number"
							value={editOrderId}
							onChange={(e) => setEditOrderId(e.target.value)}
							fullWidth
						/>
						<TextField select label="Department For" value={editWorkerStaff} onChange={(e) => setEditWorkerStaff(e.target.value)} fullWidth>
							{DEPT_FOR.map((o) => (
								<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
							))}
						</TextField>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeEdit} disabled={editLoading}>Cancel</Button>
					<Button className="btn-primary" onClick={handleSaveEdit} disabled={editLoading || !editDeptName || !editDeptCode || !editOrderId || !!editNameError || !!editCodeError}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</IndexWrapper>
	);
}

