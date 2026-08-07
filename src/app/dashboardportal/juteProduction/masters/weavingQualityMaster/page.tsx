"use client";

import * as React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
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
import {
	ChevronDown as ExpandIcon,
	Pencil as EditOutlinedIcon,
	Plus as AddIcon,
	Trash2 as DeleteIcon,
} from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// Cloth item supplied by weaving_quality_setup.
type SetupItem = {
	item_id: number;
	item_code: string;
	item_name: string;
};

type WeavingQualityRow = {
	weaving_quality_id: number;
	co_id: number;
	item_id: number;
	item_code: string | null;
	item_name: string | null;
	weaving_quality_code: string;
	weaving_quality_name: string | null;
	ends: number | null;
	finished_length: number | null;
	ozs_yds: number | null;
	std_ozs_yds: number | null;
	no_of_jugar_per_cut: number;
	width: number | null;
	ports: number | null;
	reed_porter: number | null;
	shrinkage_pct: number | null;
	shots: number | null;
	mc_teeth: number | null;
	jbo_rbo: string | null;
	reed_space: number | null;
	tpi: number | null;
	active: number;
};

type FormState = {
	item_id: string;
	weaving_quality_code: string;
	weaving_quality_name: string;
	ends: string;
	finished_length: string;
	ozs_yds: string;
	std_ozs_yds: string;
	no_of_jugar_per_cut: string;
	width: string;
	ports: string;
	reed_porter: string;
	shrinkage_pct: string;
	shots: string;
	mc_teeth: string;
	jbo_rbo: string;
	reed_space: string;
	tpi: string;
};

const EMPTY_FORM: FormState = {
	item_id: "",
	weaving_quality_code: "",
	weaving_quality_name: "",
	ends: "",
	finished_length: "",
	ozs_yds: "",
	std_ozs_yds: "",
	no_of_jugar_per_cut: "",
	width: "",
	ports: "",
	reed_porter: "",
	shrinkage_pct: "",
	shots: "",
	mc_teeth: "",
	jbo_rbo: "",
	reed_space: "",
	tpi: "",
};

const itemLabel = (i: Pick<SetupItem, "item_code" | "item_name">): string =>
	`${i.item_code} — ${i.item_name}`;

// Optional numeric field -> number | null (blank stays null).
const numOrNull = (v: string): number | null => {
	const t = v.trim();
	if (!t) return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
};

