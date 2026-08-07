// Types for the R-08-21 Width & Picks SQC screen — on-loom dimensional QC of
// woven cloth. Mirrors the backend /api/juteSQC width-picks endpoints (header +
// detail tables, NOT JSON arrays).
//
// ONE save = ONE (date, cloth-quality) group: a header (entry_date, cloth
// quality, std_width_cm, std_picks, optional inspector_name) + N loom reading
// rows (loom machine, width_cm, optional picks_dm). width_cm is required per
// row; picks_dm is OPTIONAL (only a sampled subset of looms is pick-checked).
//
// std_width_cm + std_picks are entered on the form per quality, editable, and
// SNAPSHOT on the header at save (no change to any item master).
//
// Quality dropdown = JUTE CLOTH items (item_type_id=5). Loom dropdown = WEAVING
// (Loom) machines. Dates are 'YYYY-MM-DD'.

import { z } from "zod";

// ─── Master option shapes ─────────────────────────────────────────────────────

// A jute-cloth quality item (item_type_id=5). Reuses the beaming cloth picker.
export type ClothQuality = {
	item_id: number;
	item_name: string;
	item_code?: string | null;
};

// A weaving (Loom) machine option.
export type Loom = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
};

// ─── Setup payload ────────────────────────────────────────────────────────────
// GET width_picks_create_setup -> {data: {cloth_qualities, looms}}.
export type WidthPicksSetup = {
	cloth_qualities: ClothQuality[];
	looms: Loom[];
};

// ─── Saved loom reading row (by-date read) ────────────────────────────────────
export type WidthPicksRow = {
	loom_id?: number | null;
	loom_name?: string | null;
	mech_code?: string | null;
	width_cm?: number | null;
	picks_dm?: number | null;
};

// ─── Per-group summaries (by_date, server-computed) ───────────────────────────
export type WidthSummary = {
	avg_width?: number | null;
	tol_low?: number | null;
	tol_high?: number | null;
	remark?: string | null; // '$' when avg_width outside +/-0.5% band, else ''
};

export type PicksSummary = {
	avg_picks?: number | null;
	stdev?: number | null; // sample stdev over non-null picks; null/0 when <2 values
	max_picks?: number | null;
	min_picks?: number | null;
	pick_count?: number | null;
};

// ─── Per (date, quality) block (by_date) ──────────────────────────────────────
export type WidthPicksBlock = {
	width_picks_id: number;
	item_id?: number | null;
	item_name?: string | null;
	item_code?: string | null;
	std_width_cm?: number | null;
	std_picks?: number | null;
	inspector_name?: string | null;
	rows: WidthPicksRow[];
	width_summary?: WidthSummary | null;
	picks_summary?: PicksSummary | null;
};

// GET get_width_picks_by_date -> {data: {blocks}}.
export type WidthPicksByDateResponse = {
	blocks: WidthPicksBlock[];
};

// ─── History row (paginated table) ────────────────────────────────────────────
// GET get_width_picks_table -> {data, total, page, page_size}.
export type WidthPicksTableRow = {
	width_picks_id: number;
	entry_date?: string | null;
	item_id?: number | null;
	item_name?: string | null;
	item_code?: string | null;
	std_width_cm?: number | null;
	std_picks?: number | null;
	inspector_name?: string | null;
	[key: string]: unknown;
};

export type WidthPicksTableResponse = {
	data: WidthPicksTableRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single date+quality group) ───────────────────────────────
// POST create_width_picks -> {message, width_picks_id}.
export type WidthPicksCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	item_id: number;
	std_width_cm: number;
	std_picks: number;
	inspector_name?: string;
	rows: {
		loom_id: number;
		width_cm: number;
		picks_dm?: number;
	}[];
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Allow NaN at element level (blank width -> NaN)
// so the friendly refine messages fire instead of Zod's default "received NaN".
// picks_dm is optional: undefined means "not pick-checked" (blank allowed).
const loomRowSchema = z.object({
	loom_id: z.number().int().positive("A loom must be selected on every row"),
	width_cm: z.number().or(z.nan()),
	picks_dm: z.number().or(z.nan()).optional(),
});

const posStd = (label: string) =>
	z
		.number({ error: `${label} is required` })
		.refine((n) => Number.isFinite(n) && n > 0, `${label} must be greater than 0`);

export const widthPicksCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	item_id: z
		.number({ error: "A cloth quality must be selected" })
		.int()
		.positive("A cloth quality must be selected"),
	std_width_cm: posStd("Std width (cm)"),
	std_picks: posStd("Std picks"),
	inspector_name: z.string().optional(),
	rows: z
		.array(loomRowSchema)
		.refine((arr) => arr.length >= 1, "Enter at least one loom reading row")
		.refine(
			(arr) => arr.every((r) => Number.isFinite(r.width_cm)),
			"Width (cm) is required on every loom row",
		)
		.refine(
			(arr) => arr.every((r) => Number(r.width_cm) > 0),
			"Every width (cm) must be greater than 0",
		)
		// picks_dm is optional, but if present it must be > 0.
		.refine(
			(arr) =>
				arr.every(
					(r) => r.picks_dm === undefined || (Number.isFinite(r.picks_dm) && Number(r.picks_dm) > 0),
				),
			"Any entered picks/dm must be greater than 0",
		),
});

export type WidthPicksCreateFormValues = z.infer<typeof widthPicksCreateSchema>;
