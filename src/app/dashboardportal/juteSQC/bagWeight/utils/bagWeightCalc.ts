// Client-side preview for R-08-23 Bag Weight (finished-bag weight control). The
// server recomputes corr / averages / stdev / cv / HY-LT on save/read and is
// AUTHORITATIVE; this only reproduces the math for live display so the inspector
// sees the per-row corrected weight and block stats before save.
//
// Per row:  corr = obs * (100 + std_mr_pct) / (100 + mr)    (MR correction to std MR)
// Block (over the rows):
//   avg_mr  = mean(mr); avg_obs = mean(obs); avg_corr = mean(corr) [ROW-WISE]
//   obs_stdev   = SAMPLE stdev(obs) (n-1, null if <2)
//   obs_cv_pct  = obs_stdev / avg_obs * 100
//   obs_hy_lt_pct  = (avg_obs  - std_bag_weight) / std_bag_weight * 100
//   corr_hy_lt_pct = (avg_corr - std_bag_weight) / std_bag_weight * 100
// HY/LT sign: positive = Heavy, negative = Light (display-only).

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// MR-corrected bag weight: correction of observed weight to the std MR%. Null
// when obs/mr/stdMr is invalid or (100 + mr) is non-positive.
export function correctedWeight(obs: number, mr: number, stdMrPct: number): number | null {
	if (!Number.isFinite(obs) || !Number.isFinite(mr) || !Number.isFinite(stdMrPct)) return null;
	const denom = 100 + mr;
	if (denom <= 0) return null;
	return (obs * (100 + stdMrPct)) / denom;
}

export type ReadingStrings = {
	mr: string;
	obs: string;
};

export const blankReading = (): ReadingStrings => ({ mr: "", obs: "" });

// A blank input becomes NaN (not Number("")===0) so downstream validation flags
// missing values instead of silently treating them as 0.
function num(s: string): number {
	return s.trim() === "" ? NaN : Number(s);
}

// Live per-row preview from string-state inputs. Returns the rounded corrected
// weight (null when the inputs are not yet usable).
export function computeRowCorr(row: ReadingStrings, stdMrPct: number): number | null {
	const corr = correctedWeight(num(row.obs), num(row.mr), stdMrPct);
	return corr == null ? null : round2(corr);
}

function mean(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return null;
	return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// SAMPLE standard deviation (n-1). Null when fewer than 2 valid values — matches
// the server's statistics.stdev (which raises on <2).
function sampleStdev(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length < 2) return null;
	const m = valid.reduce((a, b) => a + b, 0) / valid.length;
	const variance = valid.reduce((a, b) => a + (b - m) ** 2, 0) / (valid.length - 1);
	return Math.sqrt(variance);
}

export type BlockStats = {
	avg_mr: number | null;
	avg_obs: number | null;
	avg_corr: number | null; // row-wise mean of the per-row corrected weights
	obs_stdev: number | null;
	obs_cv_pct: number | null;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
};

const EMPTY_STATS: BlockStats = {
	avg_mr: null,
	avg_obs: null,
	avg_corr: null,
	obs_stdev: null,
	obs_cv_pct: null,
	obs_hy_lt_pct: null,
	corr_hy_lt_pct: null,
};

