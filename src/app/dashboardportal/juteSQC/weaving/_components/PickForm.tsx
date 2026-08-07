"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Snackbar, TextField } from "@mui/material";
import {
	Plus as AddIcon,
	Save as SaveIcon,
	Trash2 as DeleteOutlineIcon,
} from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// ---- Shared-contract option shapes (see weaving SQC backend contract) ----
export type WeavingQualityOption = {
	weaving_quality_id: number;
	item_id: number;
	item_code: string | null;
	item_name: string | null;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
};

export type WeavingLoomOption = {
	machine_id: number;
	machine_name: string | null;
	mech_code: string | null;
	line_no: number | null;
	branch_id: number | null;
};

export type WeavingPickSetup = {
	qualities: WeavingQualityOption[];
	looms: WeavingLoomOption[];
	readings: unknown[];
	summary: unknown[];
};

// One staged (not-yet-saved) observation row.
type StagedRow = {
	weaving_quality_id: number;
	machine_id: number;
	width: number | null;
	picks: number;
	// display labels captured at stage time
	qualityLabel: string;
	loomLabel: string;
};

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: WeavingPickSetup;
	onSaved: () => void;
};

function qualityLabel(q: WeavingQualityOption): string {
	return `${q.weaving_quality_code ?? ""} — ${q.weaving_quality_name ?? ""}`.trim();
}

function loomLabel(l: WeavingLoomOption): string {
	return `${l.mech_code ?? ""} ${l.machine_name ?? ""}`.trim();
}

export default function PickForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [qualityId, setQualityId] = React.useState<number | "">("");
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [width, setWidth] = React.useState<string>("");
	const [picks, setPicks] = React.useState<string>("");
	const [rows, setRows] = React.useState<StagedRow[]>([]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const selectedQuality = setup.qualities.find((q) => q.weaving_quality_id === Number(qualityId)) ?? null;
	const selectedLoom = setup.looms.find((l) => l.machine_id === Number(machineId)) ?? null;

	// Quality, loom and Pick/PPI are required; width optional.
	const formInvalid = !qualityId || !machineId || picks === "" || Number(picks) < 0;

	// Stage a row locally (multi-observation — POST all on save).
	const handleAddRow = () => {
		if (formInvalid || !selectedQuality || !selectedLoom) {
			setError("Select a quality and loom and enter Pick/PPI (≥ 0).");
			return;
		}
		setError(null);
		setRows((prev) => [
			...prev,
			{
				weaving_quality_id: selectedQuality.weaving_quality_id,
				machine_id: selectedLoom.machine_id,
				width: width === "" ? null : Number(width),
				picks: Number(picks),
				qualityLabel: qualityLabel(selectedQuality),
				loomLabel: loomLabel(selectedLoom),
			},
		]);
		// Keep quality + loom selected so the inspector can punch many readings quickly.
		setWidth("");
		setPicks("");
	};

	const handleRemoveRow = (idx: number) => {
		setRows((prev) => prev.filter((_, i) => i !== idx));
	};

	// POST all staged rows to the save endpoint.
	const handleSaveAll = async () => {
		if (rows.length === 0) {
			setError("Add at least one observation row before saving.");
			return;
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entries: rows.map((r) => ({
				weaving_quality_id: r.weaving_quality_id,
				machine_id: r.machine_id,
				width: r.width,
				picks: r.picks,
			})),
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.WEAVING_SQC_PICK_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved ${rows.length} reading${rows.length === 1 ? "" : "s"}`);
		setRows([]);
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
						md: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				<Autocomplete
					options={setup.qualities}
					getOptionLabel={qualityLabel}
					value={selectedQuality}
					onChange={(_, newVal) => setQualityId(newVal ? newVal.weaving_quality_id : "")}
					size="small"
					autoHighlight
					renderInput={(params) => <TextField {...params} label="Quality" />}
					isOptionEqualToValue={(opt, val) => opt.weaving_quality_id === val.weaving_quality_id}
				/>
				<Autocomplete
					options={setup.looms}
					getOptionLabel={loomLabel}
					value={selectedLoom}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					autoHighlight
					renderInput={(params) => <TextField {...params} label="Loom No" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					type="number"
					label="Width"
					value={width}
					onChange={(e) => setWidth(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Pick / PPI"
					value={picks}
					onChange={(e) => setPicks(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
			</Box>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box
				sx={{
					display: "flex",
					gap: 1.5,
					flexWrap: "wrap",
					justifyContent: { xs: "stretch", md: "flex-end" },
				}}
			>
				<Button
					variant="outlined"
					startIcon={<AddIcon size={18} />}
					onClick={handleAddRow}
					disabled={formInvalid}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					Add Row
				</Button>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSaveAll}
					disabled={rows.length === 0 || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : `Save ${rows.length || ""} Reading${rows.length === 1 ? "" : "s"}`.trim()}
				</Button>
			</Box>

			{/* Staged rows (not yet persisted) */}
			{rows.length > 0 ? (
				<Box
					component="table"
					sx={{
						width: "100%",
						borderCollapse: "collapse",
						"& th, & td": {
							borderBottom: "1px solid",
							borderColor: "divider",
							px: 1,
							py: 0.75,
							textAlign: "left",
							fontSize: 14,
						},
						"& th": { color: "text.secondary", fontWeight: 600 },
					}}
				>
					<Box component="thead">
						<Box component="tr">
							<Box component="th">Quality</Box>
							<Box component="th">Loom</Box>
							<Box component="th" sx={{ textAlign: "right!important" }}>
								Width
							</Box>
							<Box component="th" sx={{ textAlign: "right!important" }}>
								Pick / PPI
							</Box>
							<Box component="th" sx={{ width: 56 }} />
						</Box>
					</Box>
					<Box component="tbody">
						{rows.map((r, i) => (
							<Box component="tr" key={`${r.weaving_quality_id}-${r.machine_id}-${i}`}>
								<Box component="td">{r.qualityLabel}</Box>
								<Box component="td">{r.loomLabel}</Box>
								<Box component="td" sx={{ textAlign: "right!important" }}>
									{r.width != null ? r.width.toFixed(2) : "—"}
								</Box>
								<Box component="td" sx={{ textAlign: "right!important" }}>
									{r.picks.toFixed(2)}
								</Box>
								<Box component="td">
									<Button
										size="small"
										color="error"
										onClick={() => handleRemoveRow(i)}
										sx={{ minWidth: 0, p: 0.5 }}
									>
										<DeleteOutlineIcon size={16} />
									</Button>
								</Box>
							</Box>
						))}
					</Box>
				</Box>
			) : null}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
