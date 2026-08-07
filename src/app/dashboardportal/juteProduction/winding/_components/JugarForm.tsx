"use client";

import * as React from "react";
import { Alert, Box, Button, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingJugarSetup, WindingJugarSide } from "../types/windingTypes";
import { useJugarState } from "../hooks/useJugarState";
import { useQualityByDate } from "../hooks/useQualityByDate";
import { JUGAR_MIN, JUGAR_MAX } from "../utils/windingCalc";

type Props = {
	coId: string;
	branchId: number;
	setup: WindingJugarSetup;
	date: string;
	spellId: number | null;
	onSaved: () => void;
};

// Spindle leftover weight at BOTH ends of the spell, per winder. There is no
// Opening/Closing selector any more: the two weights are one entry with two
// fields. Each is prefilled — from the row already stored if there is one, else
// carried from the previous spell's closing (spell sequence, so A -> B -> C
// within a day and wrapping to the last spell of an earlier date) — and a save
// posts both back, so an untouched carried opening is persisted rather than
// silently counting as 0 in the reconciliation.
//
// The winder is picked the same way as on the doff form — yarn quality first,
// then the EB nos mapped to it in this date+spell's person -> quality map. Stays
// SINGLE-select: a jugar weight is one person's leftover, and both the prefill
// and the upsert are per-person lookups that have no meaning for a set.
export default function JugarForm({ coId, branchId, setup, date, spellId, onSaved }: Props) {
	const [ebId, setEbId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [opening, setOpening] = React.useState<string>("");
	const [closing, setClosing] = React.useState<string>("");
	// Per-field: has the user typed since the last lookup? A dirty field is never
	// overwritten by the prefill — manual entry beats the carry-forward.
	const [dirty, setDirty] = React.useState({ opening: false, closing: false });
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const { state, refresh: refreshState } = useJugarState(
		coId,
		ebId === "" ? null : Number(ebId),
		date,
		spellId,
		branchId,
	);

	// The person -> quality map for this date + spell (Quality tab) drives both
	// pickers — there is no free worker list here either.
	const { rows: qualityRows } = useQualityByDate(coId, date, branchId, spellId);

	// Distinct qualities on the map (item_code comes off the row).
	const qualityOpts = React.useMemo(() => {
		const seen = new Map<number, string>();
		qualityRows.forEach((r) => {
			if (r.item_id == null || seen.has(r.item_id)) return;
			seen.set(r.item_id, r.item_code ?? String(r.item_id));
		});
		return Array.from(seen, ([item_id, label]) => ({ item_id, label }));
	}, [qualityRows]);

	// Winders mapped to the chosen quality, deduped, sorted by name then EB no.
	const ebOpts = React.useMemo(() => {
		if (yarnItemId === "") return [];
		const seen = new Set<number>();
		return qualityRows
			.filter((r) => {
				if (r.item_id !== Number(yarnItemId) || r.eb_id == null || seen.has(r.eb_id)) return false;
				seen.add(r.eb_id);
				return true;
			})
			.sort(
				(a, b) =>
					(a.worker_name ?? "").localeCompare(b.worker_name ?? "") ||
					(a.emp_code ?? String(a.eb_id)).localeCompare(b.emp_code ?? String(b.eb_id)),
			);
	}, [qualityRows, yarnItemId]);

	// A different quality means a different set of winders — drop the old pick.
	const handlePickQuality = (itemId: number) => {
		setYarnItemId(itemId);
		setEbId("");
	};

	// Mill-floor tablet: compact but >= 40px tall so it stays thumb-hittable.
	const pickSx = { minHeight: 40, px: 1.5, textTransform: "none" as const };

	// New lookup context -> nothing is user-typed any more.
	React.useEffect(() => {
		setDirty({ opening: false, closing: false });
	}, [ebId, date, spellId]);

	// Prefill both fields; a dirty field keeps whatever the user typed.
	React.useEffect(() => {
		if (!state) return;
		// Blank ONLY when the server found nothing — a stored opening of 0 is a real
		// value and must render as "0", or it would never be posted back.
		const asText = (s: WindingJugarSide) => (s.source === "none" ? "" : String(s.weight));
		setOpening((prev) => (dirty.opening ? prev : asText(state.opening)));
		setClosing((prev) => (dirty.closing ? prev : asText(state.closing)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state]);

	const num = (s: string) => (s === "" ? null : Number(s));
	// Opening may be exactly 0 — a winder can start a spell with an empty spindle,
	// and a forced positive number would invent carryover that is not there.
	// Closing has no such case: "nothing left" is expressed by leaving it blank.
	const inRange = (v: number | null, allowZero: boolean) =>
		v == null || ((allowZero ? v >= JUGAR_MIN : v > JUGAR_MIN) && v <= JUGAR_MAX);
	const openingNum = num(opening);
	const closingNum = num(closing);
	const openingOk = inRange(openingNum, true);
	const closingOk = inRange(closingNum, false);

	const formInvalid =
		!date ||
		spellId == null ||
		ebId === "" ||
		(openingNum == null && closingNum == null) ||
		!openingOk ||
		!closingOk ||
		saving;

	const sideNote = (s: WindingJugarSide | undefined, field: "opening" | "closing") => {
		if (!s || dirty[field]) return "";
		if (s.source === "saved") return "Saved entry — editing updates it";
		if (s.source === "carry") return "Carried from the previous spell's closing";
		if (s.source === "carry_open") return "Carried from this winder's previous opening";
		return "";
	};

	const handleSubmit = async () => {
		if (formInvalid) {
			setError(
				`Enter an opening (${JUGAR_MIN} to ${JUGAR_MAX} kg) or a closing weight ` +
					`(over ${JUGAR_MIN}, up to ${JUGAR_MAX} kg).`,
			);
			return;
		}
		setSaving(true);
		setError(null);

		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			eb_id: Number(ebId),
			opening: openingNum,
			closing: closingNum,
		};
		const { error: err } = await fetchWithCookie<{ data: unknown }>(
			apiRoutesPortalMasters.WINDING_JUGAR_SAVE,
			"POST",
			body,
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Jugar saved");
		setDirty({ opening: false, closing: false });
		refreshState(); // both sides come back as "saved" with their ids
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{qualityOpts.length === 0 ? (
				<Alert severity="info">
					No yarn quality mapped for this date and spell. Map the winders in the Quality tab
					first — jugar entry picks the winder from that map.
				</Alert>
			) : (
				<>
					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Yarn Quality
						</Typography>
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
							{qualityOpts.map((q) => {
								const on = yarnItemId === q.item_id;
								return (
									<Button
										key={q.item_id}
										size="small"
										variant={on ? "contained" : "outlined"}
										color={on ? "primary" : "inherit"}
										onClick={() => handlePickQuality(q.item_id)}
										sx={pickSx}
									>
										{q.label}
									</Button>
								);
							})}
						</Box>
					</Box>

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							EB No
						</Typography>
						{yarnItemId === "" ? (
							<Typography variant="body2" color="text.secondary">
								Pick a yarn quality to list its winders.
							</Typography>
						) : ebOpts.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No winder mapped to this quality.
							</Typography>
						) : (
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
								{ebOpts.map((r) => {
									const on = ebId === r.eb_id;
									return (
										<Button
											key={r.eb_id}
											size="small"
											variant={on ? "contained" : "outlined"}
											color={on ? "primary" : "inherit"}
											onClick={() => setEbId(r.eb_id as number)}
											sx={{ ...pickSx, flexDirection: "column", lineHeight: 1.15, py: 0.5 }}
										>
											<Box component="span">{r.emp_code ?? r.eb_id}</Box>
											<Box component="span" sx={{ fontSize: "0.7rem", opacity: 0.75 }}>
												{/* worker_name is "FIRST MIDDLE LAST" from the server — first word only. */}
												{(r.worker_name ?? "").split(" ")[0]}
											</Box>
										</Button>
									);
								})}
							</Box>
						)}
					</Box>
				</>
			)}

			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					type="number"
					label="Opening Jugar"
					value={opening}
					onChange={(e) => {
						setOpening(e.target.value);
						setDirty((d) => ({ ...d, opening: true }));
					}}
					size="small"
					fullWidth
					error={!openingOk}
					helperText={
						!openingOk
							? `Must be >= ${JUGAR_MIN} and <= ${JUGAR_MAX}`
							: sideNote(state?.opening, "opening")
					}
				/>
				<TextField
					type="number"
					label="Closing Jugar"
					value={closing}
					onChange={(e) => {
						setClosing(e.target.value);
						setDirty((d) => ({ ...d, closing: true }));
					}}
					size="small"
					fullWidth
					error={!closingOk}
					helperText={
						!closingOk
							? `Must be > ${JUGAR_MIN} and <= ${JUGAR_MAX}`
							: sideNote(state?.closing, "closing")
					}
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
					startIcon={<SaveIcon size={18} />}
					onClick={handleSubmit}
					disabled={formInvalid}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Jugar"}
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
