"use client";

import * as React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
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
import { ChevronDown as ExpandIcon, Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	ADDITIVE_FIELDS,
	ADDITIVE_LABELS,
	type AdditiveField,
	type EmulsionCreatePayload,
	type EmulsionSetup,
	emulsionCreateSchema,
} from "../types/emulsionTypes";
import { oilPctStatus, statusChipColor, theoreticalOilPct } from "../utils/emulsionCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: EmulsionSetup;
	onSaved: () => void;
};

// A blank input becomes NaN (not Number("")===0) so the schema's positive refine
// fires instead of silently sending 0.
const reqNum = (s: string): number => (s.trim() === "" ? NaN : Number(s));
// Optional additive: blank -> undefined (dropped), else the parsed number.
const optNum = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));

/**
 * R-08-02 Emulsion SINGLE flat-row entry form.
 *
 * One save = one date's recipe: header (entry_date, optional spreader machine),
 * the prominent batch fields (oil_used_ltr, tank_capacity_ltr prefilled 1000,
 * MEASURED oil_pct_in_emulsion) and the target band (std_oil_pct_low/high
 * prefilled 16/17, editable, snapshotted at save), plus a COLLAPSED Additives
 * section with the rest of the recipe + prepared_by. A live theoretical oil %
 * (oil/tank*100, reference) and an OK/LOW/HIGH status chip (measured vs band) are
 * shown. Submit = ONE POST to create_emulsion. The server recomputes both derived
 * values and is AUTHORITATIVE; this preview is advisory.
 */
