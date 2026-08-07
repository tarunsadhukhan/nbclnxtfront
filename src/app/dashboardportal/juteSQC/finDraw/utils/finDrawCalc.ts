// Client-side preview for R-08-12/13/14 Finisher Drawing (Sliver Weight).
// Mirrors the backend compute_fin_draw_sliver_stats. The server recomputes and
// persists every value on save and is AUTHORITATIVE; this only reproduces the math
// for live per-row display so the inspector sees the corrected sliver weight, CV%
// and band pass/fail before saving the whole sheet.
//
// DELTA vs the Inter Card clone: the drawing-stage std MR default is 16 (carding
// used 20). The linkage is a BATCH, which has no single std, so the preview
// always uses DEFAULT_STD_MR_PCT (16) and no CV band.

// Standard moisture regain % used for every batch row (a batch has no per-row std).
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

// Sample standard deviation (n-1 divisor). Guard n<=1 → 0.0.
export function sampleStdev(nums: number[]): number {
	const n = nums.length;
	if (n <= 1) return 0;
	const m = mean(nums);
	const variance = nums.reduce((acc, v) => acc + (Number(v) - m) * (Number(v) - m), 0) / (n - 1);
	return Math.sqrt(variance);
}

// CV ratio on the corrected basis: stdev / corr_wt. Guard corr > 0.
// Returned as a RATIO (render ×100 for a percentage).
export function cvRatio(stdev: number, corrWt: number): number {
	if (!corrWt || corrWt <= 0) return 0;
	return stdev / corrWt;
}

// Band pass flag. The high edge is the upper tolerance: a row passes when its
// CV% (as a percentage, i.e. ratio×100) is at or under std_cv_high. When no high
// edge is seeded the band is not evaluated → null (cv_within_band unknown).
export function cvWithinBand(
	cvRatioValue: number,
	stdCvHigh: number | null | undefined,
): boolean | null {
	if (stdCvHigh == null) return null;
	return cvRatioValue * 100 <= Number(stdCvHigh);
}

// ─── Full per-row preview bundle ─────────────────────────────────────────────

export type FinDrawPreview = {
	observed: number[]; // raw cut weights
	corrected: number[]; // per-cut corrected weight
	avgWt: number | null; // mean observed
	avgMrPct: number | null; // mean MR%
	corrWt: number | null; // avg-then-correct corrected sliver weight
	sdev: number | null; // sample stdev of corrected cuts
	cvPct: number | null; // already ×100 (a percentage)
	withinBand: boolean | null; // pass / fail / null (no band)
	n: number; // # of valid (numeric, >0) weight readings used
};

// Compute the live advisory preview for a single row from string-state inputs.
// Empty/invalid readings are dropped pairwise (a weight without its MR%, or vice
// versa, is ignored). Returns null when no usable reading pair exists yet. DLV
// numbers do not affect the math.
//
// A batch has no single std, so the preview always uses std 16 with NO CV band
// (withinBand is always null). Corr Wt follows the cached-value path:
// avg-then-correct (avgWt corrected by avgMr), which matches the sheet exactly.
// The CV% uses the per-cut corrected series' sample stdev over the corrected
// sliver weight.
export function computeRowPreview(
	weightStrings: string[],
	mrStrings: string[],
): FinDrawPreview | null {
	const stdMr = DEFAULT_STD_MR_PCT;

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

	const avgWt = round2(mean(observed));
	const avgMr = round2(mean(mr));
	// avg-then-correct: corrected average weight from the row averages.
	const corrWt = correctedWeight(avgWt, avgMr, stdMr);
	const sdev = round4(sampleStdev(corrected));
	const cv = cvRatio(sdev, corrWt);

	return {
		observed,
		corrected,
		avgWt,
		avgMrPct: avgMr,
		corrWt,
		sdev,
		cvPct: round2(cv * 100),
		withinBand: null, // batch has no std → no CV band
		n: observed.length,
	};
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
