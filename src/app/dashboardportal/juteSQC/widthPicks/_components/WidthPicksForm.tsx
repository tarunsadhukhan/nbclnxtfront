"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
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
	widthPicksCreateSchema,
	type WidthPicksCreatePayload,
	type WidthPicksSetup,
} from "../types/widthPicksTypes";
import {
	blankLoomRow,
	computePicksSummary,
	computeWidthSummary,
	type LoomRowStrings,
} from "../utils/widthPicksCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: WidthPicksSetup;
	onSaved: () => void;
};

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

/**
 * R-08-21 Width & Picks SINGLE (date, cloth-quality) group entry form.
 *
 * One save = ONE header (date, cloth quality, std_width_cm, std_picks, optional
 * inspector_name) + N loom reading rows (loom, width_cm required, picks_dm
 * OPTIONAL). std_width_cm + std_picks are editable and snapshotted at save. Live
 * WIDTH summary (avg + tol band + '$' remark when outside +/-0.5%) and PICKS
 * summary (avg/stdev/max/min over non-null picks) are shown. Submit = ONE POST of
 * the whole group. The server recomputes both summaries and is AUTHORITATIVE;
 * this preview is advisory.
 */
export default function WidthPicksForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [stdWidth, setStdWidth] = React.useState("");
	const [stdPicks, setStdPicks] = React.useState("");
	const [inspector, setInspector] = React.useState("");
	const [rows, setRows] = React.useState<LoomRowStrings[]>(() => [blankLoomRow()]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.cloth_qualities)[number]>();
		for (const c of setup.cloth_qualities) m.set(c.item_id, c);
		return m;
	}, [setup.cloth_qualities]);

	const loomById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.looms)[number]>();
		for (const l of setup.looms) m.set(l.machine_id, l);
		return m;
	}, [setup.looms]);

	const stdWidthNum = num(stdWidth);
	const widthSummary = React.useMemo(
		() => computeWidthSummary(rows, stdWidthNum),
		[rows, stdWidthNum],
	);
	const picksSummary = React.useMemo(() => computePicksSummary(rows), [rows]);

	const setRowField = React.useCallback(
		(index: number, key: keyof LoomRowStrings, value: string | number | "") => {
			setRows((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [key]: value };
				return next;
			});
		},
		[],
	);

	const addRow = React.useCallback(() => {
		setRows((prev) => [...prev, blankLoomRow()]);
	}, []);

	const removeRow = React.useCallback((index: number) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setRows([blankLoomRow()]);
		// Keep std + inspector so a run of same-quality groups is fast.
	}, []);

	const handleSave = async () => {
		// Drop wholly-blank rows (no loom and no width) before validating so a
		// trailing empty row does not block the save. Blank width -> NaN (not
		// Number("")===0) so the schema flags a partially-filled row instead of
		// silently sending 0. picks_dm blank -> omitted (not pick-checked).
		const nonBlankRows = rows.filter(
			(r) => r.loom_id !== "" || r.width_cm.trim() !== "" || r.picks_dm.trim() !== "",
		);
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			item_id: itemId === "" ? 0 : Number(itemId),
			std_width_cm: num(stdWidth),
			std_picks: num(stdPicks),
			inspector_name: inspector.trim() === "" ? undefined : inspector.trim(),
			rows: nonBlankRows.map((r) => ({
				loom_id: r.loom_id === "" ? 0 : Number(r.loom_id),
				width_cm: num(r.width_cm),
				picks_dm: r.picks_dm.trim() === "" ? undefined : num(r.picks_dm),
			})),
		};

		const parsed = widthPicksCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every required field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: WidthPicksCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; width_picks_id: number };
		}>(apiRoutesPortalMasters.WIDTH_PICKS_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved width & picks group");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Width &amp; picks group — one cloth quality, its width/picks standards, and N loom readings
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
					gap: 2,
					alignItems: "start",
				}}
			>
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
					sx={{ gridColumn: { xs: "auto", md: "span 2" } }}
					renderInput={(params) => (
						<TextField {...params} label="Cloth quality" placeholder="Cloth quality" />
					)}
				/>
				<TextField
					type="number"
					size="small"
					label="Std width (cm)"
					value={stdWidth}
					onChange={(e) => setStdWidth(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std width (cm)" }}
				/>
				<TextField
					type="number"
					size="small"
					label="Std picks"
					value={stdPicks}
					onChange={(e) => setStdPicks(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std picks" }}
				/>
				<TextField
					size="small"
					label="Inspector (optional)"
					value={inspector}
					onChange={(e) => setInspector(e.target.value)}
					sx={{ gridColumn: { xs: "auto", sm: "span 2" } }}
				/>
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 620 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }}>#</TableCell>
							<TableCell sx={{ minWidth: 240 }}>Loom</TableCell>
							<TableCell align="right" sx={{ minWidth: 130 }}>
								Width (cm)
							</TableCell>
							<TableCell align="right" sx={{ minWidth: 130 }}>
								Picks/dm (optional)
							</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => (
							<TableRow key={`loom-row-${i}`}>
								<TableCell>{i + 1}</TableCell>
								<TableCell>
									<Autocomplete
										options={setup.looms}
										getOptionLabel={(opt) => opt.machine_name}
										renderOption={(props, opt) => (
											<li {...props} key={opt.machine_id}>
												{opt.machine_name}
												{opt.mech_code ? ` (${opt.mech_code})` : ""}
											</li>
										)}
										value={r.loom_id === "" ? null : loomById.get(Number(r.loom_id)) ?? null}
										onChange={(_, newVal) =>
											setRowField(i, "loom_id", newVal ? newVal.machine_id : "")
										}
										isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
										size="small"
										renderInput={(params) => (
											<TextField {...params} variant="standard" placeholder="Loom" />
										)}
									/>
								</TableCell>
								<TableCell align="right">
									<TextField
										type="number"
										size="small"
										variant="standard"
										value={r.width_cm}
										onChange={(e) => setRowField(i, "width_cm", e.target.value)}
										inputProps={{
											step: "any",
											min: 0,
											"aria-label": `Row ${i + 1} width (cm)`,
											style: { textAlign: "right" },
										}}
										sx={{ width: 110 }}
									/>
								</TableCell>
								<TableCell align="right">
									<TextField
										type="number"
										size="small"
										variant="standard"
										placeholder="—"
										value={r.picks_dm}
										onChange={(e) => setRowField(i, "picks_dm", e.target.value)}
										inputProps={{
											step: "any",
											min: 0,
											"aria-label": `Row ${i + 1} picks/dm`,
											style: { textAlign: "right" },
										}}
										sx={{ width: 110 }}
									/>
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
						))}
					</TableBody>
				</Table>
			</TableContainer>

			<Box>
				<Button size="small" startIcon={<AddIcon size={16} />} onClick={addRow}>
					Add loom row
				</Button>
			</Box>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
					gap: 2,
				}}
			>
				<Paper variant="outlined" sx={{ p: 1.5 }}>
					<Typography variant="caption" color="text.secondary">
						Width summary (all rows)
					</Typography>
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mt: 0.5 }}>
						<Typography variant="body2">
							Avg width: <strong>{fmt(widthSummary.avg_width)}</strong>
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Tol: {fmt(widthSummary.tol_low)} – {fmt(widthSummary.tol_high)}
						</Typography>
						{widthSummary.remark === "$" ? (
							<Chip size="small" color="error" label="$ out of ±0.5%" />
						) : (
							<Chip size="small" color="success" label="within ±0.5%" />
						)}
					</Box>
				</Paper>
				<Paper variant="outlined" sx={{ p: 1.5 }}>
					<Typography variant="caption" color="text.secondary">
						Picks summary (non-null picks only)
					</Typography>
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 0.5 }}>
						<Typography variant="body2">
							Avg: <strong>{fmt(picksSummary.avg_picks)}</strong>
						</Typography>
						<Typography variant="body2">Stdev: {fmt(picksSummary.stdev, 4)}</Typography>
						<Typography variant="body2">Max: {fmt(picksSummary.max_picks, 0)}</Typography>
						<Typography variant="body2">Min: {fmt(picksSummary.min_picks, 0)}</Typography>
						<Typography variant="body2" color="text.secondary">
							n={picksSummary.pick_count}
						</Typography>
					</Box>
				</Paper>
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
					{saving ? "Saving…" : "Save Group"}
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