export default function EmulsionForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [mcId, setMcId] = React.useState<number | "">("");
	const [oilUsed, setOilUsed] = React.useState("");
	const [tankCapacity, setTankCapacity] = React.useState(String(setup.default_tank_capacity));
	const [oilPct, setOilPct] = React.useState("");
	const [stdLow, setStdLow] = React.useState(String(setup.default_oil_pct_low));
	const [stdHigh, setStdHigh] = React.useState(String(setup.default_oil_pct_high));
	// Additive + free-text state, keyed by field name.
	const [additives, setAdditives] = React.useState<Record<string, string>>({});
	const [rollsMade, setRollsMade] = React.useState("");
	const [others, setOthers] = React.useState("");
	const [preparedBy, setPreparedBy] = React.useState("");

	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const machineById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.machines)[number]>();
		for (const mc of setup.machines) m.set(mc.machine_id, mc);
		return m;
	}, [setup.machines]);

	// Live preview (advisory; server is authoritative).
	const theoretical = theoreticalOilPct(reqNum(oilUsed), reqNum(tankCapacity));
	const status = oilPctStatus(reqNum(oilPct), reqNum(stdLow), reqNum(stdHigh));

	const setAdditive = React.useCallback((key: AdditiveField, value: string) => {
		setAdditives((prev) => ({ ...prev, [key]: value }));
	}, []);

	const resetForm = React.useCallback(() => {
		setMcId("");
		setOilUsed("");
		setOilPct("");
		setAdditives({});
		setRollsMade("");
		setOthers("");
		setPreparedBy("");
		// Keep tank capacity + the std band so a run of same-recipe days is fast.
	}, []);

	const handleSave = async () => {
		const additivePayload: Partial<Record<AdditiveField, number>> = {};
		for (const f of ADDITIVE_FIELDS) {
			const v = optNum(additives[f] ?? "");
			if (v !== undefined) additivePayload[f] = v;
		}

		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			mc_id: mcId === "" ? undefined : Number(mcId),
			oil_used_ltr: reqNum(oilUsed),
			tank_capacity_ltr: reqNum(tankCapacity),
			oil_pct_in_emulsion: reqNum(oilPct),
			std_oil_pct_low: reqNum(stdLow),
			std_oil_pct_high: reqNum(stdHigh),
			...additivePayload,
			spreader_rolls_made: optNum(rollsMade),
			others: others.trim() === "" ? undefined : others.trim(),
			prepared_by: preparedBy.trim() === "" ? undefined : preparedBy.trim(),
		};

		const parsed = emulsionCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every required field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: EmulsionCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; emulsion_id: number };
		}>(apiRoutesPortalMasters.EMULSION_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved emulsion record");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Emulsion record — one date&apos;s jute-oil batching recipe
			</Typography>

			{/* Header: optional machine */}
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
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
					sx={{ minWidth: 280, flex: "1 1 280px" }}
					renderInput={(params) => (
						<TextField {...params} label="Machine (optional)" placeholder="Spreader machine" />
					)}
				/>
			</Box>

			{/* PROMINENT batch fields */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
					gap: 2,
				}}
			>
				<TextField
					type="number"
					size="small"
					label="Oil used (ltr)"
					value={oilUsed}
					onChange={(e) => setOilUsed(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Oil used (ltr)" }}
				/>
				<TextField
					type="number"
					size="small"
					label="Tank capacity (ltr)"
					value={tankCapacity}
					onChange={(e) => setTankCapacity(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Tank capacity (ltr)" }}
					helperText={`Default ${setup.default_tank_capacity}`}
				/>
				<TextField
					type="number"
					size="small"
					label="Oil % in emulsion (measured)"
					value={oilPct}
					onChange={(e) => setOilPct(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Oil % in emulsion (measured)" }}
				/>
				<TextField
					type="number"
					size="small"
					label="Std oil % low"
					value={stdLow}
					onChange={(e) => setStdLow(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std oil % low" }}
					helperText={`Default ${setup.default_oil_pct_low}`}
				/>
				<TextField
					type="number"
					size="small"
					label="Std oil % high"
					value={stdHigh}
					onChange={(e) => setStdHigh(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std oil % high" }}
					helperText={`Default ${setup.default_oil_pct_high}`}
				/>
			</Box>

			{/* Live derived display */}
			<Box sx={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary" display="block">
						Theoretical oil % (oil/tank, reference)
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{theoretical != null ? theoretical.toFixed(2) : "—"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary" display="block">
						Status (measured vs band)
					</Typography>
					{status != null ? (
						<Chip size="small" label={status} color={statusChipColor(status)} />
					) : (
						<Typography variant="body1" fontWeight={600}>
							—
						</Typography>
					)}
				</Box>
			</Box>

			{/* COLLAPSED additives */}
			<Accordion variant="outlined" disableGutters>
				<AccordionSummary expandIcon={<ExpandIcon size={18} />}>
					<Typography variant="subtitle2">Additives (optional)</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
							gap: 2,
						}}
					>
						{ADDITIVE_FIELDS.map((f) => (
							<TextField
								key={f}
								type="number"
								size="small"
								label={ADDITIVE_LABELS[f]}
								value={additives[f] ?? ""}
								onChange={(e) => setAdditive(f, e.target.value)}
								inputProps={{ step: "any", min: 0, "aria-label": ADDITIVE_LABELS[f] }}
							/>
						))}
						<TextField
							type="number"
							size="small"
							label="Spreader rolls made"
							value={rollsMade}
							onChange={(e) => setRollsMade(e.target.value)}
							inputProps={{ step: 1, min: 0, "aria-label": "Spreader rolls made" }}
						/>
						<TextField
							size="small"
							label="Others"
							value={others}
							onChange={(e) => setOthers(e.target.value)}
							inputProps={{ "aria-label": "Others" }}
							sx={{ gridColumn: { xs: "1 / -1", sm: "span 2" } }}
						/>
						<TextField
							size="small"
							label="Prepared by"
							value={preparedBy}
							onChange={(e) => setPreparedBy(e.target.value)}
							inputProps={{ "aria-label": "Prepared by" }}
							sx={{ gridColumn: { xs: "1 / -1", sm: "span 2" } }}
						/>
					</Box>
				</AccordionDetails>
			</Accordion>

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
					{saving ? "Saving…" : "Save Record"}
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
