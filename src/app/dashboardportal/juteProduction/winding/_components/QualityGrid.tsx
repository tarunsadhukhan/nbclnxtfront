"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	CircularProgress,
	IconButton,
	MenuItem,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { RefreshCw as GetIcon, Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	YarnItemOption,
	WindingMachineOption,
	WindingQualityRow,
} from "../types/windingTypes";
import { useQualitySetup } from "../hooks/useQualitySetup";
import { useQualityByDate } from "../hooks/useQualityByDate";
import { SPINDLE_MIN, SPINDLE_MAX } from "../utils/windingCalc";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	yarnItems: YarnItemOption[];
};

type EditState = {
	item_id: number | "";
	machine_id: number | "";
	no_of_spindle: string;
};

// The person -> quality map for one date + spell. "Get Quality" seeds one row
// per winder carried forward from the previous spell (nothing when there is no
// prior spell) and returns them; each row's yarn + spindle (1..30) is editable
// and saved individually. Winders are added with the picker and removed with
// the row bin — the doff form prefills its Yarn from this map.
export default function QualityGrid({ coId, branchId, date, spellId, yarnItems }: Props) {
	const { setup, loading: setupLoading, error: setupError, run, reset } = useQualitySetup(
		coId,
		branchId,
	);
	const { rows: dayRows, loading: dayLoading, refresh: refreshDay } = useQualityByDate(
		coId,
		date,
		branchId,
		spellId,
	);
	const [edits, setEdits] = React.useState<Record<number, EditState>>({});
	const [savingId, setSavingId] = React.useState<number | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);
	const [adding, setAdding] = React.useState(false);
	const [snack, setSnack] = React.useState<string | null>(null);

	const yarnOpts = setup?.yarn_items ?? yarnItems;
	const machineOpts = React.useMemo(() => setup?.machines ?? [], [setup]);
	const mapRows = React.useMemo(() => setup?.rows ?? [], [setup]);
	const machineLabel = (m: WindingMachineOption) =>
		`${m.mech_code ?? ""} — ${m.machine_name ?? ""}`;

	// Reset the editable section when the date/spell context changes.
	React.useEffect(() => {
		reset();
		setEdits({});
	}, [date, spellId, reset]);

	// Seed local edit state from fetched setup rows.
	React.useEffect(() => {
		if (!setup) return;
		const seed: Record<number, EditState> = {};
		setup.rows.forEach((r) => {
			seed[r.winding_daily_qlty_id] = {
				item_id: r.item_id ?? "",
				machine_id: r.machine_id ?? "",
				no_of_spindle: String(r.no_of_spindle ?? 0),
			};
		});
		setEdits(seed);
	}, [setup]);

	// Winders not yet on the map — the only ones worth offering in the picker.
	const addableWorkers = React.useMemo(() => {
		const mapped = new Set(mapRows.map((r) => r.eb_id));
		return (setup?.workers ?? []).filter((w) => !mapped.has(w.eb_id));
	}, [setup, mapRows]);

	const handleGet = async () => {
		if (spellId == null) {
			setSnack("Select a spell first.");
			return;
		}
		await run(date, spellId);
	};

	const setYarn = (id: number, value: number | "") =>
		setEdits((prev) => ({ ...prev, [id]: { ...prev[id], item_id: value } }));
	const setMachine = (id: number, value: number | "") =>
		setEdits((prev) => ({ ...prev, [id]: { ...prev[id], machine_id: value } }));
	const setSpindle = (id: number, value: string) =>
		setEdits((prev) => ({ ...prev, [id]: { ...prev[id], no_of_spindle: value } }));

	const handleAddWinder = async (ebId: number) => {
		if (spellId == null) return;
		setAdding(true);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			eb_id: ebId,
		};
		const { error: err } = await fetchWithCookie<{ data: { winding_daily_qlty_id: number } }>(
			apiRoutesPortalMasters.WINDING_QUALITY_ADD,
			"POST",
			body,
		);
		setAdding(false);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack("Winder added.");
		await run(date, spellId);
		refreshDay();
	};

	const handleDeleteRow = async (row: WindingQualityRow) => {
		if (!window.confirm(`Remove ${row.emp_code ?? row.eb_id} from this spell's map?`)) return;
		setDeletingId(row.winding_daily_qlty_id);
		const url = `${apiRoutesPortalMasters.WINDING_QUALITY_DELETE}/${row.winding_daily_qlty_id}?co_id=${coId}`;
		const { error: err } = await fetchWithCookie(url, "DELETE");
		setDeletingId(null);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack("Winder removed.");
		if (spellId != null) await run(date, spellId);
		refreshDay();
	};

	const handleSaveRow = async (row: WindingQualityRow) => {
		const e = edits[row.winding_daily_qlty_id];
		if (!e) return;
		const spindle = e.no_of_spindle === "" ? NaN : Number(e.no_of_spindle);
		if (Number.isNaN(spindle) || spindle < SPINDLE_MIN || spindle > SPINDLE_MAX) {
			setSnack(`Spindles must be between ${SPINDLE_MIN} and ${SPINDLE_MAX}.`);
			return;
		}
		setSavingId(row.winding_daily_qlty_id);
		const url = `${apiRoutesPortalMasters.WINDING_QUALITY_SAVE}/${row.winding_daily_qlty_id}?co_id=${coId}`;
		const body = {
			co_id: Number(coId),
			item_id: e.item_id === "" ? null : Number(e.item_id),
			machine_id: e.machine_id === "" ? null : Number(e.machine_id),
			no_of_spindle: spindle,
		};
		const { error: err } = await fetchWithCookie(url, "PUT", body);
		setSavingId(null);
		if (err) {
			setSnack(err);
			return;
		}
		setSnack(`Saved yarn for ${row.emp_code ?? row.eb_id}`);
		refreshDay();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
					<Typography variant="subtitle2">Yarn &amp; spindle entry</Typography>
					<Button
						variant="contained"
						size="small"
						startIcon={<GetIcon size={16} />}
						onClick={handleGet}
						disabled={setupLoading || spellId == null}
					>
						{setupLoading ? "Loading…" : "Get Quality"}
					</Button>
					{setup ? (
						<Autocomplete
							options={addableWorkers}
							getOptionLabel={(w) => w.label}
							renderOption={(props, w) => (
								<li {...props} key={w.eb_id}>
									{w.label}
								</li>
							)}
							value={null}
							onChange={(_, newVal) => {
								if (newVal) void handleAddWinder(newVal.eb_id);
							}}
							size="small"
							disabled={adding || spellId == null}
							clearOnEscape
							blurOnSelect
							isOptionEqualToValue={(opt, val) => opt.eb_id === val.eb_id}
							sx={{ minWidth: 280 }}
							renderInput={(params) => <TextField {...params} label="Add winder" />}
						/>
					) : null}
				</Box>

				{setupError ? <Alert severity="error">{setupError}</Alert> : null}

				{setupLoading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress />
					</Box>
				) : setup && mapRows.length > 0 ? (
					<Box sx={{ width: "100%", overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 960 }}>
							<TableHead>
								<TableRow>
									<TableCell>Winder</TableCell>
									<TableCell>Machine</TableCell>
									<TableCell>Yarn</TableCell>
									<TableCell>No. of Spindle</TableCell>
									<TableCell align="right">Save</TableCell>
									<TableCell align="right">Remove</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{mapRows.map((r) => {
									const e = edits[r.winding_daily_qlty_id] ?? {
										item_id: "",
										machine_id: "",
										no_of_spindle: "0",
									};
									return (
										<TableRow key={r.winding_daily_qlty_id}>
											<TableCell>{`${r.emp_code ?? ""} — ${r.worker_name ?? ""}`}</TableCell>
											<TableCell>
												<Autocomplete
													options={machineOpts}
													getOptionLabel={machineLabel}
													renderOption={(props, m) => (
														<li {...props} key={m.machine_id}>
															{machineLabel(m)}
														</li>
													)}
													value={
														e.machine_id === ""
															? null
															: machineOpts.find((m) => m.machine_id === Number(e.machine_id)) ?? null
													}
													onChange={(_, newVal) =>
														setMachine(r.winding_daily_qlty_id, newVal ? newVal.machine_id : "")
													}
													size="small"
													clearOnEscape
													isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
													sx={{ minWidth: 200 }}
													renderInput={(params) => <TextField {...params} />}
												/>
											</TableCell>
											<TableCell>
												<TextField
													select
													size="small"
													value={e.item_id}
													onChange={(ev) =>
														setYarn(
															r.winding_daily_qlty_id,
															ev.target.value === "" ? "" : Number(ev.target.value),
														)
													}
													sx={{ minWidth: 200 }}
												>
													<MenuItem value="">
														<em>None</em>
													</MenuItem>
													{yarnOpts.map((y) => (
														<MenuItem key={y.item_id} value={y.item_id}>
															{y.item_code} — {y.item_name ?? ""}
														</MenuItem>
													))}
												</TextField>
											</TableCell>
											<TableCell>
												<TextField
													type="number"
													size="small"
													value={e.no_of_spindle}
													onChange={(ev) => setSpindle(r.winding_daily_qlty_id, ev.target.value)}
													inputProps={{ min: SPINDLE_MIN, max: SPINDLE_MAX }}
													sx={{ width: 120 }}
												/>
											</TableCell>
											<TableCell align="right">
												<Tooltip title="Save row">
													<span>
														<IconButton
															size="small"
															color="primary"
															onClick={() => handleSaveRow(r)}
															disabled={savingId === r.winding_daily_qlty_id}
															sx={{ minWidth: 40, minHeight: 40 }}
														>
															<SaveIcon size={16} />
														</IconButton>
													</span>
												</Tooltip>
											</TableCell>
											<TableCell align="right">
												<Tooltip title="Remove winder">
													<span>
														<IconButton
															size="small"
															color="error"
															onClick={() => handleDeleteRow(r)}
															disabled={deletingId === r.winding_daily_qlty_id}
															sx={{ minWidth: 40, minHeight: 40 }}
														>
															<DeleteIcon size={16} />
														</IconButton>
													</span>
												</Tooltip>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</Box>
				) : setup ? (
					<Alert severity="info">
						No winders on the map for this date and spell — nothing was carried forward from the
						previous spell. Use &ldquo;Add winder&rdquo; above to build it.
					</Alert>
				) : (
					<Alert severity="info">Press &ldquo;Get Quality&rdquo; to load / seed the winder rows.</Alert>
				)}
			</Box>

			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Yarn entries
				</Typography>
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<Table size="small" sx={{ minWidth: 760 }}>
						<TableHead>
							<TableRow>
								<TableCell>Winder</TableCell>
								<TableCell>Machine</TableCell>
								<TableCell>Yarn</TableCell>
								<TableCell>Spindles</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{dayLoading ? (
								<TableRow>
									<TableCell colSpan={4} align="center">
										<CircularProgress size={20} />
									</TableCell>
								</TableRow>
							) : dayRows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} align="center">
										No entries for this date / spell.
									</TableCell>
								</TableRow>
							) : (
								dayRows.map((r) => (
									<TableRow key={r.winding_daily_qlty_id}>
										<TableCell>{`${r.emp_code ?? ""} — ${r.worker_name ?? ""}`}</TableCell>
										<TableCell>{r.mech_code ?? r.machine_name ?? "—"}</TableCell>
										<TableCell>{r.item_code ?? "—"}</TableCell>
										<TableCell>{r.no_of_spindle}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</Box>
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
