"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Paper,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	CUTTING_LENGTH_READINGS,
	DEFAULT_STD_LENGTH,
	cuttingLengthCreateSchema,
	type CuttingLengthCreatePayload,
	type CuttingLengthSetup,
} from "../types/cuttingLengthTypes";
import { computeCuttingLengthPreview } from "../utils/cuttingLengthCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: CuttingLengthSetup;
	onSaved: () => void;
};

const blankReadings = (): string[] => Array(CUTTING_LENGTH_READINGS).fill("");

/**
 * R-08-20 Cutting Length SINGLE reading-set entry form.
 *
 * One save = one date's reading-set: header (entry_date, optional cloth quality,
 * std_length) + EXACTLY 20 cut-length readings (inches). std_length prefills 78
 * (or the server default) and is editable; it is snapshotted at save. A live
 * avg / sample-stdev / cv% / deviation (avg − std) preview is shown. The server
 * recomputes these (SAMPLE stdev n-1) and is AUTHORITATIVE; this preview is
 * advisory.
 */
export default function CuttingLengthForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const defaultStd = Number.isFinite(setup.default_std_length)
		? setup.default_std_length
		: DEFAULT_STD_LENGTH;

	const [itemId, setItemId] = React.useState<number | "">("");
	const [stdLength, setStdLength] = React.useState<string>(String(defaultStd));
	const [readings, setReadings] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.cloth_qualities)[number]>();
		for (const c of setup.cloth_qualities) m.set(c.item_id, c);
		return m;
	}, [setup.cloth_qualities]);

	const stdLengthNum = stdLength === "" ? defaultStd : Number(stdLength);
	const preview = computeCuttingLengthPreview(readings, stdLengthNum);

	const setReadingAt = React.useCallback((index: number, value: string) => {
		setReadings((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setReadings(blankReadings());
		// Keep std length so a run of same-standard sets is fast.
	}, []);

	const handleSave = async () => {
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			item_id: itemId === "" ? undefined : Number(itemId),
			std_length: stdLength.trim() === "" ? NaN : Number(stdLength),
			// Blank reading "" must become NaN (not Number("")===0) so the schema's
			// finite/positive refine flags missing readings instead of silently sending 0.
			readings: readings.map((r) => (r.trim() === "" ? NaN : Number(r))),
		};

		const parsed = cuttingLengthCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: CuttingLengthCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{ data: { message: string; cutting_length_id: number } }>(
			apiRoutesPortalMasters.CUTTING_LENGTH_CREATE,
			"POST",
			body,
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved cutting-length reading-set");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Cutting-length reading-set — {CUTTING_LENGTH_READINGS} cut-piece lengths (inches) for one date
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
					gap: 2,
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
					renderInput={(params) => (
						<TextField {...params} label="Cloth quality (optional)" placeholder="Cloth quality" />
					)}
				/>

				<TextField
					type="number"
					size="small"
					label="Std length (in)"
					value={stdLength}
					onChange={(e) => setStdLength(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std length" }}
					helperText={`Default: ${defaultStd}`}
					fullWidth
				/>
			</Box>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: {
						xs: "repeat(2, 1fr)",
						sm: "repeat(4, 1fr)",
						md: "repeat(5, 1fr)",
					},
					gap: 1.5,
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={`len-${i}`}
						type="number"
						size="small"
						label={`#${i + 1}`}
						value={r}
						onChange={(e) => setReadingAt(i, e.target.value)}
						inputProps={{ step: "any", min: 0, "aria-label": `Cutting length reading ${i + 1}` }}
					/>
				))}
			</Box>

			<Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Average
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.avg != null ? preview.avg.toFixed(2) : "—"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Std dev (sample)
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.stdev != null ? preview.stdev.toFixed(4) : "—"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						CV %
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.cvPct != null ? preview.cvPct.toFixed(4) : "—"}
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
