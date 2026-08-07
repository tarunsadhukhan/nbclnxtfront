"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Plus as AddIcon, Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	MAX_SAMPLE_ROWS,
	fabricConstructionCreateSchema,
	type FabricConstructionCreatePayload,
	type FabricConstructionSetup,
} from "../types/fabricConstructionTypes";
import {
	blankSampleRow,
	computeBlockAverages,
	computeRowPreview,
	type SampleRowStrings,
} from "../utils/fabricConstructionCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: FabricConstructionSetup;
	onSaved: () => void;
};

// The 6 measured sample-row fields, in display order.
const MEASURED_FIELDS: { key: keyof SampleRowStrings; label: string }[] = [
	{ key: "length_yds", label: "Length (yds)" },
	{ key: "width_cms", label: "Width (cms)" },
	{ key: "ends_per_dm", label: "Ends/dm" },
	{ key: "picks_per_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "obs_wt_kg", label: "Obs wt (kg)" },
];

// The 6 header std fields, in display order.
const STD_FIELDS = [
	{ key: "std_length_yds", label: "Std length (yds)" },
	{ key: "std_width_cms", label: "Std width (cms)" },
	{ key: "std_ends_dm", label: "Std ends/dm" },
	{ key: "std_picks_dm", label: "Std picks/dm" },
	{ key: "std_mr_pct", label: "Std MR%" },
	{ key: "std_oz_per_yd", label: "Std oz/yd" },
] as const;

type StdKey = (typeof STD_FIELDS)[number]["key"];

const blankStd = (defaultStdMrPct: number): Record<StdKey, string> => ({
	std_length_yds: "",
	std_width_cms: "",
	std_ends_dm: "",
	std_picks_dm: "",
	std_mr_pct: String(defaultStdMrPct),
	std_oz_per_yd: "",
});

function fmt(n: number | null, dp = 2): string {
	return n != null && Number.isFinite(n) ? n.toFixed(dp) : "—";
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

/**
 * R-08-19 Fabric Construction SINGLE quality-block entry form.
 *
 * One save = ONE header (date, cloth quality, 6 std values) + UP TO 5 sample
 * rows, each with 6 measured inputs. std_mr_pct prefills from the setup default
 * (16 for hessian) and all 6 std fields are editable + snapshotted at save. Live
 * per-row crcted_oz and per-column block averages are shown. Submit = ONE POST of
 * the whole block (array of rows). The server recomputes obs_ozs / crcted_oz /
 * averages and is AUTHORITATIVE; this preview is advisory.
 */
export default function FabricConstructionForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [std, setStd] = React.useState<Record<StdKey, string>>(() =>
		blankStd(setup.default_std_mr_pct),
	);
	const initialRowCount = Math.min(
		Math.max(setup.sample_rows || MAX_SAMPLE_ROWS, 1),
		MAX_SAMPLE_ROWS,
	);
	const [rows, setRows] = React.useState<SampleRowStrings[]>(() =>
		Array.from({ length: initialRowCount }, blankSampleRow),
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.cloth_qualities)[number]>();
		for (const c of setup.cloth_qualities) m.set(c.item_id, c);
		return m;
	}, [setup.cloth_qualities]);

	const stdMrNum = num(std.std_mr_pct);
	const stdMrForPreview = Number.isFinite(stdMrNum) ? stdMrNum : setup.default_std_mr_pct;
	const averages = React.useMemo(
		() => computeBlockAverages(rows, stdMrForPreview),
		[rows, stdMrForPreview],
	);

	const setStdAt = React.useCallback((key: StdKey, value: string) => {
		setStd((prev) => ({ ...prev, [key]: value }));
	}, []);

	const setRowField = React.useCallback(
		(index: number, key: keyof SampleRowStrings, value: string) => {
			setRows((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [key]: value };
				return next;
			});
		},
		[],
	);

	const addRow = React.useCallback(() => {
		setRows((prev) => (prev.length >= MAX_SAMPLE_ROWS ? prev : [...prev, blankSampleRow()]));
	}, []);

	const removeRow = React.useCallback((index: number) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setRows(Array.from({ length: initialRowCount }, blankSampleRow));
		// Keep std fields so a run of same-quality blocks is fast.
	}, [initialRowCount]);

	const handleSave = async () => {
		// Drop wholly-blank rows before validating so empty extra rows do not block
		// the save. Blank field -> NaN (not Number("")===0) so the schema flags a
		// partially-filled row instead of silently sending 0.
		const nonBlankRows = rows.filter((r) =>
			MEASURED_FIELDS.some((f) => r[f.key].trim() !== ""),
		);
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			item_id: itemId === "" ? 0 : Number(itemId),
			quality_text: itemId === "" ? undefined : itemById.get(Number(itemId))?.item_name,
			std_length_yds: num(std.std_length_yds),
			std_width_cms: num(std.std_width_cms),
			std_ends_dm: num(std.std_ends_dm),
			std_picks_dm: num(std.std_picks_dm),
			std_mr_pct: num(std.std_mr_pct),
			std_oz_per_yd: num(std.std_oz_per_yd),
			rows: nonBlankRows.map((r) => ({
				length_yds: num(r.length_yds),
				width_cms: num(r.width_cms),
				ends_per_dm: num(r.ends_per_dm),
				picks_per_dm: num(r.picks_per_dm),
				mr_pct: num(r.mr_pct),
				obs_wt_kg: num(r.obs_wt_kg),
			})),
		};

		const parsed = fabricConstructionCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: FabricConstructionCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; fabric_const_id: number };
		}>(apiRoutesPortalMasters.FABRIC_CONSTRUCTION_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved fabric construction block");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Fabric construction block — one cloth quality, its 6 standards, and up to {MAX_SAMPLE_ROWS}{" "}
				sample rows
			</Typography>

			<Autocomplete
				options={setup.cloth_qualities}
				getOptionLabel={(opt) => opt.item_name}
				renderOption={(props, opt) => (
					<li {...props} key={opt.item_id}>
						{opt.item_name}
						{opt.item_code ? ` (${opt.item_code})` : ""}
					</li>
				)}
				value={itemId === "" ? null : itemById.get(Number(itemId)) ?? null}
				onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
				isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				size="small"
				sx={{ maxWidth: 420 }}
				renderInput={(params) => (
					<TextField {...params} label="Cloth quality" placeholder="Cloth quality" />
				)}
			/>

			<Box>
				<Typography variant="caption" color="text.secondary">
					Standards (snapshotted at save)
				</Typography>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "repeat(2, 1fr)",
							sm: "repeat(3, 1fr)",
							md: "repeat(6, 1fr)",
						},
						gap: 2,
						mt: 1,
					}}
				>
					{STD_FIELDS.map((f) => (
						<TextField
							key={f.key}
							type="number"
							size="small"
							label={f.label}
							value={std[f.key]}
							onChange={(e) => setStdAt(f.key, e.target.value)}
							inputProps={{ step: "any", min: 0, "aria-label": f.label }}
							helperText={
								f.key === "std_mr_pct" ? `Default ${setup.default_std_mr_pct}` : undefined
							}
						/>
					))}
				</Box>
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 820 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }}>#</TableCell>
							{MEASURED_FIELDS.map((f) => (
								<TableCell key={f.key} align="right" sx={{ minWidth: 110 }}>
									{f.label}
								</TableCell>
							))}
							<TableCell align="right" sx={{ minWidth: 90 }}>
								Crcted oz
							</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => {
							const preview = computeRowPreview(r, stdMrForPreview);
							return (
								<TableRow key={`sample-${i}`}>
									<TableCell>{i + 1}</TableCell>
									{MEASURED_FIELDS.map((f) => (
										<TableCell key={f.key} align="right">
											<TextField
												type="number"
												size="small"
												variant="standard"
												value={r[f.key]}
												onChange={(e) => setRowField(i, f.key, e.target.value)}
												inputProps={{
													step: "any",
													min: 0,
													"aria-label": `Row ${i + 1} ${f.label}`,
													style: { textAlign: "right" },
												}}
												sx={{ width: 90 }}
											/>
										</TableCell>
									))}
									<TableCell align="right" sx={{ fontWeight: 600 }}>
										{fmt(preview.crctedOz)}
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Remove row">
											<span>
												<IconButton
													size="small"
													color="error"
													disabled={rows.length <= 1}
													onClick={() => removeRow(i)}
													sx={{ minWidth: 40, minHeight: 40 }}
												>
													<DeleteIcon size={16} />
												</IconButton>
											</span>
										</Tooltip>
									</TableCell>
								</TableRow>
							);
						})}
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }}>Avg</TableCell>
							<TableCell align="right">{fmt(averages.length_yds)}</TableCell>
							<TableCell align="right">{fmt(averages.width_cms)}</TableCell>
							<TableCell align="right">{fmt(averages.ends_per_dm)}</TableCell>
							<TableCell align="right">{fmt(averages.picks_per_dm)}</TableCell>
							<TableCell align="right">{fmt(averages.mr_pct)}</TableCell>
							<TableCell align="right">{fmt(averages.obs_wt_kg)}</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(averages.crcted_oz)}
							</TableCell>
							<TableCell />
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>

			<Box>
				<Button
					size="small"
					startIcon={<AddIcon size={16} />}
					onClick={addRow}
					disabled={rows.length >= MAX_SAMPLE_ROWS}
				>
					Add sample row
				</Button>
				<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
					Avg obs oz/yd: <strong>{fmt(averages.obs_ozs)}</strong>
				</Typography>
			</Box>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Block"}
				</Button>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Paper>
	);
}
