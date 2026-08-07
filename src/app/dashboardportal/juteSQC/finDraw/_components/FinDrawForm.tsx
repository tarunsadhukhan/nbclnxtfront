"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	IconButton,
	MenuItem,
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
	alpha,
} from "@mui/material";
import { Plus as AddIcon, Trash2 as DeleteOutlineIcon, Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	FIN_DRAW_READINGS,
	FIN_DRAW_SECTIONS,
	DEFAULT_FIN_DRAW_SECTION,
	finDrawSaveSchema,
	type FinDrawSection,
	type FinDrawSetup,
	type FinDrawSavePayload,
	type FinDrawRow,
} from "../types/finDrawTypes";
import { computeRowPreview } from "../utils/finDrawCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: FinDrawSetup;
	onSaved: () => void;
};

// Human-friendly labels for the three finisher-drawing sub-sections.
const SECTION_LABEL: Record<FinDrawSection, string> = {
	HESS: "Hessian",
	SWP: "Sacking Warp (SWP)",
	SWT: "Sacking Warp/Twine (SWT)",
};

// A single editable row of the entry grid. Numeric inputs are held as strings;
// selects hold the id or "" when unset. Each row gets a stable client key so the
// React list reconciles correctly as rows are added/removed. dlvNos holds the 4
// per-cut delivery numbers as strings ("" → null on save).
type DraftRow = {
	key: string;
	section: FinDrawSection;
	mcId: number | "";
	spellId: number | "";
	batchId: number | "";
	dlvNos: string[];
	weights: string[];
	mrPcts: string[];
};

let rowSeq = 0;
const nextKey = (): string => `r-${++rowSeq}`;
const blankReadings = (): string[] => Array(FIN_DRAW_READINGS).fill("");
const makeBlankRow = (): DraftRow => ({
	key: nextKey(),
	section: DEFAULT_FIN_DRAW_SECTION,
	mcId: "",
	spellId: "",
	batchId: "",
	dlvNos: blankReadings(),
	weights: blankReadings(),
	mrPcts: blankReadings(),
});

// A draft row is "empty" (skipped on save) when no selects are set and every
// DLV/weight/MR cell is blank — i.e. the trailing add-row the user never touched.
// The section defaults to HESS and is not by itself a sign the row is "filled".
function isRowEmpty(r: DraftRow): boolean {
	const noSelects = r.mcId === "" && r.spellId === "" && r.batchId === "";
	const noNumbers =
		r.weights.every((w) => w === "") &&
		r.mrPcts.every((m) => m === "") &&
		r.dlvNos.every((d) => d === "");
	return noSelects && noNumbers;
}

