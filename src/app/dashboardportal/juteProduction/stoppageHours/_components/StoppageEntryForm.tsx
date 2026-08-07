"use client";

import * as React from "react";
import { Alert, Box, Button, MenuItem, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon, X as CancelIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { StoppageEntryRow, StoppageSetup } from "../types/stoppageTypes";
import { STOPPAGE_REASON_LABELS, type StoppageReasonCode } from "../types/stoppageTypes";
import { isStoppageHoursValid, netRunningHours, todayISO } from "../utils/stoppageCalc";

type Props = {
	coId: string;
	branchId: number;
	setup: StoppageSetup;
	editingEntry: StoppageEntryRow | null;
	onSaved: () => void;
	onCancelEdit: () => void;
};

export default function StoppageEntryForm({
	coId,
	branchId,
	setup,
	editingEntry,
	onSaved,
	onCancelEdit,
}: Props) {
	const editing = editingEntry != null;

	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	const [spellId, setSpellId] = React.useState<number | "">(setup.spells[0]?.spell_id ?? "");
	const [deptId, setDeptId] = React.useState<number | "">("");
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [hours, setHours] = React.useState<string>("");
	const [reasonCode, setReasonCode] = React.useState<string>("");
	const [remarks, setRemarks] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Distinct departments derived from the machine setup list (SPEC §3.2).
	const depts = React.useMemo(() => {
		const m = new Map<number, string>();
		setup.machines.forEach((x) => {
			if (x.dept_id && x.dept_name) m.set(x.dept_id, x.dept_name);
		});
		return Array.from(m, ([id, name]) => ({ id, name }));
	}, [setup.machines]);

	// Machine dropdown filtered to the selected department (SPEC §3.2).
	const machinesForDept = React.useMemo(
		() => (deptId === "" ? [] : setup.machines.filter((x) => x.dept_id === Number(deptId))),
		[deptId, setup.machines]
	);

	// Selected spell's working_hours drives validation + the net-running-hours hint (SPEC §3.3).
	const workingHours = React.useMemo(
		() => setup.spells.find((s) => s.spell_id === Number(spellId))?.working_hours ?? 0,
		[spellId, setup.spells]
	);

	// Lift a grid row into edit mode. The machine's department is recovered from the
	// setup list so the cascade dropdowns are populated correctly.
	React.useEffect(() => {
		if (editingEntry) {
			setTranDate(editingEntry.tran_date);
			setSpellId(editingEntry.spell_id);
			const machine = setup.machines.find((m) => m.machine_id === editingEntry.machine_id);
			setDeptId(machine?.dept_id ?? editingEntry.dept_id ?? "");
			setMachineId(editingEntry.machine_id);
			setHours(String(editingEntry.stoppage_hours));
			setReasonCode(editingEntry.reason_code);
			setRemarks(editingEntry.remarks ?? "");
			setError(null);
		}
	}, [editingEntry, setup.machines]);

	const enteredHours = Number(hours || 0);
	const hoursValid = isStoppageHoursValid(enteredHours, workingHours);
	const netHours = netRunningHours(workingHours, enteredHours);

	const formInvalid =
		!tranDate ||
		spellId === "" ||
		deptId === "" ||
		machineId === "" ||
		!hoursValid ||
		!reasonCode ||
		saving;

	const resetToCreateDefaults = () => {
		setDeptId("");
		setMachineId("");
		setHours("");
		setReasonCode("");
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
				co_id: Number(coId),
				spell_id: Number(spellId),
				stoppage_hours: enteredHours,
				reason_code: reasonCode,
				remarks: remarks || null,
			};
			const url = `${apiRoutesPortalMasters.STOPPAGE_ENTRY_EDIT}/${editingEntry.stoppage_hours_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			setSaving(false);
			if (err) {
				setError(err);
				return;
			}
			setSnack(`Updated entry #${editingEntry.stoppage_hours_id}`);
			onCancelEdit();
			resetToCreateDefaults();
			onSaved();
			return;
		}
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: tranDate,
			spell_id: Number(spellId),
			machine_id: Number(machineId),
			stoppage_hours: enteredHours,
			reason_code: reasonCode,
			remarks: remarks || null,
		};
		const { data, error: err } = await fetchWithCookie<{ data: { stoppage_hours_id: number } }>(
			apiRoutesPortalMasters.STOPPAGE_ENTRY_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved entry #${data?.data?.stoppage_hours_id}`);
		// Keep date + spell for rapid sequential entry.
		resetToCreateDefaults();
		onSaved();
	};

	const handleCancelEdit = () => {
		onCancelEdit();
		setTranDate(todayISO());
		setSpellId(setup.spells[0]?.spell_id ?? "");
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
					disabled={editing}
					fullWidth
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
							{s.spell_code} — {s.spell_name}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Department"
					value={deptId}
					onChange={(e) => {
						setDeptId(e.target.value === "" ? "" : Number(e.target.value));
						setMachineId("");
					}}
					size="small"
					disabled={editing}
					fullWidth
					helperText="Filter only — not saved"
				>
					{depts.map((d) => (
						<MenuItem key={d.id} value={d.id}>
							{d.name}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Machine"
					value={machineId}
					onChange={(e) => setMachineId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					disabled={editing || deptId === ""}
					fullWidth
				>
					{machinesForDept.map((m) => (
						<MenuItem key={m.machine_id} value={m.machine_id}>
							{m.mech_code} — {m.machine_name}
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="number"
					label="Hours"
					value={hours}
					onChange={(e) => setHours(e.target.value)}
					size="small"
					inputProps={{ step: 0.25, min: 0 }}
					fullWidth
					error={hours !== "" && !hoursValid}
					helperText={
						hours !== "" && !hoursValid
							? workingHours > 0
								? `Must be > 0 and ≤ ${Number(workingHours)} (spell working hours)`
								: "Select a spell first"
							: workingHours > 0
								? `Net running hours: ${netHours} of ${Number(workingHours)}`
								: ""
					}
				/>
				<TextField
					select
					label="Reason"
					value={reasonCode}
					onChange={(e) => setReasonCode(e.target.value)}
					size="small"
					fullWidth
				>
					{(setup.reasons.length > 0
						? setup.reasons
						: (Object.keys(STOPPAGE_REASON_LABELS) as StoppageReasonCode[]).map((code) => ({
								code,
								label: STOPPAGE_REASON_LABELS[code],
							}))
					).map((r) => (
						<MenuItem key={r.code} value={r.code}>
							{STOPPAGE_REASON_LABELS[r.code as StoppageReasonCode] ?? r.label}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Remarks"
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ maxLength: 255 }}
				/>
			</Box>
			{workingHours > 0 ? (
				<Typography variant="body2" color="text.secondary">
					Net running hours (planned − entered): <strong>{netHours}</strong> of{" "}
					{Number(workingHours)} planned spell hours.
				</Typography>
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
