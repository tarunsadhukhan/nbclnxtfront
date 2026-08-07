"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	MenuItem,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Pencil as EditOutlinedIcon, Plus as AddIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type WtRow = {
	spreader_machine_attr_id: number;
	co_id: number;
	branch_id?: number | null;
	machine_id: number;
	wt_per_roll: number;
	active: number;
	machine_name?: string | null;
	mech_code?: string | null;
	branch_name?: string | null;
};

type SetupMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	wt_per_roll: number;
	spreader_machine_attr_id?: number | null;
};

export default function SpreaderMachineWtPage() {
	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

	// Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
	const sidebarBranchIds = React.useMemo(() => selectedBranches.map(Number), [selectedBranches]);
	const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
	React.useEffect(() => {
		if (sidebarBranchIds.length === 1) {
			setPageBranchId(sidebarBranchIds[0]);
		} else if (sidebarBranchIds.length === 0) {
			setPageBranchId("");
		} else {
			setPageBranchId((prev) =>
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [rows, setRows] = React.useState<WtRow[]>([]);
	const [machines, setMachines] = React.useState<SetupMachine[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<WtRow | null>(null);
	const [form, setForm] = React.useState({ machine_id: "" as number | "", wt_per_roll: "", active: 1 });

	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const refresh = React.useCallback(async () => {
		if (!coId || branchId == null) {
			setRows([]);
			setMachines([]);
			return;
		}
		setLoading(true);
		const [list, setup] = await Promise.all([
			fetchWithCookie<{ data: WtRow[] }>(
				`${apiRoutesPortalMasters.SPREADER_MACHINE_WT_LIST}?co_id=${coId}&branch_id=${branchId}`,
				"GET"
			),
			fetchWithCookie<{ data: { machines: SetupMachine[] } }>(
				`${apiRoutesPortalMasters.SPREADER_MACHINE_WT_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`,
				"GET"
			),
		]);
		if (list.error || setup.error) setError(list.error ?? setup.error ?? null);
		setRows(list.data?.data ?? []);
		setMachines(setup.data?.data?.machines ?? []);
		setLoading(false);
	}, [coId, branchId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async () => {
		if (!coId || branchId == null) return;
		setError(null);
		const payload = {
			co_id: Number(coId),
			branch_id: branchId,
			machine_id: Number(form.machine_id),
			wt_per_roll: Number(form.wt_per_roll),
			active: Number(form.active),
		};
		if (editing) {
			const url = `${apiRoutesPortalMasters.SPREADER_MACHINE_WT_EDIT}/${editing.spreader_machine_attr_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", {
				wt_per_roll: payload.wt_per_roll,
				active: payload.active,
			});
			if (err) {
				setError(err);
				return;
			}
		} else {
			const { error: err } = await fetchWithCookie(
				apiRoutesPortalMasters.SPREADER_MACHINE_WT_CREATE,
				"POST",
				payload
			);
			if (err) {
				setError(err);
				return;
			}
		}
		setOpen(false);
		setEditing(null);
		await refresh();
	};

	const openCreate = () => {
		setEditing(null);
		setForm({ machine_id: "", wt_per_roll: "", active: 1 });
		setOpen(true);
	};
	const openEdit = (r: WtRow) => {
		setEditing(r);
		setForm({
			machine_id: r.machine_id,
			wt_per_roll: String(r.wt_per_roll),
			active: r.active,
		});
		setOpen(true);
	};

	const columns: GridColDef<WtRow>[] = [
		{
			field: "actions",
			headerName: "",
			width: 60,
			sortable: false,
			renderCell: (params) => (
				<Tooltip title="Edit">
					<IconButton size="small" onClick={() => openEdit(params.row)} sx={{ minWidth: 40, minHeight: 40 }}>
						<EditOutlinedIcon size={16} />
					</IconButton>
				</Tooltip>
			),
		},
		{ field: "machine_name", headerName: "Spreader", flex: 1, minWidth: 200 },
		{ field: "mech_code", headerName: "Code", width: 120 },
		{
			field: "wt_per_roll",
			headerName: "Wt per Roll (kg)",
			width: 160,
			type: "number",
			valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : ""),
		},
		{
			field: "active",
			headerName: "Active",
			width: 90,
			renderCell: (params) => (params.value ? "Yes" : "No"),
		},
	];

	if (!mounted) {
		return null;
	}

	if (!coId) {
		return <Alert severity="warning" sx={{ m: 2 }}>Select a company to continue.</Alert>;
	}

	if (sidebarBranchIds.length === 0) {
		return <Alert severity="warning" sx={{ m: 2 }}>Select at least one branch in the sidebar to continue.</Alert>;
	}

	const usedMachineIds = new Set(rows.map((r) => r.machine_id));
	const machineOptions = editing
		? machines.filter((m) => m.machine_id === editing.machine_id)
		: machines.filter((m) => !usedMachineIds.has(m.machine_id));

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Spreader Machine Weight
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Roll weight (kg) per spreader machine.
					</Typography>
				</Box>
				<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate} disabled={branchId == null}>
					New
				</Button>
			</Box>
			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, minWidth: 240 }}
				>
					{branchOptions.map((b) => (
						<MenuItem key={b.branch_id} value={Number(b.branch_id)}>
							{b.branch_name}
						</MenuItem>
					))}
				</TextField>
			) : selectedBranchName ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Branch: {selectedBranchName}
				</Typography>
			) : null}
			{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
			{branchId == null ? <Alert severity="info" sx={{ mb: 2 }}>Select a branch to load machine weights.</Alert> : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows.map((r) => ({ ...r, id: r.spreader_machine_attr_id }))}
					columns={columns}
					loading={loading}
					density="comfortable"
					disableRowSelectionOnClick
					pageSizeOptions={[10, 25, 50]}
					initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
					sx={{ width: "100%" }}
				/>
			</Box>

			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>{editing ? "Edit Wt per Roll" : "Assign Wt per Roll"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						<TextField
							select
							label="Spreader"
							value={form.machine_id}
							onChange={(e) =>
								setForm({ ...form, machine_id: e.target.value === "" ? "" : Number(e.target.value) })
							}
							size="small"
							disabled={!!editing}
						>
							{machineOptions.map((m) => (
								<MenuItem key={m.machine_id} value={m.machine_id}>
									{m.machine_name} ({m.mech_code})
								</MenuItem>
							))}
						</TextField>
						<TextField
							type="number"
							label="Wt per Roll (kg)"
							inputProps={{ step: 0.001, min: 0 }}
							value={form.wt_per_roll}
							onChange={(e) => setForm({ ...form, wt_per_roll: e.target.value })}
							size="small"
						/>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography variant="body2">Active</Typography>
							<Switch
								checked={!!form.active}
								onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
							/>
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button
						variant="contained"
						onClick={handleSave}
						disabled={!form.machine_id || !form.wt_per_roll || Number(form.wt_per_roll) <= 0}
					>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
