// Types for the R-08-23 Bag Weight SQC screen — finished-bag weight control.
// Mirrors the backend /api/juteSQC bag-weight endpoints (single flat table,
// morrah pattern — readings stored as a JSON-string array of {mr, obs}).
//
// SINGLE (date, bag type) block: one save = ONE header (entry_date, bag type,
// std_bag_weight, std_mr_pct) + N reading rows (>=1, no upper cap), each row = {mr (MR%),
// obs (observed bag weight, gm)}. The server computes the per-row corrected
// weight, the block averages, the SAMPLE stdev/CV%, and the OBS/CORR HY-LT% and
// is AUTHORITATIVE; the FE only previews the math for live display.
//
// std_bag_weight + std_mr_pct are entered on the form (std_mr_pct prefills 20 for
// jute bags), editable, SNAPSHOT at save (no item-master change). Bag type
// dropdown = JUTE CLOTH items (item_type_id=5). Dates are 'YYYY-MM-DD' strings.
// HY/LT is display-only (positive = Heavy, negative = Light); NO pass/fail band.

import { z } from "zod";

// Default Std MR% (jute bags) used to prefill the form's std_mr_pct field.
export const DEFAULT_STD_MR_PCT = 20;

// ─── Master option shape ──────────────────────────────────────────────────────

// A jute-cloth bag item (item_mst, item_type_id=5). Reuses the beaming cloth
// picker shape.
export type BagType = {
	item_id: number;
	item_code?: string | null;
	item_name: string;
};

// ─── Setup payload ────────────────────────────────────────────────────────────
// GET bag_weight_create_setup -> {data: {bag_types, default_std_mr_pct}}.
export type BagWeightSetup = {
	bag_types: BagType[];
	default_std_mr_pct: number;
};

// ─── Saved reading row (by-date read) ─────────────────────────────────────────
export type BagWeightReading = {
	mr?: number | null;
	obs?: number | null;
	corr?: number | null; // server-computed: obs*(100+std_mr)/(100+mr)
};

// ─── Per (date, bag type) block summary (by_date) ─────────────────────────────
export type BagWeightBlock = {
	bag_weight_id: number;
	item_id?: number | null;
	item_name?: string | null;
	bag_type_label?: string | null;
	std_bag_weight?: number | null;
	std_mr_pct?: number | null;
	readings: BagWeightReading[];
	avg_mr?: number | null;
	avg_obs?: number | null;
	avg_corr?: number | null;
	obs_stdev?: number | null;
	obs_cv_pct?: number | null;
	obs_hy_lt_pct?: number | null;
	corr_hy_lt_pct?: number | null;
};

// GET get_bag_weight_by_date -> {data: {blocks}}.
export type BagWeightByDateResponse = {
	blocks: BagWeightBlock[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_bag_weight_table -> {data, total, page, page_size}.
export type BagWeightHistoryRow = {
	bag_weight_id?: number | null;
	entry_date?: string | null;
	item_name?: string | null;
	bag_type_label?: string | null;
	std_bag_weight?: number | null;
	std_mr_pct?: number | null;
	avg_obs?: number | null;
	avg_corr?: number | null;
	obs_stdev?: number | null;
	obs_cv_pct?: number | null;
	obs_hy_lt_pct?: number | null;
	corr_hy_lt_pct?: number | null;
};

export type BagWeightTableResponse = {
	data: BagWeightHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single block) ────────────────────────────────────────────
// POST create_bag_weight -> {message, bag_weight_id}.
export type BagWeightCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	item_id: number;
	bag_type_label?: string;
	std_bag_weight: number;
	std_mr_pct: number;
	readings: { mr: number; obs: number }[];
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Allow NaN at the element level (blank inputs map
// to NaN) so the friendly refine messages fire instead of Zod's default
// "expected number, received NaN".
const readingSchema = z.object({
	mr: z.number().or(z.nan()),
	obs: z.number().or(z.nan()),
});

export const bagWeightCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	item_id: z
		.number({ error: "A bag type must be selected" })
		.int()
		.positive("A bag type must be selected"),
	bag_type_label: z.string().optional(),
	std_bag_weight: z
		.number({ error: "Std bag weight is required" })
		.refine((n) => Number.isFinite(n) && n > 0, "Std bag weight must be greater than 0"),
	std_mr_pct: z
		.number({ error: "Std MR% is required" })
		.refine((n) => Number.isFinite(n) && n > 0, "Std MR% must be greater than 0"),
	readings: z
		.array(readingSchema)
		.refine((arr) => arr.length >= 1, "Enter at least one reading row")
		.refine(
			(arr) => arr.every((r) => Number.isFinite(r.mr) && Number.isFinite(r.obs)),
			"Every MR% and observed weight is required",
		)
		.refine(
			(arr) => arr.every((r) => r.mr > 0 && r.obs > 0),
			"Every MR% and observed weight must be greater than 0",
		),
});

export type BagWeightCreateFormValues = z.infer<typeof bagWeightCreateSchema>;
