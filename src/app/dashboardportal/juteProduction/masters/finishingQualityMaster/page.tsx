"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
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
import { Pencil as EditIcon, Plus as AddIcon, Trash2 as DeleteIcon, Eye as ViewIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// =============================================================================
// Quality type discriminator (BE: quality_type 1=hessian, 2=sacking — INT, no DB change)
// =============================================================================
const QUALITY_TYPE_HESSIAN = 1;
const QUALITY_TYPE_SACKING = 2;

type QualityType = typeof QUALITY_TYPE_HESSIAN | typeof QUALITY_TYPE_SACKING;

// =============================================================================
// Setup / list / detail contract types (match BE finishing_masters.py exactly)
// =============================================================================
type SetupItem = {
	item_id: number;
	item_code: string;
	full_item_code: string | null;
	item_name: string;
	item_grp_id: number;
	item_grp_name: string;
	item_type_id: number;
};

type FinishingQualityRow = {
	finishing_quality_id: number;
	co_id: number;
	branch_id: number | null;
	quality_type: number;
	item_id: number;
	item_code: string | null;
	item_name: string | null;
	packsheet_wt: number | null;
	std_bale_weight: number | null;
	no_of_bags: number | null;
	active: number;
};

// =============================================================================
// Zod schema — item is the identity; the three params are all OPTIONAL.
// Numeric fields are strings in the form (text inputs), parsed to number|null
// at submit.
// =============================================================================
const optionalNumber = z
	.string()
	.optional()
	.refine((v) => v === undefined || v === "" || Number.isFinite(Number(v)), {
		message: "Must be a number",
	});

const formSchema = z.object({
	quality_type: z.union([z.literal(QUALITY_TYPE_HESSIAN), z.literal(QUALITY_TYPE_SACKING)]),
	item_id: z.string().min(1, "Item is required"),
	packsheet_wt: optionalNumber,
	std_bale_weight: optionalNumber,
	no_of_bags: optionalNumber,
});

type FormData = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormData = {
	quality_type: QUALITY_TYPE_HESSIAN,
	item_id: "",
	packsheet_wt: "",
	std_bale_weight: "",
	no_of_bags: "",
};

// Parse a form string to number | null (empty -> null).
const toNum = (v: string | undefined): number | null => {
	if (v === undefined || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

const toInt = (v: string | undefined): number | null => {
	const n = toNum(v);
	return n === null ? null : Math.trunc(n);
};

const toStr = (v: number | null | undefined): string => (v === null || v === undefined ? "" : String(v));

const itemLabel = (i: Pick<SetupItem, "item_code" | "full_item_code" | "item_name">): string =>
	`${i.full_item_code || i.item_code} — ${i.item_name}`;

type DialogMode = "create" | "edit" | "view";

export default function FinishingQualityMasterPage() {
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

	const [rows, setRows] = React.useState<FinishingQualityRow[]>([]);
	const [items, setItems] = React.useState<SetupItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [typeFilter, setTypeFilter] = React.useState<QualityType | "all">("all");

	const [open, setOpen] = React.useState(false);
	const [mode, setMode] = React.useState<DialogMode>("create");
	const [editingId, setEditingId] = React.useState<number | null>(null);

	const { control, handleSubmit, reset, formState } = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: DEFAULT_VALUES,
	});

	const isView = mode === "view";

	const refresh = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		const params = new URLSearchParams({ co_id: String(coId) });
		if (typeFilter !== "all") params.set("quality_type", String(typeFilter));
		const { data, error: err } = await fetchWithCookie<{ data: FinishingQualityRow[] }>(
			`${apiRoutesPortalMasters.FINISHING_QUALITY_LIST}?${params.toString()}`,
			"GET"
		);
		if (err) setError(err);
		setRows(data?.data ?? []);
		setLoading(false);
	}, [coId, typeFilter]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	// Load create/edit setup (items only) once a company is selected.
	React.useEffect(() => {
		if (!coId) return;
		void (async () => {
			const params = new URLSearchParams({ co_id: String(coId) });
			if (singleBranchId != null) params.set("branch_id", String(singleBranchId));
			const { data } = await fetchWithCookie<{ data: { items: SetupItem[] } }>(
				`${apiRoutesPortalMasters.FINISHING_QUALITY_SETUP}?${params.toString()}`,
				"GET"
			);
			setItems(data?.data?.items ?? []);
		})();
	}, [coId, singleBranchId]);

	const openCreate = () => {
		setMode("create");
		setEditingId(null);
		reset(DEFAULT_VALUES);
		setError(null);
		setOpen(true);
	};

	const rowToForm = (row: FinishingQualityRow): FormData => ({
		quality_type: row.quality_type === QUALITY_TYPE_SACKING ? QUALITY_TYPE_SACKING : QUALITY_TYPE_HESSIAN,
		item_id: String(row.item_id),
		packsheet_wt: toStr(row.packsheet_wt),
		std_bale_weight: toStr(row.std_bale_weight),
		no_of_bags: toStr(row.no_of_bags),
	});

	const openDetail = async (row: FinishingQualityRow, nextMode: DialogMode) => {
		if (!coId) return;
		setError(null);
		setMode(nextMode);
		setEditingId(row.finishing_quality_id);
		// Seed from the list row so the dialog opens immediately, then refine from detail.
		reset(rowToForm(row));
		setOpen(true);

		const { data, error: err } = await fetchWithCookie<{ data: FinishingQualityRow }>(
			`${apiRoutesPortalMasters.FINISHING_QUALITY_DETAIL}/${row.finishing_quality_id}?co_id=${coId}`,
			"GET"
		);
		if (err) {
			setError(err);
			return;
		}
		if (data?.data) reset(rowToForm(data.data));
	};

	const onSubmit = handleSubmit(async (values) => {
		if (!coId || isView) return;
		setError(null);

		const branchId = singleBranchId != null ? singleBranchId : branchOptions[0]?.branch_id ?? null;

		if (mode === "edit" && editingId != null) {
			const body = {
				item_id: Number(values.item_id),
				packsheet_wt: toNum(values.packsheet_wt),
				std_bale_weight: toNum(values.std_bale_weight),
				no_of_bags: toInt(values.no_of_bags),
				active: 1,
			};
			const { error: err } = await fetchWithCookie(
				`${apiRoutesPortalMasters.FINISHING_QUALITY_EDIT}/${editingId}?co_id=${coId}`,
				"PUT",
				body
			);
			if (err) {
				setError(err);
				return;
			}
		} else {
			const body = {
				co_id: Number(coId),
				branch_id: branchId,
				quality_type: values.quality_type,
				item_id: Number(values.item_id),
				packsheet_wt: toNum(values.packsheet_wt),
				std_bale_weight: toNum(values.std_bale_weight),
				no_of_bags: toInt(values.no_of_bags),
			};
			const { error: err } = await fetchWithCookie(
				apiRoutesPortalMasters.FINISHING_QUALITY_CREATE,
				"POST",
				body
			);
			if (err) {
				setError(err);
				return;
			}
		}
		setOpen(false);
		setEditingId(null);
		await refresh();
	});

	const handleDelete = async (r: FinishingQualityRow) => {
		if (!coId) return;
		const label = r.item_code ? `${r.item_code} — ${r.item_name ?? ""}`.trim() : String(r.item_id);
		if (!window.confirm(`Delete finishing quality "${label}"?`)) return;
		setError(null);
		const { error: err } = await fetchWithCookie(
			`${apiRoutesPortalMasters.FINISHING_QUALITY_DELETE}/${r.finishing_quality_id}?co_id=${coId}`,
			"DELETE"
		);
		if (err) {
			setError(err);
			return;
		}
		await refresh();
	};

	const columns: GridColDef<FinishingQualityRow>[] = [
		{
			field: "actions",
			headerName: "",
			width: 130,
			sortable: false,
			renderCell: (params) => (
				<Box>
					<Tooltip title="View">
						<IconButton size="small" onClick={() => void openDetail(params.row, "view")}>
							<ViewIcon size={16} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Edit">
						<IconButton size="small" onClick={() => void openDetail(params.row, "edit")}>
							<EditIcon size={16} />
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
			field: "quality_type",
			headerName: "Type",
			width: 110,
			renderCell: (params) =>
				params.value === QUALITY_TYPE_SACKING ? (
					<Chip label="Sacking" size="small" color="secondary" variant="outlined" />
				) : (
					<Chip label="Hessian" size="small" variant="outlined" />
				),
		},
		{
			field: "item",
			headerName: "Item",
			flex: 1,
			minWidth: 200,
			valueGetter: (_value, row) => {
				const code = row.item_code ?? "";
				const name = row.item_name ?? "";
				if (!code && !name) return String(row.item_id);
				return `${code} — ${name}`.trim();
			},
		},
		{
			field: "packsheet_wt",
			headerName: "Packsheet Wt (kg)",
			width: 150,
			type: "number",
			valueFormatter: (value) => (value != null ? value : "—"),
		},
		{
			field: "std_bale_weight",
			headerName: "Std Bale Wt (kg)",
			width: 150,
			type: "number",
			valueFormatter: (value) => (value != null ? value : "—"),
		},
		{
			field: "no_of_bags",
			headerName: "No. of Bags",
			width: 120,
			type: "number",
			valueFormatter: (value) => (value != null ? value : "—"),
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

	const dialogTitle =
		mode === "create"
			? "New Finishing Quality"
			: mode === "edit"
				? "Edit Finishing Quality"
				: "Finishing Quality";

	// On edit/view the (quality_type, item) pair is the identity and is locked.
	const lockIdentity = mode !== "create";

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}>
				<Box>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
						Finishing Quality Master
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Hessian and sacking finishing qualities keyed by item, with optional packsheet weight,
						standard bale weight and bag count.
					</Typography>
				</Box>
				<Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
					<TextField
						select
						size="small"
						label="Type"
						value={typeFilter === "all" ? "all" : String(typeFilter)}
						onChange={(e) =>
							setTypeFilter(e.target.value === "all" ? "all" : (Number(e.target.value) as QualityType))
						}
						sx={{ minWidth: 140 }}
					>
						<MenuItem value="all">All</MenuItem>
						<MenuItem value={String(QUALITY_TYPE_HESSIAN)}>Hessian</MenuItem>
						<MenuItem value={String(QUALITY_TYPE_SACKING)}>Sacking</MenuItem>
					</TextField>
					<Button variant="contained" startIcon={<AddIcon size={18} />} onClick={openCreate}>
						New Quality
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
					rows={rows}
					getRowId={(r) => r.finishing_quality_id}
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
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "grid", gap: 2, mt: 1 }}>
						{/* Quality type + item form the identity — both locked on edit/view. */}
						<Controller
							control={control}
							name="quality_type"
							render={({ field }) => (
								<TextField
									select
									label="Quality Type"
									size="small"
									value={String(field.value)}
									onChange={(e) => field.onChange(Number(e.target.value) as QualityType)}
									disabled={lockIdentity}
								>
									<MenuItem value={String(QUALITY_TYPE_HESSIAN)}>Hessian</MenuItem>
									<MenuItem value={String(QUALITY_TYPE_SACKING)}>Sacking</MenuItem>
								</TextField>
							)}
						/>

						<Controller
							control={control}
							name="item_id"
							render={({ field, fieldState }) => (
								<Autocomplete
									options={items}
									getOptionLabel={itemLabel}
									value={items.find((it) => String(it.item_id) === field.value) ?? null}
									onChange={(_, newVal) => field.onChange(newVal ? String(newVal.item_id) : "")}
									size="small"
									fullWidth
									disabled={lockIdentity || items.length === 0}
									clearOnEscape
									isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
									renderOption={(props, option) => {
										const { key: _key, ...rest } = props;
										return (
											<li key={option.item_id} {...rest}>
												{itemLabel(option)}
											</li>
										);
									}}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Item"
											required
											error={!!fieldState.error}
											helperText={
												fieldState.error?.message ??
												(items.length === 0 ? "Loading items…" : undefined)
											}
										/>
									)}
								/>
							)}
						/>

						<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
							<NumField control={control} name="packsheet_wt" label="Packsheet Wt (kg)" disabled={isView} />
							<NumField control={control} name="std_bale_weight" label="Std Bale Wt (kg)" disabled={isView} />
							<NumField control={control} name="no_of_bags" label="No. of Bags" disabled={isView} integer />
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>{isView ? "Close" : "Cancel"}</Button>
					{!isView ? (
						<Button variant="contained" onClick={() => void onSubmit()} disabled={formState.isSubmitting}>
							Save
						</Button>
					) : null}
				</DialogActions>
			</Dialog>
		</Box>
	);
}

// =============================================================================
// Small numeric field bound to a string-typed RHF field (parsed at submit).
// =============================================================================
type NumFieldName = keyof FormData;

function NumField({
	control,
	name,
	label,
	disabled,
	integer = false,
}: {
	control: ReturnType<typeof useForm<FormData>>["control"];
	name: NumFieldName;
	label: string;
	disabled?: boolean;
	integer?: boolean;
}) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<TextField
					type="number"
					label={label}
					size="small"
					value={typeof field.value === "string" ? field.value : ""}
					onChange={field.onChange}
					disabled={disabled}
					inputProps={integer ? { step: 1 } : { step: 0.001 }}
					error={!!fieldState.error}
					helperText={fieldState.error?.message}
				/>
			)}
		/>
	);
}
