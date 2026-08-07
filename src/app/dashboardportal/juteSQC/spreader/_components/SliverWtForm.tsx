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
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Plus as AddIcon, Trash2 as DeleteIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	SLIVER_WT_MAX_READINGS,
	SLIVER_WT_MIN_READINGS,
	spreaderSliverWtSchema,
	type SpreaderSliverWtSetup,
	type SpreaderSliverWtSavePayload,
} from "../types/sqcSpreaderTypes";
import { computePreview } from "../utils/spreaderSliverCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: SpreaderSliverWtSetup;
	onSaved: () => void;
};

// Start with a single blank reading row (min 1, max 12).
const blankReadings = (): string[] => Array(SLIVER_WT_MIN_READINGS).fill("");

/**
 * R-08-03 Spreader Sliver Weight entry form.
 *
 * Header pickers (date is supplied by the parent; spell / machine / quality +
 * optional free-text CATEGORY default from the setup payload). Unlike R-08-04
 * this captures a DYNAMIC list of paired (weight, MR%) readings — add/remove
 * rows between 1 and 12 — and the live preview (corrected weights, averages,
 * StDev, CV%) is advisory only (NO bands). The server recomputes and persists
 * every value on save. Units are lb/100yds (operator-entered, already scaled).
 * POST shape per the R-08-03 build plan §3.
 */
