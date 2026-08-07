"use client";

import * as React from "react";
import { Alert, Box, Button, MenuItem, Snackbar, TextField } from "@mui/material";
import { Save as SaveIcon, X as CancelIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DrawingEntryRow, DrawingSetup } from "../types/drawingTypes";
import { computeDiffMeter, computeEff, todayISO } from "../utils/drawingCalc";
import { useMachinePrevState } from "../hooks/useMachinePrevState";

type Props = {
	coId: string;
	branchId: number;
	setup: DrawingSetup;
	editingEntry: DrawingEntryRow | null;
	onSaved: () => void;
	onCancelEdit: () => void;
};

export default function DrawingEntryForm({
	coId,
	branchId,
	setup,
	editingEntry,
	onSaved,
	onCancelEdit,
}: Props) {
	const editing = editingEntry != null;

	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	const [spell, setSpell] = React.useState<string>(setup.spells[0]?.spell_code ?? "");
	const [wrkHours, setWrkHours] = React.useState<string>(
		String(setup.spells[0]?.working_hours ?? "")
	);
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [openMeter, setOpenMeter] = React.useState<string>("0");
	const [closeMeter, setCloseMeter] = React.useState<string>("");
	const [remarks, setRemarks] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const machine = React.useMemo(
		() => setup.machines.find((m) => m.machine_id === Number(machineId)) ?? null,
		[machineId, setup.machines]
	);
	const constMeter = machine?.const_meter ?? 0;
	const wrapLimit = machine?.meter_wrap_limit ?? 10000;

	// Populate the form when a grid row is lifted into edit mode.
	React.useEffect(() => {
		if (editingEntry) {
			setTranDate(editingEntry.tran_date);
			setSpell(editingEntry.spell);
			setWrkHours(String(editingEntry.wrk_hours));
			setMachineId(editingEntry.machine_id);
			setOpenMeter(String(editingEntry.open_meter));
			setCloseMeter(String(editingEntry.close_meter));
			setRemarks(editingEntry.remarks ?? "");
			setError(null);
		}
	}, [editingEntry]);

	// Spell selection drives working hours (still user-editable afterwards).
	const handleSpellChange = (code: string) => {
		setSpell(code);
		const sp = setup.spells.find((s) => s.spell_code === code);
		if (sp) setWrkHours(String(sp.working_hours));
	};

	const { state: prevState, loading: prevLoading } = useMachinePrevState(
		coId,
		machineId === "" ? null : Number(machineId),
		tranDate,
		spell,
		editing ? editingEntry.drawing_entry_id : null
	);

	// Pre-fill open meter from the machine's previous close meter (create mode only —
	// in edit mode the stored open meter must not be overwritten).
	React.useEffect(() => {
		if (!editing && prevState) {
			setOpenMeter(String(prevState.open_meter));
		}
	}, [editing, prevState]);

	const alreadyEntered = !editing && !!prevState?.already_entered;
	const attrMissing = machineId !== "" && prevState != null && !prevState.attr_configured;

	const computedDiff =
		closeMeter === "" ? 0 : computeDiffMeter(Number(openMeter || 0), Number(closeMeter), wrapLimit);
	const computedEff = computeEff(computedDiff, constMeter, Number(wrkHours || 0));

	const formInvalid =
		!tranDate ||
		!spell ||
		!machineId ||
		closeMeter === "" ||
		Number(wrkHours) <= 0 ||
		Number(openMeter) < 0 ||
		computedDiff < 0 ||
		alreadyEntered ||
		attrMissing ||
		saving;

	const resetToCreateDefaults = () => {
		setMachineId("");
		setOpenMeter("0");
		setCloseMeter("");
		setRemarks("");
	};

	const handleSubmit = async () => {
		if (formInvalid) {
			setError("Please complete all required fields.");
			return;
		}
		setSaving(true);
		setError(null);
		if (editing) {
			const body = {
				tran_date: tranDate,
				spell,
				machine_id: Number(machineId),
				open_meter: Number(openMeter),
				close_meter: Number(closeMeter),
				wrk_hours: Number(wrkHours),
				remarks: remarks || null,
			};
			const url = `${apiRoutesPortalMasters.DRAWING_ENTRY_EDIT}/${editingEntry.drawing_entry_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			setSaving(false);
			if (err) {
				setError(err);
				return;
			}
			setSnack(`Updated entry #${editingEntry.drawing_entry_id}`);
			onCancelEdit();
			resetToCreateDefaults();
			onSaved();
			return;
		}
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: tranDate,
			spell,
			machine_id: Number(machineId),
			open_meter: Number(openMeter),
			close_meter: Number(closeMeter),
			wrk_hours: Number(wrkHours),
			remarks: remarks || null,
		};
		const { data, error: err } = await fetchWithCookie<{ data: { drawing_entry_id: number } }>(
			apiRoutesPortalMasters.DRAWING_ENTRY_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved entry #${data?.data?.drawing_entry_id}`);
		// Keep date + spell for rapid sequential entry (legacy reset behaviour).
		resetToCreateDefaults();
		onSaved();
	};

	const handleCancelEdit = () => {
		onCancelEdit();
		setTranDate(todayISO());
		const first = setup.spells[0];
		setSpell(first?.spell_code ?? "");
		setWrkHours(String(first?.working_hours ?? ""));
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
				<TextField
					type="date"
					label="Date"
					value={tranDate}
					onChange={(e) => setTranDate(e.target.value)}
					size="small"
					InputLabelProps={{ shrink: true }}
					fullWidth
				/>
				<TextField
					select
					label="Spell"
					value={spell}
					onChange={(e) => handleSpellChange(e.target.value)}
					size="small"
					fullWidth
				>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_code} value={s.spell_code}>
							{s.spell_code} ({Number(s.working_hours)} hrs)
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="number"
					label="Working Hours"
					value={wrkHours}
					onChange={(e) => setWrkHours(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					select
					label="Machine"
					value={machineId}
					onChange={(e) => setMachineId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.machines.map((m) => (
						<MenuItem key={m.machine_id} value={m.machine_id}>
							{m.mech_code} — {m.machine_name}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Const Meter (m/8h)"
					value={constMeter || ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					type="number"
					label="Open Meter"
					value={openMeter}
					onChange={(e) => setOpenMeter(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					type="number"
					label="Close Meter"
					value={closeMeter}
					onChange={(e) => setCloseMeter(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Diff Meter"
					value={closeMeter === "" ? "" : computedDiff}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
					error={computedDiff < 0}
					helperText={computedDiff < 0 ? "Diff is negative — check meters" : ""}
				/>
				<TextField
					label="Eff (%)"
					value={closeMeter === "" ? "" : computedEff}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					label="Remarks"
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ maxLength: 255 }}
				/>
			</Box>
			{alreadyEntered ? (
				<Alert severity="warning">
					Machine already entered for this date and spell. Pick another machine, or edit the
					existing row from the grid below.
				</Alert>
			) : null}
			{attrMissing ? (
				<Alert severity="warning">
					No drawing attributes configured for this machine — set Const Meter in the Drawing
					Machine Master first.
				</Alert>
			) : null}
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
					disabled={formInvalid || prevLoading}
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
