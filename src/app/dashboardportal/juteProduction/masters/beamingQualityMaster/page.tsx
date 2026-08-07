"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	MenuItem,
	Switch,
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

// Jute-cloth item (item_type_id = 5) supplied by bm_quality_create_setup.
type SetupItem = {
	item_id: number;
	item_code: string;
	item_name: string;
};

// Jute-yarn option supplying the count (§A.8); selecting one auto-fills std_count.
type SetupYarn = {
	item_id: number;
	item_code: string;
	item_name: string;
	jute_yarn_count: number;
};

type BmQualityRow = {
	bm_quality_id: number;
	co_id: number;
	item_id: number;
	item_code: string | null;
	item_name: string | null;
	bm_quality_code: string;
	bm_quality_name: string | null;
	// For composite qualities the parent ends = SUM(component ends) and std_count is null (§Q3).
	ends: number;
	std_count: number | null;
	is_composite: number;
	active: number;
};

// One row of the composite COMPONENTS editor (§Q3). count auto-fills from the picked yarn.
type ComponentRow = {
	component_no: number;
	ends: string;
	yarn_item_id: string;
	count: string;
};

// Detail payload returned by BM_QUALITY_DETAIL for the edit dialog.
type BmQualityDetailComponent = {
	component_no: number;
	ends: number;
	yarn_item_id: number | null;
	count: number;
};

type FormState = {
	item_id: string;
	bm_quality_code: string;
	bm_quality_name: string;
	is_composite: boolean;
	// Simple-path fields (used only when is_composite === false).
	ends: string;
	yarn_item_id: string;
	std_count: string;
};

const EMPTY_FORM: FormState = {
	item_id: "",
	bm_quality_code: "",
	bm_quality_name: "",
	is_composite: false,
	ends: "",
	yarn_item_id: "",
	std_count: "",
};

const emptyComponentRow = (component_no: number): ComponentRow => ({
	component_no,
	ends: "",
	yarn_item_id: "",
	count: "",
});

const INITIAL_COMPONENTS: ComponentRow[] = [emptyComponentRow(1), emptyComponentRow(2)];

const itemLabel = (i: Pick<SetupItem, "item_code" | "item_name">): string =>
	`${i.item_code} — ${i.item_name}`;

