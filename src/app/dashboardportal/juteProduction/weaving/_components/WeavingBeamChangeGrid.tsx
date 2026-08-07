"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
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
import { useWeavingBeamMap } from "../hooks/useWeavingBeamMap";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
};

// One beam_no per loom for the date/spell. Mirrors LoomQualityMapGrid but the editable
// cell is a free-text beam number instead of a quality dropdown.
export default function WeavingBeamChangeGrid({ coId, branchId, date, spellId }: Props) {
	const { rows, lastUpdated, loading, error, refresh } = useWeavingBeamMap(
		coId,
		branchId,
		date,
		spellId
	);
	const [edits, setEdits] = React.useState<Record<number, string>>({});
	const [saving, setSaving] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Seed local edit state (loom -> beam_no) from fetched rows. Prefill from the prior
	// date's beam when nothing is saved yet today.
	React.useEffect(() => {
		const seed: Record<number, string> = {};
		rows.forEach((r) => {
			seed[r.machine_id] = r.beam_no ?? r.prev_beam_no ?? "";
		});
		setEdits(seed);
	}, [rows]);

	const savedMap = React.useMemo(() => {
		const m: Record<number, string> = {};
		rows.forEach((r) => {
			m[r.machine_id] = r.beam_no ?? "";
		});
		return m;
	}, [rows]);

	const isDirty = React.useCallback(
		(machineId: number) => (edits[machineId] ?? "") !== (savedMap[machineId] ?? ""),
		[edits, savedMap]
	);
	const dirtyCount = rows.reduce((n, r) => (isDirty(r.machine_id) ? n + 1 : n), 0);

	const prevDate = rows.find((r) => r.prev_date)?.prev_date ?? null;
	const hasCarryForward = rows.some((r) => !r.beam_no && r.prev_beam_no);

	const setBeam = (machineId: number, value: string) => {
		setEdits((prev) => ({ ...prev, [machineId]: value }));
	};

	const handleSave = async () => {
		setSaving(true);
		const entries = rows
			.map((r) => {
				const v = (edits[r.machine_id] ?? "").trim();
				return v !== "" ? { machine_id: r.machine_id, beam_no: v } : null;
			})
			.filter((x): x is { machine_id: number; beam_no: string } => x !== null);

		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			entries,
		};
		const { error: err } = await fetchWithCookie(
			apiRoutesPortalMasters.WEAVING_BEAM_MAP_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack(`Saved ${entries.length} beam change(s).`);
		refresh();
	};

	if (spellId == null) {
		return <Alert severity="info">Select a spell to load beam changes.</Alert>;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Beam change (per loom)</Typography>
				<Button
					variant="contained"
					size="small"
					startIcon={<SaveIcon size={16} />}
					onClick={handleSave}
					disabled={saving || loading || rows.length === 0}
				>
					{saving ? "Saving…" : dirtyCount > 0 ? `Save (${dirtyCount} unsaved)` : "Save"}
				</Button>
				{lastUpdated ? (
					<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
						Last updated: {new Date(lastUpdated.replace(" ", "T")).toLocaleString()}
					</Typography>
				) : null}
			</Box>

			{error ? <Alert severity="error">{error}</Alert> : null}

			{!loading && rows.length > 0 && hasCarryForward ? (
				<Alert severity="info">
					Prefilled from {prevDate ?? "the last saved day"}
					{dirtyCount > 0 ? ` — ${dirtyCount} unsaved change(s). Review and Save.` : "."}
				</Alert>
			) : null}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress />
				</Box>
			) : rows.length === 0 ? (
				<Alert severity="info">No looms found for this date and spell.</Alert>
			) : (
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<Table size="small" sx={{ minWidth: 600 }}>
						<TableHead>
							<TableRow>
								<TableCell>Mc Code</TableCell>
								<TableCell>Loom</TableCell>
								<TableCell>Beam No</TableCell>
								<TableCell>Status</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map((r) => {
								const v = edits[r.machine_id] ?? "";
								const dirty = isDirty(r.machine_id);
								return (
									<TableRow
										key={r.machine_id}
										sx={{ bgcolor: dirty ? "rgba(255, 193, 7, 0.12)" : undefined }}
									>
										<TableCell>{r.mech_code}</TableCell>
										<TableCell>{r.machine_name}</TableCell>
										<TableCell>
											<TextField
												size="small"
												value={v}
												onChange={(ev) => setBeam(r.machine_id, ev.target.value)}
												sx={{ minWidth: 180 }}
											/>
										</TableCell>
										<TableCell>
											{dirty ? (
												<Chip
													size="small"
													color="warning"
													variant="outlined"
													label={
														!r.beam_no && r.prev_beam_no
															? `Unsaved · from ${r.prev_beam_no}`
															: "Unsaved"
													}
												/>
											) : r.beam_no ? (
												<Chip size="small" color="success" variant="outlined" label="Saved" />
											) : null}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Box>
			)}

			<Snackbar
				open={!!snack}
				autoHideDuration={4000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
