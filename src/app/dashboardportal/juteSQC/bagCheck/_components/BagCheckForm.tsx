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
	bagCheckCreateSchema,
	type BagCheckCreatePayload,
	type BagCheckSetup,
} from "../types/bagCheckTypes";
import {
	type AggKey,
	type BagStrings,
	blankBag,
	computeBlockStats,
	computeRowCorr,
	hyLtLabel,
} from "../utils/bagCheckCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BagCheckSetup;
	onSaved: () => void;
};

// The 7 measured bag fields, in display order (defects rendered separately).
const MEASURED_FIELDS: { key: keyof BagStrings; label: string }[] = [
	{ key: "length_cm", label: "Length (cm)" },
	{ key: "width_cm", label: "Width (cm)" },
	{ key: "ends_dm", label: "Ends/dm" },
	{ key: "picks_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "bag_wt_gm", label: "Bag wt (gm)" },
	{ key: "stitch_dm", label: "Stitch/dm" },
];

// The 7 header std fields, in display order. std_mr_pct prefills 20.
const STD_FIELDS = [
	{ key: "std_bag_weight", label: "Std bag wt" },
	{ key: "std_length", label: "Std length" },
	{ key: "std_width", label: "Std width" },
	{ key: "std_ends", label: "Std ends" },
	{ key: "std_picks", label: "Std picks" },
	{ key: "std_stitch", label: "Std stitch" },
	{ key: "std_mr_pct", label: "Std MR%" },
] as const;

type StdKey = (typeof STD_FIELDS)[number]["key"];

// Aggregate-table column headers, keyed by the 8 numeric columns.
const AGG_COLS: { key: AggKey; label: string }[] = [
	{ key: "length_cm", label: "Length" },
	{ key: "width_cm", label: "Width" },
	{ key: "ends_dm", label: "Ends" },
	{ key: "picks_dm", label: "Picks" },
	{ key: "mr_pct", label: "MR%" },
	{ key: "bag_wt_gm", label: "Bag wt" },
	{ key: "stitch_dm", label: "Stitch" },
	{ key: "corr_wt_gm", label: "Corr wt" },
];

const blankStd = (defaultStdMrPct: number): Record<StdKey, string> => ({
	std_bag_weight: "",
	std_length: "",
	std_width: "",
	std_ends: "",
	std_picks: "",
	std_stitch: "",
	std_mr_pct: String(defaultStdMrPct),
});

// Map an aggregate column to the std field it is compared against (corr_wt has none).
const AGG_TO_STD: Partial<Record<AggKey, StdKey>> = {
	length_cm: "std_length",
	width_cm: "std_width",
	ends_dm: "std_ends",
	picks_dm: "std_picks",
	mr_pct: "std_mr_pct",
	bag_wt_gm: "std_bag_weight",
	stitch_dm: "std_stitch",
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

/**
 * R-08-24 Bag Checking SINGLE (date, bag type) block entry form.
 *
 * One save = ONE header (date, bag type, vendor_name + id_code FREE TEXT, and 7
 * std snapshots) + N per-bag detail rows (>=1, 20+), each row = 7 measured
 * inputs (length_cm, width_cm, ends_dm, picks_dm, mr_pct, bag_wt_gm, stitch_dm)
 * + optional free-text defects, with a live per-row corr_wt. std_mr_pct prefills
 * from the setup default (20); all 7 std fields are editable + snapshotted at
 * save. Live block aggregates (avg/stdev/cv/min/max per column + OBS/CORR HY/LT%)
 * are shown vs the std row. Submit = ONE POST of the whole block. The server
 * recomputes corr / aggregates / HY-LT and is AUTHORITATIVE; this preview is
 * advisory.
 */
export default function BagCheckForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [vendorName, setVendorName] = React.useState("");
	const [idCode, setIdCode] = React.useState("");
	const [std, setStd] = React.useState<Record<StdKey, string>>(() =>
		blankStd(setup.default_std_mr_pct),
	);
	const [rows, setRows] = React.useState<BagStrings[]>(() => [blankBag()]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.bag_types)[number]>();
		for (const b of setup.bag_types) m.set(b.item_id, b);
		return m;
	}, [setup.bag_types]);

	const stdMrNum = num(std.std_mr_pct);
	const stdMrForPreview = Number.isFinite(stdMrNum) ? stdMrNum : setup.default_std_mr_pct;
	const stats = React.useMemo(
		() => computeBlockStats(rows, stdMrForPreview, num(std.std_bag_weight)),
		[rows, stdMrForPreview, std.std_bag_weight],
	);

	const setStdAt = React.useCallback((key: StdKey, value: string) => {
		setStd((prev) => ({ ...prev, [key]: value }));
	}, []);

	const setRowField = React.useCallback(
		(index: number, key: keyof BagStrings, value: string) => {
			setRows((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [key]: value };
				return next;
			});
		},
		[],
	);

	const addRow = React.useCallback(() => {
		setRows((prev) => [...prev, blankBag()]);
	}, []);

	const removeRow = React.useCallback((index: number) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setVendorName("");
		setIdCode("");
		setRows([blankBag()]);
		// Keep std fields so a run of same-type blocks is fast.
	}, []);

	const handleSave = async () => {
		// Drop wholly-blank bags before validating so empty extra rows do not block
		// the save. Blank field -> NaN (not Number("")===0) so the schema flags a
		// partially-filled bag instead of silently sending 0.
		const nonBlankRows = rows.filter((r) => MEASURED_FIELDS.some((f) => r[f.key].trim() !== ""));
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			item_id: itemId === "" ? 0 : Number(itemId),
			bag_type_label: itemId === "" ? undefined : itemById.get(Number(itemId))?.item_name,
			vendor_name: vendorName.trim() || undefined,
			id_code: idCode.trim() || undefined,
			std_bag_weight: num(std.std_bag_weight),
			std_length: num(std.std_length),
			std_width: num(std.std_width),
			std_ends: num(std.std_ends),
			std_picks: num(std.std_picks),
			std_stitch: num(std.std_stitch),
			std_mr_pct: num(std.std_mr_pct),
			bags: nonBlankRows.map((r) => ({
				length_cm: num(r.length_cm),
				width_cm: num(r.width_cm),
				ends_dm: num(r.ends_dm),
				picks_dm: num(r.picks_dm),
				mr_pct: num(r.mr_pct),
				bag_wt_gm: num(r.bag_wt_gm),
				stitch_dm: num(r.stitch_dm),
				defects: r.defects.trim() || undefined,
			})),
		};

		const parsed = bagCheckCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: BagCheckCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; bag_check_id: number };
		}>(apiRoutesPortalMasters.BAG_CHECK_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved bag-checking block");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Bag-checking block — one bag type, its 7 standards, and its per-bag inspection rows
			</Typography>

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
				<Autocomplete
					options={setup.bag_types}
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
					sx={{ minWidth: 280, flex: "1 1 320px" }}
					renderInput={(params) => (
						<TextField {...params} label="Bag type" placeholder="Bag type" />
					)}
				/>
				<TextField
					size="small"
					label="Vendor name"
					value={vendorName}
					onChange={(e) => setVendorName(e.target.value)}
					inputProps={{ "aria-label": "Vendor name", maxLength: 255 }}
					sx={{ width: 220 }}
				/>
				<TextField
					size="small"
					label="ID code"
					value={idCode}
					onChange={(e) => setIdCode(e.target.value)}
					inputProps={{ "aria-label": "ID code", maxLength: 255 }}
					sx={{ width: 180 }}
				/>
			</Box>

			<Box>
				<Typography variant="caption" color="text.secondary">
					Standards (snapshotted at save)
				</Typography>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "repeat(2, 1fr)",
							sm: "repeat(4, 1fr)",
							md: "repeat(7, 1fr)",
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
				<Table size="small" sx={{ minWidth: 980 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }}>#</TableCell>
							{MEASURED_FIELDS.map((f) => (
								<TableCell key={f.key} align="right" sx={{ minWidth: 96 }}>
									{f.label}
								</TableCell>
							))}
							<TableCell align="right" sx={{ minWidth: 90 }}>
								Corr wt
							</TableCell>
							<TableCell sx={{ minWidth: 140 }}>Defects</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => {
							const corr = computeRowCorr(r, stdMrForPreview);
							return (
								<TableRow key={`bag-${i}`}>
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
													"aria-label": `Bag ${i + 1} ${f.label}`,
													style: { textAlign: "right" },
												}}
												sx={{ width: 80 }}
											/>
										</TableCell>
									))}
									<TableCell align="right" sx={{ fontWeight: 600 }}>
										{fmt(corr)}
									</TableCell>
									<TableCell>
										<TextField
											size="small"
											variant="standard"
											value={r.defects}
											onChange={(e) => setRowField(i, "defects", e.target.value)}
											placeholder="—"
											inputProps={{ "aria-label": `Bag ${i + 1} defects` }}
											sx={{ width: 130 }}
										/>
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Remove bag">
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
							{MEASURED_FIELDS.map((f) => (
								<TableCell key={f.key} align="right">
									{fmt(stats.aggregates[f.key as AggKey]?.avg)}
								</TableCell>
							))}
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(stats.aggregates.corr_wt_gm.avg)}
							</TableCell>
							<TableCell />
							<TableCell />
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>

			<Box>
				<Button size="small" startIcon={<AddIcon size={16} />} onClick={addRow}>
					Add bag
				</Button>
			</Box>

			{/* Live block aggregates: std row vs avg/stdev/cv/min/max per column. */}
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 760 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ minWidth: 80 }} />
							{AGG_COLS.map((c) => (
								<TableCell key={c.key} align="right" sx={{ minWidth: 80 }}>
									{c.label}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }}>Std</TableCell>
							{AGG_COLS.map((c) => {
								const stdKey = AGG_TO_STD[c.key];
								return (
									<TableCell key={c.key} align="right">
										{stdKey ? fmt(num(std[stdKey])) : "—"}
									</TableCell>
								);
							})}
						</TableRow>
						{(["avg", "stdev", "cv_pct", "min", "max"] as const).map((stat) => (
							<TableRow key={stat}>
								<TableCell sx={{ fontWeight: 600 }}>
									{stat === "cv_pct" ? "CV %" : stat === "stdev" ? "Std dev" : stat}
								</TableCell>
								{AGG_COLS.map((c) => (
									<TableCell key={c.key} align="right">
										{fmt(stats.aggregates[c.key]?.[stat])}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "repeat(2, 1fr)",
					gap: 1,
					p: 1.5,
					bgcolor: "action.hover",
					borderRadius: 1,
				}}
			>
				<Stat label="OBS HY/LT %" value={hyLtLabel(stats.obs_hy_lt_pct)} />
				<Stat label="CORR HY/LT %" value={hyLtLabel(stats.corr_hy_lt_pct)} />
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

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="body2" sx={{ fontWeight: 600 }}>
				{value}
			</Typography>
		</Box>
	);
}
