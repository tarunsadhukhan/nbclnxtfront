"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	MenuItem,
	Snackbar,
	TextField,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpreaderSetup } from "../types/spreaderTypes";
import { spellFromHour, todayISO, currentHour } from "../utils/shift";
import { useBinState } from "../hooks/useBinState";
import BinStateBanner from "./BinStateBanner";

type Props = {
	coId: string;
	branchId: number;
	setup: SpreaderSetup;
	onSaved: () => void;
};

export default function ProductionEntryForm({ coId, branchId, setup, onSaved }: Props) {
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [entryTime, setEntryTime] = React.useState<number>(currentHour());
	const [spell, setSpell] = React.useState<string>(spellFromHour(currentHour()));
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [binId, setBinId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [trolleyNo, setTrolleyNo] = React.useState<string>("");
	const [noOfRolls, setNoOfRolls] = React.useState<string>("");
	const [remarks, setRemarks] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const wtPerRoll = React.useMemo(() => {
		if (!machineId) return 0;
		return setup.machines.find((m) => m.machine_id === Number(machineId))?.wt_per_roll ?? 0;
	}, [machineId, setup.machines]);

	const { state: binState, loading: stateLoading } = useBinState(
		coId,
		binId === "" ? null : Number(binId),
		entryDate,
		Number(entryTime)
	);

	const lockedItemName = React.useMemo(() => {
		if (!binState?.locked_item_id) return null;
		return setup.items.find((i) => i.item_id === binState.locked_item_id)?.item_name ?? null;
	}, [binState, setup.items]);

	// If bin has an open group locked to an item, force item_id to that value.
	React.useEffect(() => {
		if (binState?.locked_item_id) {
			setItemId(binState.locked_item_id);
		}
	}, [binState?.locked_item_id]);

	// Update spell automatically when entry_time changes (unless user has overridden it manually).
	React.useEffect(() => {
		setSpell(spellFromHour(Number(entryTime)));
	}, [entryTime]);

	const windowAllowed = binState?.window ? binState.window.allowed : true;
	const formInvalid =
		!machineId ||
		!binId ||
		!itemId ||
		!noOfRolls ||
		Number(noOfRolls) <= 0 ||
		!wtPerRoll ||
		!windowAllowed;

	const handleSubmit = async () => {
		if (formInvalid) {
			setError("Please complete all required fields.");
			return;
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entry_time: Number(entryTime),
			spell,
			machine_id: Number(machineId),
			item_id: Number(itemId),
			bin_id: Number(binId),
			trolley_no: trolleyNo ? Number(trolleyNo) : null,
			no_of_rolls: Number(noOfRolls),
			wt_per_roll: Number(wtPerRoll),
			remarks: remarks || null,
		};
		const { data, error: err } = await fetchWithCookie<{ data: { spreader_prod_entry_id: number; entry_id_grp: number } }>(
			apiRoutesPortalMasters.SPREADER_ENTRY_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved entry #${data?.data?.spreader_prod_entry_id} (group ${data?.data?.entry_id_grp})`);
		setNoOfRolls("");
		setTrolleyNo("");
		setRemarks("");
		onSaved();
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
					label="Entry Date"
					value={entryDate}
					onChange={(e) => setEntryDate(e.target.value)}
					size="small"
					InputLabelProps={{ shrink: true }}
					fullWidth
				/>
				<TextField
					type="number"
					label="Entry Hour (0-23)"
					value={entryTime}
					onChange={(e) =>
						setEntryTime(Math.max(0, Math.min(23, Number(e.target.value || 0))))
					}
					size="small"
					fullWidth
				/>
				<TextField
					select
					label="Spell"
					value={spell}
					onChange={(e) => setSpell(e.target.value)}
					size="small"
					fullWidth
				>
					{setup.spells.map((s) => (
						<MenuItem key={s.code} value={s.code}>
							{s.label}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Spreader"
					value={machineId}
					onChange={(e) => setMachineId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.machines.map((m) => (
						<MenuItem key={m.machine_id} value={m.machine_id}>
							{m.machine_name} ({m.mech_code}) — {m.wt_per_roll} kg
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Wt per Roll (kg)"
					value={wtPerRoll || ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					select
					label="Bin"
					value={binId}
					onChange={(e) => setBinId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.bins.map((b) => (
						<MenuItem key={b.bin_id} value={b.bin_id}>
							{b.bin_code}
							{b.bin_no != null ? ` (#${b.bin_no})` : ""}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Item (jute / jute waste)"
					value={itemId}
					onChange={(e) => setItemId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
					disabled={!!binState?.locked_item_id}
					helperText={binState?.locked_item_id ? "Locked by open group" : ""}
				>
					{setup.items.map((it) => (
						<MenuItem key={it.item_id} value={it.item_id}>
							{it.item_name}
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="number"
					label="No. of Rolls"
					value={noOfRolls}
					onChange={(e) => setNoOfRolls(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					type="number"
					label="Trolley No"
					value={trolleyNo}
					onChange={(e) => setTrolleyNo(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Remarks"
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>
			<BinStateBanner state={binState} itemName={lockedItemName} loading={stateLoading} />
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
					onClick={handleSubmit}
					disabled={formInvalid || saving}
					fullWidth={false}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Entry"}
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
