"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Divider, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { computePreview } from "../utils/qrCv15aCalc";
import { READING_COUNT } from "../types/qrCv15aTypes";
import type { QrCv15aSetup, QrCv15aSavePayloadRow } from "../types/qrCv15aTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: QrCv15aSetup;
	onSaved: () => void;
};

const emptyReadings = (): string[] => Array.from({ length: READING_COUNT }, () => "");

function fmt(value: number | null): string {
	return value != null ? value.toFixed(2) : "";
}

export default function QrCv15aForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [drawingMcId, setDrawingMcId] = React.useState<number | "">("");
	const [spinningMcId, setSpinningMcId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [observedCount, setObservedCount] = React.useState("");
	const [mrPct, setMrPct] = React.useState("");
	const [readings, setReadings] = React.useState<string[]>(emptyReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const obsNum = observedCount === "" ? null : Number(observedCount);
	const preview = React.useMemo(
		() => computePreview(readings, Number.isFinite(obsNum as number) ? obsNum : null),
		[readings, obsNum],
	);

	const setReading = (i: number, value: string) =>
		setReadings((prev) => prev.map((r, idx) => (idx === i ? value : r)));

	const clearReadings = () => setReadings(emptyReadings());

	// Both machines + yarn + a valid obs count required; at least one reading.
	const formInvalid =
		!drawingMcId ||
		!spinningMcId ||
		!yarnItemId ||
		observedCount === "" ||
		!Number.isFinite(Number(observedCount)) ||
		preview.n === 0;

	const handleSave = async () => {
		if (!drawingMcId) return setError("Select the 3rd Drawing machine.");
		if (!spinningMcId) return setError("Select the Spinning Frame machine.");
		if (!yarnItemId) return setError("Select a yarn quality.");
		if (observedCount === "" || !Number.isFinite(Number(observedCount)))
			return setError("Enter a valid Observed Count.");
		if (preview.n === 0) return setError("Enter at least one reading.");

		setSaving(true);
		setError(null);
		const row: QrCv15aSavePayloadRow = {
			drawing_mc_id: Number(drawingMcId),
			mc_id: Number(spinningMcId),
			item_id: Number(yarnItemId),
			observed_count: Number(observedCount),
			mr_pct: mrPct === "" ? null : Number(mrPct),
			readings: readings.map((r) => (r === "" ? null : Number(r))),
		};
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entries: [row],
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.QR_CV_15A_SQC_SAVE,
			"POST",
			body,
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const yName = setup.yarn_items.find((y) => y.item_id === Number(yarnItemId))?.item_name ?? yarnItemId;
		setSnack(`Saved QR/CV (Special) readings for ${yName}`);
		// Keep header selects so the inspector can punch many groups quickly.
		clearReadings();
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Header: two machine selects (both from setup.machines) + yarn + operator-entered obs/MR */}
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
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name} (${m.mech_code})`}
					renderOption={(props, m) => (
						<li {...props} key={m.machine_id}>
							{m.machine_name} ({m.mech_code})
						</li>
					)}
					value={setup.machines.find((m) => m.machine_id === drawingMcId) ?? null}
					onChange={(_, newVal) => setDrawingMcId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="3rd Drawing Machine" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name} (${m.mech_code})`}
					renderOption={(props, m) => (
						<li {...props} key={m.machine_id}>
							{m.machine_name} ({m.mech_code})
						</li>
					)}
					value={setup.machines.find((m) => m.machine_id === spinningMcId) ?? null}
					onChange={(_, newVal) => setSpinningMcId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="Spinning Frame" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<Autocomplete
					options={setup.yarn_items}
					getOptionLabel={(y) => `${y.item_name ?? ""} (${y.item_code ?? ""})`}
					value={setup.yarn_items.find((y) => y.item_id === yarnItemId) ?? null}
					onChange={(_, newVal) => setYarnItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Yarn Quality" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					type="number"
					label="Obs Count (lb)"
					value={observedCount}
					onChange={(e) => setObservedCount(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="MR %"
					value={mrPct}
					onChange={(e) => setMrPct(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
			</Box>

			<Divider />

			{/* Flat 12-cell reading grid */}
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(6, minmax(0, 1fr))",
					},
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={i}
						type="number"
						label={`Reading ${i + 1}`}
						value={r}
						onChange={(e) => setReading(i, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
			</Box>

			<Divider />

			{/* Live preview — server recomputes on save and is authoritative. */}
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(7, minmax(0, 1fr))",
					},
				}}
			>
				<TextField label="Avg B/S" value={fmt(preview.avgBs)} size="small" fullWidth InputProps={{ readOnly: true }} />
				<TextField label="Max" value={fmt(preview.max)} size="small" fullWidth InputProps={{ readOnly: true }} />
				<TextField label="Min" value={fmt(preview.min)} size="small" fullWidth InputProps={{ readOnly: true }} />
				<TextField
					label="Std Dev"
					value={fmt(preview.stdDev)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="sample (n-1)"
				/>
				<TextField
					label="QR %"
					value={fmt(preview.qrPct)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="avg ÷ obs × 100"
				/>
				<TextField
					label="CV %"
					value={fmt(preview.cvPct)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="std ÷ QR% × 100"
				/>
				<TextField
					label="QR % @min"
					value={fmt(preview.qrAtMin)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="min ÷ obs × 100"
				/>
			</Box>

			<Typography variant="caption" color="text.secondary">
				Preview only — the server recomputes avg/max/min/std dev/QR%/CV%/QR%@min on save.
			</Typography>

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
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save"}
				</Button>
			</Box>

			<Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ""} />
		</Box>
	);
}
