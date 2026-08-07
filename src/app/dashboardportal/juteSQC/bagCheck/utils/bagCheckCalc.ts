// Client-side preview for R-08-24 Bag Checking (finished-bag acceptance
// inspection). The server recomputes per-bag corr + per-column aggregates +
// HY/LT on save/read and is AUTHORITATIVE; this only reproduces the math for
// live display so the inspector sees the per-bag corrected weight and block
// aggregates before save.
//
// Per bag:  corr_wt = bag_wt * (100 + std_mr_pct) / (100 + mr_pct)  (MR correction)
// Block (over the bags), for EACH numeric column (length, width, ends, picks,
// mr, bag_wt, stitch, corr_wt):
//   avg     = mean
//   stdev   = SAMPLE stdev (n-1, null if <2 — matches statistics.stdev)
//   cv_pct  = stdev / avg * 100
//   min, max
// PLUS:
//   obs_hy_lt_pct  = (avg_bag_wt  - std_bag_weight) / std_bag_weight * 100
//   corr_hy_lt_pct = (avg_corr_wt - std_bag_weight) / std_bag_weight * 100
// avg_corr_wt = ROW-WISE mean of the per-bag corr. HY/LT display-only
// (positive = Heavy, negative = Light); NO pass/fail band.

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// MR-corrected bag weight: correction of measured weight to the std MR%. Null
// when bag_wt/mr/stdMr is invalid or (100 + mr) is non-positive.
export function correctedWeight(bagWt: number, mr: number, stdMrPct: number): number | null {
	if (!Number.isFinite(bagWt) || !Number.isFinite(mr) || !Number.isFinite(stdMrPct)) return null;
	const denom = 100 + mr;
	if (denom <= 0) return null;
	return (bagWt * (100 + stdMrPct)) / denom;
}

// The 7 measured per-bag inputs (string form-state) + optional defects free text.
export type BagStrings = {
	length_cm: string;
	width_cm: string;
	ends_dm: string;
	picks_dm: string;
	mr_pct: string;
	bag_wt_gm: string;
	stitch_dm: string;
	defects: string;
};

export const blankBag = (): BagStrings => ({
	length_cm: "",
	width_cm: "",
	ends_dm: "",
	picks_dm: "",
	mr_pct: "",
	bag_wt_gm: "",
	stitch_dm: "",
	defects: "",
});

// The 7 numeric measured field keys (defects excluded).
export const MEASURE_KEYS = [
	"length_cm",
	"width_cm",
	"ends_dm",
	"picks_dm",
	"mr_pct",
	"bag_wt_gm",
	"stitch_dm",
] as const;
export type MeasureKey = (typeof MEASURE_KEYS)[number];

// The 8 aggregated numeric columns (the 7 measures + the computed corr_wt).
export const AGG_KEYS = [...MEASURE_KEYS, "corr_wt_gm"] as const;
export type AggKey = (typeof AGG_KEYS)[number];

// A blank input becomes NaN (not Number("")===0) so downstream validation flags
// missing values instead of silently treating them as 0.
function num(s: string): number {
	return s.trim() === "" ? NaN : Number(s);
}

function rowIsBlank(r: BagStrings): boolean {
	return MEASURE_KEYS.every((k) => r[k].trim() === "");
}

// Live per-bag corrected weight from string-state inputs. Null when not usable.
export function computeRowCorr(row: BagStrings, stdMrPct: number): number | null {
	const corr = correctedWeight(num(row.bag_wt_gm), num(row.mr_pct), stdMrPct);
	return corr == null ? null : round2(corr);
}

// SAMPLE standard deviation (n-1). Null when fewer than 2 valid values — matches
// the server's statistics.stdev (which raises on <2).
function sampleStdev(valid: number[]): number | null {
	if (valid.length < 2) return null;
	const m = valid.reduce((a, b) => a + b, 0) / valid.length;
	const variance = valid.reduce((a, b) => a + (b - m) ** 2, 0) / (valid.length - 1);
	return Math.sqrt(variance);
}

// Per-column aggregate (avg/stdev/cv/min/max). All rounded; cv/stdev null if <2.
export type ColAgg = {
	avg: number | null;
	stdev: number | null;
	cv_pct: number | null;
	min: number | null;
	max: number | null;
};

function colAgg(nums: number[]): ColAgg {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) {
		return { avg: null, stdev: null, cv_pct: null, min: null, max: null };
	}
	const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
	const stdev = sampleStdev(valid);
	return {
		avg: round2(avg),
		stdev: stdev == null ? null : round2(stdev),
		cv_pct: stdev != null && avg ? round2((stdev / avg) * 100) : null,
		min: round2(Math.min(...valid)),
		max: round2(Math.max(...valid)),
	};
}

export type BlockStats = {
	// Per-column aggregates keyed by the 8 numeric columns.
	aggregates: Record<AggKey, ColAgg>;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
};

const EMPTY_AGG: ColAgg = { avg: null, stdev: null, cv_pct: null, min: null, max: null };

function emptyAggregates(): Record<AggKey, ColAgg> {
	const out = {} as Record<AggKey, ColAgg>;
	for (const k of AGG_KEYS) out[k] = EMPTY_AGG;
	return out;
}

