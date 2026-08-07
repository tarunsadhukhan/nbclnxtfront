// Types for the R-08-22 Stitch SQC screen — finishing-stage sewing-stitch-density
// QC. Mirrors the backend /api/juteSQC stitch endpoints (single flat table,
// beam_mr/morrah pattern — readings stored as a JSON-string array, NO detail table).
//
// SINGLE reading-set entry: one save = one (date, sewing machine) reading-set
// carrying EXACTLY 5 stitch counts (stitches/dm). The server computes
// avg = mean(5) and flag ('OK' when avg == std_stitch, else 'LOW' if
// avg < std_stitch, else 'HIGH') and is AUTHORITATIVE; the FE only previews the
// math for live display. std_stitch is entered on the form (prefill 9, editable),
// snapshotted at save. Machine-only (NO quality column). NO CV%, NO MR correction.
// Dates are 'YYYY-MM-DD' strings.

import { z } from "zod";

// ─── Number of stitch counts captured per set (fixed at 5) ────────────────────
export const STITCH_READINGS = 5;

// Fallback std stitch density (stitches/dm) if the server omits default_std_stitch.
export const DEFAULT_STD_STITCH = 9;

// ─── Flag (server-authoritative, also previewed client-side) ──────────────────
export type StitchFlag = "OK" | "LOW" | "HIGH";

// ─── Master option shape ──────────────────────────────────────────────────────

// A sewing/hemming machine (machine_mst ⨝ machine_type_mst, de-duped by machine_id).
export type StitchMachine = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
};

// ─── Setup payload ───────────────────────────────────────────────────────────
// GET stitch_create_setup -> {data: {machines, default_std_stitch, readings_count}}.
export type StitchSetup = {
	machines: StitchMachine[];
	default_std_stitch: number;
	readings_count: number;
};

// ─── Saved reading row (by-date read) ─────────────────────────────────────────
export type StitchRow = {
	stitch_id: number;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	std_stitch?: number | null;
	readings: number[]; // length 5
	avg?: number | null;
	flag?: StitchFlag | null;
	inspector_name?: string | null;
};

// GET get_stitch_by_date -> {data: {rows}}.
export type StitchByDateResponse = {
	rows: StitchRow[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_stitch_table -> {data, total, page, page_size}.
export type StitchHistoryRow = {
	stitch_id?: number | null;
	entry_date?: string | null;
	machine_name?: string | null;
	mech_code?: string | null;
	std_stitch?: number | null;
	avg?: number | null;
	flag?: StitchFlag | null;
	inspector_name?: string | null;
};

export type StitchTableResponse = {
	data: StitchHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single reading-set) ──────────────────────────────────────
// POST create_stitch -> {message, stitch_id}.
export type StitchCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	mc_id: number;
	std_stitch: number;
	readings: number[]; // exactly 5
	inspector_name?: string;
};

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Exactly 5 readings, all > 0; std_stitch > 0;
// machine selected. inspector_name optional.
export const stitchCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	mc_id: z.number({ error: "A sewing machine must be selected" }).int().positive("A sewing machine must be selected"),
	std_stitch: z.number({ error: "Std stitch is required" }).positive("Std stitch must be greater than 0"),
	// Allow NaN at the element level (blank inputs map to NaN) so the friendly
	// refine messages below fire instead of Zod's default "expected number, received NaN".
	readings: z
		.array(z.number().or(z.nan()))
		.refine((arr) => arr.length === STITCH_READINGS, `Enter all ${STITCH_READINGS} stitch counts`)
		.refine((arr) => arr.every((m) => Number.isFinite(m)), `Enter all ${STITCH_READINGS} stitch counts`)
		.refine((arr) => arr.every((m) => m > 0), "Each stitch count must be greater than 0"),
	inspector_name: z.string().trim().optional(),
});

export type StitchCreateFormValues = z.infer<typeof stitchCreateSchema>;
