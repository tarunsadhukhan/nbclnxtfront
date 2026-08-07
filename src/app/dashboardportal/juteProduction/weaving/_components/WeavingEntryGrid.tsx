"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingSetup, WeavingEntryRow, LoomQualityMapRow } from "../types/weavingTypes";
import type { LoomQualityMapState } from "../hooks/useLoomQualityMap";
import { useWeavingEntriesByDate } from "../hooks/useWeavingEntriesByDate";
import { totalJugar } from "../utils/weavingCalc";

type Props = {
	coId: string;
	branchId: number;
	setup: WeavingSetup;
	date: string;
	spellId: number | null;
	// Shared, page-owned map fetch (reused across tab switches — no reload on this tab).
	map: LoomQualityMapState;
	// Bumped by the page after Process — refetches entries without remounting the grid.
	refreshKey?: number;
};

// The operator enters cuts + the CLOSING jugar reading (close_jugar / cj).
type CellEdit = { cuts: string; close_jugar: string };

// Compact styling so all columns fit narrow (phone) widths with minimal horizontal scroll.
const tightCell = { "& .MuiTableCell-root": { px: 0.5, py: 0.75 } } as const;
const numInputSx = {
	width: 58,
	"& .MuiInputBase-input": { px: 0.75, py: 0.5, textAlign: "right" as const },
};

const DASH = "—";

// Sort looms by shed line (nulls last), then by loom code — the render groups on line_no.
function byLineThenCode(a: LoomQualityMapRow, b: LoomQualityMapRow): number {
	if (a.line_no !== b.line_no) {
		if (a.line_no == null) return 1;
		if (b.line_no == null) return -1;
		return a.line_no - b.line_no;
	}
	return (a.mech_code ?? "").localeCompare(b.mech_code ?? "");
}

