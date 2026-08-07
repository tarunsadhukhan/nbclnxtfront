"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Divider, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { TPI_READING_COUNT, computeTpiPreview } from "../utils/yarnTpiCalc";
import type { YarnTpiItem, YarnTpiSavePayloadRow, YarnTpiSetup } from "../types/yarnTpiTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: YarnTpiSetup;
	onSaved: () => void;
};

const emptyReadings = (): string[] => Array.from({ length: TPI_READING_COUNT }, () => "");

export default function YarnTpiForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [countLbs, setCountLbs] = React.useState("");
	const [stdTpi, setStdTpi] = React.useState("");
	const [tpValue, setTpValue] = React.useState("");
	const [preparedBy, setPreparedBy] = React.useState("");
	const [readings, setReadings] = React.useState<string[]>(emptyReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const selectedYarn: YarnTpiItem | undefined = setup.yarn_items.find((y) => y.item_id === Number(yarnItemId));

	// Live preview — server recomputes on save and is authoritative.
	const preview = React.useMemo(() => computeTpiPreview(readings), [readings]);
	// std_tpi context: Avg − STD.TPI (only when both available).
	const stdTpiNum = stdTpi === "" ? null : Number(stdTpi);
	const tpiDiff =
		preview.avg_tpi != null && stdTpiNum != null && Number.isFinite(stdTpiNum)
			? Math.round((preview.avg_tpi - stdTpiNum) * 100) / 100
			: null;

	const setReading = (i: number, value: string) =>
		setReadings((prev) => prev.map((r, idx) => (idx === i ? value : r)));

	const clearReadings = () => setReadings(emptyReadings());

	// machine + yarn required; at least one numeric reading.
	const formInvalid = !machineId || !yarnItemId || preview.n === 0;

	const handleSave = async () => {
		if (!yarnItemId) {
			setError("Select a yarn quality.");
			return;
		}
		if (!machineId) {
			setError("Select a spinning frame (machine).");
			return;
		}
		if (preview.n === 0) {
			setError("Enter at least one TPI reading.");
			return;
		}
		setSaving(true);
		setError(null);
		const row: YarnTpiSavePayloadRow = {
			mc_id: Number(machineId),
			item_id: Number(yarnItemId),
			count_lbs: countLbs === "" ? null : Number(countLbs),
			std_tpi: stdTpi === "" ? null : Number(stdTpi),
			tp_value: tpValue === "" ? null : Number(tpValue),
			prepared_by: preparedBy.trim() === "" ? null : preparedBy.trim(),
			// Trailing-blank allowed: send 20 cells, blanks as null.
			readings: readings.map((r) => (r === "" ? null : Number(r))),
		};
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entries: [row],
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.YARN_TPI_SQC_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const yName = selectedYarn?.item_name ?? yarnItemId;
		setSnack(`Saved TPI test for ${yName}`);
		// Keep machine/yarn/header so the inspector can punch many tests quickly.
		clearReadings();
		onSaved();
	};

	const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "");

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Header: Spinning Frame / Yarn quality / Count / STD.TPI / TP / Prepared by */}
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
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
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
					label="Count (lbs)"
					value={countLbs}
					onChange={(e) => setCountLbs(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="STD. TPI"
					value={stdTpi}
					onChange={(e) => setStdTpi(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="TP"
					value={tpValue}
					onChange={(e) => setTpValue(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					label="Prepared by"
					value={preparedBy}
					onChange={(e) => setPreparedBy(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Divider />

			{/* 20-cell TPI reading grid — numeric inputs, trailing-blank allowed. */}
			<Typography variant="subtitle2" color="text.secondary">
				TPI Readings (up to {TPI_READING_COUNT}; trailing blanks allowed)
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(5, minmax(0, 1fr))",
					},
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={i}
						type="number"
						label={`#${i + 1}`}
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
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(6, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					label="Average TPI"
					value={fmt(preview.avg_tpi)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Std Dev"
					value={fmt(preview.std_dev)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="sample (n-1)"
				/>
				<TextField
					label="CV %"
					value={fmt(preview.cv_pct)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="std dev ÷ mean × 100"
				/>
				<TextField
					label="Min"
					value={fmt(preview.min_tpi)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Max"
					value={fmt(preview.max_tpi)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Avg − STD.TPI"
					value={fmt(tpiDiff)}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="deviation from std"
				/>
			</Box>

			<Typography variant="caption" color="text.secondary">
				Preview only ({preview.n} reading{preview.n === 1 ? "" : "s"}) — the server recomputes
				avg/std dev/CV%/min/max on save.
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

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
