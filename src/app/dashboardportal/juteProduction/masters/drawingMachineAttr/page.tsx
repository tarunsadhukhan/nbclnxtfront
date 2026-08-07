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
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// One row per Drawing machine: attr columns are null when not yet configured.
type AttrRow = {
	drawing_machine_attr_id: number | null;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	dept_name: string | null;
	branch_id: number | null;
	const_meter: number | null;
	mc_group: string | null;
	meter_wrap_limit: number | null;
	active: number | null;
};

export default function DrawingMachineAttrPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<AttrRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<AttrRow | null>(null);
	const [form, setForm] = React.useState({
		machine_id: "" as number | "",
		const_meter: "",
		mc_group: "",
		meter_wrap_limit: "10000",
		active: 1,
	});

	// Single fetch: the list endpoint returns ALL Drawing machines LEFT JOINed to
	// their attr row, so it also supplies the create dialog's machine options.
	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const { data, error: err } = await fetchWithCookie<{ data: AttrRow[] }>(
			`${apiRoutesPortalMasters.DRAWING_MACHINE_ATTR_LIST}?co_id=${coId}`,
			"GET"
		);
		if (err) setError(err);
		setRows(data?.data ?? []);
		setLoading(false);
	}, [coId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async () => {
		if (!coId) return;
		setError(null);
		if (editing && editing.drawing_machine_attr_id != null) {
			const url = `${apiRoutesPortalMasters.DRAWING_MACHINE_ATTR_EDIT}/${editing.drawing_machine_attr_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", {
				const_meter: Number(form.const_meter),
				mc_group: form.mc_group || null,
				meter_wrap_limit: Number(form.meter_wrap_limit),
				active: Number(form.active),
			});
			if (err) {
				setError(err);
				return;
			}
		} else {
			const { error: err } = await fetchWithCookie(
				apiRoutesPortalMasters.DRAWING_MACHINE_ATTR_CREATE,
				"POST",
				{
					co_id: Number(coId),
					machine_id: Number(form.machine_id),
					const_meter: Number(form.const_meter),
					mc_group: form.mc_group || null,
					meter_wrap_limit: Number(form.meter_wrap_limit),
					active: Number(form.active),
				}
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
		setForm({ machine_id: "", const_meter: "", mc_group: "", meter_wrap_limit: "10000", active: 1 });
		setOpen(true);
	};
	const openEdit = (r: AttrRow) => {
		setEditing(r);
		setForm({
			machine_id: r.machine_id,
			const_meter: r.const_meter != null ? String(r.const_meter) : "",
			mc_group: r.mc_group ?? "",
			meter_wrap_limit: r.meter_wrap_limit != null ? String(r.meter_wrap_limit) : "10000",
			active: r.active ?? 1,
		});
		setOpen(true);
	};

	const columns: GridColDef<AttrRow>[] = [
		{
			field: "actions",
			headerName: "",
			width: 60,
			sortable: false,
			renderCell: (params) =>
				params.row.drawing_machine_attr_id != null ? (
					<Tooltip title="Edit">
						<IconButton
							size="small"
							onClick={() => openEdit(params.row)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<EditOutlinedIcon size={16} />
						</IconButton>
					</Tooltip>
				) : null,
		},
		{ field: "mech_code", headerName: "Code", width: 110 },
		{ field: "machine_name", headerName: "Machine", flex: 1, minWidth: 200 },
		{ field: "dept_name", headerName: "Department", width: 140 },
		{
			field: "const_meter",
			headerName: "Const Meter (m/8h)",
			width: 160,
			type: "number",
			valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : "—"),
		},
		{ field: "mc_group", headerName: "Group", width: 100 },
		{ field: "meter_wrap_limit", headerName: "Wrap Limit", width: 110, type: "number" },
		{
			field: "active",
			headerName: "Active",
			width: 110,
			renderCell: (params) =>
				params.row.drawing_machine_attr_id == null
					? "Not set"
					: params.value
					? "Yes"
					: "No",
		},
	];

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	const machineOptions = editing
		? rows.filter((r) => r.machine_id === editing.machine_id)
		: rows.filter((r) => r.drawing_machine_attr_id == null);

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Drawing Machine Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Const meter (m/8h), group and meter wrap limit per drawing machine.
					</Typography>
				</Box>
				<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
					New
				</Button>
			</Box>
			{error ? (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(r) => r.machine_id}
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
				<DialogTitle>{editing ? "Edit Drawing Attributes" : "Configure Drawing Machine"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						<TextField
							select
							label="Machine"
							value={form.machine_id}
							onChange={(e) =>
								setForm({ ...form, machine_id: e.target.value === "" ? "" : Number(e.target.value) })
							}
							size="small"
							disabled={!!editing}
						>
							{machineOptions.map((m) => (
								<MenuItem key={m.machine_id} value={m.machine_id}>
									{m.mech_code} — {m.machine_name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							type="number"
							label="Const Meter (m per 8h @100%)"
							inputProps={{ step: 0.001, min: 0 }}
							value={form.const_meter}
							onChange={(e) => setForm({ ...form, const_meter: e.target.value })}
							size="small"
						/>
						<TextField
							label="Machine Group (payroll)"
							value={form.mc_group}
							onChange={(e) => setForm({ ...form, mc_group: e.target.value })}
							size="small"
							inputProps={{ maxLength: 50 }}
						/>
						<TextField
							type="number"
							label="Meter Wrap Limit"
							inputProps={{ step: 1, min: 1 }}
							value={form.meter_wrap_limit}
							onChange={(e) => setForm({ ...form, meter_wrap_limit: e.target.value })}
							size="small"
							helperText="Counter rollover value (legacy 10000 for 5-digit odometers)"
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
						disabled={
							!form.machine_id ||
							!form.const_meter ||
							Number(form.const_meter) <= 0 ||
							Number(form.meter_wrap_limit) <= 0
						}
					>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
