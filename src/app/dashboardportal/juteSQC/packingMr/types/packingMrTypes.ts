// Types for the R-08-25 Packing MR% SQC screen — finished-goods moisture at
// packing. Mirrors the backend /api/juteSQC packing-mr endpoints (single flat
// table, beam_mr/morrah pattern — readings stored as a JSON-string array; NO
// detail table).
//
// SINGLE reading-set entry: one save = one (date, quality column) carrying
// EXACTLY 10 MR% readings. avg_mr = mean of the 10 (server-authoritative). The
// quality_group (HESSIAN | SACKING) drives the by-date group roll-up; the
// optional cloth-quality link = JUTE CLOTH items (item_type_id=5), nullable;
// construction_code is free text. NO std, NO CV%, NO deviation, NO pass/fail —
// the sheet shows averages only. Dates are 'YYYY-MM-DD' strings.

import { z } from "zod";

// ─── DEFAULT number of MR% reading fields shown for a new column. The operator
// can add or remove fields, so a saved column may carry any count ≥ 1. ─────────
export const PACKING_MR_READINGS = 10;

// ─── Quality groups (drive the by-date roll-up) ──────────────────────────────
export const QUALITY_GROUPS = ["HESSIAN", "SACKING"] as const;
export type QualityGroup = (typeof QUALITY_GROUPS)[number];
export const DEFAULT_QUALITY_GROUP: QualityGroup = "HESSIAN";

// ─── Master option shape ──────────────────────────────────────────────────────

// A jute-cloth quality item (item_mst, item_type_id=5).
export type ClothQuality = {
	item_id: number;
	item_code?: string | null;
	item_name: string;
};

// ─── Setup payload ───────────────────────────────────────────────────────────
// GET packing_mr_create_setup -> {data: {qualities, quality_groups, readings_count}}.
export type PackingMrSetup = {
	qualities: ClothQuality[];
	quality_groups: string[];
	readings_count: number;
};

// ─── Saved reading column (by-date read) ──────────────────────────────────────
export type PackingMrColumn = {
	packing_mr_id: number;
	quality_group: QualityGroup;
	item_id?: number | null;
	item_name?: string | null;
	quality_label?: string | null;
	construction_code?: string | null;
	readings: number[]; // length 10
	avg_mr?: number | null;
};

// ─── Per quality-group summary block ──────────────────────────────────────────
// group_avg_mr = WEIGHTED mean of ALL readings across that group's columns
// (= sum(all readings) / count(all readings)).
export type PackingMrGroupSummary = {
	quality_group: QualityGroup;
	group_avg_mr?: number | null;
	column_count?: number | null;
	reading_count?: number | null;
};

// GET get_packing_mr_by_date -> {data: {columns, group_summaries}}.
export type PackingMrByDateResponse = {
	columns: PackingMrColumn[];
	group_summaries: PackingMrGroupSummary[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_packing_mr_table -> {data, total, page, page_size}.
export type PackingMrHistoryRow = {
	packing_mr_id?: number | null;
	entry_date?: string | null;
	quality_group?: string | null;
	item_name?: string | null;
	quality_label?: string | null;
	construction_code?: string | null;
	avg_mr?: number | null;
};

export type PackingMrTableResponse = {
	data: PackingMrHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single reading-set) ──────────────────────────────────────
// POST create_packing_mr -> {message, packing_mr_id}.
export type PackingMrCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	quality_group: QualityGroup;
	item_id?: number; // optional cloth-quality link
	quality_label?: string;
	construction_code?: string;
	readings: number[]; // exactly 10
};

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Exactly 10 readings, all > 0; quality_group
// required; item_id / quality_label / construction_code optional.
export const packingMrCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	quality_group: z.enum(QUALITY_GROUPS),
	item_id: z.number().int().positive().optional(),
	quality_label: z.string().optional(),
	construction_code: z.string().optional(),
	// Allow NaN at the element level (blank inputs map to NaN) so the friendly
	// refine messages below fire instead of Zod's default "expected number, received NaN".
	readings: z
		.array(z.number().or(z.nan()))
		.refine((arr) => arr.length >= 1, "Enter at least one MR% reading")
		.refine((arr) => arr.every((m) => Number.isFinite(m)), "Fill in every MR% reading (or remove blank ones)")
		.refine((arr) => arr.every((m) => m > 0), "Each MR% reading must be greater than 0"),
});

export type PackingMrCreateFormValues = z.infer<typeof packingMrCreateSchema>;
