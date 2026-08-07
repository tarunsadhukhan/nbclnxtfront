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

type BinRow = {
	bin_id: number;
	co_id: number;
	branch_id: number | null;
	bin_code: string;
	bin_no: number | null;
	description: string | null;
	active: number;
	branch_name?: string | null;
};

export default function SpreaderBinsPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => { setMounted(true); }, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedCompany } = useSidebarContext();
	const branchOptions = selectedCompany?.branches ?? [];
	const [rows, setRows] = React.useState<BinRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<BinRow | null>(null);
	const [form, setForm] = React.useState({
		bin_code: "",
		bin_no: "",
		description: "",
		branch_id: "",
		active: 1,
	});

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPREADER_BIN_LIST}?co_id=${coId}`;
		const { data, error: err } = await fetchWithCookie<{ data: BinRow[] }>(url, "GET");
		if (err) setError(err);
		else setRows(data?.data ?? []);
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
			bin_code: form.bin_code.trim(),
			bin_no: form.bin_no ? Number(form.bin_no) : null,
			description: form.description || null,
			branch_id: form.branch_id ? Number(form.branch_id) : null,
			active: Number(form.active),
		};
		if (editing) {
			const url = `${apiRoutesPortalMasters.SPREADER_BIN_EDIT}/${editing.bin_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", payload);
			if (err) {
				setError(err);
				return;
			}
		} else {
			const { error: err } = await fetchWithCookie(apiRoutesPortalMasters.SPREADER_BIN_CREATE, "POST", payload);
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
		setForm({ bin_code: "", bin_no: "", description: "", branch_id: "", active: 1 });
		setOpen(true);
	};

	const openEdit = (row: BinRow) => {
		setEditing(row);
		setForm({
			bin_code: row.bin_code,
			bin_no: row.bin_no != null ? String(row.bin_no) : "",
			description: row.description ?? "",
			branch_id: row.branch_id != null ? String(row.branch_id) : "",
			active: row.active,
		});
		setOpen(true);
	};

	const columns: GridColDef<BinRow>[] = [
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
		{ field: "bin_code", headerName: "Bin Code", flex: 1, minWidth: 140 },
		{ field: "bin_no", headerName: "Bin No", width: 100, type: "number" },
		{ field: "description", headerName: "Description", flex: 1, minWidth: 200 },
		{ field: "branch_name", headerName: "Branch", width: 150 },
		{
			field: "active",
			headerName: "Active",
			width: 90,
			renderCell: (params) => (params.value ? "Yes" : "No"),
		},
	];

	if (!mounted) return null;

	if (!coId) {
		return <Alert severity="warning" sx={{ m: 2 }}>Select a company to continue.</Alert>;
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Spreader Bin Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Manage spreader bins for this company.
					</Typography>
				</Box>
				<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
					New Bin
				</Button>
			</Box>
			{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={rows.map((r) => ({ ...r, id: r.bin_id }))}
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
				<DialogTitle>{editing ? `Edit Bin: ${editing.bin_code}` : "New Bin"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
						<TextField
							label="Bin Code"
							value={form.bin_code}
							onChange={(e) => setForm({ ...form, bin_code: e.target.value })}
							size="small"
							required
						/>
						<TextField
							type="number"
							label="Bin No"
							value={form.bin_no}
							onChange={(e) => setForm({ ...form, bin_no: e.target.value })}
							size="small"
						/>
						<TextField
							select
							label="Branch"
							value={form.branch_id}
							onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
							size="small"
							required
						>
							{branchOptions.map((b) => (
								<MenuItem key={b.branch_id} value={String(b.branch_id)}>
									{b.branch_name}
								</MenuItem>
							))}
						</TextField>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography variant="body2">Active</Typography>
							<Switch
								checked={!!form.active}
								onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
							/>
						</Box>
						<TextField
							label="Description"
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							size="small"
							fullWidth
							sx={{ gridColumn: "1 / -1" }}
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleSave} disabled={!form.bin_code.trim() || !form.branch_id}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
