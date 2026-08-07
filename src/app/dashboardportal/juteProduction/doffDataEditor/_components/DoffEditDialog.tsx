"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	DoffEntryRow,
	SpinningTrollyOption,
	YarnItemOption,
} from "../../spinning/types/spinningTypes";

// Shape returned by GET doff_editor_setup (spec 5.8). worker_name is the
// server-concatenated label, "E1234 - Ramesh Das" — render it, don't rebuild it.
export type WorkerOption = {
	eb_id: number;
	worker_name: string;
};

type Props = {
	row: DoffEntryRow;
	coId: string;
	yarnItems: YarnItemOption[];
	workers: WorkerOption[];
	trollies: SpinningTrollyOption[];
	onClose: () => void;
	onSaved: () => void;
};

// Audited-correction edit dialog: sends ONLY changed fields so item/eb-only
// edits skip the backend weight recompute (spec 7.3) and stamp *_source='manual'.
export default function DoffEditDialog({
	row,
	coId,
	yarnItems,
	workers,
	trollies,
	onClose,
	onSaved,
}: Props) {
	const [itemId, setItemId] = React.useState<number | null>(row.item_id);
	const [ebId, setEbId] = React.useState<number | null>(row.eb_id);
	const [trollyId, setTrollyId] = React.useState<number>(row.trolly_id);
	const [gross, setGross] = React.useState<string>(String(row.gross_weight ?? ""));
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const handleSave = async () => {
		const payload: Record<string, number> = {};
		if (itemId != null && itemId !== row.item_id) payload.item_id = itemId;
		if (ebId != null && ebId !== row.eb_id) payload.eb_id = ebId;
		// 7.3: gross/trolly go in the payload ONLY when actually changed — an
		// item/operator-only correction must not trigger a tare/net recompute.
		const grossNum = Number(gross);
		if (gross !== "" && Number.isFinite(grossNum) && grossNum !== row.gross_weight) {
			payload.gross_weight = grossNum;
		}
		if (trollyId !== row.trolly_id) payload.trolly_id = trollyId;

		if (Object.keys(payload).length === 0) {
			setError("No changes to save.");
			return;
		}
		setSaving(true);
		setError(null);
		const url = `${apiRoutesPortalMasters.SPINNING_DOFF_EDIT}/${row.daily_doff_tbl_id}?co_id=${coId}`;
		const { error: err } = await fetchWithCookie(url, "PUT", payload);
		setSaving(false);
		if (err) {
			// Shown verbatim — includes the 403 locked-unit message.
			setError(err);
			return;
		}
		onSaved();
	};

	return (
		<Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
			<DialogTitle>
				Edit doff #{row.daily_doff_tbl_id}
				<Typography variant="body2" color="text.secondary">
					{row.mech_code ?? `#${row.mc_id}`} — {row.machine_name ?? ""} · {row.doff_date} ·{" "}
					{row.spell_code}
				</Typography>
			</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
				{error ? <Alert severity="error">{error}</Alert> : null}

				<Autocomplete
					options={yarnItems}
					getOptionLabel={(y) => `${y.item_name} (${y.item_code})`}
					value={yarnItems.find((y) => y.item_id === itemId) ?? null}
					onChange={(_, v) => setItemId(v ? v.item_id : row.item_id)}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
					renderOption={(props, y) => (
						<li {...props} key={y.item_id}>
							{y.item_name} ({y.item_code})
						</li>
					)}
					size="small"
					renderInput={(params) => (
						<TextField
							{...params}
							label="Yarn"
							helperText={itemId !== row.item_id ? "Will be stamped item_source = manual" : undefined}
						/>
					)}
				/>

				<Autocomplete
					options={workers}
					getOptionLabel={(w) => w.worker_name}
					value={workers.find((w) => w.eb_id === ebId) ?? null}
					onChange={(_, v) => setEbId(v ? v.eb_id : row.eb_id)}
					isOptionEqualToValue={(opt, val) => opt.eb_id === val.eb_id}
					renderOption={(props, w) => (
						<li {...props} key={w.eb_id}>
							{w.worker_name}
						</li>
					)}
					size="small"
					renderInput={(params) => (
						<TextField
							{...params}
							label="Operator"
							helperText={ebId !== row.eb_id ? "Will be stamped eb_source = manual" : undefined}
						/>
					)}
				/>

				<TextField
					select
					size="small"
					label="Trolly"
					value={trollyId}
					onChange={(e) => setTrollyId(Number(e.target.value))}
				>
					{trollies.map((t) => (
						<MenuItem key={t.trolly_id} value={t.trolly_id}>
							{t.trolly_name} — {t.trolly_weight} kg
						</MenuItem>
					))}
					{/* Row's trolly may be out of the branch setup list (legacy/import). */}
					{trollies.every((t) => t.trolly_id !== row.trolly_id) ? (
						<MenuItem value={row.trolly_id}>{row.trolly_name ?? `#${row.trolly_id}`}</MenuItem>
					) : null}
				</TextField>

				<TextField
					size="small"
					type="number"
					label="Gross weight (kg)"
					value={gross}
					onChange={(e) => setGross(e.target.value)}
					helperText={`Stored: gross ${row.gross_weight} / tare ${row.tare_weight} / net ${row.net_weight}. Changing gross or trolly recomputes tare + net on the server.`}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button variant="contained" onClick={handleSave} disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
