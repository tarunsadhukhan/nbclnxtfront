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
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Pencil as EditOutlinedIcon, Plus as AddIcon, Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// trolly_type: 'T' = Trolly, 'S' = Spool. Backend column on trolly_mst.
type TrollyType = "T" | "S";

type MachineType = { machine_type_id: number; machine_type_name: string };

const TROLLY_TYPE_OPTIONS: { value: TrollyType; label: string }[] = [
	{ value: "T", label: "Trolly" },
	{ value: "S", label: "Spool" },
];

const trollyTypeLabel = (t: string | null | undefined): string => {
	if (t === "S") return "Spool";
	// Default/unknown treated as Trolly (backend default 'T').
	return "Trolly";
};

type TrollyRow = {
	trolly_id: number;
	trolly_name: string | null;
	trolly_weight: number | null;
	// list response returns 'bucket_weight'; create/edit body key is 'busket_weight'.
	bucket_weight: number | null;
	trolly_posting_code: string | null;
	branch_id: number | null;
	trolly_type?: string | null;
	machine_type_id: number | null;
};

export default function TrollyMasterPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedCompany, selectedBranches } = useSidebarContext();

	// Only branches the sidebar currently has selected, in company order.
	const branchOptions = React.useMemo(
		() =>
			(selectedCompany?.branches ?? []).filter((b) => selectedBranches.includes(b.branch_id)),
		[selectedCompany, selectedBranches]
	);
	const singleBranchId = branchOptions.length === 1 ? branchOptions[0].branch_id : null;

	const [rows, setRows] = React.useState<TrollyRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<TrollyRow | null>(null);
	const [form, setForm] = React.useState({
		trolly_name: "",
		trolly_weight: "",
		busket_weight: "",
		trolly_posting_code: "",
		branch_id: "",
		trolly_type: "T" as TrollyType,
		machine_type_id: "",
	});

	const [machineTypes, setMachineTypes] = React.useState<MachineType[]>([]);

	// Grid filter: show all types, or only Trolly / only Spool.
	const [typeFilter, setTypeFilter] = React.useState<"ALL" | TrollyType>("ALL");
	const [machineTypeFilter, setMachineTypeFilter] = React.useState<"ALL" | number>("ALL");

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		// Scope to the selected branch so trolleys show per-branch, not all lumped together.
		// ponytail: single-branch scope only; 0 or 2+ selected falls back to all (Branch column disambiguates).
		const branchQs = singleBranchId != null ? `&branch_id=${singleBranchId}` : "";
		const { data, error: err } = await fetchWithCookie<{ data: TrollyRow[] }>(
			`${apiRoutesPortalMasters.TROLLY_LIST}?co_id=${coId}${branchQs}`,
			"GET"
		);
		if (err) setError(err);
		setRows(data?.data ?? []);
		setLoading(false);
	}, [coId, singleBranchId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	React.useEffect(() => {
		void (async () => {
			const { data } = await fetchWithCookie<{ data: MachineType[] }>(
				apiRoutesPortalMasters.TROLLY_MACHINE_TYPES,
				"GET"
			);
			setMachineTypes(data?.data ?? []);
		})();
	}, []);

	const handleSave = async () => {
		if (!coId) return;
		setError(null);
		// NOTE: body key 'busket_weight' matches the backend column typo.
		const body = {
			trolly_name: form.trolly_name,
			trolly_weight: Number(form.trolly_weight),
			busket_weight: Number(form.busket_weight),
			trolly_posting_code: form.trolly_posting_code || null,
			branch_id: form.branch_id !== "" ? Number(form.branch_id) : null,
			trolly_type: form.trolly_type,
			machine_type_id: form.machine_type_id !== "" ? Number(form.machine_type_id) : null,
		};
		if (editing) {
			const url = `${apiRoutesPortalMasters.TROLLY_EDIT}/${editing.trolly_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			if (err) {
				setError(err);
				return;
			}
		} else {
			const { error: err } = await fetchWithCookie(apiRoutesPortalMasters.TROLLY_CREATE, "POST", {
				co_id: Number(coId),
				...body,
			});
			if (err) {
				setError(err);
				return;
			}
		}
		setOpen(false);
		setEditing(null);
		await refresh();
	};

	const handleDelete = async (r: TrollyRow) => {
		if (!coId) return;
		if (!window.confirm(`Delete trolly "${r.trolly_name ?? r.trolly_id}"?`)) return;
		setError(null);
		const { error: err } = await fetchWithCookie(
			`${apiRoutesPortalMasters.TROLLY_DELETE}/${r.trolly_id}?co_id=${coId}`,
			"DELETE"
		);
		if (err) {
			setError(err);
			return;
		}
		await refresh();
	};

	const openCreate = () => {
		setEditing(null);
		setForm({
			trolly_name: "",
			trolly_weight: "",
			busket_weight: "",
			trolly_posting_code: "",
			branch_id: singleBranchId != null ? String(singleBranchId) : "",
			trolly_type: "T",
			machine_type_id: "",
		});
		setOpen(true);
	};
	const openEdit = (r: TrollyRow) => {
		setEditing(r);
		setForm({
			trolly_name: r.trolly_name ?? "",
			trolly_weight: r.trolly_weight != null ? String(r.trolly_weight) : "",
			busket_weight: r.bucket_weight != null ? String(r.bucket_weight) : "",
			trolly_posting_code: r.trolly_posting_code ?? "",
			branch_id: r.branch_id != null ? String(r.branch_id) : "",
			trolly_type: r.trolly_type === "S" ? "S" : "T",
			machine_type_id: r.machine_type_id != null ? String(r.machine_type_id) : "",
		});
		setOpen(true);
	};

	const columns: GridColDef<TrollyRow>[] = [
		{
			field: "actions",
			headerName: "",
			width: 100,
			sortable: false,
			renderCell: (params) => (
				<Box>
					<Tooltip title="Edit">
						<IconButton size="small" onClick={() => openEdit(params.row)}>
							<EditOutlinedIcon size={16} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete">
						<IconButton size="small" color="error" onClick={() => void handleDelete(params.row)}>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
		{ field: "trolly_name", headerName: "Trolly Name", flex: 1, minWidth: 200 },
		{
			field: "trolly_type",
			headerName: "Type",
			width: 110,
			valueGetter: (value) => trollyTypeLabel(value as string | null | undefined),
		},
		{
			field: "machine_type_id",
			headerName: "Machine Type",
			width: 150,
			valueGetter: (value) => {
				if (value == null) return "—";
				const mt = machineTypes.find((m) => m.machine_type_id === value);
				return mt ? mt.machine_type_name : value;
			},
		},
		{
			field: "trolly_weight",
			headerName: "Trolly Wt (kg)",
			width: 140,
			type: "number",
			valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : "—"),
		},
		{
			field: "bucket_weight",
			headerName: "Bucket Wt (kg)",
			width: 140,
			type: "number",
			valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : "—"),
		},
		{ field: "trolly_posting_code", headerName: "Posting Code", width: 150 },
		{
			field: "branch_id",
			headerName: "Branch",
			width: 140,
			valueGetter: (value) => {
				if (value == null) return "—";
				const match = (selectedCompany?.branches ?? []).find((b) => b.branch_id === value);
				return match ? match.branch_name : value;
			},
		},
	];

	// Treat missing/unknown trolly_type as 'T' (backend default) for filtering.
	const filteredRows = React.useMemo(() => {
		return rows.filter((r) => {
			const typeOk = typeFilter === "ALL" || (r.trolly_type === "S" ? "S" : "T") === typeFilter;
			const mtOk = machineTypeFilter === "ALL" || r.machine_type_id === machineTypeFilter;
			return typeOk && mtOk;
		});
	}, [rows, typeFilter, machineTypeFilter]);

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Trolly Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Trolly and bucket tare weights used for net doff weight calculation.
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
					<TextField
						select
						label="Type"
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value as "ALL" | TrollyType)}
						size="small"
						sx={{ minWidth: 140 }}
					>
						<MenuItem value="ALL">All</MenuItem>
						{TROLLY_TYPE_OPTIONS.map((o) => (
							<MenuItem key={o.value} value={o.value}>
								{o.label}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Machine Type"
						value={String(machineTypeFilter)}
						onChange={(e) =>
							setMachineTypeFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
						}
						size="small"
						sx={{ minWidth: 150 }}
					>
						<MenuItem value="ALL">All</MenuItem>
						{machineTypes.map((mt) => (
							<MenuItem key={mt.machine_type_id} value={String(mt.machine_type_id)}>
								{mt.machine_type_name}
							</MenuItem>
						))}
					</TextField>
					<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
						New
					</Button>
				</Box>
			</Box>
			{error ? (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}
			<Box sx={{ width: "100%" }}>
				<DataGrid
					autoHeight
					rows={filteredRows}
					getRowId={(r) => r.trolly_id}
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
				<DialogTitle>{editing ? "Edit Trolly" : "New Trolly"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						<TextField
							label="Trolly Name"
							value={form.trolly_name}
							onChange={(e) => setForm({ ...form, trolly_name: e.target.value })}
							size="small"
							inputProps={{ maxLength: 100 }}
						/>
						<TextField
							select
							label="Type"
							value={form.trolly_type}
							onChange={(e) =>
								setForm({ ...form, trolly_type: e.target.value as TrollyType })
							}
							size="small"
						>
							{TROLLY_TYPE_OPTIONS.map((o) => (
								<MenuItem key={o.value} value={o.value}>
									{o.label}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							label="Machine Type"
							value={form.machine_type_id}
							onChange={(e) => setForm({ ...form, machine_type_id: e.target.value })}
							size="small"
							required
							helperText={machineTypes.length === 0 ? "Loading machine types…" : "Required"}
						>
							{machineTypes.map((mt) => (
								<MenuItem key={mt.machine_type_id} value={String(mt.machine_type_id)}>
									{mt.machine_type_name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							type="number"
							label="Trolly Weight (kg)"
							inputProps={{ step: 0.001, min: 0 }}
							value={form.trolly_weight}
							onChange={(e) => setForm({ ...form, trolly_weight: e.target.value })}
							size="small"
						/>
						<TextField
							type="number"
							label="Bucket Weight (kg)"
							inputProps={{ step: 0.001, min: 0 }}
							value={form.busket_weight}
							onChange={(e) => setForm({ ...form, busket_weight: e.target.value })}
							size="small"
						/>
						<TextField
							label="Posting Code"
							value={form.trolly_posting_code}
							onChange={(e) => setForm({ ...form, trolly_posting_code: e.target.value })}
							size="small"
							inputProps={{ maxLength: 50 }}
						/>
						<TextField
							select
							label="Branch"
							value={form.branch_id}
							onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
							size="small"
							disabled={branchOptions.length === 0}
							helperText={branchOptions.length === 0 ? "No branch selected in sidebar" : undefined}
						>
							{branchOptions.length !== 1 ? (
								<MenuItem value="">
									<em>None</em>
								</MenuItem>
							) : null}
							{branchOptions.map((b) => (
								<MenuItem key={b.branch_id} value={String(b.branch_id)}>
									{b.branch_name}
								</MenuItem>
							))}
						</TextField>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button
						variant="contained"
						onClick={handleSave}
						disabled={
								!form.trolly_name ||
								form.trolly_weight === "" ||
								form.busket_weight === "" ||
								form.machine_type_id === ""
							}
					>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
