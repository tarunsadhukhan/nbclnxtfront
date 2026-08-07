"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	createFilterOptions,
	Snackbar,
	TextField,
} from "@mui/material";
import type { FilterOptionsState } from "@mui/material";
import { Save as SaveIcon, X as CancelIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DoffEntryRow, SpinningSetup } from "../types/spinningTypes";
import { computeNet, computeTare } from "../utils/spinningCalc";
import { useDoffMachinePrevState } from "../hooks/useDoffMachinePrevState";

type Props = {
	coId: string;
	branchId: number;
	setup: SpinningSetup;
	date: string;
	spellId: number | null;
	editingEntry: DoffEntryRow | null;
	onSaved: () => void;
	onCancelEdit: () => void;
};

const NET_MIN = 5;
const NET_MAX = 60;

// Enter accepts the option ONLY when typing narrowed the list to exactly one
// match. `autoHighlight` does the accepting (MUI selects the highlighted =
// first option on Enter); we swallow Enter whenever the filter left 0 or 2+
// options, so multi-match lists behave exactly as before.
// ponytail: props bag, not a wrapper component — the three fields differ too much.
function useEnterOnSingleMatch<T>() {
	const filtered = React.useRef<T[]>([]);
	const filter = React.useMemo(() => createFilterOptions<T>(), []);
	return {
		autoHighlight: true,
		filterOptions: (options: T[], state: FilterOptionsState<T>) => {
			const result = filter(options, state);
			filtered.current = result;
			return result;
		},
		onKeyDown: (event: React.KeyboardEvent & { defaultMuiPrevented?: boolean }) => {
			if (event.key === "Enter" && filtered.current.length !== 1) {
				// MUI v7 checks defaultMuiPrevented (not defaultPrevented) to bail out.
				event.defaultMuiPrevented = true;
			}
		},
	};
}

