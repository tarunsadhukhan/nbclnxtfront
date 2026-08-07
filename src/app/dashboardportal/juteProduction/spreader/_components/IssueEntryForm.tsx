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
import type { IssueSetup } from "../types/spreaderTypes";
import { spellFromHour, todayISO, currentHour } from "../utils/shift";
import { useAvailableWeights } from "../hooks/useIssueSetup";

type Props = {
	coId: string;
	branchId: number;
	setup: IssueSetup;
	onSaved: () => void;
};

export default function IssueEntryForm({ coId, branchId, setup, onSaved }: Props) {
	const [issueDate, setIssueDate] = React.useState<string>(todayISO());
	const [issueTime, setIssueTime] = React.useState<number>(currentHour());
	const [spell, setSpell] = React.useState<string>(spellFromHour(currentHour()));
	const [binKey, setBinKey] = React.useState<string>(""); // bin_id-group composite
	const [wtPerRoll, setWtPerRoll] = React.useState<number | "">("");
	const [noOfRolls, setNoOfRolls] = React.useState<string>("");
	const [breakerInter, setBreakerInter] = React.useState<string>("");
	const [remarks, setRemarks] = React.useState<string>("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const selectedBin = React.useMemo(() => {
		if (!binKey) return null;
		return setup.bins_with_stock.find((b) => `${b.bin_id}-${b.entry_id_grp}` === binKey) ?? null;
	}, [binKey, setup.bins_with_stock]);

	const { data: weights } = useAvailableWeights(coId, selectedBin?.entry_id_grp ?? null);

	React.useEffect(() => {
		setSpell(spellFromHour(Number(issueTime)));
	}, [issueTime]);

	// Reset weight selection when bin changes
	React.useEffect(() => {
		setWtPerRoll("");
		setNoOfRolls("");
	}, [binKey]);

	const availableForSelected = React.useMemo(() => {
		if (!weights || wtPerRoll === "") return 0;
		const match = weights.weights.find((w) => w.wt_per_roll === Number(wtPerRoll));
		return match?.available_rolls ?? 0;
	}, [weights, wtPerRoll]);

	const formInvalid =
		!selectedBin ||
		wtPerRoll === "" ||
		!noOfRolls ||
		Number(noOfRolls) <= 0 ||
		Number(noOfRolls) > availableForSelected;

	const handleSubmit = async () => {
		if (!selectedBin || formInvalid) {
			setError("Please complete all required fields.");
			return;
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			issue_date: issueDate,
			issue_time: Number(issueTime),
			spell,
			entry_id_grp: selectedBin.entry_id_grp,
			wt_per_roll: Number(wtPerRoll),
			no_of_rolls: Number(noOfRolls),
			breaker_inter_no: breakerInter || null,
			remarks: remarks || null,
		};
		const { data, error: err } = await fetchWithCookie<{ data: { spreader_roll_issue_id: number } }>(
			apiRoutesPortalMasters.SPREADER_ISSUE_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Issued (#${data?.data?.spreader_roll_issue_id})`);
		setNoOfRolls("");
		setBreakerInter("");
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
					select
					label="Bin (with stock)"
					value={binKey}
					onChange={(e) => setBinKey(e.target.value)}
					size="small"
					fullWidth
				>
					{setup.bins_with_stock.map((b) => (
						<MenuItem key={`${b.bin_id}-${b.entry_id_grp}`} value={`${b.bin_id}-${b.entry_id_grp}`}>
							{b.bin_code} · {b.item_name} · {b.current_rolls} rolls (grp #{b.entry_id_grp})
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="date"
					label="Issue Date"
					value={issueDate}
					onChange={(e) => setIssueDate(e.target.value)}
					size="small"
					InputLabelProps={{ shrink: true }}
					fullWidth
				/>
				<TextField
					type="number"
					label="Issue Hour (0-23)"
					value={issueTime}
					onChange={(e) =>
						setIssueTime(Math.max(0, Math.min(23, Number(e.target.value || 0))))
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
					label="Item (auto)"
					value={selectedBin?.item_name ?? ""}
					InputProps={{ readOnly: true }}
					size="small"
					fullWidth
				/>
				<TextField
					select
					label="Wt per Roll"
					value={wtPerRoll}
					onChange={(e) => setWtPerRoll(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
					disabled={!weights || weights.weights.length === 0}
				>
					{(weights?.weights ?? []).map((w) => (
						<MenuItem key={w.wt_per_roll} value={w.wt_per_roll}>
							{w.wt_per_roll} kg (available: {w.available_rolls})
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="number"
					label={`Issue Rolls${wtPerRoll !== "" ? ` (max ${availableForSelected})` : ""}`}
					value={noOfRolls}
					onChange={(e) => setNoOfRolls(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Breaker / Inter No"
					value={breakerInter}
					onChange={(e) => setBreakerInter(e.target.value)}
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
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Issue"}
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