// Block stats over the live form bags (advisory; server is authoritative).
// Wholly-blank bags are skipped so trailing empties do not poison the stats.
// hyLt% needs std_bag_weight; pass NaN/0 to suppress those two metrics.
export function computeBlockStats(
	rows: BagStrings[],
	stdMrPct: number,
	stdBagWeight: number,
): BlockStats {
	const cols: Record<AggKey, number[]> = {
		length_cm: [],
		width_cm: [],
		ends_dm: [],
		picks_dm: [],
		mr_pct: [],
		bag_wt_gm: [],
		stitch_dm: [],
		corr_wt_gm: [],
	};
	for (const r of rows) {
		if (rowIsBlank(r)) continue;
		for (const k of MEASURE_KEYS) cols[k].push(num(r[k]));
		const corr = correctedWeight(num(r.bag_wt_gm), num(r.mr_pct), stdMrPct);
		if (corr != null) cols.corr_wt_gm.push(corr);
	}

	const aggregates = emptyAggregates();
	let any = false;
	for (const k of AGG_KEYS) {
		aggregates[k] = colAgg(cols[k]);
		if (cols[k].length > 0) any = true;
	}
	if (!any) {
		return { aggregates, obs_hy_lt_pct: null, corr_hy_lt_pct: null };
	}

	const avgBagWt = aggregates.bag_wt_gm.avg;
	const avgCorr = aggregates.corr_wt_gm.avg; // ROW-WISE mean of per-bag corr
	const stdValid = Number.isFinite(stdBagWeight) && stdBagWeight > 0;
	return {
		aggregates,
		obs_hy_lt_pct:
			stdValid && avgBagWt != null
				? round2(((avgBagWt - stdBagWeight) / stdBagWeight) * 100)
				: null,
		corr_hy_lt_pct:
			stdValid && avgCorr != null
				? round2(((avgCorr - stdBagWeight) / stdBagWeight) * 100)
				: null,
	};
}

// HY/LT sign label: positive = Heavy, negative = Light (display-only).
export function hyLtLabel(pct: number | null | undefined): string {
	if (pct == null || !Number.isFinite(Number(pct))) return "—";
	const v = Number(pct);
	const tag = v > 0 ? "Heavy" : v < 0 ? "Light" : "On std";
	return `${v.toFixed(2)}% ${tag}`;
}

// ponytail: tiny self-check guards the non-trivial logic (per-bag corr + block
// aggregates). Runs once on import in dev; a no-op in production. Locks the
// spec's verified example: corr(541,17,20)=554.87, corr(588,19,20)=592.94; the
// 20-bag A-TYPE set -> avg bag_wt 564.95, avg corr 571.10, bag_wt stdev 28.48,
// cv 5.04, min 520, max 610, obs_hy_lt -2.59, corr_hy_lt -1.53.
if (process.env.NODE_ENV !== "production") {
	const c1 = correctedWeight(541, 17, 20);
	console.assert(
		c1 != null && Math.abs(c1 - 554.87) < 0.01,
		`bagCheckCalc corr(541,17,20) self-check failed: ${c1}`,
	);
	const c2 = correctedWeight(588, 19, 20);
	console.assert(
		c2 != null && Math.abs(c2 - 592.94) < 0.01,
		`bagCheckCalc corr(588,19,20) self-check failed: ${c2}`,
	);
	// 20-bag A-TYPE bag_wt + mr set (the two columns the locked aggregates cover).
	const set: [number, number][] = [
		[17, 541], [18, 605], [19, 576], [18, 575], [18, 559], [19, 588], [19, 547], [18, 566],
		[19, 541], [18, 566], [19, 576], [22, 610], [20, 586], [21, 610], [21, 595], [18, 540],
		[17.5, 530], [18, 520], [17, 523], [17, 545],
	];
	const stats = computeBlockStats(
		set.map(([mr_pct, bag_wt_gm]) => ({
			...blankBag(),
			mr_pct: String(mr_pct),
			bag_wt_gm: String(bag_wt_gm),
		})),
		20,
		580,
	);
	const bw = stats.aggregates.bag_wt_gm;
	console.assert(
		bw.avg != null && Math.abs(bw.avg - 564.95) < 0.01,
		`bagCheckCalc avg bag_wt self-check failed: ${bw.avg}`,
	);
	console.assert(
		bw.stdev != null && Math.abs(bw.stdev - 28.48) < 0.05,
		`bagCheckCalc bag_wt stdev self-check failed: ${bw.stdev}`,
	);
	console.assert(
		bw.cv_pct != null && Math.abs(bw.cv_pct - 5.04) < 0.05,
		`bagCheckCalc bag_wt cv self-check failed: ${bw.cv_pct}`,
	);
	console.assert(
		bw.min === 520 && bw.max === 610,
		`bagCheckCalc bag_wt min/max self-check failed: ${bw.min}/${bw.max}`,
	);
	console.assert(
		stats.aggregates.corr_wt_gm.avg != null &&
			Math.abs(stats.aggregates.corr_wt_gm.avg - 571.1) < 0.1,
		`bagCheckCalc avg corr self-check failed: ${stats.aggregates.corr_wt_gm.avg}`,
	);
	console.assert(
		stats.obs_hy_lt_pct != null && Math.abs(stats.obs_hy_lt_pct - -2.59) < 0.02,
		`bagCheckCalc obs_hy_lt self-check failed: ${stats.obs_hy_lt_pct}`,
	);
	console.assert(
		stats.corr_hy_lt_pct != null && Math.abs(stats.corr_hy_lt_pct - -1.53) < 0.05,
		`bagCheckCalc corr_hy_lt self-check failed: ${stats.corr_hy_lt_pct}`,
	);
}
