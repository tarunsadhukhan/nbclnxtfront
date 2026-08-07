// Types for the R-08-18 Beam MR% SQC screen — warp-beam moisture-regain QC.
// Mirrors the backend /api/juteSQC beam-mr endpoints (DB table jute_sqc_beam_mr).
//
// SINGLE reading-set entry (morrah/interCard array pattern): one save = one
// (date, quality_group, beam machine, spell) reading-set carrying ONE OR MORE MR%
// readings. avg_mr = mean of the readings. std_mr defaults by quality_group
// (HESSIAN 16, SACKING 20), is editable on the form, and is snapshotted at save.
// deviation = avg_mr - std_mr_pct. NO CV%, NO pass/fail band.
//
// Quality dropdown = JUTE CLOTH items (item_type_id=5). Machine = Beaming-type.
// The server recomputes avg_mr / deviation on save/read and is AUTHORITATIVE; the
// FE only previews the math for live display. Dates are 'YYYY-MM-DD' strings.

import { z } from "zod";

// ─── Default # of blank MR% inputs a new reading-set starts with. The count is
// no longer fixed — the inspector can add/remove readings freely (min 1). ──────
export const BEAM_MR_DEFAULT_READINGS = 5;

// ─── Quality groups ──────────────────────────────────────────────────────────
export const QUALITY_GROUPS = ["HESSIAN", "SACKING"] as const;
export type QualityGroup = (typeof QUALITY_GROUPS)[number];
export const DEFAULT_QUALITY_GROUP: QualityGroup = "HESSIAN";

// Fallback std MR% by group if the server omits std_mr_by_group.
export const DEFAULT_STD_MR_BY_GROUP: Record<QualityGroup, number> = {
	HESSIAN: 16,
	SACKING: 20,
};

// ─── Master option shapes ────────────────────────────────────────────────────

// A spell / shift option (spell_mst ⨝ shift_mst).
export type SqcSpell = {
	spell_id: number;
	spell_code: string;
	spell_name: string;
};

// A beaming machine (machine_mst ⨝ machine_type_mst).
export type BeamMrMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	machine_type_name?: string | null;
	branch_id?: number | null;
};

// A jute-cloth quality item (item_mst, item_type_id=5).
export type ClothQuality = {
	item_id: number;
	item_name: string;
	item_code?: string | null;
};

// ─── Setup payload ───────────────────────────────────────────────────────────
// GET get_beam_mr_create_setup -> {data: {spells, machines, cloth_qualities,
//   std_mr_by_group, readings_per_set}}.
export type BeamMrSetup = {
	spells: SqcSpell[];
	machines: BeamMrMachine[];
	cloth_qualities: ClothQuality[];
	std_mr_by_group: Record<string, number>;
	readings_per_set: number;
};

// ─── Saved reading row (by-date read) ─────────────────────────────────────────
export type BeamMrRow = {
	beam_mr_id: number;
	quality_group: QualityGroup;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id?: number | null;
	item_name?: string | null;
	spell_id?: number | null;
	spell_code?: string | null;
	readings: number[]; // one or more
	avg_mr?: number | null;
	std_mr_pct?: number | null;
	deviation?: number | null;
};

// ─── Per quality-group summary block ──────────────────────────────────────────
// overall_avg_mr = mean of the per-machine avg_mr within that quality_group.
export type BeamMrGroupSummary = {
	quality_group: QualityGroup;
	overall_avg_mr?: number | null;
	std_mr_pct?: number | null;
	machine_count?: number | null;
};

// GET get_beam_mr_by_date -> {data: {rows, group_summaries}}.
export type BeamMrByDateResponse = {
	rows: BeamMrRow[];
	group_summaries: BeamMrGroupSummary[];
};

// ─── Create payload (single reading-set) ──────────────────────────────────────
// POST create_beam_mr -> {message, beam_mr_id}.
export type BeamMrCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	quality_group: QualityGroup;
	spell_id: number;
	item_id: number;
	mc_id: number;
	readings: number[]; // one or more
	std_mr_pct?: number;
};

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Exactly 5 MR% readings (>= 0).
export const beamMrCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	quality_group: z.enum(QUALITY_GROUPS),
	spell_id: z.number({ error: "A spell must be selected" }).int().positive("A spell must be selected"),
	item_id: z.number({ error: "A cloth quality must be selected" }).int().positive("A cloth quality must be selected"),
	mc_id: z.number({ error: "A beam machine must be selected" }).int().positive("A beam machine must be selected"),
	// Allow NaN at the element level (blank inputs map to NaN) so the friendly
	// refine messages below fire instead of Zod's default "expected number, received NaN".
	readings: z
		.array(z.number().or(z.nan()))
		.refine((arr) => arr.length >= 1, "Enter at least one MR% reading")
		.refine((arr) => arr.every((m) => Number.isFinite(m)), "Fill in or remove any blank MR% reading")
		.refine((arr) => arr.every((m) => m > 0), "Each MR% reading must be greater than 0"),
	std_mr_pct: z.number().nonnegative().optional(),
});

export type BeamMrCreateFormValues = z.infer<typeof beamMrCreateSchema>;
