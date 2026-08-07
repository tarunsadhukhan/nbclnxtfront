"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	IconButton,
	MenuItem,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Plus as AddIcon, Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	MAX_SPOT_ROWS,
	humidityCreateSchema,
	type Department,
	type HumidityCreatePayload,
	type HumiditySetup,
} from "../types/humidityTypes";
import {
	blankSpotRow,
	computeRoundAverages,
	type SpotRowStrings,
} from "../utils/humidityCalc";

type Props = {
	coId: string;
	branchId: number;
	reportDate: string;
	setup: HumiditySetup;
	onSaved: () => void;
};

function fmt(n: number | null, dp = 2): string {
	return n != null && Number.isFinite(n) ? n.toFixed(dp) : "—";
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

/**
 * Humidity Recording SINGLE (date, department, round) reading-set entry form.
 *
 * One save = ONE header (report_date, department, round, prepared_by) + 1..3
 * spot readings, each {spot_label, reading_time "HH:MM", temp_c, rh_pct}. Live
 * avg_temp + avg_rh (mean over the filled spots) are shown. Submit = ONE POST of
 * the whole reading-set. The server recomputes avg_temp / avg_rh and is
 * AUTHORITATIVE; this preview is advisory.
 */
export default function HumidityForm({ coId, branchId, reportDate, setup, onSaved }: Props) {
	const [deptId, setDeptId] = React.useState<number | "">("");
	const [roundNo, setRoundNo] = React.useState<number | "">("");
	const [preparedBy, setPreparedBy] = React.useState("");
	const initialRowCount = Math.min(Math.max(setup.spots_per_round || MAX_SPOT_ROWS, 1), MAX_SPOT_ROWS);
	const [rows, setRows] = React.useState<SpotRowStrings[]>(() =>
		Array.from({ length: initialRowCount }, blankSpotRow),
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const deptById = React.useMemo(() => {
		const m = new Map<number, Department>();
		for (const d of setup.departments) m.set(d.dept_id, d);
		return m;
	}, [setup.departments]);

	const averages = React.useMemo(() => computeRoundAverages(rows), [rows]);

	const setRowField = React.useCallback(
		(index: number, key: keyof SpotRowStrings, value: string) => {
			setRows((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [key]: value };
				return next;
			});
		},
		[],
	);

	const addRow = React.useCallback(() => {
		setRows((prev) => (prev.length >= MAX_SPOT_ROWS ? prev : [...prev, blankSpotRow()]));
	}, []);

	const removeRow = React.useCallback((index: number) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setDeptId("");
		setRoundNo("");
		setRows(Array.from({ length: initialRowCount }, blankSpotRow));
		// Keep prepared_by so a run of same-operator entries is fast.
	}, [initialRowCount]);

	const handleSave = async () => {
		// Drop wholly-blank spot rows before validating so empty extra rows do not
		// block the save. Blank field -> NaN (not Number("")===0) so the schema flags
		// a partially-filled row instead of silently sending 0.
		const nonBlankRows = rows.filter(
			(r) => r.temp_c.trim() !== "" || r.rh_pct.trim() !== "",
		);
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			report_date: reportDate,
			dept_id: deptId === "" ? 0 : Number(deptId),
			round_no: roundNo === "" ? 0 : Number(roundNo),
			prepared_by: preparedBy.trim() === "" ? undefined : preparedBy.trim(),
			spots: nonBlankRows.map((r) => ({
				spot_label: r.spot_label.trim() === "" ? undefined : r.spot_label.trim(),
				reading_time: r.reading_time.trim() === "" ? undefined : r.reading_time.trim(),
				temp_c: num(r.temp_c),
				rh_pct: num(r.rh_pct),
			})),
		};

		const parsed = humidityCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: HumidityCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; humidity_id: number };
		}>(apiRoutesPortalMasters.HUMIDITY_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved humidity reading-set");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Humidity reading-set — one department, one round, and 1..{MAX_SPOT_ROWS} spot readings
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
					gap: 2,
				}}
			>
				<Autocomplete
					options={setup.departments}
					getOptionLabel={(opt) => opt.dept_desc}
					renderOption={(props, opt) => (
						<li {...props} key={opt.dept_id}>
							{opt.dept_desc}
							{opt.dept_code ? ` (${opt.dept_code})` : ""}
						</li>
					)}
					value={deptId === "" ? null : deptById.get(Number(deptId)) ?? null}
					onChange={(_, newVal) => setDeptId(newVal ? newVal.dept_id : "")}
					isOptionEqualToValue={(opt, val) => opt.dept_id === val.dept_id}
					size="small"
					renderInput={(params) => (
						<TextField {...params} label="Department" placeholder="Department" />
					)}
				/>

				<TextField
					select
					size="small"
					label="Round"
					value={roundNo}
					onChange={(e) => setRoundNo(e.target.value === "" ? "" : Number(e.target.value))}
				>
					{setup.rounds.map((r) => (
						<MenuItem key={r.round_no} value={r.round_no}>
							{r.label}
						</MenuItem>
					))}
				</TextField>

				<TextField
					size="small"
					label="Prepared by"
					value={preparedBy}
					onChange={(e) => setPreparedBy(e.target.value)}
				/>
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 560 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }}>#</TableCell>
							<TableCell sx={{ minWidth: 140 }}>Spot label</TableCell>
							<TableCell sx={{ minWidth: 110 }}>Time (HH:MM)</TableCell>
							<TableCell align="right" sx={{ minWidth: 110 }}>
								Temp (°C)
							</TableCell>
							<TableCell align="right" sx={{ minWidth: 110 }}>
								RH %
							</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => (
							<TableRow key={`spot-${i}`}>
								<TableCell>{i + 1}</TableCell>
								<TableCell>
									<TextField
										size="small"
										variant="standard"
										value={r.spot_label}
										onChange={(e) => setRowField(i, "spot_label", e.target.value)}
										inputProps={{ "aria-label": `Spot ${i + 1} label` }}
										sx={{ width: 130 }}
									/>
								</TableCell>
								<TableCell>
									<TextField
										size="small"
										variant="standard"
										placeholder="HH:MM"
										value={r.reading_time}
										onChange={(e) => setRowField(i, "reading_time", e.target.value)}
										inputProps={{ "aria-label": `Spot ${i + 1} time` }}
										sx={{ width: 90 }}
									/>
								</TableCell>
								<TableCell align="right">
									<TextField
										type="number"
										size="small"
										variant="standard"
										value={r.temp_c}
										onChange={(e) => setRowField(i, "temp_c", e.target.value)}
										inputProps={{
											step: "any",
											min: 0,
											"aria-label": `Spot ${i + 1} temperature`,
											style: { textAlign: "right" },
										}}
										sx={{ width: 90 }}
									/>
								</TableCell>
								<TableCell align="right">
									<TextField
										type="number"
										size="small"
										variant="standard"
										value={r.rh_pct}
										onChange={(e) => setRowField(i, "rh_pct", e.target.value)}
										inputProps={{
											step: "any",
											min: 0,
											max: 100,
											"aria-label": `Spot ${i + 1} RH%`,
											style: { textAlign: "right" },
										}}
										sx={{ width: 90 }}
									/>
								</TableCell>
								<TableCell align="center">
									<Tooltip title="Remove spot">
										<span>
											<IconButton
												size="small"
												color="error"
												disabled={rows.length <= 1}
												onClick={() => removeRow(i)}
												sx={{ minWidth: 40, minHeight: 40 }}
											>
												<DeleteIcon size={16} />
											</IconButton>
										</span>
									</Tooltip>
								</TableCell>
							</TableRow>
						))}
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }} colSpan={3}>
								Avg
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(averages.avg_temp)}
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(averages.avg_rh)}
							</TableCell>
							<TableCell />
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>

			<Box>
				<Button
					size="small"
					startIcon={<AddIcon size={16} />}
					onClick={addRow}
					disabled={rows.length >= MAX_SPOT_ROWS}
				>
					Add spot
				</Button>
			</Box>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Reading-set"}
				</Button>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Paper>
	);
}