export default function DoffEntryForm({
	coId,
	branchId,
	setup,
	date,
	spellId,
	editingEntry,
	onSaved,
	onCancelEdit,
}: Props) {
	const editing = editingEntry != null;

	const [machineId, setMachineId] = React.useState<number | "">("");
	const [trollyId, setTrollyId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	// Once the operator flips the Yarn dropdown we stop prefilling from prevState.
	const [itemTouched, setItemTouched] = React.useState(false);
	const [grossWeight, setGrossWeight] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const machine = React.useMemo(
		() => setup.machines.find((m) => m.machine_id === Number(machineId)) ?? null,
		[machineId, setup.machines]
	);
	const trolly = React.useMemo(
		() => setup.trollies.find((t) => t.trolly_id === Number(trollyId)) ?? null,
		[trollyId, setup.trollies]
	);

	const machineEnter = useEnterOnSingleMatch<(typeof setup.machines)[number]>();
	const trollyEnter = useEnterOnSingleMatch<(typeof setup.trollies)[number]>();
	const yarnEnter = useEnterOnSingleMatch<(typeof setup.yarn_items)[number]>();

	const bobbinWeight = machine?.bobbin_weight ?? 0;
	const trollyWeight = trolly?.trolly_weight ?? 0;
	const bucketWeight = trolly?.bucket_weight ?? 0;
	// Spec 7.2: a missing bobbin standard must be visible, not blank — the
	// backend now 400s (B5) on save; surface it before the user weighs.
	const bobbinMissing = machine != null && bobbinWeight <= 0;

	// Populate the form when a grid row is lifted into edit mode.
	React.useEffect(() => {
		if (editingEntry) {
			setMachineId(editingEntry.mc_id);
			setTrollyId(editingEntry.trolly_id);
			setItemId(editingEntry.item_id ?? "");
			setItemTouched(true); // never clobber an existing row's yarn with the prefill
			setGrossWeight(String(editingEntry.gross_weight));
			setError(null);
		}
	}, [editingEntry]);

	const { state: prevState, loading: prevLoading } = useDoffMachinePrevState(
		coId,
		machineId === "" ? null : Number(machineId),
		date,
		spellId,
		trollyId === "" ? null : Number(trollyId)
	);

	// Yarn prefill from the machine's current rule (helper today / mapper as-of
	// for backdated dates) — spec 5.3 FE.
	React.useEffect(() => {
		if (!editing && !itemTouched) {
			setItemId(prevState?.mapped_item_id ?? "");
		}
	}, [prevState, editing, itemTouched]);

	// Reset the touched flag when the machine changes — the prefill should
	// follow the newly selected frame.
	React.useEffect(() => {
		if (!editing) setItemTouched(false);
	}, [machineId, editing]);

	// Spec 7.1: prevState.tare is resolved server-side AS-OF tran_date — it is
	// the tare the save will use. The local compute (as-of-today bobbin hint)
	// is only a fallback while prevState loads.
	const localTare = computeTare(trollyWeight, bucketWeight, bobbinWeight);
	const effectiveTare = prevState != null ? prevState.tare : localTare;
	const computedNet = grossWeight === "" ? 0 : computeNet(Number(grossWeight), effectiveTare);
	const netOutOfRange = grossWeight !== "" && (computedNet < NET_MIN || computedNet > NET_MAX);

	const formInvalid =
		!date ||
		spellId == null ||
		!machineId ||
		!trollyId ||
		grossWeight === "" ||
		Number(grossWeight) <= 0 ||
		netOutOfRange ||
		saving;

	const resetToCreateDefaults = () => {
		setGrossWeight("");
		// Keep machine/trolly/yarn for rapid sequential doff entry.
	};

	const handleSubmit = async () => {
		if (formInvalid) {
			setError(`Please complete all required fields. Net must be between ${NET_MIN} and ${NET_MAX}.`);
			return;
		}
		setSaving(true);
		setError(null);

		if (editing) {
			// D7: send ONLY fields the user actually changed vs the row under edit
			// (mirrors DoffEditDialog) — a no-op save must not trigger the §7.3
			// server-side tare/net recompute.
			const body: Record<string, unknown> = {};
			const grossNum = Number(grossWeight);
			if (grossNum !== editingEntry.gross_weight) body.gross_weight = grossNum;
			if (Number(trollyId) !== editingEntry.trolly_id) body.trolly_id = Number(trollyId);
			if (Object.keys(body).length === 0) {
				setSaving(false);
				setError("No changes to save.");
				return;
			}
			const url = `${apiRoutesPortalMasters.SPINNING_DOFF_EDIT}/${editingEntry.daily_doff_tbl_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			setSaving(false);
			if (err) {
				setError(err);
				return;
			}
			setSnack(`Updated doff #${editingEntry.daily_doff_tbl_id}`);
			onCancelEdit();
			resetToCreateDefaults();
			onSaved();
			return;
		}

		// Only send item_id when the operator overrode the mapped prefill — an
		// untouched prefill must stay a helper/mapper stamp server-side, not
		// get mis-marked 'manual' (manual is protected from sync forever).
		const mappedItemId = prevState?.mapped_item_id ?? null;
		const chosenItemId = itemId === "" ? null : Number(itemId);
		const body: Record<string, unknown> = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			machine_id: Number(machineId),
			trolly_id: Number(trollyId),
			gross_weight: Number(grossWeight),
		};
		if (chosenItemId != null && chosenItemId !== mappedItemId) {
			body.item_id = chosenItemId;
		}
		const { data, error: err } = await fetchWithCookie<{
			data: {
				daily_doff_tbl_id: number;
				net_weight: number;
				tare_weight: number;
				unmapped_machine?: boolean;
			};
		}>(apiRoutesPortalMasters.SPINNING_DOFF_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		if (data?.data?.unmapped_machine) {
			setError(
				"Saved, but this machine has no quality rule — map it in Frame → Quality before processing."
			);
		}
		setSnack(`Saved doff #${data?.data?.daily_doff_tbl_id} (net ${data?.data?.net_weight})`);
		// Keep machine/spell/trolly for rapid entry; clear gross only.
		resetToCreateDefaults();
		onSaved();
	};

	// Keyboard-only entry: Enter commits the field and jumps to the next editable
	// one; Enter on the last one (Gross Weight) saves. An Autocomplete whose list
	// is still ambiguous (2+ matches, see useEnterOnSingleMatch) swallows Enter —
	// MUI never preventDefaults it — so that case must not advance either.
	const gridRef = React.useRef<HTMLDivElement>(null);
	const handleEnterAdvance = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter") return;
		const el = event.target as HTMLElement;
		const popupOpen =
			el.getAttribute("role") === "combobox" && el.getAttribute("aria-expanded") === "true";
		if (popupOpen && !event.defaultPrevented) return;
		const fields = Array.from(
			gridRef.current?.querySelectorAll<HTMLInputElement>(
				"input:not([readonly]):not([disabled])"
			) ?? []
		);
		const idx = fields.indexOf(el as HTMLInputElement);
		if (idx === -1) return;
		const next = fields[idx + 1];
		if (next) {
			next.focus();
			next.select();
			return;
		}
		if (!saving) void handleSubmit();
	};

	const handleCancelEdit = () => {
		onCancelEdit();
		setMachineId("");
		setTrollyId("");
		setItemId("");
		setItemTouched(false);
		setGrossWeight("");
		setError(null);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box
				ref={gridRef}
				onKeyDown={handleEnterAdvance}
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
					renderOption={(props, m) => (
						<li {...props} key={m.machine_id}>
							{m.mech_code} — {m.machine_name}
						</li>
					)}
					renderInput={(params) => <TextField {...params} label="Machine" />}
					{...machineEnter}
				/>
				{/* Weight in the label: a branch can carry duplicate trolly NAMES
				    (dev3 br-2 has two '3'/'8'/'10') — name alone reads like a
				    cross-branch leak, and it keeps the search text unambiguous. */}
				<Autocomplete
					options={setup.trollies}
					getOptionLabel={(t) => `${t.trolly_name} — ${t.trolly_weight} kg`}
					value={trolly}
					onChange={(_, newVal) => setTrollyId(newVal ? newVal.trolly_id : "")}
					size="small"
					fullWidth
					clearOnEscape
					isOptionEqualToValue={(opt, val) => opt.trolly_id === val.trolly_id}
					renderOption={(props, t) => (
						<li {...props} key={t.trolly_id}>
							{t.trolly_name} — {t.trolly_weight} kg
						</li>
					)}
					renderInput={(params) => <TextField {...params} label="Trolly" />}
					{...trollyEnter}
				/>
				<Autocomplete
					options={setup.yarn_items}
					getOptionLabel={(y) => `${y.item_name} (${y.item_code})`}
					value={setup.yarn_items.find((y) => y.item_id === itemId) ?? null}
					onChange={(_, newVal) => {
						setItemTouched(true);
						setItemId(newVal ? newVal.item_id : "");
					}}
					size="small"
					fullWidth
					disabled={editing}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
					renderOption={(props, y) => (
						<li {...props} key={y.item_id}>
							{y.item_name} ({y.item_code})
						</li>
					)}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Yarn"
							helperText={
								!editing && prevState?.mapped_item_id != null && itemId === prevState.mapped_item_id
									? "From the machine's current rule"
									: ""
							}
						/>
					)}
					{...yarnEnter}
				/>
				<TextField
					type="number"
					label="Gross Weight"
					value={grossWeight}
					onChange={(e) => setGrossWeight(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Bobbin Wt"
					value={machine ? String(bobbinWeight) : ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
					error={bobbinMissing}
					helperText={bobbinMissing ? "No bobbin standard for this machine" : ""}
				/>
				<TextField
					label="Tare Weight"
					value={machineId && trollyId ? effectiveTare : ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
					helperText={prevLoading ? "Resolving tare for the entry date…" : ""}
				/>
				<TextField
					label="Net Weight"
					value={grossWeight === "" ? "" : computedNet}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
					error={netOutOfRange}
					helperText={netOutOfRange ? `Net must be ${NET_MIN}–${NET_MAX}` : ""}
				/>
				<TextField
					label="Running Total Net"
					value={prevState ? prevState.running_total_net : ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					label="Next Doff #"
					value={prevState ? prevState.next_doff_no : ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
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
					disabled={formInvalid || prevLoading}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : editing ? "Update" : "Save Doff"}
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
