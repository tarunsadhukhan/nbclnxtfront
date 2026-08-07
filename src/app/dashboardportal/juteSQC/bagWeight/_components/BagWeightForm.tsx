"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	IconButton,
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
	bagWeightCreateSchema,
	type BagWeightCreatePayload,
	type BagWeightSetup,
} from "../types/bagWeightTypes";
import {
	blankReading,
	computeBlockStats,
	computeRowCorr,
	hyLtLabel,
	type ReadingStrings,
} from "../utils/bagWeightCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BagWeightSetup;
	onSaved: () => void;
};

function fmt(n: number | null, dp = 2): string {
	return n != null && Number.isFinite(n) ? n.toFixed(dp) : "—";
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

/**
 * R-08-23 Bag Weight SINGLE (date, bag type) block entry form.
 *
 * One save = ONE header (date, bag type, std_bag_weight, std_mr_pct) + N reading
 * rows (>=1, no upper cap), each {mr (MR%), obs (observed bag weight gm)}. std_mr_pct
 * prefills from the setup default (20 for jute bags); std fields are editable and
 * snapshotted at save. Live per-row corr and block stats (avg_mr/avg_obs/avg_corr,
 * obs stdev/CV%, OBS+CORR HY/LT%) are shown. Submit = ONE POST of the whole block
 * (array of readings). The server recomputes corr / stats and is AUTHORITATIVE;
 * this preview is advisory.
 */
export default function BagWeightForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [stdBagWeight, setStdBagWeight] = React.useState("");
	const [stdMrPct, setStdMrPct] = React.useState(String(setup.default_std_mr_pct));
	const [rows, setRows] = React.useState<ReadingStrings[]>(() => [blankReading()]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.bag_types)[number]>();
		for (const b of setup.bag_types) m.set(b.item_id, b);
		return m;
	}, [setup.bag_types]);

	const stdMrNum = num(stdMrPct);
	const stdMrForPreview = Number.isFinite(stdMrNum) ? stdMrNum : setup.default_std_mr_pct;
	const stats = React.useMemo(
		() => computeBlockStats(rows, stdMrForPreview, num(stdBagWeight)),
		[rows, stdMrForPreview, stdBagWeight],
	);

	const setRowField = React.useCallback(
		(index: number, key: keyof ReadingStrings, value: string) => {
			setRows((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [key]: value };
				return next;
			});
		},
		[],
	);

	const addRow = React.useCallback(() => {
		setRows((prev) => [...prev, blankReading()]);
	}, []);

	const removeRow = React.useCallback((index: number) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setStdBagWeight("");
		setRows([blankReading()]);
		// Keep std_mr_pct so a run of same-type blocks is fast.
	}, []);

	const handleSave = async () => {
		// Drop wholly-blank rows before validating so empty extra rows do not block
		// the save. Blank field -> NaN (not Number("")===0) so the schema flags a
		// partially-filled row instead of silently sending 0.
		const nonBlankRows = rows.filter((r) => r.mr.trim() !== "" || r.obs.trim() !== "");
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			item_id: itemId === "" ? 0 : Number(itemId),
			bag_type_label: itemId === "" ? undefined : itemById.get(Number(itemId))?.item_name,
			std_bag_weight: num(stdBagWeight),
			std_mr_pct: num(stdMrPct),
			readings: nonBlankRows.map((r) => ({ mr: num(r.mr), obs: num(r.obs) })),
		};

		const parsed = bagWeightCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: BagWeightCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; bag_weight_id: number };
		}>(apiRoutesPortalMasters.BAG_WEIGHT_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved bag weight block");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Bag weight block — one bag type, its standards, and any number of reading rows
			</Typography>

			<Box
				sx={{
					display: "flex",
					gap: 2,
					flexWrap: "wrap",
					alignItems: "flex-start",
				}}
			>
				<Autocomplete
					options={setup.bag_types}
					getOptionLabel={(opt) => opt.item_name}
					renderOption={(props, opt) => (
						<li {...props} key={opt.item_id}>
							{opt.item_name}
							{opt.item_code ? ` (${opt.item_code})` : ""}
						</li>
					)}
					value={itemId === "" ? null : itemById.get(Number(itemId)) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
					size="small"
					sx={{ minWidth: 280, flex: "1 1 280px" }}
					renderInput={(params) => (
						<TextField {...params} label="Bag type" placeholder="Bag type" />
					)}
				/>
				<TextField
					type="number"
					size="small"
					label="Std bag weight (gm)"
					value={stdBagWeight}
					onChange={(e) => setStdBagWeight(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std bag weight (gm)" }}
					sx={{ width: 180 }}
				/>
				<TextField
					type="number"
					size="small"
					label="Std MR%"
					value={stdMrPct}
					onChange={(e) => setStdMrPct(e.target.value)}
					inputProps={{ step: "any", min: 0, "aria-label": "Std MR%" }}
					helperText={`Default ${setup.default_std_mr_pct}`}
					sx={{ width: 160 }}
				/>
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 480 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }}>#</TableCell>
							<TableCell align="right" sx={{ minWidth: 120 }}>
								MR%
							</TableCell>
							<TableCell align="right" sx={{ minWidth: 150 }}>
								Obs weight (gm)
							</TableCell>
							<TableCell align="right" sx={{ minWidth: 110 }}>
								Corr weight
							</TableCell>
							<TableCell align="center" sx={{ width: 56 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => {
							const corr = computeRowCorr(r, stdMrForPreview);
							return (
								<TableRow key={`reading-${i}`}>
									<TableCell>{i + 1}</TableCell>
									<TableCell align="right">
										<TextField
											type="number"
											size="small"
											variant="standard"
											value={r.mr}
											onChange={(e) => setRowField(i, "mr", e.target.value)}
											inputProps={{
												step: "any",
												min: 0,
												"aria-label": `Row ${i + 1} MR%`,
												style: { textAlign: "right" },
											}}
											sx={{ width: 100 }}
										/>
									</TableCell>
									<TableCell align="right">
										<TextField
											type="number"
											size="small"
											variant="standard"
											value={r.obs}
											onChange={(e) => setRowField(i, "obs", e.target.value)}
											inputProps={{
												step: "any",
												min: 0,
												"aria-label": `Row ${i + 1} observed weight`,
												style: { textAlign: "right" },
											}}
											sx={{ width: 120 }}
										/>
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 600 }}>
										{fmt(corr)}
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Remove row">
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
							);
						})}
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }}>Avg</TableCell>
							<TableCell align="right">{fmt(stats.avg_mr)}</TableCell>
							<TableCell align="right">{fmt(stats.avg_obs)}</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(stats.avg_corr)}
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
				>
					Add reading row
				</Button>
			</Box>

			{/* Live block stats */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
					gap: 1,
					p: 1.5,
					bgcolor: "action.hover",
					borderRadius: 1,
				}}
			>
				<Stat label="Avg MR%" value={fmt(stats.avg_mr)} />
				<Stat label="Avg obs (gm)" value={fmt(stats.avg_obs)} />
				<Stat label="Avg corr (gm)" value={fmt(stats.avg_corr)} />
				<Stat label="Obs std dev" value={fmt(stats.obs_stdev, 4)} />
				<Stat label="Obs CV %" value={fmt(stats.obs_cv_pct, 4)} />
				<Stat label="Obs HY/LT %" value={hyLtLabel(stats.obs_hy_lt_pct)} />
				<Stat label="Corr HY/LT %" value={hyLtLabel(stats.corr_hy_lt_pct)} />
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
					{saving ? "Saving…" : "Save Block"}
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

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="body2" sx={{ fontWeight: 600 }}>
				{value}
			</Typography>
		</Box>
	);
}
