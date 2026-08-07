// Client-side preview for R-08-03 Spreader Sliver Weight. Mirrors the backend
// compute_spreader_sliver_stats (see the R-08-03 build plan §2). The server
// recomputes and persists every value on save and is AUTHORITATIVE; this only
// reproduces the math for live display so the inspector sees corrected weights,
// averages, StDev and CV% before saving. NO weight bands (the only difference
// from R-08-04 roll weight).
//
// Verified worked example (build plan §2): a single correction
//   20.32 × (100+16) / (100+29) = 18.27   (std_mr 16, obs_mr 29)
// CV% = stdev_corr / avg_corr (corrected basis); sample stdev (n-1, guard n<=1 → 0).

// Default per-quality standard moisture regain % when no satellite value is set.
export const DEFAULT_STD_MR_PCT = 16;

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

function round4(x: number): number {
	return Math.round(x * 10000) / 10000;
}

// corrected_i = obs_i * (100 + std_mr_pct) / (100 + mr_i)
export function correctedWeight(observed: number, mrPct: number, stdMrPct: number): number {
	const denom = 100 + Number(mrPct);
	if (!denom) return 0;
	return round2((Number(observed) * (100 + Number(stdMrPct))) / denom);
}

export function mean(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

// Sample standard deviation (n-1 divisor). Guard n<=1 → 0.0 (per build plan §2).
export function sampleStdev(nums: number[]): number {
	const n = nums.length;
	if (n <= 1) return 0;
	const m = mean(nums);
	const variance = nums.reduce((acc, v) => acc + (Number(v) - m) * (Number(v) - m), 0) / (n - 1);
	return Math.sqrt(variance);
}

// CV ratio on the corrected basis: stdev_corr / avg_corr. Guard avg_corr > 0.
// Returned as a RATIO (render ×100 for a percentage).
export function cvRatio(stdevCorr: number, avgCorr: number): number {
	if (!avgCorr || avgCorr <= 0) return 0;
	return stdevCorr / avgCorr;
}

// ─── Full preview bundle (no bands) ──────────────────────────────────────────

export type SpreaderSliverWtPreview = {
	observed: number[]; // raw weights (the bench reading, lb/100yds)
	corrected: number[]; // per-reading corrected weight
	avgMrPct: number | null;
	avgObs: number | null;
	avgCorr: number | null;
	stdev: number | null; // corrected basis, sample (n-1)
	cvPct: number | null; // already ×100 (a percentage)
	n: number; // # of valid (numeric, >0) weight readings used
};

// Compute the live advisory preview from string-state inputs. Empty/invalid
// readings are dropped pairwise (a weight without its MR%, or vice versa, is
// ignored). Returns null when no usable reading pair exists yet.
export function computePreview(
	weightStrings: string[],
	mrStrings: string[],
	stdMrPct: number | null | undefined,
): SpreaderSliverWtPreview | null {
	const stdMr = stdMrPct == null ? DEFAULT_STD_MR_PCT : Number(stdMrPct);

	const observed: number[] = [];
	const mr: number[] = [];
	const corrected: number[] = [];
	for (let i = 0; i < weightStrings.length; i++) {
		const w = Number(weightStrings[i]);
		const m = Number(mrStrings[i]);
		if (
			weightStrings[i] === "" ||
			!Number.isFinite(w) ||
			w <= 0 ||
			mrStrings[i] === "" ||
			!Number.isFinite(m)
		) {
			continue;
		}
		observed.push(w);
		mr.push(m);
		corrected.push(correctedWeight(w, m, stdMr));
	}

	if (observed.length === 0) return null;

	const avgObs = round2(mean(observed));
	const avgMr = round2(mean(mr));
	const avgCorr = round2(mean(corrected));
	const stdev = round4(sampleStdev(corrected));
	const cv = cvRatio(stdev, avgCorr) * 100;

	return {
		observed,
		corrected,
		avgMrPct: avgMr,
		avgObs,
		avgCorr,
		stdev,
		cvPct: round2(cv),
		n: observed.length,
	};
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
