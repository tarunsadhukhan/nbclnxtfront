// Types for the R-08-02 Emulsion SQC screen — daily batching jute-oil recipe log.
// Mirrors the backend /api/juteSQC emulsion endpoints. This is NOT a sampled QC
// report: ONE save = ONE flat row per date (NO readings array, NO StDev/CV).
//
// Header: entry_date, optional spreader/emulsion machine, the prominent batch
// fields (oil_used_ltr, tank_capacity_ltr, MEASURED oil_pct_in_emulsion) and the
// target band (std_oil_pct_low / std_oil_pct_high — entered on the form, prefilled
// 16 / 17, editable, SNAPSHOT at save), plus a long tail of optional additive
// columns. The server computes theoretical_oil_pct (oil/tank*100, reference only)
// and oil_pct_status (OK/LOW/HIGH vs the band) on read; both are display-only.

import { z } from "zod";

// Form prefills (overridable by the setup payload).
export const DEFAULT_OIL_PCT_LOW = 16;
export const DEFAULT_OIL_PCT_HIGH = 17;
export const DEFAULT_TANK_CAPACITY = 1000;

// Measured-oil-% status vs the std band (display-only).
export type OilPctStatus = "OK" | "LOW" | "HIGH";

// ─── Master option shape ──────────────────────────────────────────────────────
// Spreader machine (machine_type_mst.machine_type_name = SPREADER_MACHINE_TYPE_NAME),
// de-duped by machine_id. mc_id is OPTIONAL.
export type EmulsionMachine = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
};

// ─── Setup payload ────────────────────────────────────────────────────────────
// GET emulsion_create_setup -> {data: {machines, default_oil_pct_low,
// default_oil_pct_high, default_tank_capacity}}.
export type EmulsionSetup = {
	machines: EmulsionMachine[];
	default_oil_pct_low: number;
	default_oil_pct_high: number;
	default_tank_capacity: number;
};

// ─── The optional additive columns (all DECIMAL(10,2) nullable) ────────────────
// Held as strings in form state; sent as number|undefined. Keep the order the
// spec lists them in so the form/grid mirror the recipe sheet.
export const ADDITIVE_FIELDS = [
	"adco_used_ml",
	"eco_fin_used_ltr",
	"p40_gms",
	"efjl_kg",
	"glycerine_gms",
	"castrol_oil",
	"diesel_ltr",
	"citric_acid_ltr",
	"enzyme_gms",
	"treated_water_ltr",
	"rbo_ltr",
	"jbo_ltr",
	"molasses_kg",
	"urea_kg",
	"biochemical_kg",
	"jsp66",
	"feel_free_good_ve_kg",
] as const;
export type AdditiveField = (typeof ADDITIVE_FIELDS)[number];

// Friendly labels for the additive inputs / grid columns.
export const ADDITIVE_LABELS: Record<AdditiveField, string> = {
	adco_used_ml: "ADCO used (ml)",
	eco_fin_used_ltr: "Eco Fin used (ltr)",
	p40_gms: "P40 (gms)",
	efjl_kg: "EFJL (kg)",
	glycerine_gms: "Glycerine (gms)",
	castrol_oil: "Castrol oil",
	diesel_ltr: "Diesel (ltr)",
	citric_acid_ltr: "Citric acid (ltr)",
	enzyme_gms: "Enzyme (gms)",
	treated_water_ltr: "Treated water (ltr)",
	rbo_ltr: "RBO (ltr)",
	jbo_ltr: "JBO (ltr)",
	molasses_kg: "Molasses (kg)",
	urea_kg: "Urea (kg)",
	biochemical_kg: "Biochemical (kg)",
	jsp66: "JSP66",
	feel_free_good_ve_kg: "Feel Free Good VE (kg)",
};

