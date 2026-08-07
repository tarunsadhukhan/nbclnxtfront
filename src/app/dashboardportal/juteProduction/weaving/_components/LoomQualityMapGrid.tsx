"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	CircularProgress,
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
import { Save as SaveIcon, Stamp as StampIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingSetup, LoomQualityMapRow } from "../types/weavingTypes";
import type { LoomQualityMapState } from "../hooks/useLoomQualityMap";

// Sort looms by shed line (nulls last), then by loom code — the render groups on line_no.
// Mirrors WeavingEntryGrid so both tabs show the same order.
function byLineThenCode(a: LoomQualityMapRow, b: LoomQualityMapRow): number {
	if (a.line_no !== b.line_no) {
		if (a.line_no == null) return 1;
		if (b.line_no == null) return -1;
		return a.line_no - b.line_no;
	}
	return (a.mech_code ?? "").localeCompare(b.mech_code ?? "");
}

type Props = {
	coId: string;
	branchId: number;
	setup: WeavingSetup;
	date: string;
	spellId: number | null;
	// The map fetch is owned by the page and shared with the entry grid, so switching tabs
	// doesn't refetch. This tab is the only consumer of the lazy carry-forward (prev_quality_*).
	map: LoomQualityMapState;
};

export default function LoomQualityMapGrid({ coId, branchId, setup, date, spellId, map }: Props) {
	const { rows, lastUpdated, loading, carryForwardLoading, error, refresh } = map;
	const [edits, setEdits] = React.useState<Record<number, number | "">>({});
	const [saving, setSaving] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);
	const [lineFilter, setLineFilter] = React.useState<string>("");

	// Reset local edits when the cell identity (date/spell) changes — a fresh grid.
	React.useEffect(() => {
		setEdits({});
	}, [date, spellId]);

	// Default the Line filter to the first line once rows arrive — rendering every loom at
	// once (400+ rows of selects) is what made the tab slow, so there is no "All lines" option.
	React.useEffect(() => {
		setLineFilter((cur) => {
			if (cur !== "") return cur;
			const first = [...rows].sort(byLineThenCode)[0];
			if (!first) return "";
			return first.line_no != null ? String(first.line_no) : "none";
		});
	}, [rows]);

	// Seed/patch edit state (loom -> weaving_quality_id) WITHOUT clobbering the operator's picks.
	// Rows arrive in two phases (saved mapping first, then lazy carry-forward merged in), so this
	// runs more than once: it only fills a cell that is still blank/untouched — a value the user
	// already selected is preserved. Prefill order per cell: saved mapping, else prior-day draft.
	React.useEffect(() => {
		setEdits((prev) => {
			const next = { ...prev };
			rows.forEach((r) => {
				if (next[r.machine_id] === undefined || next[r.machine_id] === "") {
					next[r.machine_id] = r.weaving_quality_id ?? r.prev_quality_id ?? "";
				}
			});
			return next;
		});
	}, [rows]);

	// Baseline = what is actually persisted today (null/"" when unsaved). A cell is
	// dirty when its current selection differs from the saved baseline — carried-
	// forward prefills are therefore dirty until the operator clicks Save Map.
	const savedMap = React.useMemo(() => {
		const m: Record<number, number | ""> = {};
		rows.forEach((r) => {
			m[r.machine_id] = r.weaving_quality_id ?? "";
		});
		return m;
	}, [rows]);

	const isDirty = React.useCallback(
		(machineId: number) => (edits[machineId] ?? "") !== (savedMap[machineId] ?? ""),
		[edits, savedMap]
	);
	const dirtyCount = rows.reduce((n, r) => (isDirty(r.machine_id) ? n + 1 : n), 0);

	// Banner: surface the date the draft was prefilled from (first row carrying one).
	const prevDate = rows.find((r) => r.prev_date)?.prev_date ?? null;
	const hasCarryForward = rows.some((r) => r.weaving_quality_id == null && r.prev_quality_id != null);

	const setQuality = (machineId: number, value: number | "") => {
		setEdits((prev) => ({ ...prev, [machineId]: value }));
	};

	const handleSaveMap = async () => {
		setSaving(true);
		const entries = rows
			.map((r) => {
				const q = edits[r.machine_id];
				return q !== undefined && q !== ""
					? { machine_id: r.machine_id, weaving_quality_id: Number(q) }
					: null;
			})
			.filter((x): x is { machine_id: number; weaving_quality_id: number } => x !== null);

		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			entries,
		};
		const { error: err } = await fetchWithCookie(
			apiRoutesPortalMasters.WEAVING_QUALITY_MAP_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack(`Saved ${entries.length} loom mapping(s).`);
		refresh();
	};

	const handleMapped = async () => {
		setBusy(true);
		const body = { co_id: Number(coId), branch_id: Number(branchId), tran_date: date, spell_id: spellId };
		const { data, error: err } = await fetchWithCookie<{
			data: { quality_stamped: number; operator_stamped: number };
		}>(apiRoutesPortalMasters.WEAVING_QUALITY_MAP_MAPPED, "POST", body);
		setBusy(false);
		if (err) {
			setSnack(err);
			return;
		}
		const d = data?.data;
		setSnack(
			`Quality stamped: ${d?.quality_stamped ?? 0}, Operator stamped: ${d?.operator_stamped ?? 0}`
		);
		refresh();
	};

	if (spellId == null) {
		return <Alert severity="info">Select a spell to load loom → quality mapping.</Alert>;
	}

	// Unique shed lines for the filter dropdown ("none" bucket for unassigned looms).
	const lineOptions = [
		...Array.from(new Set(rows.map((r) => r.line_no).filter((l): l is number => l != null)))
			.sort((a, b) => a - b)
			.map(String),
		...(rows.some((r) => r.line_no == null) ? ["none"] : []),
	];
	const visibleRows = [...rows].sort(byLineThenCode).filter((r) => {
		if (lineFilter === "") return false; // not defaulted yet — avoid the full-grid paint
		return lineFilter === "none" ? r.line_no == null : r.line_no === Number(lineFilter);
	});

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Loom → Quality mapping</Typography>
				<Button
					variant="contained"
					size="small"
					startIcon={<SaveIcon size={16} />}
					onClick={handleSaveMap}
					disabled={saving || loading || rows.length === 0}
				>
					{saving ? "Saving…" : dirtyCount > 0 ? `Save Map (${dirtyCount} unsaved)` : "Save Map"}
				</Button>
				<Button
					variant="outlined"
					size="small"
					startIcon={<StampIcon size={16} />}
					onClick={handleMapped}
					disabled={busy || loading}
				>
					Mapped
				</Button>
				<Autocomplete
					size="small"
					options={lineOptions}
					value={lineFilter === "" ? null : lineFilter}
					onChange={(_e, v) => {
						if (v) setLineFilter(v); // ignore clear — a blank filter shows nothing
					}}
					getOptionLabel={(o) => (o === "none" ? "No line" : `Line ${o}`)}
					sx={{ minWidth: 140 }}
					renderInput={(params) => <TextField {...params} label="Line" />}
				/>
				{carryForwardLoading ? (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}
					>
						<CircularProgress size={12} /> Loading prior-day suggestions…
					</Typography>
				) : lastUpdated ? (
					<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
						Last updated: {new Date(lastUpdated.replace(" ", "T")).toLocaleString()}
					</Typography>
				) : null}
			</Box>

			{error ? <Alert severity="error">{error}</Alert> : null}

			{!loading && rows.length > 0 && hasCarryForward ? (
				<Alert severity="info">
					Prefilled from {prevDate ?? "the last saved day"}
					{dirtyCount > 0 ? ` — ${dirtyCount} unsaved change(s). Review and Save Map.` : "."}
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
								<TableCell>Quality</TableCell>
								<TableCell>Status</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{visibleRows.map((r, i) => {
								const q = edits[r.machine_id] ?? "";
								const dirty = isDirty(r.machine_id);
								const newLine = i === 0 || visibleRows[i - 1].line_no !== r.line_no;
								return (
									<React.Fragment key={r.machine_id}>
									{newLine ? (
										<TableRow>
											<TableCell colSpan={4} sx={{ bgcolor: "action.hover", fontWeight: 600, py: 0.25 }}>
												{r.line_no != null ? `Line ${r.line_no}` : "No line"}
											</TableCell>
										</TableRow>
									) : null}
									<TableRow
										sx={{ bgcolor: dirty ? "rgba(255, 193, 7, 0.12)" : undefined }}
									>
										<TableCell>{r.mech_code}</TableCell>
										<TableCell>{r.machine_name}</TableCell>
										<TableCell>
											<TextField
												select
												size="small"
												value={q}
												onChange={(ev) =>
													setQuality(
														r.machine_id,
														ev.target.value === "" ? "" : Number(ev.target.value)
													)
												}
												sx={{ minWidth: 180 }}
											>
												<MenuItem value="">
													<em>None</em>
												</MenuItem>
												{setup.qualities.map((qq) => (
													<MenuItem key={qq.weaving_quality_id} value={qq.weaving_quality_id}>
														{qq.weaving_quality_name ?? qq.weaving_quality_code} ({qq.weaving_quality_code})
													</MenuItem>
												))}
											</TextField>
										</TableCell>
										<TableCell>
											{dirty ? (
												<Chip
													size="small"
													color="warning"
													variant="outlined"
													label={
														r.weaving_quality_id == null && r.prev_quality_id != null
															? `Unsaved · from ${r.prev_quality_name ?? "prev"}`
															: "Unsaved"
													}
												/>
											) : r.weaving_quality_id != null ? (
												<Chip size="small" color="success" variant="outlined" label="Saved" />
											) : null}
										</TableCell>
									</TableRow>
									</React.Fragment>
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
