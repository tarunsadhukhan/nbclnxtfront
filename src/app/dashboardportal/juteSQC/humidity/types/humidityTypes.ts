// Types for the Humidity Recording SQC screen — plant-wide department
// temperature/RH log. Mirrors the backend /api/juteSQC humidity endpoints
// (single flat table, bag-weight pattern — spot readings stored as a
// JSON-string array of {spot_label, reading_time, temp_c, rh_pct}).
//
// SINGLE (date, department, round) reading-set: one save = ONE header
// (report_date, dept_id, round_no [1=Morning,2=Noon,3=Evening], prepared_by) +
// 1..3 spot readings. The server computes avg_temp + avg_rh (mean over spots,
// 2dp) and is AUTHORITATIVE; the FE only previews the averages for live display.
// NO std/CV, NO band/status — averages only. Dates are 'YYYY-MM-DD' strings.

import { z } from "zod";

// ─── Spot readings per round (1..3, default 3) ────────────────────────────────
export const MAX_SPOT_ROWS = 3;

// ─── Setup payload shapes ─────────────────────────────────────────────────────
export type Department = {
	dept_id: number;
	dept_desc: string;
	dept_code?: string | null;
};

export type Round = {
	round_no: number; // 1=Morning, 2=Noon, 3=Evening
	label: string;
};

// GET humidity_create_setup -> {data: {departments, rounds, spots_per_round}}.
export type HumiditySetup = {
	departments: Department[];
	rounds: Round[];
	spots_per_round: number;
};

// ─── Saved spot reading (by-date read) ────────────────────────────────────────
export type HumiditySpot = {
	spot_label?: string | null;
	reading_time?: string | null;
	temp_c?: number | null;
	rh_pct?: number | null;
};

// One saved round within a department (by_date).
export type HumidityRound = {
	humidity_id: number;
	round_no: number;
	round_label: string;
	spots: HumiditySpot[];
	avg_temp?: number | null; // server-computed
	avg_rh?: number | null; // server-computed
	prepared_by?: string | null;
};

// One department group (by_date): its rounds (Morning/Noon/Evening).
export type HumidityDept = {
	dept_id: number;
	dept_desc: string;
	rounds: HumidityRound[];
};

// GET get_humidity_by_date -> {data: {departments}}.
export type HumidityByDateResponse = {
	departments: HumidityDept[];
};

// ─── Paginated history row (trend view) ───────────────────────────────────────
// GET get_humidity_table -> {data, total, page, page_size}.
export type HumidityHistoryRow = {
	humidity_id?: number | null;
	report_date?: string | null;
	dept_desc?: string | null;
	round_no?: number | null;
	avg_temp?: number | null;
	avg_rh?: number | null;
};

export type HumidityTableResponse = {
	data: HumidityHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single reading-set) ──────────────────────────────────────
// POST create_humidity -> {message, humidity_id}.
export type HumidityCreatePayload = {
	co_id: number;
	branch_id: number;
	report_date: string;
	dept_id: number;
	round_no: number;
	prepared_by?: string;
	spots: {
		spot_label?: string;
		reading_time?: string;
		temp_c: number;
		rh_pct: number;
	}[];
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Numeric inputs are held as strings in form state; the schema validates the
// parsed payload that is POSTed. Allow NaN at the element level (blank inputs map
// to NaN) so the friendly refine messages fire instead of Zod's default
// "expected number, received NaN".
const spotSchema = z.object({
	spot_label: z.string().optional(),
	reading_time: z.string().optional(),
	temp_c: z.number().or(z.nan()),
	rh_pct: z.number().or(z.nan()),
});

export const humidityCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	report_date: z.string().min(1, "Report date is required"),
	dept_id: z
		.number({ error: "A department must be selected" })
		.int()
		.positive("A department must be selected"),
	round_no: z
		.number({ error: "A round must be selected" })
		.int()
		.refine((n) => [1, 2, 3].includes(n), "Select Morning, Noon or Evening"),
	prepared_by: z.string().optional(),
	spots: z
		.array(spotSchema)
		.refine((arr) => arr.length >= 1, "Enter at least one spot reading")
		.refine((arr) => arr.length <= MAX_SPOT_ROWS, `At most ${MAX_SPOT_ROWS} spot readings`)
		.refine(
			(arr) => arr.every((s) => Number.isFinite(s.temp_c) && Number.isFinite(s.rh_pct)),
			"Every spot needs a temperature and RH%",
		)
		.refine((arr) => arr.every((s) => s.temp_c > 0), "Temperature must be greater than 0")
		.refine(
			(arr) => arr.every((s) => s.rh_pct > 0 && s.rh_pct <= 100),
			"RH% must be between 0 and 100",
		),
});

export type HumidityCreateFormValues = z.infer<typeof humidityCreateSchema>;
