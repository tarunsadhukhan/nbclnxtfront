"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingDoffSetup } from "../types/windingTypes";
import { useWindingDoffPrevState } from "../hooks/useWindingDoffPrevState";
import { useQualityByDate } from "../hooks/useQualityByDate";
import {
	computeWindingNet,
	validateWindingNet,
	WINDING_NET_MIN,
	WINDING_NET_MAX,
} from "../utils/windingCalc";

type Props = {
	coId: string;
	branchId: number;
	setup: WindingDoffSetup;
	date: string;
	spellId: number | null;
	onSaved: () => void;
};

// A doff is one weighing: pick the yarn quality, pick the EB no(s) mapped to it,
// enter the gross weight — no machine anywhere on the form. Both pickers read
// this date+spell's person -> quality map (Quality tab), so the two button banks
// ARE the map: no free worker list, no yarn dropdown. One weighing can be shared
// by several winders — the server deducts the tare ONCE and writes one row per
// winder with net_total / N. The Save gate mirrors the backend: total net > 0 and
// 1 <= PER-ROW share <= 500 (a gross fine for one winder can fail split 4 ways).
export default function DoffForm({ coId, branchId, setup, date, spellId, onSaved }: Props) {
	const [ebIds, setEbIds] = React.useState<number[]>([]);
	const [trollyId, setTrollyId] = React.useState<number | "">("");
	const [spoolId, setSpoolId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [grossWeight, setGrossWeight] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const trolly = React.useMemo(
		() => setup.trollies.find((t) => t.trolly_id === Number(trollyId)) ?? null,
		[trollyId, setup.trollies],
	);
	const spool = React.useMemo(
		() => setup.spools.find((s) => s.trolly_id === Number(spoolId)) ?? null,
		[spoolId, setup.spools],
	);

	const trollyWt = trolly?.trolly_weight ?? 0;
	const spoolWt = spool?.trolly_weight ?? 0;

	// Prefill from the FIRST picked winder's last active doff (trolly/spool only —
	// the yarn is chosen first now, from the map, so a previous doff can't override
	// it). One probe, never one per selected eb.
	const { state: prevState } = useWindingDoffPrevState(coId, ebIds[0] ?? null, branchId);

	// The person -> quality map for this date + spell (Quality tab). It drives
	// BOTH pickers: qualities first, then only the EBs mapped to the one picked.
	const { rows: qualityRows } = useQualityByDate(coId, date, branchId, spellId);

	// Distinct qualities on the map. item_code comes off the row; fall back to
	// the setup list when the row didn't carry one.
	const qualityOpts = React.useMemo(() => {
		const seen = new Map<number, string>();
		qualityRows.forEach((r) => {
			if (r.item_id == null || seen.has(r.item_id)) return;
			const y = setup.yarn_items.find((i) => i.item_id === r.item_id);
			seen.set(r.item_id, r.item_code ?? y?.item_code ?? y?.item_name ?? String(r.item_id));
		});
		return Array.from(seen, ([item_id, label]) => ({ item_id, label }));
	}, [qualityRows, setup.yarn_items]);

	// Winders mapped to the chosen quality (deduped — one button per person),
	// sorted by worker name then EB no so the buttons sit where the eye expects.
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

	React.useEffect(() => {
		if (prevState) {
			if (prevState.trolly_id != null) setTrollyId(prevState.trolly_id);
			if (prevState.spool_id != null) setSpoolId(prevState.spool_id);
		}
		// Only re-run when a new prev state arrives.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [prevState?.winding_doff_id]);

	// A different quality means a different set of winders — drop the old picks.
	const handlePickQuality = (itemId: number) => {
		setYarnItemId(itemId);
		setEbIds([]);
	};

	// EB buttons are a multi-pick: click toggles, colour IS the state.
	const toggleEb = (id: number) =>
		setEbIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

	const grossNum = grossWeight === "" ? 0 : Number(grossWeight);
	// Tare comes off ONCE, then the net splits across the picked winders — same
	// order as the server, so the displayed share is what gets written.
	const netTotal = grossWeight === "" ? 0 : computeWindingNet(grossNum, trollyWt, spoolWt);
	const share = ebIds.length ? netTotal / ebIds.length : 0;
	const netPositive = netTotal > 0;
	// The 1..500 band is a PER-ROW gate, not a total one.
	const shareInRange = ebIds.length > 0 && validateWindingNet(share);
	// Display only — 3 dp max, trailing zeros stripped ("37.5", not "37.500").
	const shareLabel = Number(share.toFixed(3));

	const formInvalid =
		!date ||
		spellId == null ||
		ebIds.length === 0 ||
		trollyId === "" ||
		spoolId === "" ||
		yarnItemId === "" ||
		grossWeight === "" ||
		grossNum <= 0 ||
		!netPositive ||
		!shareInRange ||
		saving;

	const handleSubmit = async () => {
		if (formInvalid) {
			if (ebIds.length === 0) {
				setError("Pick at least one EB no.");
			} else if (!netPositive) {
				setError("Net weight must be greater than 0.");
			} else if (!shareInRange) {
				setError(
					`Each winder's share must be between ${WINDING_NET_MIN} and ${WINDING_NET_MAX} kg.`,
				);
			} else {
				setError("Please complete all required fields.");
			}
			return;
		}
		setSaving(true);
		setError(null);

		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			eb_ids: ebIds,
			trolly_id: Number(trollyId),
			spool_id: Number(spoolId),
			quality_id: Number(yarnItemId),
			gross_weight: grossNum,
		};
		const { data, error: err } = await fetchWithCookie<{
			data: {
				winding_doff_ids: number[];
				winding_doff_id: number;
				net_total: number;
				net_per_row: number;
				net: number;
				row_gross_wt: number;
			};
		}>(apiRoutesPortalMasters.WINDING_DOFF_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const rows = data?.data?.winding_doff_ids?.length ?? ebIds.length;
		const per = data?.data?.net_per_row ?? shareLabel;
		setSnack(`Saved ${rows} doff${rows === 1 ? "" : "s"} (${per} kg each).`);
		setGrossWeight(""); // Keep workers/trolly/spool/quality for rapid sequential entry.
		onSaved();
	};

	// Mill-floor tablet: compact but >= 40px tall so it stays thumb-hittable.
	const pickSx = { minHeight: 40, px: 1.5, textTransform: "none" as const };

	// The caption under the derived row does double duty: the gate message when it
	// fails, otherwise the per-winder share once 2+ winders share the weighing.
	const netError =
		grossWeight === ""
			? null
			: !netPositive
				? "Net must be > 0"
				: ebIds.length > 0 && !shareInRange
					? `Each winder's share must be ${WINDING_NET_MIN}–${WINDING_NET_MAX} kg`
					: null;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{qualityOpts.length === 0 ? (
				<Alert severity="info">
					No yarn quality mapped for this date and spell. Map the winders in the Quality tab
					first — doff entry picks both the quality and the EB no from that map.
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
							EB No {ebIds.length > 1 ? `(${ebIds.length} selected)` : ""}
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
									const on = ebIds.includes(r.eb_id as number);
									return (
										<Button
											key={r.eb_id}
											size="small"
											variant={on ? "contained" : "outlined"}
											color={on ? "primary" : "inherit"}
											onClick={() => toggleEb(r.eb_id as number)}
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
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
				}}
			>
				<Autocomplete
					options={setup.trollies}
					getOptionLabel={(t) => t.trolly_name}
					renderOption={(props, t) => (
						<li {...props} key={t.trolly_id}>
							{t.trolly_name}
						</li>
					)}
					value={
						trollyId === ""
							? null
							: setup.trollies.find((t) => t.trolly_id === Number(trollyId)) ?? null
					}
					onChange={(_, newVal) => setTrollyId(newVal ? newVal.trolly_id : "")}
					size="small"
					fullWidth
					clearOnEscape
					isOptionEqualToValue={(opt, val) => opt.trolly_id === val.trolly_id}
					renderInput={(params) => <TextField {...params} label="Trolly" />}
				/>
				<Autocomplete
					options={setup.spools}
					getOptionLabel={(s) => s.trolly_name}
					renderOption={(props, s) => (
						<li {...props} key={s.trolly_id}>
							{s.trolly_name}
						</li>
					)}
					value={
						spoolId === ""
							? null
							: setup.spools.find((s) => s.trolly_id === Number(spoolId)) ?? null
					}
					onChange={(_, newVal) => setSpoolId(newVal ? newVal.trolly_id : "")}
					size="small"
					fullWidth
					clearOnEscape
					isOptionEqualToValue={(opt, val) => opt.trolly_id === val.trolly_id}
					renderInput={(params) => <TextField {...params} label="Spool" />}
				/>
			</Box>

			{/* Gross is the only typed field — it keeps its own full-width row. */}
			<TextField
				type="number"
				label="Gross Weight"
				value={grossWeight}
				onChange={(e) => setGrossWeight(e.target.value)}
				size="small"
				fullWidth
			/>

			{/* The three derived weights stay on ONE line at every width (phone
			    included): tight gap, small font, and the net error moved out to a
			    caption below so it can never wrap the row. */}
			<Box>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
						gap: 0.75,
					}}
				>
					<TextField
						label="Trolly Wt"
						value={trollyId === "" ? "" : trollyWt}
						InputProps={{ readOnly: true, sx: { fontSize: "0.8rem" } }}
						InputLabelProps={{ sx: { fontSize: "0.8rem" } }}
						size="small"
						fullWidth
					/>
					<TextField
						label="Spool Wt"
						value={spoolId === "" ? "" : spoolWt}
						InputProps={{ readOnly: true, sx: { fontSize: "0.8rem" } }}
						InputLabelProps={{ sx: { fontSize: "0.8rem" } }}
						size="small"
						fullWidth
					/>
					{/* Net is the TOTAL for the weighing; the split lives in the caption. */}
					<TextField
						label="Net"
						value={grossWeight === "" ? "" : netTotal}
						InputProps={{ readOnly: true, sx: { fontSize: "0.8rem" } }}
						InputLabelProps={{ sx: { fontSize: "0.8rem" } }}
						size="small"
						fullWidth
						error={!!netError}
					/>
				</Box>
				{netError ? (
					<Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
						{netError}
					</Typography>
				) : grossWeight !== "" && ebIds.length > 1 ? (
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
						{shareLabel} × {ebIds.length}
					</Typography>
				) : null}
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
					{saving ? "Saving…" : "Save Doff"}
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
