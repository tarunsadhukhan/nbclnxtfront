// Types for the R-08-20 Cutting Length SQC screen — daily cut-piece length
// consistency. Mirrors the backend /api/juteSQC cutting-length endpoints (single
// flat table, morrah pattern — readings stored as a JSON-string array).
//
// SINGLE reading-set entry: one save = one date's readings carrying EXACTLY 20
// cut-length readings (inches). The server computes avg (mean), SAMPLE stdev
// (n-1), cv_pct (= stdev/avg*100) and deviation (= avg - std_length) and is
// AUTHORITATIVE; the FE only previews the math for live display. std_length is
// entered on the form (prefill 78, editable), snapshotted at save. The optional
// cloth-quality link = JUTE CLOTH items (item_type_id=5), nullable. NO MR
// correction, NO pass/fail band. Dates are 'YYYY-MM-DD' strings.

import { z } from "zod";

// ─── Number of cut-length readings captured per set (fixed at 20) ─────────────
export const CUTTING_LENGTH_READINGS = 20;

// Fallback std length (inches) if the server omits default_std_length.
export const DEFAULT_STD_LENGTH = 78;

// ─── Master option shape ──────────────────────────────────────────────────────

// A jute-cloth quality item (item_mst, item_type_id=5).
export type ClothQuality = {
	item_id: number;
	item_code?: string | null;
	item_name: string;
};

// ─── Setup payload ───────────────────────────────────────────────────────────
// GET cutting_length_create_setup -> {data: {cloth_qualities, default_std_length,
//   readings_count}}.
export type CuttingLengthSetup = {
	cloth_qualities: ClothQuality[];
	default_std_length: number;
	readings_count: number;
};

// ─── Saved reading row (by-date read) ─────────────────────────────────────────
export type CuttingLengthRow = {
	cutting_length_id: number;
	item_id?: number | null;
	item_name?: string | null;
	std_length?: number | null;
	readings: number[]; // length 20
	avg?: number | null;
	stdev?: number | null;
	cv_pct?: number | null;
	deviation?: number | null;
};

// GET get_cutting_length_by_date -> {data: {rows}}.
export type CuttingLengthByDateResponse = {
	rows: CuttingLengthRow[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_cutting_length_table -> {data, total, page, page_size}.
export type CuttingLengthHistoryRow = {
	cutting_length_id?: number | null;
	entry_date?: string | null;
	item_name?: string | null;
	std_length?: number | null;
	avg?: number | null;
	stdev?: number | null;
	cv_pct?: number | null;
	deviation?: number | null;
};

export type CuttingLengthTableResponse = {
	data: CuttingLengthHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single reading-set) ──────────────────────────────────────
// POST create_cutting_length -> {message, cutting_length_id}.
export type CuttingLengthCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	item_id?: number; // optional cloth-quality link
	std_length: number;
	readings: number[]; // exactly 20
};

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Exactly 20 readings, all > 0; std_length > 0.
// item_id is optional (entry allowed without a quality).
export const cuttingLengthCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	item_id: z.number().int().positive().optional(),
	std_length: z.number({ error: "Std length is required" }).positive("Std length must be greater than 0"),
	// Allow NaN at the element level (blank inputs map to NaN) so the friendly
	// refine messages below fire instead of Zod's default "expected number, received NaN".
	readings: z
		.array(z.number().or(z.nan()))
		.refine((arr) => arr.length === CUTTING_LENGTH_READINGS, `Enter all ${CUTTING_LENGTH_READINGS} readings`)
		.refine((arr) => arr.every((m) => Number.isFinite(m)), `Enter all ${CUTTING_LENGTH_READINGS} readings`)
		.refine((arr) => arr.every((m) => m > 0), "Each reading must be greater than 0"),
});

export type CuttingLengthCreateFormValues = z.infer<typeof cuttingLengthCreateSchema>;
