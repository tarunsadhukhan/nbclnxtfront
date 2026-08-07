"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	MenuItem,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	QualityMapRow,
	QualityMapSaveResult,
	SpinningSetup,
	YarnItemOption,
} from "../types/spinningTypes";
import { todayISO } from "../utils/spinningCalc";
import DoffSyncButton from "./DoffSyncButton";

type Props = {
	coId: string;
	branchId: number;
	setup: SpinningSetup;
	date: string;
	spellId: number | null;
	// Bumps the SpinningProcessBar refreshKey after mapper save / sync (spec 5.6.1).
	onMutated?: () => void;
};

const RETRO_LABELS: Record<string, string> = {
	fill: "Fill gaps only (doffs without a quality)",
	synced: "Update synced doffs too (keep manual edits)",
	all: "Update ALL doffs incl. manual (Edit level)",
};

// RULE GRID (spec 5.3): one row per spinning machine with its CURRENT rule
// ("Frame X → item Y since 15-Jul A1"). Saving appends mapper log rows,
// updates the helper and retro-stamps doff rows per retro_mode — two-step
// (preview → confirm). Mid-SPELL changes need no rule: flip the Yarn dropdown
// on the doff entry itself.
export default function FrameMapGrid({ coId, branchId, setup, date, spellId, onMutated }: Props) {
	const [rows, setRows] = React.useState<QualityMapRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);
	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPINNING_QUALITY_MAP_GRID}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: { machines: QualityMapRow[]; yarn_items: YarnItemOption[] } }>(
			url,
			"GET"
		).then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setRows([]);
			} else {
				setError(null);
				setRows(data?.data?.machines ?? []);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, version]);

	const [edits, setEdits] = React.useState<Record<number, number | "">>({});
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());
	// "" = start of day (no effective spell); otherwise a spell_id from setup.spells.
	const [effectiveSpellId, setEffectiveSpellId] = React.useState<number | "">("");
	const [retroMode, setRetroMode] = React.useState<string>("fill");
	const [saving, setSaving] = React.useState(false);
	const [preview, setPreview] = React.useState<QualityMapSaveResult | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Seed edit state from the current helper rules.
	React.useEffect(() => {
		const seed: Record<number, number | ""> = {};
		rows.forEach((r) => {
			seed[r.machine_id] = r.item_id ?? "";
		});
		setEdits(seed);
	}, [rows]);

	const isDirty = React.useCallback(
		(machineId: number, current: number | null) => (edits[machineId] ?? "") !== (current ?? ""),
		[edits]
	);

	const dirtyEntries = React.useMemo(
		() =>
			rows
				.filter((r) => isDirty(r.machine_id, r.item_id))
				.map((r) => {
					const q = edits[r.machine_id];
					return q !== undefined && q !== "" ? { mc_id: r.machine_id, item_id: Number(q) } : null;
				})
				.filter((x): x is { mc_id: number; item_id: number } => x !== null),
		[rows, edits, isDirty]
	);

	const postSave = async (confirm: boolean) => {
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entries: dirtyEntries,
			effective_from_date: effectiveDate,
			effective_from_spell_id: effectiveSpellId === "" ? null : effectiveSpellId,
			retro_mode: retroMode,
			confirm,
		};
		return fetchWithCookie<{ data: QualityMapSaveResult }>(
			apiRoutesPortalMasters.SPINNING_QUALITY_MAP_SAVE,
			"POST",
			body
		);
	};

	// Two-step save: confirm:false previews counts (writes nothing) -> dialog ->
	// confirm:true commits mapper + helper + retro in one transaction.
	const handleSave = async () => {
		if (dirtyEntries.length === 0) {
			setSnack("No rule changes to save.");
			return;
		}
		setSaving(true);
		const { data, error: err } = await postSave(false);
		setSaving(false);
		if (err) {
			setSnack(err);
			return;
		}
		setPreview(data?.data ?? null);
	};

	const handleConfirm = async () => {
		setSaving(true);
		const { data, error: err } = await postSave(true);
		setSaving(false);
		setPreview(null);
		if (err) {
			setSnack(err);
			return;
		}
		const d = data?.data;
		setSnack(
			`Saved ${d?.mapper_ids.length ?? 0} rule(s) — ${d?.retro_rows ?? 0} doff(s) restamped` +
				(d?.reprocessed_units.length
					? `, ${d.reprocessed_units.length} processed unit(s) flagged for reprocess.`
					: ".")
		);
		refresh();
		onMutated?.();
	};

	if (spellId == null) {
		return <Alert severity="info">Select a spell to load the frame → quality rules.</Alert>;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Frame → Quality rules</Typography>
				<TextField
					type="date"
					size="small"
					label="Effective Date"
					value={effectiveDate}
					onChange={(e) => setEffectiveDate(e.target.value)}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					select
					size="small"
					label="Effective Spell"
					value={effectiveSpellId}
					onChange={(e) =>
						setEffectiveSpellId(e.target.value === "" ? "" : Number(e.target.value))
					}
					sx={{ minWidth: 150 }}
				>
					<MenuItem value="">
						<em>Start of day</em>
					</MenuItem>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_code}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					size="small"
					label="Retro mode"
					value={retroMode}
					onChange={(e) => setRetroMode(e.target.value)}
					sx={{ minWidth: 260 }}
				>
					{Object.entries(RETRO_LABELS).map(([mode, label]) => (
						<MenuItem key={mode} value={mode}>
							{label}
						</MenuItem>
					))}
				</TextField>
				<Button
					variant="contained"
					size="small"
					startIcon={<SaveIcon size={16} />}
					onClick={handleSave}
					disabled={saving || loading || dirtyEntries.length === 0}
				>
					{saving
						? "Saving…"
						: dirtyEntries.length > 0
							? `Save Rules (${dirtyEntries.length})`
							: "Save Rules"}
				</Button>
				<DoffSyncButton
					coId={coId}
					branchId={branchId}
					date={date}
					spellId={spellId}
					onSynced={() => {
						refresh();
						onMutated?.();
					}}
				/>
			</Box>

			{error ? <Alert severity="error">{error}</Alert> : null}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress />
				</Box>
			) : rows.length === 0 ? (
				<Alert severity="info">No spinning machines found for this branch.</Alert>
			) : (
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<Table size="small" sx={{ minWidth: 640 }}>
						<TableHead>
							<TableRow>
								<TableCell>Mc Code</TableCell>
								<TableCell>Machine</TableCell>
								<TableCell>Yarn (current rule)</TableCell>
								<TableCell>Status</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map((r) => {
								const q = edits[r.machine_id] ?? "";
								const dirty = isDirty(r.machine_id, r.item_id);
								const value = setup.yarn_items.find((y) => y.item_id === q) ?? null;
								return (
									<TableRow
										key={r.machine_id}
										sx={{ bgcolor: dirty ? "rgba(255, 193, 7, 0.12)" : undefined }}
									>
										<TableCell>{r.mech_code}</TableCell>
										<TableCell>{r.machine_name}</TableCell>
										<TableCell>
											<Autocomplete
												options={setup.yarn_items}
												getOptionLabel={(y) => `${y.item_name} (${y.item_code})`}
												value={value}
												onChange={(_, newVal) =>
													setEdits((prev) => ({
														...prev,
														[r.machine_id]: newVal ? newVal.item_id : "",
													}))
												}
												size="small"
												sx={{ minWidth: 220 }}
												isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
												renderOption={(props, y) => (
													<li {...props} key={y.item_id}>
														{y.item_name} ({y.item_code})
													</li>
												)}
												renderInput={(params) => <TextField {...params} label="Yarn" />}
											/>
											{/* Inherited-italics idiom (target map grid): current rule
											    provenance, muted until the user edits the cell. */}
											{!dirty && r.item_id != null && r.effective_from_date ? (
												<Typography
													variant="caption"
													sx={{ fontStyle: "italic", color: "text.disabled", display: "block" }}
												>
													since {r.effective_from_date}
													{r.effective_from_spell_code ? ` ${r.effective_from_spell_code}` : ""}
												</Typography>
											) : null}
										</TableCell>
										<TableCell>
											{dirty ? (
												<Chip size="small" color="warning" variant="outlined" label="Unsaved" />
											) : r.item_id != null ? (
												<Chip size="small" color="success" variant="outlined" label="Mapped" />
											) : (
												<Chip size="small" variant="outlined" label="No rule" />
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Box>
			)}

			<Dialog open={!!preview} onClose={() => setPreview(null)}>
				<DialogTitle>Apply rule change?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Effective {effectiveDate}
						{effectiveSpellId !== ""
							? ` ${setup.spells.find((s) => s.spell_id === effectiveSpellId)?.spell_code ?? effectiveSpellId}`
							: " (start of day)"}{" "}
						—{" "}
						{RETRO_LABELS[retroMode]?.toLowerCase()}. {preview?.retro_rows ?? 0} doff entr
						{(preview?.retro_rows ?? 0) === 1 ? "y" : "ies"} affected,{" "}
						{preview?.reprocessed_units.length ?? 0} processed unit(s) will need reprocess — apply?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPreview(null)}>Cancel</Button>
					<Button variant="contained" onClick={handleConfirm} disabled={saving}>
						{saving ? "Applying…" : "Apply"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={!!snack}
				autoHideDuration={5000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
