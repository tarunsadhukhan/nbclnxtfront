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
	BREAKER_CARD_READINGS,
	breakerCardSaveSchema,
	type BreakerCardSetup,
	type BreakerCardSavePayload,
	type BreakerCardRow,
} from "../types/breakerCardTypes";
import { computeRowPreview } from "../utils/breakerCardCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BreakerCardSetup;
	onSaved: () => void;
};

// A single editable row of the entry grid. Numeric inputs are held as strings;
// selects hold the id or "" when unset. Each row gets a stable client key so the
// React list reconciles correctly as rows are added/removed.
type DraftRow = {
	key: string;
	mcId: number | "";
	spellId: number | "";
	batchId: number | "";
	weights: string[];
	mrPcts: string[];
};

let rowSeq = 0;
const nextKey = (): string => `r-${++rowSeq}`;
const blankReadings = (): string[] => Array(BREAKER_CARD_READINGS).fill("");
const makeBlankRow = (): DraftRow => ({
	key: nextKey(),
	mcId: "",
	spellId: "",
	batchId: "",
	weights: blankReadings(),
	mrPcts: blankReadings(),
});

// A draft row is "empty" (skipped on save) when no selects are set and every
// weight/MR cell is blank — i.e. the trailing add-row the user never touched.
function isRowEmpty(r: DraftRow): boolean {
	const noSelects = r.mcId === "" && r.spellId === "" && r.batchId === "";
	const noNumbers = r.weights.every((w) => w === "") && r.mrPcts.every((m) => m === "");
	return noSelects && noNumbers;
}

/**
 * R-08-05/06/07 Breaker Card (Coarse-Side SWT) MULTI-ROW entry form.
 *
 * Renders a table where the inspector adds one row per (machine, spell, batch)
 * reading set — each with 4 cut weights + 4 MR%. A batch has no single std, so
 * the live preview always uses std 16 with no CV band; per row a live Corr Wt and
 * CV% preview is shown. One submit POSTs the whole array as { rows: [...] }; blank
 * rows are dropped and empty selects map to null. Server values are authoritative;
 * the preview is advisory.
 */
export default function BreakerCardForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [rows, setRows] = React.useState<DraftRow[]>(() => [makeBlankRow()]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

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

		const payloadRows: BreakerCardRow[] = filledRows.map((r) => ({
			mc_id: r.mcId === "" ? null : Number(r.mcId),
			spell_id: r.spellId === "" ? null : Number(r.spellId),
			batch_plan_id: r.batchId === "" ? null : Number(r.batchId),
			weights: r.weights.map((w) => Number(w)),
			mr_pcts: r.mrPcts.map((m) => Number(m)),
		}));

		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			card_side: "COARSE",
			rows: payloadRows,
		};

		const parsed = breakerCardSaveSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every reading row.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: BreakerCardSavePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; breaker_card_swt_ids: number[]; count: number };
		}>(
			apiRoutesPortalMasters.BREAKER_CARD_SWT_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved ${payloadRows.length} breaker-card row${payloadRows.length === 1 ? "" : "s"}`);
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
					Reading rows — each row = one Mc / Spell / Batch with {BREAKER_CARD_READINGS} cut
					weights (LB/5yds) + {BREAKER_CARD_READINGS} MR%
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
				<Table size="small" sx={{ minWidth: 1180 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ minWidth: 150 }}>Machine (Mc)</TableCell>
							<TableCell sx={{ minWidth: 130 }}>Spell</TableCell>
							<TableCell sx={{ minWidth: 200 }}>Batch</TableCell>
							{Array.from({ length: BREAKER_CARD_READINGS }).map((_, i) => (
								<TableCell key={`wt-h-${i}`} align="center" sx={{ minWidth: 92 }}>
									Wt {i + 1}
								</TableCell>
							))}
							{Array.from({ length: BREAKER_CARD_READINGS }).map((_, i) => (
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
