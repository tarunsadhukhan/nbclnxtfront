"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	MenuItem,
	Paper,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	FAULT_COUNT,
	fabricFaultCreateSchema,
	type FabricFaultCreatePayload,
	type FabricFaultSetup,
} from "../types/fabricFaultTypes";
import { pieceTotal } from "../utils/fabricFaultCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: FabricFaultSetup;
	onSaved: () => void;
};

// Fault labels come from the server echo when present, else the locked constant.
const blankCounts = (): string[] => Array(FAULT_COUNT).fill("");

// Blank cell == 0 (0 is the normal value), so parse "" -> 0 here (NOT NaN).
const toCount = (s: string): number => (s.trim() === "" ? 0 : Number(s));

/**
 * R-08-28 Fabric Fault SINGLE inspected-piece entry form.
 *
 * One save = ONE inspected piece (one loom/cloth column): header (entry_date,
 * shift/spell, cloth quality, loom, date_of_weaving, remarks, inspector_name) +
 * the FIXED 15-fault checklist of integer counts (default 0). Live piece_total =
 * sum(15). Submit = ONE POST to create_fabric_fault. The server recomputes
 * piece_total and the day roll-up and is AUTHORITATIVE; this preview is advisory.
 */
export default function FabricFaultForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const faultLabels = setup.fault_types?.length === FAULT_COUNT ? setup.fault_types : [];

	const [spellId, setSpellId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [loomId, setLoomId] = React.useState<number | "">("");
	const [dateOfWeaving, setDateOfWeaving] = React.useState("");
	const [remarks, setRemarks] = React.useState("");
	const [inspector, setInspector] = React.useState("");
	const [counts, setCounts] = React.useState<string[]>(blankCounts);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.qualities)[number]>();
		for (const c of setup.qualities) m.set(c.item_id, c);
		return m;
	}, [setup.qualities]);

	const loomById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.looms)[number]>();
		for (const l of setup.looms) m.set(l.machine_id, l);
		return m;
	}, [setup.looms]);

	const livePieceTotal = pieceTotal(counts.map(toCount));

	const setCountAt = React.useCallback((index: number, value: string) => {
		setCounts((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setLoomId("");
		setCounts(blankCounts());
		// Keep spell, date_of_weaving and inspector so a run of same-shift pieces is fast.
	}, []);

	const handleSave = async () => {
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			spell_id: spellId === "" ? undefined : Number(spellId),
			item_id: itemId === "" ? undefined : Number(itemId),
			loom_id: loomId === "" ? undefined : Number(loomId),
			date_of_weaving: dateOfWeaving.trim() === "" ? undefined : dateOfWeaving,
			// Blank cell -> 0 (0 is the normal value). Each must be an integer >= 0.
			fault_counts: counts.map(toCount),
			remarks: remarks.trim() === "" ? undefined : remarks.trim(),
			inspector_name: inspector.trim() === "" ? undefined : inspector.trim(),
		};

		const parsed = fabricFaultCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please check the fault counts.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: FabricFaultCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; fabric_fault_id: number };
		}>(apiRoutesPortalMasters.FABRIC_FAULT_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved inspected piece");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Inspected piece — one loom/cloth column, {FAULT_COUNT}-fault checklist (counts default 0)
			</Typography>

			{/* Header */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
					gap: 2,
					alignItems: "start",
				}}
			>
				<TextField
					select
					size="small"
					label="Shift (spell)"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
				>
					<MenuItem value="">
						<em>None</em>
					</MenuItem>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_code}
						</MenuItem>
					))}
				</TextField>

				<Autocomplete
					options={setup.qualities}
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
					options={setup.looms}
					getOptionLabel={(opt) =>
						`${opt.machine_name}${opt.mech_code ? ` (${opt.mech_code})` : ""}`
					}
					renderOption={(props, opt) => (
						<li {...props} key={opt.machine_id}>
							{opt.machine_name}
							{opt.mech_code ? ` (${opt.mech_code})` : ""}
						</li>
					)}
					value={loomId === "" ? null : loomById.get(Number(loomId)) ?? null}
					onChange={(_, newVal) => setLoomId(newVal ? newVal.machine_id : "")}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
					size="small"
					renderInput={(params) => <TextField {...params} label="Loom" placeholder="Loom" />}
				/>

				<TextField
					type="date"
					size="small"
					label="Date of weaving"
					value={dateOfWeaving}
					onChange={(e) => setDateOfWeaving(e.target.value)}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					size="small"
					label="Inspector (optional)"
					value={inspector}
					onChange={(e) => setInspector(e.target.value)}
				/>
				<TextField
					size="small"
					label="Remarks (optional)"
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
				/>
			</Box>

			{/* 15-fault checklist */}
			<Typography variant="caption" color="text.secondary">
				Fault checklist (counts) — most are 0
			</Typography>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
					gap: 2,
				}}
			>
				{counts.map((c, i) => (
					<TextField
						key={`fault-${i}`}
						type="number"
						size="small"
						label={faultLabels[i] ?? `Fault ${i + 1}`}
						value={c}
						onChange={(e) => setCountAt(i, e.target.value)}
						inputProps={{ step: 1, min: 0, "aria-label": faultLabels[i] ?? `Fault ${i + 1}` }}
					/>
				))}
			</Box>

			<Box sx={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary" display="block">
						Piece total
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{livePieceTotal}
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
					{saving ? "Saving…" : "Save Piece"}
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
