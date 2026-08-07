// Client-side preview for R-08-20 Cutting Length (daily cut-piece length
// consistency). The server recomputes avg / stdev / cv_pct / deviation on
// save/read and is AUTHORITATIVE; this only reproduces the math for live display
// so the inspector sees the numbers before saving.
//
// avg       = mean of the 20 readings
// stdev     = SAMPLE standard deviation (n-1, Bessel's correction — matches
//             Python statistics.stdev, NOT pstdev)
// cv_pct    = stdev / avg * 100
// deviation = avg − std_length   (no MR correction, no pass/fail band)

import { CUTTING_LENGTH_READINGS } from "../types/cuttingLengthTypes";

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function mean(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

// SAMPLE standard deviation (n-1). Needs at least 2 readings; returns 0 otherwise.
export function sampleStdev(nums: number[]): number {
	const n = nums.length;
	if (n < 2) return 0;
	const m = mean(nums);
	const sumSq = nums.reduce((a, b) => a + (Number(b) - m) ** 2, 0);
	return Math.sqrt(sumSq / (n - 1));
}

export type CuttingLengthPreview = {
	avg: number | null; // mean of the parsed readings
	stdev: number | null; // sample stdev (n-1)
	cvPct: number | null; // stdev / avg * 100
	deviation: number | null; // avg − std_length
	n: number; // # of valid (numeric, > 0) readings used
};

// Live advisory preview from string-state inputs. Blank/invalid readings are
// dropped. Returns null fields when no usable reading exists yet.
export function computeCuttingLengthPreview(
	readingStrings: string[],
	stdLength: number,
): CuttingLengthPreview {
	const readings: number[] = [];
	for (const s of readingStrings) {
		if (s === "") continue;
		const v = Number(s);
		if (!Number.isFinite(v) || v <= 0) continue;
		readings.push(v);
	}
	if (readings.length === 0) {
		return { avg: null, stdev: null, cvPct: null, deviation: null, n: 0 };
	}
	const avgRaw = mean(readings);
	const stdevRaw = sampleStdev(readings);
	const avg = round2(avgRaw);
	const stdev = round2(stdevRaw);
	const cvPct = avgRaw !== 0 ? round2((stdevRaw / avgRaw) * 100) : null;
	const deviation = round2(avgRaw - Number(stdLength));
	return { avg, stdev, cvPct, deviation, n: readings.length };
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: self-check guards the only non-trivial logic (mean + SAMPLE stdev +
// cv% + deviation) against the spec's VERIFIED EXAMPLE. Runs once on import in
// dev; a no-op in production. Throws if the math drifts.
if (process.env.NODE_ENV !== "production") {
	const readings = [
		78, 78, 79, 78, 78, 78, 78, 78, 78, 78, 78, 79, 77, 78, 78, 78, 78, 78, 78, 78,
	];
	console.assert(readings.length === CUTTING_LENGTH_READINGS, "cuttingLengthCalc: example must be 20 readings");
	const m = mean(readings);
	const sd = sampleStdev(readings);
	const cv = (sd / m) * 100;
	console.assert(Math.abs(round2(m) - 78.05) < 1e-9, `cuttingLengthCalc avg self-check failed: ${round2(m)}`);
	console.assert(Math.abs(sd - 0.394) < 0.001, `cuttingLengthCalc sample-stdev self-check failed: ${sd}`);
	console.assert(Math.abs(cv - 0.5048) < 0.001, `cuttingLengthCalc cv% self-check failed: ${cv}`);
	console.assert(Math.abs(round2(m - 78) - 0.05) < 1e-9, `cuttingLengthCalc deviation self-check failed: ${round2(m - 78)}`);
}
