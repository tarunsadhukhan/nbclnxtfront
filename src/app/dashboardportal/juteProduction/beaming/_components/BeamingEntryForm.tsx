"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, MenuItem, Snackbar, TextField } from "@mui/material";
import { Save as SaveIcon, X as CancelIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	BeamingEntryCreateBody,
	BeamingEntryEditBody,
	BeamingEntryRow,
	BeamingQualityOption,
	BeamingSetup,
} from "../types/beamingTypes";

type Props = {
	coId: string;
	branchId: number;
	setup: BeamingSetup;
	date: string;
	spell: string;
	editingEntry: BeamingEntryRow | null;
	onSaved: () => void;
	onCancelEdit: () => void;
};

export default function BeamingEntryForm({
	coId,
	branchId,
	setup,
	date,
	spell,
	editingEntry,
	onSaved,
	onCancelEdit,
}: Props) {
	const editing = editingEntry != null;

	const [machineId, setMachineId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [qualityId, setQualityId] = React.useState<number | "">("");
	const [actCuts, setActCuts] = React.useState<string>("");
	const [noOfBeam, setNoOfBeam] = React.useState<string>("");
	// EB No, Std Count and Beam No are intentionally NOT entry fields (removed to
	// avoid confusion). eb_id / beam_no are sent null on create; on edit the server
	// keeps the existing values. rpm_roller / act_speed come from the future Beaming
	// SQC tab (like Spinning SQC), resolved server-side.
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Resolve spell_id from the shared spell_code selector (SPEC §C header).
	const spellId = React.useMemo(
		() => setup.spells.find((s) => s.spell_code === spell)?.spell_id ?? null,
		[spell, setup.spells]
	);

	// Qualities for the chosen item only (SPEC §C.1 — quality must belong to item).
	const qualitiesForItem = React.useMemo<BeamingQualityOption[]>(
		() => setup.qualities.filter((q) => q.item_id === Number(itemId)),
		[itemId, setup.qualities]
	);

	const selectedQuality = React.useMemo(
		() => setup.qualities.find((q) => q.bm_quality_id === Number(qualityId)) ?? null,
		[qualityId, setup.qualities]
	);

	// Populate the form when a grid row is lifted into edit mode.
	React.useEffect(() => {
		if (editingEntry) {
			setMachineId(editingEntry.machine_id);
			setItemId(editingEntry.item_id);
			setQualityId(editingEntry.bm_quality_id);
			setActCuts(String(editingEntry.act_cuts));
			setNoOfBeam(String(editingEntry.no_of_beam));
			setError(null);
		}
	}, [editingEntry]);

	// Reset the quality when the item changes (cascade — the quality must belong
	// to the chosen item). Skip while editing-prefill is in flight.
	React.useEffect(() => {
		if (editing) return;
		setQualityId("");
	}, [itemId, editing]);

	// Default Act Cuts to the std cuts/beam (resolved as-of date) on quality/date
	// change — create mode only; editable so the operator can override. cuts_per_beam
	// is QUALITY-linked, so resolve it by the selected bm_quality (machine is passed
	// when chosen but is not required; the standard resolves without it).
	React.useEffect(() => {
		if (editing) return;
		if (qualityId === "" || !date) return;
		let cancelled = false;
		let url = `${apiRoutesPortalMasters.BEAMING_MACHINE_STANDARDS}?co_id=${coId}&bm_quality_id=${qualityId}&tran_date=${date}`;
		if (machineId !== "") url += `&machine_id=${machineId}`;
		void fetchWithCookie<{ data: { std_cuts_per_beam: number | null } }>(url, "GET").then(
			({ data }) => {
				if (cancelled) return;
				const stdCuts = Number(data?.data?.std_cuts_per_beam ?? 0);
				if (stdCuts > 0) setActCuts(String(Math.round(stdCuts)));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [qualityId, machineId, date, editing, coId]);

	// Ends is shown read-only from the selected quality. All kg / efficiency figures
	// are computed server-side and appear in the day grid after save — the form no
	// longer shows est. previews (they were unreliable until the standard resolved).
	const ends = selectedQuality?.ends ?? 0;

	const formInvalid =
		!date ||
		!spell ||
		spellId == null ||
		!machineId ||
		!itemId ||
		!qualityId ||
		actCuts === "" ||
		Number(actCuts) <= 0 ||
		noOfBeam === "" ||
		Number(noOfBeam) <= 0 ||
		saving;

	const resetToCreateDefaults = () => {
		setActCuts("");
		setNoOfBeam("");
		setQualityId("");
		// Keep machine/item for rapid sequential entry.
	};

	const handleSubmit = async () => {
		if (formInvalid) {
			setError(
				"Please complete all required fields. Act cuts and no. of beams must be > 0; quality must belong to the chosen item."
			);
			return;
		}
		setSaving(true);
		setError(null);

		if (editing) {
			const body: BeamingEntryEditBody = {
				// EB No / Beam No are not entry fields; null keeps the existing values
				// server-side (entry_edit preserves existing when the body sends null).
				eb_id: null,
				beam_no: null,
				act_cuts: Number(actCuts),
				no_of_beam: Number(noOfBeam),
			};
			const url = `${apiRoutesPortalMasters.BEAMING_ENTRY_EDIT}/${editingEntry.beaming_daily_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			setSaving(false);
			if (err) {
				setError(err);
				return;
			}
			setSnack(`Updated beaming entry #${editingEntry.beaming_daily_id}`);
			onCancelEdit();
			resetToCreateDefaults();
			onSaved();
			return;
		}

		const body: BeamingEntryCreateBody = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: Number(spellId),
			machine_id: Number(machineId),
			eb_id: null,
			item_id: Number(itemId),
			bm_quality_id: Number(qualityId),
			beam_no: null,
			act_cuts: Number(actCuts),
			no_of_beam: Number(noOfBeam),
		};
		const { data, error: err } = await fetchWithCookie<{
			data: { beaming_daily_id: number };
		}>(apiRoutesPortalMasters.BEAMING_ENTRY_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved beaming entry #${data?.data?.beaming_daily_id}`);
		resetToCreateDefaults();
		onSaved();
	};

	const handleCancelEdit = () => {
		onCancelEdit();
		setMachineId("");
		setItemId("");
		setQualityId("");
		resetToCreateDefaults();
		setError(null);
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
						md: "repeat(3, minmax(0, 1fr))",
					},
				}}
			>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.mech_code} — ${m.machine_name}`}
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					fullWidth
					disabled={editing}
					clearOnEscape
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
					renderInput={(params) => <TextField {...params} label="Machine" />}
				/>
				<Autocomplete
					options={setup.items}
					getOptionLabel={(it) => `${it.item_code} — ${it.item_name}`}
					value={setup.items.find((it) => it.item_id === itemId) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					size="small"
					fullWidth
					disabled={editing}
					clearOnEscape
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
					renderInput={(params) => <TextField {...params} label="Item (Jute Cloth)" />}
				/>
				<TextField
					select
					label="bm_quality"
					value={qualityId}
					onChange={(e) => setQualityId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
					disabled={editing || !itemId}
					helperText={!itemId ? "Select an item first." : ""}
				>
					{qualitiesForItem.map((q) => (
						<MenuItem key={q.bm_quality_id} value={q.bm_quality_id}>
							{q.bm_quality_code}
							{q.bm_quality_name ? ` (${q.bm_quality_name})` : ""}
							{q.is_composite === 1 ? " — composite" : ""}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Ends"
					value={selectedQuality ? ends : ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					type="number"
					label="No. of Beams"
					value={noOfBeam}
					onChange={(e) => setNoOfBeam(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ min: 0 }}
				/>
				<TextField
					type="number"
					label="Act Cuts/Beam"
					value={actCuts}
					onChange={(e) => setActCuts(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ min: 0 }}
					helperText="Defaults to std cuts/beam — editable"
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
					gap: 1,
					justifyContent: { xs: "stretch", md: "flex-end" },
				}}
			>
				{editing ? (
					<Button
						variant="outlined"
						startIcon={<CancelIcon size={18} />}
						onClick={handleCancelEdit}
						sx={{ minHeight: 44 }}
					>
						Cancel Edit
					</Button>
				) : null}
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSubmit}
					disabled={formInvalid}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : editing ? "Update" : "Save Entry"}
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
