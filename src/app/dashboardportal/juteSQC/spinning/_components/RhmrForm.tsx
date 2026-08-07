"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	MenuItem,
	Snackbar,
	TextField,
} from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import type { SqcRhmrSetup, SqcRhmrSavePayload, SqcRhmrSaveResult } from "../types/sqcSpinningTypes";

type Props = {
	coId: string;
	branchId: number;
	setup: SqcRhmrSetup;
	onSaved: () => void;
};

const fmt1 = (v: number | null | undefined) => (v != null ? Number(v).toFixed(1) : "—");

export default function RhmrForm({ coId, branchId, setup, onSaved }: Props) {
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [temperature, setTemperature] = React.useState<string>("");
	const [humidity, setHumidity] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);
	// Existing-row confirm dialog (upsert overwrite gate).
	const [confirmExisting, setConfirmExisting] = React.useState<SqcRhmrSaveResult["existing"] | null>(null);

	const formInvalid = spellId === "" || temperature === "" || humidity === "";

	const spellLabel = React.useMemo(() => {
		const s = setup.spells.find((x) => x.spell_id === Number(spellId));
		return s ? s.spell_code : "";
	}, [setup.spells, spellId]);

	const postSave = React.useCallback(
		async (confirm: boolean): Promise<SqcRhmrSaveResult | null> => {
			const body: SqcRhmrSavePayload = {
				co_id: Number(coId),
				branch_id: Number(branchId),
				entry_date: entryDate,
				spell_id: Number(spellId),
				temperature: temperature === "" ? null : Number(temperature),
				humidity: humidity === "" ? null : Number(humidity),
				confirm,
			};
			const { data, error: err } = await fetchWithCookie<{ data: SqcRhmrSaveResult }>(
				apiRoutesPortalMasters.SPINNING_SQC_RHMR_SAVE,
				"POST",
				body
			);
			if (err) {
				setError(err);
				return null;
			}
			return data?.data ?? null;
		},
		[coId, branchId, entryDate, spellId, temperature, humidity]
	);

	const finishSave = React.useCallback(() => {
		setSnack(`Saved RHMR for ${entryDate} ${spellLabel}`);
		setTemperature("");
		setHumidity("");
		onSaved();
	}, [entryDate, spellLabel, onSaved]);

	const handleSave = async () => {
		if (formInvalid) {
			setError("Pick a spell and enter both Temperature and Humidity.");
			return;
		}
		setSaving(true);
		setError(null);
		const result = await postSave(false);
		setSaving(false);
		if (!result) return;
		if (result.exists) {
			// Existing (date, spell) row — ask before overwriting.
			setConfirmExisting(result.existing ?? null);
			return;
		}
		finishSave();
	};

	const handleConfirmOverwrite = async () => {
		setSaving(true);
		setError(null);
		const result = await postSave(true);
		setSaving(false);
		setConfirmExisting(null);
		if (!result) return;
		finishSave();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
					type="date"
					label="Date"
					value={entryDate}
					onChange={(e) => setEntryDate(e.target.value)}
					size="small"
					fullWidth
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					select
					label="Spell"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_code}
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="number"
					label="Temperature (°C)"
					value={temperature}
					onChange={(e) => setTemperature(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: 0.1 }}
				/>
				<TextField
					type="number"
					label="Humidity (%)"
					value={humidity}
					onChange={(e) => setHumidity(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: 0.1 }}
				/>
			</Box>
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
					{saving ? "Saving…" : "Save"}
				</Button>
			</Box>

			{/* Overwrite confirm — an entry for this date + spell already exists. */}
			<Dialog open={confirmExisting !== null} onClose={() => setConfirmExisting(null)}>
				<DialogTitle>Entry already exists</DialogTitle>
				<DialogContent>
					<DialogContentText component="div">
						An RHMR entry already exists for <b>{entryDate}</b>, spell <b>{spellLabel}</b>:
						<Box sx={{ mt: 1, mb: 1 }}>
							Existing — Temperature: <b>{fmt1(confirmExisting?.temperature)} °C</b>, Humidity:{" "}
							<b>{fmt1(confirmExisting?.humidity)} %</b>
						</Box>
						Overwrite with Temperature <b>{temperature || "—"} °C</b>, Humidity <b>{humidity || "—"} %</b>?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmExisting(null)} disabled={saving}>
						No, keep existing
					</Button>
					<Button variant="contained" onClick={handleConfirmOverwrite} disabled={saving}>
						{saving ? "Saving…" : "Yes, overwrite"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