// Block stats over the live form rows (advisory; server is authoritative).
// Wholly-blank rows are skipped so trailing empties do not poison the stats.
// hyLt% needs std_bag_weight; pass NaN/0 to suppress those two metrics.
export function computeBlockStats(
	rows: ReadingStrings[],
	stdMrPct: number,
	stdBagWeight: number,
): BlockStats {
	const mrs: number[] = [];
	const obss: number[] = [];
	const corrs: number[] = [];
	for (const r of rows) {
		if (r.mr.trim() === "" && r.obs.trim() === "") continue; // wholly-blank
		const mr = num(r.mr);
		const obs = num(r.obs);
		mrs.push(mr);
		obss.push(obs);
		const corr = correctedWeight(obs, mr, stdMrPct);
		if (corr != null) corrs.push(corr);
	}
	if (obss.length === 0) return EMPTY_STATS;

	const avgMr = mean(mrs);
	const avgObs = mean(obss);
	const avgCorr = mean(corrs);
	const obsStdev = sampleStdev(obss);
	const stdValid = Number.isFinite(stdBagWeight) && stdBagWeight > 0;
	return {
		avg_mr: avgMr == null ? null : round2(avgMr),
		avg_obs: avgObs == null ? null : round2(avgObs),
		avg_corr: avgCorr == null ? null : round2(avgCorr),
		obs_stdev: obsStdev == null ? null : round2(obsStdev),
		obs_cv_pct: obsStdev != null && avgObs ? round2((obsStdev / avgObs) * 100) : null,
		obs_hy_lt_pct:
			stdValid && avgObs != null ? round2(((avgObs - stdBagWeight) / stdBagWeight) * 100) : null,
		corr_hy_lt_pct:
			stdValid && avgCorr != null ? round2(((avgCorr - stdBagWeight) / stdBagWeight) * 100) : null,
	};
}

// HY/LT sign label: positive = Heavy, negative = Light (display-only).
export function hyLtLabel(pct: number | null | undefined): string {
	if (pct == null || !Number.isFinite(Number(pct))) return "—";
	const v = Number(pct);
	const tag = v > 0 ? "Heavy" : v < 0 ? "Light" : "On std";
	return `${v.toFixed(2)}% ${tag}`;
}

// ponytail: tiny self-check guards the non-trivial logic (per-row corr + block
// stats). Runs once on import in dev; a no-op in production. Locks the spec's
// verified example: corr(541,17,20)=554.87, corr(610,22,20)=600.0; the 20-row
// A-TYPE set -> avg_obs 564.95, avg_corr 571.10, obs_cv ~5.04, obs_hy_lt ~-2.59.
if (process.env.NODE_ENV !== "production") {
	const c1 = correctedWeight(541, 17, 20);
	console.assert(
		c1 != null && Math.abs(c1 - 554.87) < 0.01,
		`bagWeightCalc corr(541,17,20) self-check failed: ${c1}`,
	);
	const c2 = correctedWeight(610, 22, 20);
	console.assert(
		c2 != null && Math.abs(c2 - 600.0) < 0.01,
		`bagWeightCalc corr(610,22,20) self-check failed: ${c2}`,
	);
	const set: [number, number][] = [
		[17, 541], [18, 605], [19, 576], [18, 575], [18, 559], [19, 588], [19, 547], [18, 566],
		[19, 541], [18, 566], [19, 576], [22, 610], [20, 586], [21, 610], [21, 595], [18, 540],
		[17.5, 530], [18, 520], [17, 523], [17, 545],
	];
	const stats = computeBlockStats(
		set.map(([mr, obs]) => ({ mr: String(mr), obs: String(obs) })),
		20,
		580,
	);
	console.assert(
		stats.avg_obs != null && Math.abs(stats.avg_obs - 564.95) < 0.01,
		`bagWeightCalc avg_obs self-check failed: ${stats.avg_obs}`,
	);
	console.assert(
		stats.avg_corr != null && Math.abs(stats.avg_corr - 571.1) < 0.05,
		`bagWeightCalc avg_corr self-check failed: ${stats.avg_corr}`,
	);
	console.assert(
		stats.obs_cv_pct != null && Math.abs(stats.obs_cv_pct - 5.04) < 0.05,
		`bagWeightCalc obs_cv_pct self-check failed: ${stats.obs_cv_pct}`,
	);
	console.assert(
		stats.obs_hy_lt_pct != null && Math.abs(stats.obs_hy_lt_pct - -2.59) < 0.02,
		`bagWeightCalc obs_hy_lt_pct self-check failed: ${stats.obs_hy_lt_pct}`,
	);
}
