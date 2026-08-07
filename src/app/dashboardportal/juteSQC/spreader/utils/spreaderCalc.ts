// Client-side preview for R-08-04 Spreader Roll Weight. Mirrors the backend
// compute_spreader_roll_wt_stats (see the R-08-04 build plan §2). The server
// recomputes and persists every value on save and is AUTHORITATIVE; this only
// reproduces the math for live display so the inspector sees corrected weights,
// averages, CV% and band counts before saving.
//
// Verified worked example (build plan §2): a single correction
//   69.40 × (100+16) / (100+38) = 58.34   (std_mr 16, obs_mr 38)
// Avg-corr 56.22, stdev-obs 2.89, stdev-corr 2.26, CV 0.0402 (= 4.02%).

import type { BandCounts } from "../types/sqcSpreaderTypes";

// Default per-quality standard moisture regain % when no satellite value is set.
export const DEFAULT_STD_MR_PCT = 16;

// Default 5-edge band set (Spreader-1). Spreader-2 uses 85/90/95/100/105.
export const DEFAULT_BAND_EDGES: readonly number[] = [55, 60, 65, 70, 75];

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

// Human-readable labels for a 5-edge band set, e.g. [55,60,65,70,75] →
//   <55, 55-60, 61-65, 66-70, 71-75, >75   (6 buckets).
export function bandLabels(edges: readonly number[]): string[] {
	const e = edges.length ? edges : DEFAULT_BAND_EDGES;
	const labels: string[] = [`<${e[0]}`];
	for (let i = 0; i < e.length - 1; i++) {
		const lo = i === 0 ? e[0] : e[i] + 1;
		labels.push(`${lo}-${e[i + 1]}`);
	}
	labels.push(`>${e[e.length - 1]}`);
	return labels;
}

// 6-bucket bucketer over a 5-edge set. A value falls in bucket k where:
//   <e1 | [e1,e2] | (e2,e3] | (e3,e4] | (e4,e5] | >e5
// Returns a {label: count} object matching the persisted band_counts_* shape.
export function bucketCounts(values: number[], edges: readonly number[]): BandCounts {
	const e = edges.length ? edges : DEFAULT_BAND_EDGES;
	const labels = bandLabels(e);
	const counts: BandCounts = {};
	for (const label of labels) counts[label] = 0;
	for (const raw of values) {
		const v = Number(raw);
		if (!Number.isFinite(v)) continue;
		let idx = labels.length - 1; // default to the > final-edge bucket
		if (v < e[0]) {
			idx = 0;
		} else {
			for (let i = 0; i < e.length - 1; i++) {
				if (v <= e[i + 1]) {
					idx = i + 1;
					break;
				}
			}
		}
		counts[labels[idx]] += 1;
	}
	return counts;
}

// ─── Full preview bundle ─────────────────────────────────────────────────────

export type SpreaderRollWtPreview = {
	observed: number[]; // raw weights (the bench reading)
	corrected: number[]; // per-reading corrected weight
	avgMrPct: number | null;
	avgObs: number | null;
	avgCorr: number | null;
	stdevObs: number | null;
	stdevCorr: number | null;
	cvPct: number | null; // already ×100 (a percentage)
	bandCountsObs: BandCounts;
	bandCountsCorr: BandCounts;
	n: number; // # of valid (numeric, >0) weight readings used
};

// Compute the live advisory preview from string-state inputs. Empty/invalid
// readings are dropped pairwise (a weight without its MR%, or vice versa, is
// ignored). Returns null when no usable reading pair exists yet.
export function computePreview(
	weightStrings: string[],
	mrStrings: string[],
	stdMrPct: number | null | undefined,
	bandEdges: readonly number[] = DEFAULT_BAND_EDGES,
): SpreaderRollWtPreview | null {
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
	const stdevObs = round4(sampleStdev(observed));
	const stdevCorr = round4(sampleStdev(corrected));
	const cv = cvRatio(stdevCorr, avgCorr) * 100;

	return {
		observed,
		corrected,
		avgMrPct: avgMr,
		avgObs,
		avgCorr,
		stdevObs,
		stdevCorr,
		cvPct: round2(cv),
		bandCountsObs: bucketCounts(observed, bandEdges),
		bandCountsCorr: bucketCounts(corrected, bandEdges),
		n: observed.length,
	};
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