// A blank DLV cell → null; otherwise the parsed integer.
function parseDlv(value: string): number | null {
	if (value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * R-08-12/13/14 Finisher Drawing (Sliver Weight) MULTI-ROW entry form.
 *
 * Renders a table where the inspector adds one row per (section, machine, spell,
 * batch) reading set — each with 4 cut weights + 4 MR% + 4 optional DLV numbers.
 * Each row leads with a Section dropdown (Hessian / SWP / SWT). A batch has no
 * single std, so the live preview always uses std 16 with no CV band; per row a
 * live Corr Wt and CV% preview is shown. One submit POSTs the whole array as
 * { rows: [...] }; blank rows are dropped, empty selects map to null, and blank
 * DLV cells map to null. Server values are authoritative; the preview is advisory.
 */
export default function FinDrawForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [rows, setRows] = React.useState<DraftRow[]>(() => [makeBlankRow()]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Sections to offer in the dropdown — prefer the server list, fall back to the
	// fixed enum so the control still works if setup omits it.
	const sectionOptions = React.useMemo<FinDrawSection[]>(
		() => (setup.sections && setup.sections.length > 0 ? setup.sections : [...FIN_DRAW_SECTIONS]),
		[setup.sections]
	);

	// Look up a batch by batch_plan_id (for the selected-value display).
	const batchById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.batches)[number]>();
		for (const b of setup.batches) m.set(b.batch_plan_id, b);
		return m;
	}, [setup.batches]);

	const addRow = React.useCallback(() => {
		setRows((prev) => [...prev, makeBlankRow()]);
	}, []);

	const removeRow = React.useCallback((key: string) => {
		setRows((prev) => {
			const next = prev.filter((r) => r.key !== key);
			return next.length === 0 ? [makeBlankRow()] : next;
		});
	}, []);

	const updateRow = React.useCallback((key: string, patch: Partial<DraftRow>) => {
		setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
	}, []);

	const setDlvAt = React.useCallback((key: string, index: number, value: string) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.key !== key) return r;
				const next = [...r.dlvNos];
				next[index] = value;
				return { ...r, dlvNos: next };
			})
		);
	}, []);

	const setWeightAt = React.useCallback(
		(key: string, index: number, value: string) => {
			setRows((prev) =>
				prev.map((r) => {
					if (r.key !== key) return r;
					const next = [...r.weights];
					next[index] = value;
					return { ...r, weights: next };
				})
			);
		},
		[]
	);

	const setMrAt = React.useCallback((key: string, index: number, value: string) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.key !== key) return r;
				const next = [...r.mrPcts];
				next[index] = value;
				return { ...r, mrPcts: next };
			})
		);
	}, []);

	const handleSave = async () => {
		const filledRows = rows.filter((r) => !isRowEmpty(r));
		if (filledRows.length === 0) {
			setError("Add at least one reading row to save.");
			return;
		}

		const payloadRows: FinDrawRow[] = filledRows.map((r) => ({
			section: r.section,
			mc_id: r.mcId === "" ? null : Number(r.mcId),
			spell_id: r.spellId === "" ? null : Number(r.spellId),
			batch_plan_id: r.batchId === "" ? null : Number(r.batchId),
			dlv_nos: r.dlvNos.map(parseDlv),
			weights: r.weights.map((w) => Number(w)),
			mr_pcts: r.mrPcts.map((m) => Number(m)),
		}));

		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			rows: payloadRows,
		};

		const parsed = finDrawSaveSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every reading row.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: FinDrawSavePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; fin_draw_sliver_wt_ids: number[]; count: number };
		}>(
			apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved ${payloadRows.length} fin-draw row${payloadRows.length === 1 ? "" : "s"}`);
		setRows([makeBlankRow()]);
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 1,
				}}
			>
				<Typography variant="subtitle2">
					Reading rows — each row = one Section / Mc / Spell / Batch with {FIN_DRAW_READINGS} DLV
					nos + {FIN_DRAW_READINGS} cut weights (LB/5yds) + {FIN_DRAW_READINGS} MR%
				</Typography>
				<Button
					variant="outlined"
					size="small"
					startIcon={<AddIcon size={16} />}
					onClick={addRow}
					sx={{ minHeight: 40 }}
				>
					Add Row
				</Button>
			</Box>

			<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 1640 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ minWidth: 200 }}>Section</TableCell>
							<TableCell sx={{ minWidth: 150 }}>Machine (Mc)</TableCell>
							<TableCell sx={{ minWidth: 130 }}>Spell</TableCell>
							<TableCell sx={{ minWidth: 200 }}>Batch</TableCell>
							{Array.from({ length: FIN_DRAW_READINGS }).map((_, i) => (
								<TableCell key={`dlv-h-${i}`} align="center" sx={{ minWidth: 76 }}>
									DLV {i + 1}
								</TableCell>
							))}
							{Array.from({ length: FIN_DRAW_READINGS }).map((_, i) => (
								<TableCell key={`wt-h-${i}`} align="center" sx={{ minWidth: 92 }}>
									Wt {i + 1}
								</TableCell>
							))}
							{Array.from({ length: FIN_DRAW_READINGS }).map((_, i) => (
								<TableCell key={`mr-h-${i}`} align="center" sx={{ minWidth: 84 }}>
									MR% {i + 1}
								</TableCell>
							))}
							<TableCell align="right" sx={{ minWidth: 90 }}>
								Corr Wt
							</TableCell>
							<TableCell align="right" sx={{ minWidth: 90 }}>
								CV %
							</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r) => {
							// A batch has no std → preview uses std 16, no CV band.
							const preview = computeRowPreview(r.weights, r.mrPcts);
							const cvPass = preview?.withinBand;
							return (
								<TableRow key={r.key} hover>
									<TableCell>
										<TextField
											select
											size="small"
											value={r.section}
											onChange={(e) =>
												updateRow(r.key, { section: e.target.value as FinDrawSection })
											}
											fullWidth
										>
											{sectionOptions.map((s) => (
												<MenuItem key={s} value={s}>
													{SECTION_LABEL[s]}
												</MenuItem>
											))}
										</TextField>
									</TableCell>
									<TableCell>
										<TextField
											select
											size="small"
											value={r.mcId}
											onChange={(e) =>
												updateRow(r.key, {
													mcId: e.target.value === "" ? "" : Number(e.target.value),
												})
											}
											fullWidth
										>
											<MenuItem value="">
												<em>None</em>
											</MenuItem>
											{setup.machines.map((m) => (
												<MenuItem key={m.machine_id} value={m.machine_id}>
													{m.machine_name} ({m.mech_code})
												</MenuItem>
											))}
										</TextField>
									</TableCell>
									<TableCell>
										<TextField
											select
											size="small"
											value={r.spellId}
											onChange={(e) =>
												updateRow(r.key, {
													spellId: e.target.value === "" ? "" : Number(e.target.value),
												})
											}
											fullWidth
										>
											<MenuItem value="">
												<em>None</em>
											</MenuItem>
											{setup.spells.map((s) => (
												<MenuItem key={s.spell_id} value={s.spell_id}>
													{s.spell_name} ({s.spell_code})
												</MenuItem>
											))}
										</TextField>
									</TableCell>
									<TableCell>
										<Autocomplete
											options={setup.batches}
											getOptionLabel={(opt) => opt.plan_name}
											renderOption={(props, opt) => (
												<li {...props} key={opt.batch_plan_id}>
													{opt.plan_name}
												</li>
											)}
											value={r.batchId === "" ? null : batchById.get(Number(r.batchId)) ?? null}
											onChange={(_, newVal) =>
												updateRow(r.key, { batchId: newVal ? newVal.batch_plan_id : "" })
											}
											size="small"
											renderInput={(params) => (
												<TextField {...params} placeholder="Batch" helperText="Std MR%: 16 (default)" />
											)}
											isOptionEqualToValue={(opt, val) => opt.batch_plan_id === val.batch_plan_id}
											sx={{ minWidth: 190 }}
										/>
									</TableCell>
									{r.dlvNos.map((d, i) => (
										<TableCell key={`${r.key}-dlv-${i}`} align="center">
											<TextField
												type="number"
												size="small"
												value={d}
												onChange={(e) => setDlvAt(r.key, i, e.target.value)}
												inputProps={{ step: 1, min: 0, "aria-label": `DLV no ${i + 1}` }}
												sx={{ width: 64 }}
											/>
										</TableCell>
									))}
									{r.weights.map((w, i) => (
										<TableCell key={`${r.key}-wt-${i}`} align="center">
											<TextField
												type="number"
												size="small"
												value={w}
												onChange={(e) => setWeightAt(r.key, i, e.target.value)}
												inputProps={{ step: "any", min: 0, "aria-label": `Weight ${i + 1}` }}
												sx={{ width: 80 }}
											/>
										</TableCell>
									))}
									{r.mrPcts.map((m, i) => (
										<TableCell key={`${r.key}-mr-${i}`} align="center">
											<TextField
												type="number"
												size="small"
												value={m}
												onChange={(e) => setMrAt(r.key, i, e.target.value)}
												inputProps={{ step: "any", min: 0, "aria-label": `MR% ${i + 1}` }}
												sx={{ width: 72 }}
											/>
										</TableCell>
									))}
									<TableCell align="right">
										<Typography variant="body2" fontWeight={600}>
											{preview?.corrWt != null ? preview.corrWt.toFixed(2) : "—"}
										</Typography>
									</TableCell>
									<TableCell
										align="right"
										sx={
											preview?.cvPct == null || cvPass == null
												? undefined
												: cvPass
												? {
														color: "success.main",
														fontWeight: 700,
														bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
												  }
												: {
														color: "error.main",
														fontWeight: 700,
														bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
												  }
										}
									>
										{preview?.cvPct != null ? `${preview.cvPct.toFixed(2)}%` : "—"}
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Remove row">
											<IconButton
												size="small"
												color="error"
												onClick={() => removeRow(r.key)}
												sx={{ minWidth: 40, minHeight: 40 }}
											>
												<DeleteOutlineIcon size={16} />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box
				sx={{
					position: { xs: "sticky", md: "static" },
					bottom: 0,
					bgcolor: "background.paper",
					py: 1,
					display: "flex",
					justifyContent: { xs: "stretch", md: "flex-end" },
				}}
			>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save All Rows"}
				</Button>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
