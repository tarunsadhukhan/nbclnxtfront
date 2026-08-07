"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";

// --- Types (match the target_map_grid contract exactly) -------------------
// Beaming standards are split by id_type: 'mcid' (Machine — speed/dia) and
// 'qid' (Quality = bm_quality — laid_length/cuts_per_beam/eff). value_role is
// standard | target | actual. 'actual' is used by the Beaming SQC page, which
// reuses these endpoints with value_role='actual' (param 'speed' = actual RPM).

export type IdType = "mcid" | "qid";
export type ValueRole = "standard" | "target" | "actual";

export type TargetGridCell = {
	value: number | null;
	source_date: string | null;
	is_exact: boolean;
};

export type TargetGridRow = {
	ref_id: number;
	ref_code: string | null;
	ref_name: string | null;
	cells: Record<string, TargetGridCell | undefined>;
};

export type TargetGridData = {
	params: string[];
	rows: TargetGridRow[];
};

// A dirty cell to send to target_map_bulk_save. value === null clears a cell that
// previously held a value.
export type DirtyCell = { ref_id: number; param: string; value: number | null };

type Props = {
	grid: TargetGridData;
	loading: boolean;
	saving: boolean;
	effectiveDate: string;
	paramLabels: Record<string, string>;
	onSave: (cells: DirtyCell[]) => void;
};

// Local editable state: ref_id -> param -> raw string ("" = empty/cleared).
type EditState = Record<number, Record<string, string>>;

const numToStr = (v: number | null | undefined): string =>
	v === null || v === undefined ? "" : String(v);

export default function TargetGrid({
	grid,
	loading,
	saving,
	effectiveDate,
	paramLabels,
	onSave,
}: Props) {
	// Baseline = the loaded value per cell as a string ("" when absent). A cell is
	// dirty when its current edit differs from this baseline.
	const baseline = React.useMemo<EditState>(() => {
		const m: EditState = {};
		grid.rows.forEach((r) => {
			m[r.ref_id] = {};
			grid.params.forEach((p) => {
				m[r.ref_id][p] = numToStr(r.cells[p]?.value ?? null);
			});
		});
		return m;
	}, [grid]);

	const [edits, setEdits] = React.useState<EditState>(baseline);

	// Reseed edits whenever a fresh grid loads (date / role change).
	React.useEffect(() => {
		setEdits(baseline);
	}, [baseline]);

	const setCell = (refId: number, param: string, raw: string) => {
		setEdits((prev) => ({
			...prev,
			[refId]: { ...(prev[refId] ?? {}), [param]: raw },
		}));
	};

	const isDirty = React.useCallback(
		(refId: number, param: string) =>
			(edits[refId]?.[param] ?? "") !== (baseline[refId]?.[param] ?? ""),
		[edits, baseline]
	);

	const { dirtyCells, invalidCount } = React.useMemo(() => {
		const out: DirtyCell[] = [];
		let invalid = 0;
		grid.rows.forEach((r) => {
			grid.params.forEach((p) => {
				if (!isDirty(r.ref_id, p)) return;
				const raw = edits[r.ref_id]?.[p] ?? "";
				if (raw === "") {
					out.push({ ref_id: r.ref_id, param: p, value: null });
					return;
				}
				const num = Number(raw);
				if (!Number.isFinite(num)) {
					// Partial / invalid input ("-", "1e"): never send NaN (JSON.stringify
					// turns it into null = a spurious clear). Flag it and block save.
					invalid += 1;
					return;
				}
				out.push({ ref_id: r.ref_id, param: p, value: num });
			});
		});
		return { dirtyCells: out, invalidCount: invalid };
	}, [grid, edits, isDirty]);

	const dirtyCount = dirtyCells.length;

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (grid.rows.length === 0) {
		return <Alert severity="info">No beaming machines / qualities found for this company.</Alert>;
	}

	if (grid.params.length === 0) {
		return <Alert severity="info">No parameters apply to this Role.</Alert>;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">Inline entry</Typography>
				<Button
					variant="contained"
					size="small"
					startIcon={<SaveIcon size={16} />}
					onClick={() => onSave(dirtyCells)}
					disabled={saving || dirtyCount === 0 || invalidCount > 0}
				>
					{saving ? "Saving…" : dirtyCount > 0 ? `Save (${dirtyCount} changed)` : "Save"}
				</Button>
				{invalidCount > 0 ? (
					<Typography variant="caption" color="error">
						{invalidCount} invalid entr{invalidCount === 1 ? "y" : "ies"} — fix to save.
					</Typography>
				) : null}
				<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
					Italic / muted = inherited from an earlier date; edit to set it on {effectiveDate}.
				</Typography>
			</Box>

			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 600 }}>
					<TableHead>
						<TableRow>
							<TableCell>Code</TableCell>
							<TableCell>Machine / Quality</TableCell>
							{grid.params.map((p) => (
								<TableCell key={p} align="right">
									{paramLabels[p] ?? p}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{grid.rows.map((r) => (
							<TableRow key={r.ref_id}>
								<TableCell>{r.ref_code ?? "—"}</TableCell>
								<TableCell>{r.ref_name ?? r.ref_id}</TableCell>
								{grid.params.map((p) => {
									const cell = r.cells[p];
									const dirty = isDirty(r.ref_id, p);
									const inherited = !!cell && cell.is_exact === false;
									// Show inherited values muted/italic until the user edits the cell.
									const showInherited = inherited && !dirty;
									const raw = edits[r.ref_id]?.[p] ?? "";
									const field = (
										<TextField
											type="number"
											size="small"
											value={raw}
											onChange={(ev) => setCell(r.ref_id, p, ev.target.value)}
											inputProps={{ step: 0.001, style: { textAlign: "right" } }}
											sx={{
												width: 110,
												bgcolor: dirty ? "rgba(255, 193, 7, 0.12)" : undefined,
												"& input": showInherited
													? { fontStyle: "italic", color: "text.disabled" }
													: undefined,
											}}
										/>
									);
									return (
										<TableCell key={p} align="right">
											{showInherited && cell?.source_date ? (
												<Tooltip title={`Inherited from ${cell.source_date}`}>
													<span>{field}</span>
												</Tooltip>
											) : (
												field
											)}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Box>
		</Box>
	);
}