// Loom rows on the production grid never carry a quality dropdown — the quality is
// MAPPED on the Loom → Quality tab and inherited read-only here (like spinning).
export default function WeavingEntryGrid({ coId, branchId, date, spellId, map, refreshKey = 0 }: Props) {
	// The mapped quality per loom (read-only source for this grid) comes from the page-owned,
	// shared map fetch — this grid needs only the loom list + saved mapping (it ignores the
	// editor's carry-forward). Sharing means switching to this tab does NOT refetch the map.
	const { rows: mapRows, loading: mapLoading, error: mapError } = map;
	// Existing day entries (to prefill cuts/jugar and show server-computed outputs).
	const { rows: entryRows, loading: entriesLoading, loaded: entriesLoaded, error: entriesError, refresh } =
		useWeavingEntriesByDate(coId, date, branchId, spellId, null, refreshKey);

	const [edits, setEdits] = React.useState<Record<number, CellEdit>>({});
	const [savingId, setSavingId] = React.useState<number | null>(null);
	const [savingAll, setSavingAll] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);
	const [query, setQuery] = React.useState("");
	const [lineFilter, setLineFilter] = React.useState<string>("");
	// Pending save awaiting the negative-jugar confirmation.
	const [confirm, setConfirm] = React.useState<{
		negatives: { id: number; code: string; value: number }[];
		proceed: () => void;
	} | null>(null);
	// Focus targets for Enter-to-next-row: machine_id -> Cuts input element.
	const cutsRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

	// Index existing entries by machine for prefill + edit-vs-create resolution.
	const entryByMachine = React.useMemo(() => {
		const m: Record<number, WeavingEntryRow> = {};
		entryRows.forEach((e) => {
			m[e.machine_id] = e;
		});
		return m;
	}, [entryRows]);

	// A fresh grid when the (date, spell) cell identity changes.
	React.useEffect(() => {
		setEdits({});
	}, [date, spellId]);

	// Default the Line filter to the first line once rows arrive — rendering every loom at
	// once (400+ rows of inputs) is what made the tab slow, so there is no "All lines" option.
	React.useEffect(() => {
		setLineFilter((cur) => {
			if (cur !== "") return cur;
			const first = [...mapRows].sort(byLineThenCode)[0];
			if (!first) return "";
			return first.line_no != null ? String(first.line_no) : "none";
		});
	}, [mapRows]);

	// Seed cuts/close_jugar from any saved entry WITHOUT clobbering in-progress typing:
	// mapRows arrive in two phases (saved mapping, then the lazy ~5s carry-forward merge),
	// so this runs more than once — it only fills cells that are still undefined. Gates on
	// `entriesLoaded` (not just !loading): on mount the shared mapRows are already populated
	// while the entries fetch has not even started, and a loading-only gate would seed every
	// cell blank — saved values would never prefill and Update could overwrite them with 0s.
	React.useEffect(() => {
		if (entriesLoading || !entriesLoaded) return;
		setEdits((prev) => {
			const next = { ...prev };
			mapRows.forEach((r) => {
				if (next[r.machine_id] === undefined) {
					const e = entryByMachine[r.machine_id];
					next[r.machine_id] = {
						cuts: e ? String(e.cuts ?? "") : "",
						close_jugar: e ? String(e.close_jugar ?? "") : "",
					};
				}
			});
			return next;
		});
	}, [mapRows, entryByMachine, entriesLoading, entriesLoaded]);

	const setCell = (machineId: number, field: keyof CellEdit, value: string) => {
		setEdits((prev) => ({
			...prev,
			[machineId]: { ...(prev[machineId] ?? { cuts: "", close_jugar: "" }), [field]: value },
		}));
	};

	// Live total-jugar preview: cuts·jc + cj − oj − adj (weavingCalc.totalJugar — the server
	// remains authoritative at Process time). null = no mapped quality/jc, rendered as a dash.
	const liveJugar = React.useCallback(
		(r: LoomQualityMapRow, cell: CellEdit, entry: WeavingEntryRow | undefined): number | null => {
			const jc = Number(r.no_of_jugar_per_cut ?? 0);
			if (r.weaving_quality_id == null || !jc || jc <= 0) return null;
			return totalJugar(
				Number(cell.cuts || 0),
				jc,
				Number(entry?.open_jugar ?? 0),
				Number(cell.close_jugar || 0),
				Number(entry?.less_production ?? 0)
			);
		},
		[]
	);

	// Dirty = differs from the seeded baseline (the saved entry, or blank when unsaved).
	const isDirty = React.useCallback(
		(machineId: number) => {
			const cell = edits[machineId];
			if (!cell) return false;
			const e = entryByMachine[machineId];
			const base: CellEdit = {
				cuts: e ? String(e.cuts ?? "") : "",
				close_jugar: e ? String(e.close_jugar ?? "") : "",
			};
			return cell.cuts !== base.cuts || cell.close_jugar !== base.close_jugar;
		},
		[edits, entryByMachine]
	);

	const dirtyRows = mapRows.filter(
		(r) => isDirty(r.machine_id) && (edits[r.machine_id]?.cuts ?? "") !== ""
	);
	// Dirty rows Save-all cannot send (cuts still blank) — surfaced, never silently dropped.
	const dirtyNoCuts = mapRows.filter(
		(r) => isDirty(r.machine_id) && (edits[r.machine_id]?.cuts ?? "") === ""
	);

	const doSaveRow = async (machineId: number) => {
		const cell = edits[machineId] ?? { cuts: "", close_jugar: "" };
		setSavingId(machineId);
		const existing = entryByMachine[machineId];
		if (existing) {
			const body = { cuts: Number(cell.cuts), close_jugar: Number(cell.close_jugar || 0) };
			const url = `${apiRoutesPortalMasters.WEAVING_ENTRY_EDIT}/${existing.weaving_daily_id}?co_id=${coId}`;
			const { error: err } = await fetchWithCookie(url, "PUT", body);
			setSavingId(null);
			if (err) {
				setSnack(err);
				return;
			}
			setSnack(`Updated entry #${existing.weaving_daily_id}`);
			refresh();
			return;
		}
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			machine_id: machineId,
			cuts: Number(cell.cuts),
			close_jugar: Number(cell.close_jugar || 0),
		};
		const { data, error: err } = await fetchWithCookie<{
			data: { weaving_daily_id: number; weaving_quality_id: number };
		}>(apiRoutesPortalMasters.WEAVING_ENTRY_CREATE, "POST", body);
		setSavingId(null);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack(`Saved entry #${data?.data?.weaving_daily_id}`);
		refresh();
	};

	// Collect looms whose live total jugar is negative — gate the save behind a confirm.
	const negativesFor = (machineIds: number[]) =>
		machineIds.flatMap((id) => {
			const r = mapRows.find((m) => m.machine_id === id);
			if (!r) return [];
			const tj = liveJugar(r, edits[id] ?? { cuts: "", close_jugar: "" }, entryByMachine[id]);
			// id rides along as the React key — dev3 carries duplicate mech_code rows.
			return tj != null && tj < 0 ? [{ id, code: r.mech_code ?? `#${id}`, value: tj }] : [];
		});

	const handleSave = (machineId: number) => {
		const cell = edits[machineId] ?? { cuts: "", close_jugar: "" };
		if (cell.cuts === "" || Number(cell.cuts) < 0) {
			setSnack("Enter cuts for this loom.");
			return;
		}
		const negatives = negativesFor([machineId]);
		if (negatives.length) {
			setConfirm({ negatives, proceed: () => void doSaveRow(machineId) });
			return;
		}
		void doSaveRow(machineId);
	};

	const doSaveAll = async () => {
		if (spellId == null) {
			setSnack("Select a spell — cannot batch save.");
			return;
		}
		setSavingAll(true);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			rows: dirtyRows.map((r) => {
				const cell = edits[r.machine_id];
				return {
					spell_id: spellId,
					machine_id: r.machine_id,
					cuts: Number(cell?.cuts || 0),
					close_jugar: Number(cell?.close_jugar || 0),
				};
			}),
		};
		const { data, error: err } = await fetchWithCookie<{
			data?: { saved?: number; skipped?: number };
			saved?: number;
			skipped?: number;
		}>(apiRoutesPortalMasters.WEAVING_PLANNING_GRID_SAVE, "POST", body);
		setSavingAll(false);
		if (err) {
			setSnack(err);
			return;
		}
		const saved = data?.data?.saved ?? data?.saved ?? body.rows.length;
		const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
		const held = dirtyNoCuts.length
			? ` ${dirtyNoCuts.length} edited row(s) not sent — cuts empty.`
			: "";
		setSnack(`Batch saved ${saved} row(s), skipped ${skipped}.${held}`);
		refresh();
	};

	const handleSaveAll = () => {
		if (dirtyRows.length === 0) {
			if (dirtyNoCuts.length) {
				setSnack(`${dirtyNoCuts.length} edited row(s) need cuts before saving.`);
			}
			return;
		}
		const negatives = negativesFor(dirtyRows.map((r) => r.machine_id));
		if (negatives.length) {
			setConfirm({ negatives, proceed: () => void doSaveAll() });
			return;
		}
		void doSaveAll();
	};

	if (spellId == null) {
		return <Alert severity="info">Select a spell to load the production grid.</Alert>;
	}

	const loading = mapLoading || entriesLoading;
	const error = mapError || entriesError;

	// Unique shed lines for the filter dropdown ("none" bucket for unassigned looms).
	const lineOptions = [
		...Array.from(new Set(mapRows.map((r) => r.line_no).filter((l): l is number => l != null)))
			.sort((a, b) => a - b)
			.map(String),
		...(mapRows.some((r) => r.line_no == null) ? ["none"] : []),
	];

	const q = query.trim().toLowerCase();
	const visibleRows = [...mapRows].sort(byLineThenCode).filter((r) => {
		// A search spans ALL lines (there is no "All lines" option any more); otherwise
		// show only the selected line — "" means not defaulted yet, render nothing.
		if (q === "") {
			if (lineFilter === "") return false;
			return lineFilter === "none" ? r.line_no == null : r.line_no === Number(lineFilter);
		}
		return (
			String(r.mech_posting_code ?? "").toLowerCase().includes(q) ||
			(r.mech_code ?? "").toLowerCase().includes(q) ||
			(r.machine_name ?? "").toLowerCase().includes(q)
		);
	});

	// Focus the next visible row's Cuts input (Enter on Cl.Jugar).
	const focusNextCuts = (machineId: number) => {
		const idx = visibleRows.findIndex((r) => r.machine_id === machineId);
		const next = idx >= 0 ? visibleRows[idx + 1] : undefined;
		if (next) cutsRefs.current[next.machine_id]?.focus();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Production entry (per loom)</Typography>
				<Typography variant="caption" color="text.secondary">
					Enter cuts + closing jugar per loom, then Save. Quality mapping is NOT required to capture inputs — all jugar / production / efficiency values are computed later when you Process the day + spell. Tot.Jugar is a live preview only.
				</Typography>
				<TextField
					size="small"
					label="Search loom / posting code"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ minWidth: 200 }}
				/>
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
				<Button
					variant="outlined"
					size="small"
					onClick={handleSaveAll}
					disabled={savingAll || dirtyRows.length === 0}
				>
					{savingAll ? "Saving…" : `Save all (${dirtyRows.length})`}
				</Button>
			</Box>

			{error ? <Alert severity="error">{error}</Alert> : null}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress />
				</Box>
			) : mapRows.length === 0 ? (
				<Alert severity="info">No looms found for this date and spell.</Alert>
			) : (
				<Box sx={{ width: "100%", overflow: "auto", maxHeight: "calc(100vh - 320px)" }}>
					<Table size="small" stickyHeader sx={{ minWidth: 420, ...tightCell }}>
						<TableHead>
							<TableRow>
								<TableCell>Loom</TableCell>
								<TableCell align="right">Cuts</TableCell>
								<TableCell align="right">Cl.Jugar</TableCell>
								<TableCell align="right">Open</TableCell>
								<TableCell align="right">Tot.Jugar</TableCell>
								<TableCell />
							</TableRow>
						</TableHead>
						<TableBody>
							{visibleRows.map((r, i) => {
								const cell = edits[r.machine_id] ?? { cuts: "", close_jugar: "" };
								const entry = entryByMachine[r.machine_id];
								const tj = liveJugar(r, cell, entry);
								const newLine = i === 0 || visibleRows[i - 1].line_no !== r.line_no;
								return (
									<React.Fragment key={r.machine_id}>
										{newLine ? (
											<TableRow>
												<TableCell
													colSpan={6}
													sx={{ bgcolor: "action.hover", fontWeight: 600, py: 0.25 }}
												>
													{r.line_no != null ? `Line ${r.line_no}` : "No line"}
												</TableCell>
											</TableRow>
										) : null}
										<TableRow>
											<TableCell>
												<Typography variant="body2" sx={{ lineHeight: 1.2 }}>
													{r.mech_code}
													{r.mech_posting_code != null ? (
														<Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
															{` · #${r.mech_posting_code}`}
														</Box>
													) : null}
												</Typography>
												<Typography
													variant="caption"
													color="text.secondary"
													sx={{ display: { xs: "none", md: "block" } }}
												>
													{r.machine_name}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<TextField
													type="number"
													size="small"
													inputRef={(el: HTMLInputElement | null) => {
														cutsRefs.current[r.machine_id] = el;
													}}
													slotProps={{ htmlInput: { inputMode: "decimal" } }}
													value={cell.cuts}
													onChange={(e) => setCell(r.machine_id, "cuts", e.target.value)}
													sx={numInputSx}
												/>
											</TableCell>
											<TableCell align="right">
												<TextField
													type="number"
													size="small"
													slotProps={{ htmlInput: { inputMode: "decimal" } }}
													value={cell.close_jugar}
													onChange={(e) => setCell(r.machine_id, "close_jugar", e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															focusNextCuts(r.machine_id);
														}
													}}
													sx={numInputSx}
												/>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2">
													{entry?.open_jugar != null ? entry.open_jugar : DASH}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography
													variant="body2"
													color={tj != null && tj < 0 ? "error" : undefined}
													sx={{ fontWeight: tj != null && tj < 0 ? 600 : undefined }}
												>
													{tj != null ? tj : DASH}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Button
													variant="contained"
													size="small"
													onClick={() => handleSave(r.machine_id)}
													disabled={savingId === r.machine_id || savingAll}
													sx={{ minWidth: 0, px: 1 }}
												>
													{savingId === r.machine_id ? "…" : entry ? "Update" : "Save"}
												</Button>
											</TableCell>
										</TableRow>
									</React.Fragment>
								);
							})}
						</TableBody>
					</Table>
					{visibleRows.length === 0 ? (
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
							No looms match the search.
						</Typography>
					) : null}
				</Box>
			)}

			<Dialog open={!!confirm} onClose={() => setConfirm(null)}>
				<DialogTitle>Negative jugar — continue?</DialogTitle>
				<DialogContent>
					<DialogContentText component="div">
						Closing &lt; opening with no beam change records negative jugar — continue?
						<Box component="ul" sx={{ pl: 2.5, my: 1 }}>
							{(confirm?.negatives ?? []).map((n) => (
								<li key={n.id}>
									{n.code}: {n.value}
								</li>
							))}
						</Box>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirm(null)}>Cancel</Button>
					<Button
						variant="contained"
						color="warning"
						onClick={() => {
							const proceed = confirm?.proceed;
							setConfirm(null);
							proceed?.();
						}}
					>
						Continue
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={!!snack}
				autoHideDuration={4000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
