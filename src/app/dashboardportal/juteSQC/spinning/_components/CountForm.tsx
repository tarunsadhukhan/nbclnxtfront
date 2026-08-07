"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, MenuItem, Snackbar, TextField } from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { observedCount, correctedCount } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import type { SqcCountSetup, SqcCountSavePayloadRow } from "../types/sqcSpinningTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: SqcCountSetup;
	onSaved: () => void;
};

export default function CountForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [spellId, setSpellId] = React.useState<number | "">(""); // optional
	const [machineId, setMachineId] = React.useState<number | "">(""); // optional
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [dp, setDp] = React.useState<string>("");
	const [tp, setTp] = React.useState<string>("");
	const [wt450, setWt450] = React.useState<string>("");
	const [mrPct, setMrPct] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Std MR% comes from the selected yarn item (jute_yarn_mst.std_mr_pct).
	const selectedItem = setup.yarn_items.find((y) => y.item_id === Number(yarnItemId));
	const stdMrPct = selectedItem?.std_mr_pct;

	// Live preview (server recomputes on save and is authoritative).
	const observed = wt450 !== "" && Number(wt450) > 0 ? observedCount(Number(wt450)) : null;
	const corrected =
		observed != null && mrPct !== "" && stdMrPct != null
			? correctedCount(observed, Number(mrPct), Number(stdMrPct))
			: null;

	// Yarn + WT/450 + MR% are required (they drive the calc); spell/machine/DP/TP optional.
	const formInvalid = !yarnItemId || wt450 === "" || Number(wt450) <= 0 || mrPct === "";

	// "Add reading" appends a new observation row (multi-observation, NOT upsert).
	const handleAddReading = async () => {
		if (formInvalid) {
			setError("Select a yarn and enter WT/450 (> 0) and MR%.");
			return;
		}
		if (stdMrPct == null) {
			setError("Selected yarn has no Std MR% set. Add it on the Yarn master first.");
			return;
		}
		setSaving(true);
		setError(null);
		const reading: SqcCountSavePayloadRow = {
			spell_id: spellId === "" ? null : Number(spellId),
			mc_id: machineId === "" ? null : Number(machineId),
			item_id: Number(yarnItemId),
			dp: dp === "" ? null : Number(dp),
			tp: tp === "" ? null : Number(tp),
			wt_450_gms: Number(wt450),
			mr_pct: Number(mrPct),
			observed_count: observed,
			corrected_count: corrected,
		};
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entries: [reading],
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.SPINNING_SQC_COUNT_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const yName = selectedItem?.item_name ?? yarnItemId;
		setSnack(`Added reading (count ${observed ?? "—"}) for ${yName}`);
		// Keep spell/machine/yarn so the inspector can punch many readings quickly.
		setDp("");
		setTp("");
		setWt450("");
		setMrPct("");
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
					select
					label="Spell (optional)"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					<MenuItem value="">
						<em>None</em>
					</MenuItem>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_name} ({s.spell_code})
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name} (${m.mech_code})`}
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="Machine (MC No.)" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<Autocomplete
					options={setup.yarn_items}
					getOptionLabel={(y) => `${y.item_name} (${y.item_code})`}
					value={setup.yarn_items.find((y) => y.item_id === yarnItemId) ?? null}
					onChange={(_, newVal) => setYarnItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => (
						<TextField
							{...params}
							label="Yarn"
							helperText={
								yarnItemId !== ""
									? stdMrPct != null
										? `Std MR%: ${Number(stdMrPct).toFixed(2)}`
										: "No Std MR% set for this yarn"
									: " "
							}
						/>
					)}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					type="number"
					label="DP"
					value={dp}
					onChange={(e) => setDp(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="TP"
					value={tp}
					onChange={(e) => setTp(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="WT /450 YDS (gms)"
					value={wt450}
					onChange={(e) => setWt450(e.target.value)}
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
				<TextField
					label="Observed Count"
					value={observed != null ? observed.toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="WT/450 ÷ 450 × (14400/454)"
				/>
				<TextField
					label="Corrected Count"
					value={corrected != null ? corrected.toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="Observed ÷ (100+MR%) × (100+Std MR%)"
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
					onClick={handleAddReading}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Adding…" : "Add Reading"}
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
