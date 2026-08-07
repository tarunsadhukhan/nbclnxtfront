"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	MenuItem,
	Paper,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	ROLL_WT_READINGS,
	spreaderRollWtSchema,
	type SpreaderRollWtSetup,
	type SpreaderRollWtSavePayload,
} from "../types/sqcSpreaderTypes";
import { computePreview, DEFAULT_BAND_EDGES } from "../utils/spreaderCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: SpreaderRollWtSetup;
	onSaved: () => void;
};

const blankReadings = (): string[] => Array(ROLL_WT_READINGS).fill("");

/**
 * R-08-04 Spreader Roll Weight entry form.
 *
 * Header pickers (spell / machine / quality) default from the setup payload;
 * 10 paired (weight, MR%) bench readings are captured as string state and the
 * live preview (corrected weights, averages, CV%, band counts) is advisory only
 * — the server recomputes and persists every value on save. POST shape per the
 * R-08-04 build plan §5.5.
 */
export default function RollWtForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [spellId, setSpellId] = React.useState<number | "">(""); // optional
	const [machineId, setMachineId] = React.useState<number | "">(""); // optional
	const [qualityItemId, setQualityItemId] = React.useState<number | "">(""); // optional
	const [feederName, setFeederName] = React.useState<string>("");
	const [weights, setWeights] = React.useState<string[]>(blankReadings);
	const [mrPcts, setMrPcts] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Std MR% comes from the selected quality (jute_spreader_quality_attr); the
	// server falls back to base 16 when unset. The preview uses the same fallback.
	const selectedQuality = setup.qualities.find((q) => q.item_id === Number(qualityItemId));
	const stdMrPct = selectedQuality?.std_mr_pct;

	// Band edges from the selected machine's wt_per_roll are NOT band edges — the
	// satellite band-edge columns are not exposed in setup, so the preview uses the
	// default 55–75 set; the server applies the real per-machine edges on save.
	const bandEdges = DEFAULT_BAND_EDGES;

	const preview = React.useMemo(
		() => computePreview(weights, mrPcts, stdMrPct, bandEdges),
		[weights, mrPcts, stdMrPct, bandEdges]
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

	// All 10 weights (> 0) and all 10 MR% are required to save a complete reading set.
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
			feeder_name: feederName.trim() === "" ? null : feederName.trim(),
			roll_weights: parsedWeights,
			mr_pcts: parsedMr,
		};

		const parsed = spreaderRollWtSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete all readings.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: SpreaderRollWtSavePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{ data: { spreader_roll_wt_id: number } }>(
			apiRoutesPortalMasters.SPREADER_SQC_ROLL_WT_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const qName = selectedQuality?.item_name ?? (qualityItemId !== "" ? `Quality #${qualityItemId}` : "entry");
		setSnack(`Saved roll-weight entry for ${qName}`);
		// Keep spell/machine/quality/feeder so the inspector can punch the next set
		// quickly; clear only the numeric reading fields.
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
					helperText={
						machineId !== ""
							? `Std roll wt: ${Number(
									setup.machines.find((m) => m.machine_id === Number(machineId))?.wt_per_roll ?? 0
							  ).toFixed(2)}`
							: " "
					}
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
					label="Feeder (optional)"
					value={feederName}
					onChange={(e) => setFeederName(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			{/* 10 paired (weight, MR%) readings */}
			<Typography variant="subtitle2" sx={{ mt: 1 }}>
				Roll weight readings — {ROLL_WT_READINGS} required (weight in kg + MR%)
			</Typography>
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
					<Box key={i} sx={{ display: "flex", gap: 1 }}>
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
					</Box>
				))}
			</Box>

			{/* Live advisory preview (server is authoritative) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Live preview ({preview?.n ?? 0}/{ROLL_WT_READINGS} readings) — advisory only
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
								Stdev Corr
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{preview.stdevCorr != null ? preview.stdevCorr.toFixed(4) : "—"}
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
						<Box sx={{ gridColumn: "1 / -1" }}>
							<Typography variant="caption" color="text.secondary">
								Band counts (corrected)
							</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
								{Object.entries(preview.bandCountsCorr).map(([label, count]) => (
									<Chip
										key={label}
										label={`${label}: ${count}`}
										size="small"
										variant={count > 0 ? "filled" : "outlined"}
										color={count > 0 ? "primary" : "default"}
									/>
								))}
							</Box>
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