export default function SliverWtForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [spellId, setSpellId] = React.useState<number | "">(""); // optional
	const [machineId, setMachineId] = React.useState<number | "">(""); // optional
	const [qualityItemId, setQualityItemId] = React.useState<number | "">(""); // optional
	const [category, setCategory] = React.useState<string>(""); // optional free-text
	const [weights, setWeights] = React.useState<string[]>(blankReadings);
	const [mrPcts, setMrPcts] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Std MR% comes from the selected quality (jute_spreader_quality_attr); the
	// server falls back to base 16 when unset. The preview uses the same fallback.
	const selectedQuality = setup.qualities.find((q) => q.item_id === Number(qualityItemId));
	const stdMrPct = selectedQuality?.std_mr_pct;

	const preview = React.useMemo(
		() => computePreview(weights, mrPcts, stdMrPct),
		[weights, mrPcts, stdMrPct]
	);

	const setWeightAt = (index: number, value: string) => {
		setWeights((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};
	const setMrAt = (index: number, value: string) => {
		setMrPcts((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const addRow = () => {
		if (weights.length >= SLIVER_WT_MAX_READINGS) return;
		setWeights((prev) => [...prev, ""]);
		setMrPcts((prev) => [...prev, ""]);
	};
	const removeRow = (index: number) => {
		if (weights.length <= SLIVER_WT_MIN_READINGS) return;
		setWeights((prev) => prev.filter((_, i) => i !== index));
		setMrPcts((prev) => prev.filter((_, i) => i !== index));
	};

	// Every row must carry a weight (> 0) and a numeric MR% to save a valid set.
	const weightsFilled = weights.every((w) => w !== "" && Number(w) > 0);
	const mrFilled = mrPcts.every((m) => m !== "" && Number.isFinite(Number(m)));
	const formInvalid = !weightsFilled || !mrFilled;

	const handleSave = async () => {
		const parsedWeights = weights.map((w) => Number(w));
		const parsedMr = mrPcts.map((m) => Number(m));

		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			spell_id: spellId === "" ? null : Number(spellId),
			mc_id: machineId === "" ? null : Number(machineId),
			item_id: qualityItemId === "" ? null : Number(qualityItemId),
			category: category.trim() === "" ? null : category.trim(),
			observed_weights: parsedWeights,
			mr_pcts: parsedMr,
		};

		const parsed = spreaderSliverWtSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete all readings.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: SpreaderSliverWtSavePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{ data: { spreader_sliver_wt_id: number } }>(
			apiRoutesPortalMasters.SPREADER_SLIVER_WT_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const qName =
			selectedQuality?.item_name ?? (qualityItemId !== "" ? `Quality #${qualityItemId}` : "entry");
		setSnack(`Saved sliver-weight entry for ${qName}`);
		// Keep spell/machine/quality/category so the inspector can punch the next
		// set quickly; clear only the numeric reading rows (reset to a single row).
		setWeights(blankReadings());
		setMrPcts(blankReadings());
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Header pickers */}
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
						md: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					select
					label="Spell (optional)"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
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
				<TextField
					select
					label="Machine (MC No.)"
					value={machineId}
					onChange={(e) => setMachineId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
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
				<Autocomplete
					options={setup.qualities}
					getOptionLabel={(q) => `${q.item_name} (${q.item_code})`}
					value={setup.qualities.find((q) => q.item_id === qualityItemId) ?? null}
					onChange={(_, newVal) => setQualityItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => (
						<TextField
							{...params}
							label="Quality (raw jute)"
							helperText={
								qualityItemId !== ""
									? stdMrPct != null
										? `Std MR%: ${Number(stdMrPct).toFixed(2)}`
										: "No Std MR% set — server uses base 16"
									: " "
							}
						/>
					)}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					label="Category (optional)"
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			{/* Dynamic 1–12 paired (weight, MR%) readings */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
				<Typography variant="subtitle2">
					Sliver weight readings — {weights.length}/{SLIVER_WT_MAX_READINGS} (lb/100yds + MR%)
				</Typography>
				<Button
					variant="outlined"
					size="small"
					startIcon={<AddIcon size={16} />}
					onClick={addRow}
					disabled={weights.length >= SLIVER_WT_MAX_READINGS}
					sx={{ minHeight: 36 }}
				>
					Add reading
				</Button>
			</Box>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
						md: "repeat(3, minmax(0, 1fr))",
					},
				}}
			>
				{weights.map((w, i) => (
					<Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<TextField
							type="number"
							label={`Wt ${i + 1}`}
							value={w}
							onChange={(e) => setWeightAt(i, e.target.value)}
							size="small"
							fullWidth
							inputProps={{ step: "any", min: 0 }}
						/>
						<TextField
							type="number"
							label={`MR% ${i + 1}`}
							value={mrPcts[i]}
							onChange={(e) => setMrAt(i, e.target.value)}
							size="small"
							fullWidth
							inputProps={{ step: "any", min: 0 }}
						/>
						<Tooltip title={weights.length <= SLIVER_WT_MIN_READINGS ? "At least one reading is required" : "Remove reading"}>
							<span>
								<IconButton
									size="small"
									color="error"
									onClick={() => removeRow(i)}
									disabled={weights.length <= SLIVER_WT_MIN_READINGS}
									sx={{ minWidth: 40, minHeight: 40 }}
								>
									<DeleteIcon size={16} />
								</IconButton>
							</span>
						</Tooltip>
					</Box>
				))}
			</Box>

			{/* Live advisory preview (server is authoritative) — no bands */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Live preview ({preview?.n ?? 0}/{weights.length} readings) — advisory only
				</Typography>
				{preview ? (
					<Box
						sx={{
							display: "grid",
							gap: 2,
							gridTemplateColumns: {
								xs: "repeat(2, minmax(0, 1fr))",
								sm: "repeat(3, minmax(0, 1fr))",
								md: "repeat(5, minmax(0, 1fr))",
							},
						}}
					>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Avg Obs
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.avgObs != null ? preview.avgObs.toFixed(2) : "—"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Avg Corr
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.avgCorr != null ? preview.avgCorr.toFixed(2) : "—"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Avg MR%
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.avgMrPct != null ? preview.avgMrPct.toFixed(2) : "—"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								StDev
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.stdev != null ? preview.stdev.toFixed(4) : "—"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								CV %
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.cvPct != null ? `${preview.cvPct.toFixed(2)}%` : "—"}
							</Typography>
						</Box>
					</Box>
				) : (
					<Typography variant="body2" color="text.secondary">
						Enter at least one weight (&gt; 0) with its MR% to preview.
					</Typography>
				)}
			</Paper>

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
					startIcon={<AddIcon size={18} />}
					onClick={handleSave}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Reading Set"}
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
