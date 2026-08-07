// Client-side preview for R-08-25 Packing MR% (finished-goods moisture at
// packing). The server recomputes avg_mr / group_avg_mr on save/read and is
// AUTHORITATIVE; this only reproduces the math for live per-column display.
//
// avg_mr        = mean of the 10 MR% readings (one column)
// group_avg_mr  = WEIGHTED mean of ALL readings across a group's columns
//                 (= sum(all readings) / count(all readings)); equals the
//                 mean-of-column-averages when every column has 10 readings, and
//                 stays correct if counts ever differ.

import { PACKING_MR_READINGS } from "../types/packingMrTypes";

function round1(x: number): number {
	return Math.round(x * 10) / 10;
}

export function mean(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

// Weighted mean across many columns: flatten then mean. Stays correct even if
// columns carry different reading counts.
export function groupWeightedMean(columns: number[][]): number {
	const all = columns.flat();
	return mean(all);
}

export type PackingMrPreview = {
	avgMr: number | null; // mean of the parsed readings
	n: number; // # of valid (numeric, > 0) readings used
};

// Live advisory preview from string-state inputs. Blank/invalid readings are
// dropped. Returns null avg when no usable reading exists yet.
export function computePackingMrPreview(readingStrings: string[]): PackingMrPreview {
	const readings: number[] = [];
	for (const s of readingStrings) {
		if (s === "") continue;
		const v = Number(s);
		if (!Number.isFinite(v) || v <= 0) continue;
		readings.push(v);
	}
	if (readings.length === 0) return { avgMr: null, n: 0 };
	return { avgMr: round1(mean(readings)), n: readings.length };
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: tiny self-check guards the only non-trivial logic (column avg +
// group weighted mean). Runs once on import in dev; a no-op in production.
if (process.env.NODE_ENV !== "production") {
	const c1 = [21, 18, 19, 17, 20, 18, 22, 22, 17, 18]; // -> 19.2
	const c2 = [21, 16, 19, 19, 18, 21, 18, 20, 21, 22]; // -> 19.5
	const c3 = [21, 18, 17, 20, 20, 18, 19, 21, 20, 21]; // -> 19.5
	console.assert(round1(mean(c1)) === 19.2, `packingMrCalc avg self-check failed: ${mean(c1)}`);
	console.assert(
		computePackingMrPreview(c1.map(String)).n === PACKING_MR_READINGS,
		"packingMrCalc n self-check failed",
	);
	// 3 HESSIAN columns: 582 / 30 = 19.4 (weighted mean === mean of column averages here).
	console.assert(
		round1(groupWeightedMean([c1, c2, c3])) === 19.4,
		`packingMrCalc group weighted-mean self-check failed: ${groupWeightedMean([c1, c2, c3])}`,
	);
}
