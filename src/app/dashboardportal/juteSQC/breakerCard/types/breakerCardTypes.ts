// Types for the Breaker Card SQC screen (R-08-05/06/07 Coarse-Side SWT — carding
// stage). Mirrors the backend /api/juteSQC breaker-card endpoints. This is a
// MULTI-ROW report: one date sheet holds many (machine, spell, batch) reading
// sets, each with exactly 4 cut weights + 4 MR%. The server recomputes and
// persists every calc_* value on save and is AUTHORITATIVE; the FE only previews
// the math for live display. A per-batch GRAND-AVERAGE block is recomputed by
// the server at read time (NOT stored) and returned alongside the rows.
//
// The quality linkage is a BATCH (jute_batch_plan), not a single line quality. A
// batch has no single std, so std MR always falls back to 16 (breaker default)
// and the CV band is unevaluated (cv_within_band null).
//
// Dates are 'YYYY-MM-DD' strings; the backend returns floats already.

import { z } from "zod";

// ─── Number of cut readings captured per breaker-card row (fixed at 4) ───────
export const BREAKER_CARD_READINGS = 4;

// ─── Master option shapes ────────────────────────────────────────────────────

// A spell / shift option (spell_mst ⨝ shift_mst). De-duped by spell_code.
// Reuses the spreader spell builder server-side.
export type SqcSpell = {
	spell_id: number;
	spell_code: string;
	spell_name: string;
};

// A breaker-card machine (machine_mst ⨝ machine_type_mst where
// machine_type_name = 'Breaker Card', joined to dept_mst for the branch).
// Same shape as the spreader machine option, minus the spreader-only wt_per_roll.
export type BreakerMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	dept_id?: number | null;
	dept_name?: string | null;
	branch_id?: number | null;
};

// A batch (jute_batch_plan) — a named mix of raw-jute qualities created in Jute
// Batch Plan. plan_name is the display label. A batch has no single std, so the
// preview always uses std 16 (breaker default) and no CV band.
export type BatchOption = {
	batch_plan_id: number;
	plan_name: string;
	branch_id?: number | null;
	line_qty?: number;
};

// ─── Setup payload ───────────────────────────────────────────────────────────

// GET get_breaker_card_swt_setup -> {"data": {machines, spells, batches, entries}}.
export type BreakerCardSetup = {
	machines: BreakerMachine[];
	spells: SqcSpell[];
	batches: BatchOption[];
	entries: BreakerCardReadingRow[];
};

// ─── Saved reading row ───────────────────────────────────────────────────────

// One saved breaker-card reading set (jute_sqc_breaker_card_swt + label joins).
// weights / mr_pcts arrive as parsed arrays (backend json.loads) of length 4.
export type BreakerCardReadingRow = {
	breaker_card_swt_id: number;
	co_id?: number;
	branch_id?: number | null;
	entry_date: string; // 'YYYY-MM-DD'
	mc_id?: number | null;
	machine_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	spell_id?: number | null;
	spell_code?: string | null;
	spell_name?: string | null;
	batch_plan_id?: number | null;
	batch_plan_name?: string | null;
	// Legacy line-quality fields — still present on old rows, not used.
	item_id?: number | null;
	item_code?: string | null;
	item_name?: string | null;
	card_side?: string | null;
	weights: number[];
	mr_pcts: number[];
	std_mr_pct?: number | null;
	std_cv_low?: number | null;
	std_cv_high?: number | null;
	calc_wt?: number | null; // row avg observed
	calc_mr_pct?: number | null; // row avg MR%
	calc_corr_wt?: number | null; // corrected sliver weight
	calc_sdev?: number | null; // sample (n-1) stdev of corrected cuts
	calc_cv_pct?: number | null; // ratio (render ×100 for a percentage)
	cv_within_band?: number | null; // 1 pass / 0 fail / null when no band seeded
};

// ─── Per-batch GRAND-AVERAGE block ───────────────────────────────────────────
// Recomputed at read by the server across that date's rows for the batch:
//   OBS  = mean(calc_wt), MR%  = mean(calc_mr_pct), CORR = mean(calc_corr_wt),
//   CV%  = stdev(pooled corrected cuts) / mean(pooled corrected cuts) (ratio).
export type BreakerCardGrandAverage = {
	batch_plan_id?: number | null;
	batch_plan_name?: string | null;
	std_mr_pct?: number | null;
	std_cv_low?: number | null;
	std_cv_high?: number | null;
	row_count?: number | null;
	grand_obs?: number | null;
	grand_mr_pct?: number | null;
	grand_corr_wt?: number | null;
	grand_cv_pct?: number | null; // ratio (render ×100)
	cv_within_band?: number | null; // 1 pass / 0 fail / null when no band seeded
};

// GET get_breaker_card_swt_by_date -> {"data": {rows, grand_averages}}.
// OBJECT envelope (per R-08-04/03 review lessons): never a bare list.
export type BreakerCardByDateResponse = {
	rows: BreakerCardReadingRow[];
	grand_averages: BreakerCardGrandAverage[];
};

// ─── Save payload (multi-row) ────────────────────────────────────────────────

// One input row in the create payload. Empty selects → null. weights / mr_pcts
// are exactly-4 numeric arrays; the server recomputes all calc_* values per row
// (std MR fixed at 16 for a batch, no CV band). batch_plan_id is REQUIRED.
export type BreakerCardRow = {
	mc_id: number | null;
	spell_id: number | null;
	batch_plan_id: number | null;
	weights: number[];
	mr_pcts: number[];
};

// POST create_breaker_card_swt body. One save inserts MANY rows.
export type BreakerCardSavePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	card_side?: string | null;
	rows: BreakerCardRow[];
};

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Each row needs exactly 4 weights (> 0) and
// exactly 4 MR% (>= 0).

export const breakerCardRowSchema = z.object({
	mc_id: z.number().int().positive().nullable(),
	spell_id: z.number().int().positive().nullable(),
	batch_plan_id: z.number({ error: "A batch must be selected" }).int().positive("A batch must be selected"),
	weights: z
		.array(z.number())
		.refine((arr) => arr.length === BREAKER_CARD_READINGS, `Enter all ${BREAKER_CARD_READINGS} cut weights`)
		.refine((arr) => arr.every((w) => w > 0), "All cut weights must be greater than 0"),
	mr_pcts: z
		.array(z.number())
		.refine((arr) => arr.length === BREAKER_CARD_READINGS, `Enter all ${BREAKER_CARD_READINGS} MR% readings`)
		.refine((arr) => arr.every((m) => m >= 0), "MR% cannot be negative"),
});

export const breakerCardSaveSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	card_side: z.string().nullable().optional(),
	rows: z.array(breakerCardRowSchema).min(1, "Add at least one reading row to save"),
});

// Inferred payload types — kept structurally compatible with the manual types.
export type BreakerCardRowFormValues = z.infer<typeof breakerCardRowSchema>;
export type BreakerCardSaveFormValues = z.infer<typeof breakerCardSaveSchema>;
