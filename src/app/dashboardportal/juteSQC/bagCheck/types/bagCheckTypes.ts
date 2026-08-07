// Types for the R-08-24 Bag Checking SQC screen — finished-bag acceptance
// inspection. Mirrors the backend /api/juteSQC bag-check endpoints (header +
// detail tables, NOT JSON).
//
// SINGLE (date, bag type) block: one save = ONE header (entry_date, bag type,
// vendor_name FREE TEXT, id_code FREE TEXT, and 7 std snapshots) + N per-bag
// detail rows (>=1, 20+). Each bag carries 7 MEASURED inputs (length_cm,
// width_cm, ends_dm, picks_dm, mr_pct, bag_wt_gm, stitch_dm) — all required,
// >0 — plus optional free-text defects. The server computes per-bag corr_wt,
// the per-column aggregates, and the OBS/CORR HY-LT% and is AUTHORITATIVE; the
// FE only previews the math for live display.
//
// 7 PER-QUALITY STANDARDS sit on the header (entered on the form, std_mr_pct
// prefills 20, all editable, SNAPSHOT at save): std_bag_weight, std_length,
// std_width, std_ends, std_picks, std_stitch, std_mr_pct. Bag type dropdown =
// JUTE CLOTH items (item_type_id=5). Dates are 'YYYY-MM-DD' strings. HY/LT is
// display-only (positive = Heavy, negative = Light); NO pass/fail band, NO CV%
// band.

import { z } from "zod";
import { AGG_KEYS, type AggKey } from "../utils/bagCheckCalc";

// Default Std MR% used to prefill the form's std_mr_pct field.
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
// GET bag_check_create_setup -> {data: {bag_types, default_std_mr_pct}}.
export type BagCheckSetup = {
	bag_types: BagType[];
	default_std_mr_pct: number;
};

// ─── Saved per-bag row (by-date read) ─────────────────────────────────────────
export type BagCheckBag = {
	length_cm?: number | null;
	width_cm?: number | null;
	ends_dm?: number | null;
	picks_dm?: number | null;
	mr_pct?: number | null;
	bag_wt_gm?: number | null;
	stitch_dm?: number | null;
	corr_wt_gm?: number | null; // server-computed
	defects?: string | null;
};

// Per-column aggregate (avg/stdev/cv_pct/min/max). stdev/cv null when <2 bags.
export type ColAggregate = {
	avg?: number | null;
	stdev?: number | null;
	cv_pct?: number | null;
	min?: number | null;
	max?: number | null;
};

// ─── The 7 std-snapshot header fields ─────────────────────────────────────────
export type BagCheckStds = {
	std_bag_weight?: number | null;
	std_length?: number | null;
	std_width?: number | null;
	std_ends?: number | null;
	std_picks?: number | null;
	std_stitch?: number | null;
	std_mr_pct?: number | null;
};

// ─── Per (date, bag type) block summary (by_date) ─────────────────────────────
export type BagCheckBlock = BagCheckStds & {
	bag_check_id: number;
	item_id?: number | null;
	item_name?: string | null;
	bag_type_label?: string | null;
	vendor_name?: string | null;
	id_code?: string | null;
	bags: BagCheckBag[];
	// Per-column aggregates keyed by the 8 numeric columns (server may omit some).
	aggregates?: Partial<Record<AggKey, ColAggregate>> | null;
	obs_hy_lt_pct?: number | null;
	corr_hy_lt_pct?: number | null;
};

// GET get_bag_check_by_date -> {data: {blocks}}.
export type BagCheckByDateResponse = {
	blocks: BagCheckBlock[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_bag_check_table -> {data, total, page, page_size}.
export type BagCheckHistoryRow = BagCheckStds & {
	bag_check_id?: number | null;
	entry_date?: string | null;
	item_name?: string | null;
	bag_type_label?: string | null;
	vendor_name?: string | null;
	id_code?: string | null;
	avg_bag_wt?: number | null;
	avg_corr_wt?: number | null;
	bag_wt_stdev?: number | null;
	bag_wt_cv_pct?: number | null;
	obs_hy_lt_pct?: number | null;
	corr_hy_lt_pct?: number | null;
};

export type BagCheckTableResponse = {
	data: BagCheckHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single block) ────────────────────────────────────────────
// POST create_bag_check -> {message, bag_check_id}.
export type BagCheckCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	item_id: number;
	bag_type_label?: string;
	vendor_name?: string;
	id_code?: string;
	std_bag_weight: number;
	std_length: number;
	std_width: number;
	std_ends: number;
	std_picks: number;
	std_stitch: number;
	std_mr_pct: number;
	bags: {
		length_cm: number;
		width_cm: number;
		ends_dm: number;
		picks_dm: number;
		mr_pct: number;
		bag_wt_gm: number;
		stitch_dm: number;
		defects?: string;
	}[];
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Allow NaN at the element level (blank inputs map
// to NaN) so the friendly refine messages fire instead of Zod's default
// "expected number, received NaN".
const bagSchema = z.object({
	length_cm: z.number().or(z.nan()),
	width_cm: z.number().or(z.nan()),
	ends_dm: z.number().or(z.nan()),
	picks_dm: z.number().or(z.nan()),
	mr_pct: z.number().or(z.nan()),
	bag_wt_gm: z.number().or(z.nan()),
	stitch_dm: z.number().or(z.nan()),
	defects: z.string().optional(),
});

const posStd = (label: string) =>
	z
		.number({ error: `${label} is required` })
		.refine((n) => Number.isFinite(n) && n > 0, `${label} must be greater than 0`);

// The 7 measured numeric keys a bag must satisfy (>0). defects is free text.
const MEASURE_KEYS = AGG_KEYS.filter((k): k is Exclude<AggKey, "corr_wt_gm"> => k !== "corr_wt_gm");

export const bagCheckCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	item_id: z
		.number({ error: "A bag type must be selected" })
		.int()
		.positive("A bag type must be selected"),
	bag_type_label: z.string().optional(),
	vendor_name: z.string().optional(),
	id_code: z.string().optional(),
	std_bag_weight: posStd("Std bag weight"),
	std_length: posStd("Std length"),
	std_width: posStd("Std width"),
	std_ends: posStd("Std ends"),
	std_picks: posStd("Std picks"),
	std_stitch: posStd("Std stitch"),
	std_mr_pct: posStd("Std MR%"),
	bags: z
		.array(bagSchema)
		.refine((arr) => arr.length >= 1, "Enter at least one bag")
		.refine(
			(arr) => arr.every((r) => MEASURE_KEYS.every((k) => Number.isFinite(r[k]))),
			"Every measured value in each bag is required",
		)
		.refine(
			(arr) => arr.every((r) => MEASURE_KEYS.every((k) => (r[k] as number) > 0)),
			"Every measured value must be greater than 0",
		),
});

export type BagCheckCreateFormValues = z.infer<typeof bagCheckCreateSchema>;
