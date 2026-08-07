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
	Typography,
} from "@mui/material";
import { Save as SaveIcon, Plus as PlusIcon, X as RemoveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	BEAM_MR_DEFAULT_READINGS,
	DEFAULT_QUALITY_GROUP,
	QUALITY_GROUPS,
	beamMrCreateSchema,
	type BeamMrCreatePayload,
	type BeamMrSetup,
	type QualityGroup,
} from "../types/beamMrTypes";
import { computeBeamMrPreview, stdMrForGroup } from "../utils/beamMrCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BeamMrSetup;
	onSaved: () => void;
};

const blankReadings = (): string[] => Array(BEAM_MR_DEFAULT_READINGS).fill("");

/**
 * R-08-18 Beam MR% SINGLE reading-set entry form.
 *
 * One save = one (date, quality_group, beam machine, spell, cloth quality)
 * reading-set with ONE OR MORE MR% readings — the inspector adds/removes reading
 * inputs freely (min 1). Std MR% auto-prefills from
 * std_mr_by_group[quality_group] and is editable; it is snapshotted at save. A
 * live average + deviation (avg − std) preview is shown. The server recomputes
 * avg_mr / deviation and is AUTHORITATIVE; this preview is advisory.
 */
export default function BeamMrForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [qualityGroup, setQualityGroup] = React.useState<QualityGroup>(DEFAULT_QUALITY_GROUP);
	const [itemId, setItemId] = React.useState<number | "">("");
	const [mcId, setMcId] = React.useState<number | "">("");
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [stdMr, setStdMr] = React.useState<string>("");
	// Track whether the user has hand-edited std MR so the group auto-prefill does
	// not clobber a manual value.
	const [stdMrTouched, setStdMrTouched] = React.useState(false);
	const [readings, setReadings] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Auto-prefill std MR% from the group default whenever the group changes and
	// the user has not hand-edited it.
	React.useEffect(() => {
		if (!stdMrTouched) {
			setStdMr(String(stdMrForGroup(qualityGroup, setup.std_mr_by_group)));
		}
	}, [qualityGroup, setup.std_mr_by_group, stdMrTouched]);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.cloth_qualities)[number]>();
		for (const c of setup.cloth_qualities) m.set(c.item_id, c);
		return m;
	}, [setup.cloth_qualities]);

	const machineById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.machines)[number]>();
		for (const mc of setup.machines) m.set(mc.machine_id, mc);
		return m;
	}, [setup.machines]);

	const stdMrNum = stdMr === "" ? stdMrForGroup(qualityGroup, setup.std_mr_by_group) : Number(stdMr);
	const preview = computeBeamMrPreview(readings, stdMrNum);

	const setReadingAt = React.useCallback((index: number, value: string) => {
		setReadings((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const addReading = React.useCallback(() => {
		setReadings((prev) => [...prev, ""]);
	}, []);

	const removeReadingAt = React.useCallback((index: number) => {
		// Keep at least one reading input.
		setReadings((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setMcId("");
		setSpellId("");
		setReadings(blankReadings());
		// Keep quality group + std MR so a run of same-group sets is fast.
	}, []);

	const handleSave = async () => {
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			quality_group: qualityGroup,
			spell_id: spellId === "" ? 0 : Number(spellId),
			item_id: itemId === "" ? 0 : Number(itemId),
			mc_id: mcId === "" ? 0 : Number(mcId),
			// Blank reading "" must become NaN (not Number("")===0) so the schema's
			// finite/positive refine flags missing readings instead of silently sending 0.
			readings: readings.map((r) => (r.trim() === "" ? NaN : Number(r))),
			std_mr_pct: stdMr === "" ? undefined : Number(stdMr),
		};

		const parsed = beamMrCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: BeamMrCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{ data: { message: string; beam_mr_id: number } }>(
			apiRoutesPortalMasters.BEAM_MR_CREATE,
			"POST",
			body,
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved beam MR% reading-set");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Beam MR% reading-set — one or more MR% readings for one (quality, beam machine, spell)
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
					gap: 2,
				}}
			>
				<TextField
					select
					size="small"
					label="Quality group"
					value={qualityGroup}
					onChange={(e) => setQualityGroup(e.target.value as QualityGroup)}
					fullWidth
				>
					{QUALITY_GROUPS.map((g) => (
						<MenuItem key={g} value={g}>
							{g}
						</MenuItem>
					))}
				</TextField>

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
					renderInput={(params) => (
						<TextField {...params} label="Cloth quality" placeholder="Cloth quality" />
					)}
				/>

				<Autocomplete
					options={setup.machines}
					getOptionLabel={(opt) =>
						`${opt.machine_name}${opt.mech_code ? ` (${opt.mech_code})` : ""}`
					}
					renderOption={(props, opt) => (
						<li {...props} key={opt.machine_id}>
							{opt.machine_name}
							{opt.mech_code ? ` (${opt.mech_code})` : ""}
						</li>
					)}
					value={mcId === "" ? null : machineById.get(Number(mcId)) ?? null}
					onChange={(_, newVal) => setMcId(newVal ? newVal.machine_id : "")}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
					size="small"
					renderInput={(params) => (
						<TextField {...params} label="Beam machine" placeholder="Beam machine" />
					)}
				/>

				<TextField
					select
					size="small"
					label="Spell"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
					fullWidth
				>
					<MenuItem value="">
						<em>None</em>
					</MenuItem>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_code} — {s.spell_name}
						</MenuItem>
					))}
				</TextField>

				<TextField
					type="number"
					size="small"
					label="Std MR%"
					value={stdMr}
					onChange={(e) => {
						setStdMrTouched(true);
						setStdMr(e.target.value);
					}}
					inputProps={{ step: "any", min: 0, "aria-label": "Std MR%" }}
					helperText={`Default for ${qualityGroup}: ${stdMrForGroup(qualityGroup, setup.std_mr_by_group)}`}
					fullWidth
				/>
			</Box>

			<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" },
						gap: 2,
					}}
				>
					{readings.map((r, i) => (
						<Box key={`mr-${i}`} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
							<TextField
								type="number"
								size="small"
								label={`MR% ${i + 1}`}
								value={r}
								onChange={(e) => setReadingAt(i, e.target.value)}
								inputProps={{ step: "any", min: 0, "aria-label": `MR% reading ${i + 1}` }}
								fullWidth
							/>
							<IconButton
								size="small"
								color="error"
								onClick={() => removeReadingAt(i)}
								disabled={readings.length <= 1}
								aria-label={`Remove MR% reading ${i + 1}`}
							>
								<RemoveIcon size={16} />
							</IconButton>
						</Box>
					))}
				</Box>
				<Box>
					<Button size="small" startIcon={<PlusIcon size={16} />} onClick={addReading}>
						Add reading
					</Button>
				</Box>
			</Box>

			<Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Average MR%
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.avgMr != null ? preview.avgMr.toFixed(2) : "—"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Deviation (avg − std)
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.deviation != null ? preview.deviation.toFixed(2) : "—"}
					</Typography>
				</Box>
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
					{saving ? "Saving…" : "Save Reading-Set"}
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