export default function BeamingQualityMasterPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedCompany, selectedBranches } = useSidebarContext();

	// Only branches the sidebar currently has selected, in company order.
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => selectedBranches.includes(b.branch_id)),
		[selectedCompany, selectedBranches]
	);
	const singleBranchId = branchOptions.length === 1 ? branchOptions[0].branch_id : null;

	const [rows, setRows] = React.useState<BmQualityRow[]>([]);
	const [items, setItems] = React.useState<SetupItem[]>([]);
	const [yarns, setYarns] = React.useState<SetupYarn[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<BmQualityRow | null>(null);
	const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
	const [components, setComponents] = React.useState<ComponentRow[]>(INITIAL_COMPONENTS);

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const { data, error: err } = await fetchWithCookie<{ data: BmQualityRow[] }>(
			`${apiRoutesPortalMasters.BM_QUALITY_LIST}?co_id=${coId}`,
			"GET"
		);
		if (err) setError(err);
		setRows(data?.data ?? []);
		setLoading(false);
	}, [coId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	// Load create-setup options (jute-cloth items + jute yarns) once a company is selected.
	React.useEffect(() => {
		if (!coId) return;
		void (async () => {
			const { data } = await fetchWithCookie<{ data: { items: SetupItem[]; yarns: SetupYarn[] } }>(
				`${apiRoutesPortalMasters.BM_QUALITY_CREATE_SETUP}?co_id=${coId}`,
				"GET"
			);
			setItems(data?.data?.items ?? []);
			setYarns(data?.data?.yarns ?? []);
		})();
	}, [coId]);

	// Selecting a jute yarn auto-fills std_count from jute_yarn_count (§A.8). std_count
	// remains editable so an existing snapshot can be kept on edit.
	const handleYarnChange = (yarnItemIdStr: string) => {
		const yarn = yarns.find((y) => String(y.item_id) === yarnItemIdStr);
		setForm((prev) => ({
			...prev,
			yarn_item_id: yarnItemIdStr,
			std_count: yarn != null ? String(yarn.jute_yarn_count) : prev.std_count,
		}));
	};

	// COMPONENTS editor helpers (§Q3) — count auto-fills from the picked yarn, editable after.
	const handleComponentYarnChange = (idx: number, yarnItemIdStr: string) => {
		const yarn = yarns.find((y) => String(y.item_id) === yarnItemIdStr);
		setComponents((prev) =>
			prev.map((c, i) =>
				i === idx
					? {
							...c,
							yarn_item_id: yarnItemIdStr,
							count: yarn != null ? String(yarn.jute_yarn_count) : c.count,
						}
					: c
			)
		);
	};

	const handleComponentEndsChange = (idx: number, value: string) => {
		setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, ends: value } : c)));
	};

	const handleComponentCountChange = (idx: number, value: string) => {
		setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, count: value } : c)));
	};

	const addComponent = () => {
		setComponents((prev) => [...prev, emptyComponentRow(prev.length + 1)]);
	};

	const removeComponent = (idx: number) => {
		// Drop the row, then renumber component_no 1..n so it stays contiguous.
		setComponents((prev) =>
			prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, component_no: i + 1 }))
		);
	};

	const openCreate = () => {
		setEditing(null);
		setForm(EMPTY_FORM);
		setComponents(INITIAL_COMPONENTS);
		setOpen(true);
	};

	const openEdit = async (row: BmQualityRow) => {
		setError(null);
		setEditing(row);
		// Seed the simple-path fields from the list row first so the dialog opens immediately.
		setForm({
			item_id: String(row.item_id),
			bm_quality_code: row.bm_quality_code ?? "",
			bm_quality_name: row.bm_quality_name ?? "",
			is_composite: row.is_composite === 1,
			ends: row.ends != null ? String(row.ends) : "",
			yarn_item_id: "",
			std_count: row.std_count != null ? String(row.std_count) : "",
		});
		setComponents(INITIAL_COMPONENTS);
		setOpen(true);

		// For composite rows, fetch the components from the detail endpoint (§Q3).
		if (row.is_composite === 1 && coId) {
			const { data, error: err } = await fetchWithCookie<{
				data: { components?: BmQualityDetailComponent[] };
			}>(`${apiRoutesPortalMasters.BM_QUALITY_DETAIL}/${row.bm_quality_id}?co_id=${coId}`, "GET");
			if (err) {
				setError(err);
				return;
			}
			const detailComponents = data?.data?.components ?? [];
			if (detailComponents.length > 0) {
				setComponents(
					detailComponents
						.slice()
						.sort((a, b) => a.component_no - b.component_no)
						.map((c, i) => ({
							component_no: i + 1,
							ends: c.ends != null ? String(c.ends) : "",
							yarn_item_id: c.yarn_item_id != null ? String(c.yarn_item_id) : "",
							count: c.count != null ? String(c.count) : "",
						}))
				);
			}
		}
	};

	const handleSave = async () => {
		if (!coId) return;
		setError(null);

		// Shared validation (§A.1).
		if (!form.item_id) {
			setError("Item is required.");
			return;
		}
		if (!form.bm_quality_code.trim()) {
			setError("Quality code is required.");
			return;
		}

		// Build the path-specific portion of the body (simple vs composite — §Q3).
		let detailBody: Record<string, unknown>;
		if (form.is_composite) {
			if (components.length < 2) {
				setError("A composite quality needs at least 2 components.");
				return;
			}
			for (const c of components) {
				const cEnds = Number(c.ends);
				const cCount = Number(c.count);
				if (!Number.isInteger(cEnds) || cEnds <= 0) {
					setError(`Component ${c.component_no}: ends must be a whole number greater than 0.`);
					return;
				}
				if (!(cCount > 0)) {
					setError(`Component ${c.component_no}: count must be greater than 0.`);
					return;
				}
			}
			detailBody = {
				is_composite: 1,
				// Parent ends/std_count/yarn_item_id stay null; the real pairs live in components.
				ends: null,
				std_count: null,
				yarn_item_id: null,
				components: components.map((c) => ({
					component_no: c.component_no,
					ends: Number(c.ends),
					yarn_item_id: c.yarn_item_id ? Number(c.yarn_item_id) : null,
					count: Number(c.count),
				})),
			};
		} else {
			const endsNum = Number(form.ends);
			const stdCountNum = Number(form.std_count);
			if (!Number.isInteger(endsNum) || endsNum <= 0) {
				setError("Ends must be a whole number greater than 0.");
				return;
			}
			if (!(stdCountNum > 0)) {
				setError("Std Count must be greater than 0.");
				return;
			}
			detailBody = {
				is_composite: 0,
				ends: endsNum,
				yarn_item_id: form.yarn_item_id ? Number(form.yarn_item_id) : null,
				std_count: stdCountNum,
			};
		}

		const branchId = singleBranchId != null ? singleBranchId : branchOptions[0]?.branch_id ?? null;

		if (editing) {
			// Edit body — co_id passed as query param; editable fields only (§A.6 / §A.7).
			const body = {
				bm_quality_code: form.bm_quality_code.trim(),
				bm_quality_name: form.bm_quality_name.trim() || null,
				...detailBody,
			};
			const url = `${apiRoutesPortalMasters.BM_QUALITY_EDIT}/${editing.bm_quality_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			if (err) {
				// Backend returns 400 on duplicate (co_id,item_id,bm_quality_code).
				setError(err);
				return;
			}
		} else {
			const body = {
				co_id: Number(coId),
				branch_id: branchId,
				item_id: Number(form.item_id),
				bm_quality_code: form.bm_quality_code.trim(),
				bm_quality_name: form.bm_quality_name.trim() || null,
				...detailBody,
			};
			const { error: err } = await fetchWithCookie(apiRoutesPortalMasters.BM_QUALITY_CREATE, "POST", body);
			if (err) {
				setError(err);
				return;
			}
		}
		setOpen(false);
		setEditing(null);
		await refresh();
	};

	const handleDelete = async (r: BmQualityRow) => {
		if (!coId) return;
		const label = r.bm_quality_name ? `${r.bm_quality_code} (${r.bm_quality_name})` : r.bm_quality_code;
		if (!window.confirm(`Delete beaming quality "${label}"?`)) return;
		setError(null);
		const { error: err } = await fetchWithCookie(
			`${apiRoutesPortalMasters.BM_QUALITY_DELETE}/${r.bm_quality_id}?co_id=${coId}`,
			"DELETE"
		);
		if (err) {
			setError(err);
			return;
		}
		await refresh();
	};

	const columns: GridColDef<BmQualityRow>[] = [
		{
			field: "actions",
			headerName: "",
			width: 100,
			sortable: false,
			renderCell: (params) => (
				<Box>
					<Tooltip title="Edit">
						<IconButton size="small" onClick={() => void openEdit(params.row)}>
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
		{
			field: "item",
			headerName: "Item",
			flex: 1,
			minWidth: 220,
			valueGetter: (_value, row) => {
				const code = row.item_code ?? "";
				const name = row.item_name ?? "";
				if (!code && !name) return String(row.item_id);
				return `${code} — ${name}`.trim();
			},
		},
		{ field: "bm_quality_code", headerName: "Quality Code", width: 160 },
		{ field: "bm_quality_name", headerName: "Quality Name", flex: 1, minWidth: 160 },
		{
			field: "is_composite",
			headerName: "Type",
			width: 120,
			renderCell: (params) =>
				params.value === 1 ? (
					<Chip label="Composite" size="small" color="secondary" variant="outlined" />
				) : (
					<Chip label="Simple" size="small" variant="outlined" />
				),
		},
		{
			field: "ends",
			headerName: "Ends",
			width: 100,
			type: "number",
			// For composite the backend supplies parent ends = SUM(component ends) (§Q3).
			valueFormatter: (value) => (value != null ? value : "—"),
		},
		{
			field: "std_count",
			headerName: "Std Count",
			width: 120,
			type: "number",
			// Composite parents have std_count = null; the per-component counts live in the detail.
			valueFormatter: (value) => (value != null ? Number(value).toFixed(3) : "—"),
		},
		{
			field: "active",
			headerName: "Active",
			width: 90,
			renderCell: (params) => (params.value ? "Yes" : "No"),
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

	const endsNum = Number(form.ends);
	const stdCountNum = Number(form.std_count);
	const componentsValid =
		components.length >= 2 &&
		components.every((c) => {
			const cEnds = Number(c.ends);
			const cCount = Number(c.count);
			return Number.isInteger(cEnds) && cEnds > 0 && cCount > 0;
		});
	const simpleValid = Number.isInteger(endsNum) && endsNum > 0 && stdCountNum > 0;
	const saveDisabled =
		!form.item_id ||
		!form.bm_quality_code.trim() ||
		(form.is_composite ? !componentsValid : !simpleValid);

	// Derived parent ends preview for the composite editor (§Q3: parent ends = SUM).
	const compositeEndsTotal = components.reduce((sum, c) => {
		const n = Number(c.ends);
		return Number.isFinite(n) ? sum + n : sum;
	}, 0);

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Beaming Quality Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Map each jute-cloth item to its beaming qualities (warp code, ends, standard count).
					</Typography>
				</Box>
				<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
					New Quality
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
					getRowId={(r) => r.bm_quality_id}
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
				<DialogTitle>{editing ? "Edit Beaming Quality" : "New Beaming Quality"}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						<TextField
							select
							label="Item"
							value={form.item_id}
							onChange={(e) => setForm({ ...form, item_id: e.target.value })}
							size="small"
							required
							// Item is the master key; locked once a row exists to keep the duplicate key stable.
							disabled={!!editing || items.length === 0}
							helperText={items.length === 0 ? "Loading jute-cloth items…" : undefined}
						>
							{items.map((it) => (
								<MenuItem key={it.item_id} value={String(it.item_id)}>
									{itemLabel(it)}
								</MenuItem>
							))}
						</TextField>
						<TextField
							label="Quality Code"
							value={form.bm_quality_code}
							onChange={(e) => setForm({ ...form, bm_quality_code: e.target.value })}
							size="small"
							required
							inputProps={{ maxLength: 50 }}
							placeholder="e.g. 272-13/272"
						/>
						<TextField
							label="Quality Name"
							value={form.bm_quality_name}
							onChange={(e) => setForm({ ...form, bm_quality_name: e.target.value })}
							size="small"
							inputProps={{ maxLength: 100 }}
							placeholder="e.g. Red (optional)"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={form.is_composite}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, is_composite: e.target.checked }))
									}
								/>
							}
							label="Composite quality (multiple ends/count components)"
						/>

						{form.is_composite ? (
							// COMPOSITE: hide single ends/std_count/yarn; show the components editor (§Q3).
							<Box sx={{ display: "grid", gap: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<Typography variant="subtitle2">Components</Typography>
									<Typography variant="body2" color="text.secondary">
										Parent ends (sum): {compositeEndsTotal}
									</Typography>
								</Box>
								{components.map((c, idx) => (
									<Box
										key={c.component_no}
										sx={{
											display: "grid",
											gridTemplateColumns: "44px 1fr 1.4fr 1fr 40px",
											gap: 1,
											alignItems: "center",
										}}
									>
										<Typography variant="body2" sx={{ textAlign: "center" }}>
											#{c.component_no}
										</Typography>
										<TextField
											type="number"
											label="Ends"
											value={c.ends}
											onChange={(e) => handleComponentEndsChange(idx, e.target.value)}
											size="small"
											required
											inputProps={{ step: 1, min: 1 }}
										/>
										<TextField
											select
											label="Jute Yarn"
											value={c.yarn_item_id}
											onChange={(e) => handleComponentYarnChange(idx, e.target.value)}
											size="small"
											disabled={yarns.length === 0}
										>
											<MenuItem value="">
												<em>None</em>
											</MenuItem>
											{yarns.map((y) => (
												<MenuItem key={y.item_id} value={String(y.item_id)}>
													{`${y.item_code} — ${y.item_name} (${y.jute_yarn_count})`}
												</MenuItem>
											))}
										</TextField>
										<TextField
											type="number"
											label="Count"
											value={c.count}
											onChange={(e) => handleComponentCountChange(idx, e.target.value)}
											size="small"
											required
											inputProps={{ step: 0.001, min: 0 }}
										/>
										<Tooltip title="Remove component">
											<span>
												<IconButton
													size="small"
													color="error"
													onClick={() => removeComponent(idx)}
													// Keep at least 2 components (§Q3).
													disabled={components.length <= 2}
												>
													<DeleteIcon size={16} />
												</IconButton>
											</span>
										</Tooltip>
									</Box>
								))}
								<Button
									size="small"
									startIcon={<AddIcon size={16} />}
									onClick={addComponent}
									sx={{ justifySelf: "start" }}
								>
									Add Component
								</Button>
							</Box>
						) : (
							// SIMPLE: original single ends + yarn picker (auto-fills std_count) + std_count.
							<>
								<TextField
									type="number"
									label="Ends"
									value={form.ends}
									onChange={(e) => setForm({ ...form, ends: e.target.value })}
									size="small"
									required
									inputProps={{ step: 1, min: 1 }}
								/>
								<TextField
									select
									label="Jute Yarn (count source)"
									value={form.yarn_item_id}
									onChange={(e) => handleYarnChange(e.target.value)}
									size="small"
									disabled={yarns.length === 0}
									helperText={
										yarns.length === 0 ? "Loading jute yarns…" : "Selecting a yarn fills Std Count"
									}
								>
									<MenuItem value="">
										<em>None</em>
									</MenuItem>
									{yarns.map((y) => (
										<MenuItem key={y.item_id} value={String(y.item_id)}>
											{`${y.item_code} — ${y.item_name} (${y.jute_yarn_count})`}
										</MenuItem>
									))}
								</TextField>
								<TextField
									type="number"
									label="Std Count"
									value={form.std_count}
									onChange={(e) => setForm({ ...form, std_count: e.target.value })}
									size="small"
									required
									inputProps={{ step: 0.001, min: 0 }}
									helperText="Snapshot from the linked jute yarn; editable"
								/>
							</>
						)}
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleSave} disabled={saveDisabled}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
