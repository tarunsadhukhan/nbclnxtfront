// Types for the R-08-19 Fabric Construction SQC screen — woven hessian cloth
// construction audit. Mirrors the backend /api/juteSQC fabric-construction
// endpoints (DB tables jute_sqc_fabric_construction + _dtl).
//
// SINGLE quality-block entry (array-entry pattern): one save = ONE header
// (date, cloth quality, its 6 std values) + UP TO 5 sample rows. The FE POSTs an
// array of sample rows; the BE inserts the header + N detail rows.
//
// Each sample row carries 6 MEASURED inputs (length_yds, width_cms, ends_per_dm,
// picks_per_dm, mr_pct, obs_wt_kg). The server computes obs_ozs + crcted_oz per
// row and is AUTHORITATIVE; the FE only previews the math for live display.
//
// 6 PER-QUALITY STANDARDS sit on the header (entered on the form, std_mr_pct
// prefills 16 for hessian, all editable, SNAPSHOT at save): std_length_yds,
// std_width_cms, std_ends_dm, std_picks_dm, std_mr_pct, std_oz_per_yd.
//
// Quality dropdown = JUTE CLOTH items (item_type_id=5). Dates are 'YYYY-MM-DD'.
// NO CV%, NO pass/fail band — Std-vs-Actual deviation only.

import { z } from "zod";

// ─── Max sample rows captured per quality block ───────────────────────────────
export const MAX_SAMPLE_ROWS = 5;

// Default Std MR% (hessian) used to prefill the form's std_mr_pct field.
export const DEFAULT_STD_MR_PCT = 16;

// ─── Master option shapes ─────────────────────────────────────────────────────

// A jute-cloth quality item (item_mst, item_type_id=5). Reuses the beaming
// cloth picker shape.
export type ClothQuality = {
	item_id: number;
	item_name: string;
	item_code?: string | null;
};

// ─── Setup payload ────────────────────────────────────────────────────────────
// GET get_fabric_construction_create_setup -> {data: {cloth_qualities,
//   default_std_mr_pct, sample_rows}}.
export type FabricConstructionSetup = {
	cloth_qualities: ClothQuality[];
	default_std_mr_pct: number;
	sample_rows: number;
};

// ─── Saved sample row (by-date read) ──────────────────────────────────────────
export type FabricConstructionSampleRow = {
	length_yds?: number | null;
	width_cms?: number | null;
	ends_per_dm?: number | null;
	picks_per_dm?: number | null;
	mr_pct?: number | null;
	obs_wt_kg?: number | null;
	obs_ozs?: number | null; // server-computed
	crcted_oz?: number | null; // server-computed
};

// Per-column AVG of the (up to 5) sample rows within a block.
export type FabricConstructionBlockAvg = {
	length_yds?: number | null;
	width_cms?: number | null;
	ends_per_dm?: number | null;
	picks_per_dm?: number | null;
	mr_pct?: number | null;
	obs_wt_kg?: number | null;
	obs_ozs?: number | null;
	crcted_oz?: number | null;
};

// One Std-vs-Actual comparison line (6 per block: the 6 dimensions).
export type FabricConstructionComparison = {
	dimension: string;
	std?: number | null;
	actual?: number | null; // = block avg of that dimension
	deviation?: number | null; // = actual - std
};

// ─── Per quality-block summary (by_date) ──────────────────────────────────────
export type FabricConstructionBlock = {
	fabric_const_id: number;
	item_id?: number | null;
	item_name?: string | null;
	item_code?: string | null;
	quality_text?: string | null;
	std_length_yds?: number | null;
	std_width_cms?: number | null;
	std_ends_dm?: number | null;
	std_picks_dm?: number | null;
	std_mr_pct?: number | null;
	std_oz_per_yd?: number | null;
	rows: FabricConstructionSampleRow[];
	averages?: FabricConstructionBlockAvg | null;
	comparison?: FabricConstructionComparison[] | null;
};

// GET get_fabric_construction_by_date -> {data: {blocks}}.
export type FabricConstructionByDateResponse = {
	blocks: FabricConstructionBlock[];
};

// ─── Create payload (single quality block) ────────────────────────────────────
// POST create_fabric_construction -> {message, fabric_const_id}.
export type FabricConstructionCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	item_id: number;
	quality_text?: string;
	std_length_yds: number;
	std_width_cms: number;
	std_ends_dm: number;
	std_picks_dm: number;
	std_mr_pct: number;
	std_oz_per_yd: number;
	rows: {
		length_yds: number;
		width_cms: number;
		ends_per_dm: number;
		picks_per_dm: number;
		mr_pct: number;
		obs_wt_kg: number;
	}[];
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Allow NaN at element level (blank inputs map to
// NaN) so the friendly refine messages fire instead of Zod's default
// "expected number, received NaN".
const measuredRowSchema = z.object({
	length_yds: z.number().or(z.nan()),
	width_cms: z.number().or(z.nan()),
	ends_per_dm: z.number().or(z.nan()),
	picks_per_dm: z.number().or(z.nan()),
	mr_pct: z.number().or(z.nan()),
	obs_wt_kg: z.number().or(z.nan()),
});

const posStd = (label: string) =>
	z
		.number({ error: `${label} is required` })
		.refine((n) => Number.isFinite(n) && n > 0, `${label} must be greater than 0`);

export const fabricConstructionCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	item_id: z
		.number({ error: "A cloth quality must be selected" })
		.int()
		.positive("A cloth quality must be selected"),
	quality_text: z.string().optional(),
	std_length_yds: posStd("Std length (yds)"),
	std_width_cms: posStd("Std width (cms)"),
	std_ends_dm: posStd("Std ends/dm"),
	std_picks_dm: posStd("Std picks/dm"),
	std_mr_pct: posStd("Std MR%"),
	std_oz_per_yd: posStd("Std oz/yd"),
	rows: z
		.array(measuredRowSchema)
		.refine((arr) => arr.length >= 1, "Enter at least one sample row")
		.refine((arr) => arr.length <= MAX_SAMPLE_ROWS, `At most ${MAX_SAMPLE_ROWS} sample rows`)
		.refine(
			(arr) =>
				arr.every(
					(r) =>
						Number.isFinite(r.length_yds) &&
						Number.isFinite(r.width_cms) &&
						Number.isFinite(r.ends_per_dm) &&
						Number.isFinite(r.picks_per_dm) &&
						Number.isFinite(r.mr_pct) &&
						Number.isFinite(r.obs_wt_kg),
				),
			"Every measured value in each sample row is required",
		)
		.refine(
			(arr) =>
				arr.every(
					(r) =>
						r.length_yds > 0 &&
						r.width_cms > 0 &&
						r.ends_per_dm > 0 &&
						r.picks_per_dm > 0 &&
						r.mr_pct > 0 &&
						r.obs_wt_kg > 0,
				),
			"Every measured value must be greater than 0",
		),
});

export type FabricConstructionCreateFormValues = z.infer<typeof fabricConstructionCreateSchema>;
