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

type MaturityRow = {
	item_maturity_id: number;
	co_id: number;
	item_id: number;
	maturity_hours: number;
	active: number;
	item_name?: string | null;
	item_code?: string | null;
};

type SetupItem = {
	item_id: number;
	item_code: string;
	item_name: string;
};

export default function ItemMaturityMasterPage() {
	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<MaturityRow[]>([]);
	const [items, setItems] = React.useState<SetupItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<MaturityRow | null>(null);
	const [form, setForm] = React.useState({ item_id: "" as number | "", maturity_hours: "", active: 1 });

	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const [list, setup] = await Promise.all([
			fetchWithCookie<{ data: MaturityRow[] }>(
				`${apiRoutesPortalMasters.ITEM_MATURITY_LIST}?co_id=${coId}`,
				"GET"
			),
			fetchWithCookie<{ data: { items: SetupItem[] } }>(
				`${apiRoutesPortalMasters.ITEM_MATURITY_CREATE_SETUP}?co_id=${coId}`,
				"GET"
			),
		]);
		if (list.error || setup.error) setError(list.error ?? setup.error ?? null);
		setRows(list.data?.data ?? []);
		setItems(setup.data?.data?.items ?? []);
		setLoading(false);
	}, [coId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async () => {
		if (!coId) return;
		setError(null);
		const payload = {
			co_id: Number(coId),
			item_id: Number(form.item_id),
			maturity_hours: Number(form.maturity_hours),
			active: Number(form.active),
		};
		if (editing) {
			const url = `${apiRoutesPortalMasters.ITEM_MATURITY_EDIT}/${editing.item_maturity_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", {
				maturity_hours: payload.maturity_hours,
				active: payload.active,
			});
			if (err) {
				setError(err);
				return;
			}
		} else {
			const { error: err } = await fetchWithCookie(apiRoutesPortalMasters.ITEM_MATURITY_CREATE, "POST", payload);
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
		setForm({ item_id: "", maturity_hours: "48", active: 1 });
		setOpen(true);
	};
	const openEdit = (r: MaturityRow) => {
		setEditing(r);
		setForm({
			item_id: r.item_id,
			maturity_hours: String(r.maturity_hours),
			active: r.active,
		});
		setOpen(true);
	};

	const columns: GridColDef<MaturityRow>[] = [
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
		{ field: "item_name", headerName: "Item", flex: 1, minWidth: 220 },
		{ field: "maturity_hours", headerName: "Maturity (hrs)", width: 150, type: "number" },
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

	const usedItemIds = new Set(rows.map((r) => r.item_id));
	const itemOptions = editing
		? items.filter((i) => i.item_id === editing.item_id)
		: items.filter((i) => !usedItemIds.has(i.item_id));

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Item Maturity Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Target maturity hours per jute / jute-waste item.
					</Typography>
				</Box>
				<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
					New
				</Button>
			</Box>
			{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows.map((r) => ({ ...r, id: r.item_maturity_id }))}
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
				<DialogTitle>{editing ? "Edit Maturity" : "New Maturity"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						<TextField
							select
							label="Item"
							value={form.item_id}
							onChange={(e) => setForm({ ...form, item_id: e.target.value === "" ? "" : Number(e.target.value) })}
							size="small"
							disabled={!!editing}
						>
							{itemOptions.map((it) => (
								<MenuItem key={it.item_id} value={it.item_id}>
									{it.item_name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							type="number"
							label="Maturity (hrs)"
							value={form.maturity_hours}
							onChange={(e) => setForm({ ...form, maturity_hours: e.target.value })}
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
						disabled={!form.item_id || !form.maturity_hours || Number(form.maturity_hours) <= 0}
					>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