export default function WeavingQualityMasterPage() {
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

	const [rows, setRows] = React.useState<WeavingQualityRow[]>([]);
	const [items, setItems] = React.useState<SetupItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<WeavingQualityRow | null>(null);
	const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const { data, error: err } = await fetchWithCookie<{ data: WeavingQualityRow[] }>(
			`${apiRoutesPortalMasters.WEAVING_QUALITY_LIST}?co_id=${coId}`,
			"GET"
		);
		if (err) setError(err);
		setRows(data?.data ?? []);
		setLoading(false);
	}, [coId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	// Load create-setup options (cloth items) once a company is selected.
	React.useEffect(() => {
		if (!coId) return;
		void (async () => {
			const { data } = await fetchWithCookie<{ data: { items: SetupItem[] } }>(
				`${apiRoutesPortalMasters.WEAVING_QUALITY_SETUP}?co_id=${coId}`,
				"GET"
			);
			setItems(data?.data?.items ?? []);
		})();
	}, [coId]);

	const openCreate = () => {
		setEditing(null);
		setForm(EMPTY_FORM);
		setOpen(true);
	};

	const openEdit = (row: WeavingQualityRow) => {
		setError(null);
		setEditing(row);
		setForm({
			item_id: String(row.item_id),
			weaving_quality_code: row.weaving_quality_code ?? "",
			weaving_quality_name: row.weaving_quality_name ?? "",
			ends: row.ends != null ? String(row.ends) : "",
			finished_length: row.finished_length != null ? String(row.finished_length) : "",
			ozs_yds: row.ozs_yds != null ? String(row.ozs_yds) : "",
			std_ozs_yds: row.std_ozs_yds != null ? String(row.std_ozs_yds) : "",
			no_of_jugar_per_cut: row.no_of_jugar_per_cut != null ? String(row.no_of_jugar_per_cut) : "",
			width: row.width != null ? String(row.width) : "",
			ports: row.ports != null ? String(row.ports) : "",
			reed_porter: row.reed_porter != null ? String(row.reed_porter) : "",
			shrinkage_pct: row.shrinkage_pct != null ? String(row.shrinkage_pct) : "",
			shots: row.shots != null ? String(row.shots) : "",
			mc_teeth: row.mc_teeth != null ? String(row.mc_teeth) : "",
			jbo_rbo: row.jbo_rbo ?? "",
			reed_space: row.reed_space != null ? String(row.reed_space) : "",
			tpi: row.tpi != null ? String(row.tpi) : "",
		});
		setOpen(true);
	};

	const handleSave = async () => {
		if (!coId) return;
		setError(null);

		// Required-field validation.
		if (!form.item_id) {
			setError("Item is required.");
			return;
		}
		if (!form.weaving_quality_code.trim()) {
			setError("Quality code is required.");
			return;
		}
		const jugarNum = Number(form.no_of_jugar_per_cut);
		if (!(jugarNum > 0)) {
			setError("No. of Jugar per Cut must be greater than 0.");
			return;
		}

		// Shared numeric body — all optional numeric fields collapse to null when blank.
		const detailBody: Record<string, unknown> = {
			weaving_quality_name: form.weaving_quality_name.trim() || null,
			ends: numOrNull(form.ends),
			finished_length: numOrNull(form.finished_length),
			ozs_yds: numOrNull(form.ozs_yds),
			std_ozs_yds: numOrNull(form.std_ozs_yds),
			no_of_jugar_per_cut: jugarNum,
			width: numOrNull(form.width),
			ports: numOrNull(form.ports),
			reed_porter: numOrNull(form.reed_porter),
			shrinkage_pct: numOrNull(form.shrinkage_pct),
			shots: numOrNull(form.shots),
			mc_teeth: numOrNull(form.mc_teeth),
			jbo_rbo: form.jbo_rbo.trim() || null,
			reed_space: numOrNull(form.reed_space),
			tpi: numOrNull(form.tpi),
		};

		const branchId = singleBranchId != null ? singleBranchId : branchOptions[0]?.branch_id ?? null;

		if (editing) {
			// Edit body — co_id passed as query param; editable fields only (item locked).
			const body = {
				weaving_quality_code: form.weaving_quality_code.trim(),
				...detailBody,
			};
			const url = `${apiRoutesPortalMasters.WEAVING_QUALITY_EDIT}/${editing.weaving_quality_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			if (err) {
				// Backend returns 400 on duplicate (co_id,item_id,weaving_quality_code).
				setError(err);
				return;
			}
		} else {
			const body = {
				co_id: Number(coId),
				branch_id: branchId,
				item_id: Number(form.item_id),
				weaving_quality_code: form.weaving_quality_code.trim(),
				...detailBody,
			};
			const { error: err } = await fetchWithCookie(
				apiRoutesPortalMasters.WEAVING_QUALITY_CREATE,
				"POST",
				body
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

	const handleDelete = async (r: WeavingQualityRow) => {
		if (!coId) return;
		const label = r.weaving_quality_name
			? `${r.weaving_quality_code} (${r.weaving_quality_name})`
			: r.weaving_quality_code;
		if (!window.confirm(`Delete weaving quality "${label}"?`)) return;
		setError(null);
		const { error: err } = await fetchWithCookie(
			`${apiRoutesPortalMasters.WEAVING_QUALITY_DELETE}/${r.weaving_quality_id}?co_id=${coId}`,
			"DELETE"
		);
		if (err) {
			setError(err);
			return;
		}
		await refresh();
	};

	const columns: GridColDef<WeavingQualityRow>[] = [
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
		{ field: "weaving_quality_code", headerName: "Quality Code", width: 160 },
		{ field: "weaving_quality_name", headerName: "Quality Name", flex: 1, minWidth: 160 },
		{ field: "ends", headerName: "Ends", width: 90, type: "number" },
		{ field: "finished_length", headerName: "Fin. Length", width: 110, type: "number" },
		{ field: "std_ozs_yds", headerName: "Std Ozs/Yds", width: 120, type: "number" },
		{ field: "no_of_jugar_per_cut", headerName: "Jugar/Cut", width: 110, type: "number" },
		{ field: "width", headerName: "Width", width: 90, type: "number" },
		{ field: "shots", headerName: "Shots", width: 90, type: "number" },
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

	const jugarNum = Number(form.no_of_jugar_per_cut);
	const saveDisabled =
		!form.item_id || !form.weaving_quality_code.trim() || !(jugarNum > 0);

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Weaving Quality Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Map each cloth item to its weaving qualities (ends, length, jugar per cut and loom
						parameters).
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
					getRowId={(r) => r.weaving_quality_id}
					columns={columns}
					loading={loading}
					density="comfortable"
					disableRowSelectionOnClick
					pageSizeOptions={[10, 25, 50]}
					initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
					sx={{ width: "100%" }}
				/>
			</Box>

			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>{editing ? "Edit Weaving Quality" : "New Weaving Quality"}</DialogTitle>
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
							helperText={items.length === 0 ? "Loading cloth items…" : undefined}
						>
							{items.map((it) => (
								<MenuItem key={it.item_id} value={String(it.item_id)}>
									{itemLabel(it)}
								</MenuItem>
							))}
						</TextField>
						{/* Primary fields — DB-required and the ones that drive production
						    calculations (finished_length, ozs_yds, std_ozs_yds, jugar/cut). */}
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
								gap: 2,
							}}
						>
							<TextField
								label="Quality Code"
								value={form.weaving_quality_code}
								onChange={(e) => setForm({ ...form, weaving_quality_code: e.target.value })}
								size="small"
								required
								inputProps={{ maxLength: 50 }}
							/>
							<TextField
								label="Quality Name"
								value={form.weaving_quality_name}
								onChange={(e) => setForm({ ...form, weaving_quality_name: e.target.value })}
								size="small"
								inputProps={{ maxLength: 100 }}
							/>
							<TextField
								type="number"
								label="Ends"
								value={form.ends}
								onChange={(e) => setForm({ ...form, ends: e.target.value })}
								size="small"
								inputProps={{ step: 1, min: 0 }}
							/>
							<TextField
								type="number"
								label="Finished Length"
								value={form.finished_length}
								onChange={(e) => setForm({ ...form, finished_length: e.target.value })}
								size="small"
								inputProps={{ step: 0.001, min: 0 }}
							/>
							<TextField
								type="number"
								label="Std Ozs/Yds"
								value={form.std_ozs_yds}
								onChange={(e) => setForm({ ...form, std_ozs_yds: e.target.value })}
								size="small"
								inputProps={{ step: 0.001, min: 0 }}
							/>
							<TextField
								type="number"
								label="No. of Jugar per Cut"
								value={form.no_of_jugar_per_cut}
								onChange={(e) => setForm({ ...form, no_of_jugar_per_cut: e.target.value })}
								size="small"
								required
								inputProps={{ step: 1, min: 1 }}
								helperText="Must be greater than 0"
							/>
						</Box>
						{/* Optional construction/reference fields — not used by any production
						    calculation; collapsed to declutter entry. Yarn count is intentionally
						    omitted (warp + weft each carry their own counts; a single flat count is
						    meaningless — capture per-warp counts via composite components instead). */}
						<Accordion
							disableGutters
							elevation={0}
							sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}
						>
							<AccordionSummary expandIcon={<ExpandIcon size={18} />} sx={{ px: 0 }}>
								<Typography variant="body2" color="text.secondary">
									Optional construction details
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ px: 0 }}>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
										gap: 2,
									}}
								>
									<TextField
										type="number"
										label="Width"
										value={form.width}
										onChange={(e) => setForm({ ...form, width: e.target.value })}
										size="small"
										inputProps={{ step: 0.001, min: 0 }}
									/>
									<TextField
										type="number"
										label="Ports"
										value={form.ports}
										onChange={(e) => setForm({ ...form, ports: e.target.value })}
										size="small"
										inputProps={{ step: 1, min: 0 }}
									/>
									<TextField
										type="number"
										label="Reed Porter"
										value={form.reed_porter}
										onChange={(e) => setForm({ ...form, reed_porter: e.target.value })}
										size="small"
										inputProps={{ step: 1, min: 0 }}
									/>
									<TextField
										type="number"
										label="Shrinkage %"
										value={form.shrinkage_pct}
										onChange={(e) => setForm({ ...form, shrinkage_pct: e.target.value })}
										size="small"
										inputProps={{ step: 0.01, min: 0 }}
									/>
									<TextField
										type="number"
										label="Shots"
										value={form.shots}
										onChange={(e) => setForm({ ...form, shots: e.target.value })}
										size="small"
										inputProps={{ step: 1, min: 0 }}
									/>
									<TextField
										type="number"
										label="MC Teeth"
										value={form.mc_teeth}
										onChange={(e) => setForm({ ...form, mc_teeth: e.target.value })}
										size="small"
										inputProps={{ step: 1, min: 0 }}
									/>
									<TextField
										label="JBO / RBO"
										value={form.jbo_rbo}
										onChange={(e) => setForm({ ...form, jbo_rbo: e.target.value })}
										size="small"
										inputProps={{ maxLength: 50 }}
									/>
									<TextField
										type="number"
										label="Reed Space"
										value={form.reed_space}
										onChange={(e) => setForm({ ...form, reed_space: e.target.value })}
										size="small"
										inputProps={{ step: 0.001, min: 0 }}
									/>
									<TextField
										type="number"
										label="TPI"
										value={form.tpi}
										onChange={(e) => setForm({ ...form, tpi: e.target.value })}
										size="small"
										inputProps={{ step: 0.001, min: 0 }}
									/>
								</Box>
							</AccordionDetails>
						</Accordion>
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
