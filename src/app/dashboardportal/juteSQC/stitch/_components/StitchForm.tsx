"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	Paper,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	STITCH_READINGS,
	DEFAULT_STD_STITCH,
	stitchCreateSchema,
	type StitchCreatePayload,
	type StitchSetup,
} from "../types/stitchTypes";
import { computeStitchPreview, flagChipColor } from "../utils/stitchCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: StitchSetup;
	onSaved: () => void;
};

const blankReadings = (): string[] => Array(STITCH_READINGS).fill("");

/**
 * R-08-22 Stitch SINGLE reading-set entry form.
 *
 * One save = one (date, sewing machine) reading-set: header (entry_date, sewing
 * machine, std_stitch, optional inspector) + EXACTLY 5 stitch counts (stitches/dm).
 * std_stitch prefills 9 (or the server default) and is editable; it is snapshotted
 * at save. A live average + OK/LOW/HIGH flag preview is shown. The server
 * recomputes avg / flag and is AUTHORITATIVE; this preview is advisory.
 */
export default function StitchForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const defaultStd = Number.isFinite(setup.default_std_stitch)
		? setup.default_std_stitch
		: DEFAULT_STD_STITCH;

	const [mcId, setMcId] = React.useState<number | "">("");
	const [stdStitch, setStdStitch] = React.useState<string>(String(defaultStd));
	const [inspectorName, setInspectorName] = React.useState<string>("");
	const [readings, setReadings] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const machineById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.machines)[number]>();
		for (const mc of setup.machines) m.set(mc.machine_id, mc);
		return m;
	}, [setup.machines]);

	const stdStitchNum = stdStitch === "" ? defaultStd : Number(stdStitch);
	const preview = computeStitchPreview(readings, stdStitchNum);

	const setReadingAt = React.useCallback((index: number, value: string) => {
		setReadings((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const resetForm = React.useCallback(() => {
		setMcId("");
		setInspectorName("");
		setReadings(blankReadings());
		// Keep std stitch so a run of same-standard sets is fast.
	}, []);

	const handleSave = async () => {
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			mc_id: mcId === "" ? 0 : Number(mcId),
			std_stitch: stdStitch.trim() === "" ? NaN : Number(stdStitch),
			// Blank reading "" must become NaN (not Number("")===0) so the schema's
			// finite/positive refine flags missing readings instead of silently sending 0.
			readings: readings.map((r) => (r.trim() === "" ? NaN : Number(r))),
			inspector_name: inspectorName.trim() === "" ? undefined : inspectorName.trim(),
		};

		const parsed = stitchCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: StitchCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{ data: { message: string; stitch_id: number } }>(
			apiRoutesPortalMasters.STITCH_CREATE,
			"POST",
			body,
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved stitch reading-set");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Stitch reading-set — {STITCH_READINGS} stitch counts (stitches/dm) for one (date, sewing machine)
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
					gap: 2,
				}}
			>
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
						<TextField {...params} label="Sewing machine" placeholder="Sewing machine" />
					)}
				/>

				<TextField
					type="number"
					size="small"
					label="Std stitch (/dm)"
					value={stdStitch}
					onChange={(e) => setStdStitch(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std stitch" }}
					helperText={`Default: ${defaultStd}`}
					fullWidth
				/>

				<TextField
					size="small"
					label="Inspector (optional)"
					value={inspectorName}
					onChange={(e) => setInspectorName(e.target.value)}
					inputProps={{ "aria-label": "Inspector name" }}
					fullWidth
				/>
			</Box>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" },
					gap: 2,
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={`stitch-${i}`}
						type="number"
						size="small"
						label={`#${i + 1}`}
						value={r}
						onChange={(e) => setReadingAt(i, e.target.value)}
						inputProps={{ step: "any", min: 0, "aria-label": `Stitch count ${i + 1}` }}
					/>
				))}
			</Box>

			<Box sx={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Average (stitches/dm)
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.avg != null ? preview.avg.toFixed(2) : "—"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary" display="block">
						Flag vs std
					</Typography>
					{preview.flag != null ? (
						<Chip size="small" label={preview.flag} color={flagChipColor(preview.flag)} />
					) : (
						<Typography variant="body1" fontWeight={600}>
							—
						</Typography>
					)}
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