// ─── Saved emulsion row (by_date read) ────────────────────────────────────────
export type EmulsionRow = {
	emulsion_id: number;
	entry_date?: string | null;
	mc_id?: number | null;
	machine_name?: string | null;
	oil_used_ltr?: number | null;
	tank_capacity_ltr?: number | null;
	oil_pct_in_emulsion?: number | null;
	std_oil_pct_low?: number | null;
	std_oil_pct_high?: number | null;
	spreader_rolls_made?: number | null;
	others?: string | null;
	prepared_by?: string | null;
	// server-computed (display-only)
	theoretical_oil_pct?: number | null;
	oil_pct_status?: OilPctStatus | string | null;
} & Partial<Record<AdditiveField, number | null>>;

// GET get_emulsion_by_date -> {data: {rows}}.
export type EmulsionByDateResponse = {
	rows: EmulsionRow[];
};

// ─── Paginated history row (table) ────────────────────────────────────────────
// GET get_emulsion_table -> {data, total, page, page_size}.
export type EmulsionHistoryRow = {
	emulsion_id?: number | null;
	entry_date?: string | null;
	machine_name?: string | null;
	oil_used_ltr?: number | null;
	tank_capacity_ltr?: number | null;
	oil_pct_in_emulsion?: number | null;
	oil_pct_status?: OilPctStatus | string | null;
};

export type EmulsionTableResponse = {
	data: EmulsionHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single flat row) ─────────────────────────────────────────
// POST create_emulsion -> {message, emulsion_id}.
export type EmulsionCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	mc_id?: number;
	oil_used_ltr: number;
	tank_capacity_ltr: number;
	oil_pct_in_emulsion: number;
	std_oil_pct_low: number;
	std_oil_pct_high: number;
	spreader_rolls_made?: number;
	others?: string;
	prepared_by?: string;
} & Partial<Record<AdditiveField, number>>;

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Required numerics allow NaN at the field level
// (blank input maps to NaN) so the friendly refine messages fire instead of Zod's
// default "expected number, received NaN". Optional additives are number|undefined
// (a blank input is dropped, never sent as 0/NaN).
const reqPositive = (label: string) =>
	z
		.number()
		.or(z.nan())
		.refine((n) => Number.isFinite(n) && n > 0, `${label} must be greater than 0`);

const optAdditive = z.number().optional();

export const emulsionCreateSchema = z
	.object({
		co_id: z.number().int().positive("A company must be selected"),
		branch_id: z.number().int().positive("A branch must be selected"),
		entry_date: z.string().min(1, "Entry date is required"),
		mc_id: z.number().int().positive().optional(),
		oil_used_ltr: reqPositive("Oil used (ltr)"),
		tank_capacity_ltr: reqPositive("Tank capacity (ltr)"),
		oil_pct_in_emulsion: reqPositive("Oil % in emulsion"),
		std_oil_pct_low: reqPositive("Std oil % (low)"),
		std_oil_pct_high: z
			.number()
			.or(z.nan())
			.refine((n) => Number.isFinite(n) && n > 0, "Std oil % (high) must be greater than 0"),
		// additives (all optional)
		adco_used_ml: optAdditive,
		eco_fin_used_ltr: optAdditive,
		p40_gms: optAdditive,
		efjl_kg: optAdditive,
		glycerine_gms: optAdditive,
		castrol_oil: optAdditive,
		diesel_ltr: optAdditive,
		citric_acid_ltr: optAdditive,
		enzyme_gms: optAdditive,
		treated_water_ltr: optAdditive,
		rbo_ltr: optAdditive,
		jbo_ltr: optAdditive,
		molasses_kg: optAdditive,
		urea_kg: optAdditive,
		biochemical_kg: optAdditive,
		jsp66: optAdditive,
		feel_free_good_ve_kg: optAdditive,
		spreader_rolls_made: z.number().int().nonnegative().optional(),
		others: z.string().optional(),
		prepared_by: z.string().optional(),
	})
	.refine((v) => v.std_oil_pct_high >= v.std_oil_pct_low, {
		message: "Std oil % (high) must be ≥ std oil % (low)",
		path: ["std_oil_pct_high"],
	});

export type EmulsionCreateFormValues = z.infer<typeof emulsionCreateSchema>;
