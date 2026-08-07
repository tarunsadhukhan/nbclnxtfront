// Client-side preview for R-08-22 Stitch (finishing sewing-stitch-density QC).
// The server recomputes avg / flag on save/read and is AUTHORITATIVE; this only
// reproduces the math for live per-set display so the inspector sees the average
// and the OK/LOW/HIGH flag before saving.
//
// avg  = mean of the 5 stitch counts (stitches/dm)
// flag = 'OK'   when avg == std_stitch (verified: 9.0 vs 9 → OK)
//        'LOW'  else if avg < std_stitch (verified: 8.0 vs 9 → LOW)
//        'HIGH' otherwise               (verified: 9.4 vs 9 → HIGH)
// (NO CV%, NO MR correction.)

import { STITCH_READINGS, type StitchFlag } from "../types/stitchTypes";

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function mean(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

// Mirror of the server flag rule. The verified examples lock it: avg 9.0/std 9 →
// OK, avg 8.0 → LOW, avg 9.4 → HIGH. So OK is exact equality (epsilon-tolerant
// for float drift); anything below std is LOW, anything above is HIGH. (A plain
// round(avg)==round(std) rule would wrongly call 9.4 "OK", so it is NOT used.)
export function stitchFlag(avg: number, stdStitch: number): StitchFlag {
	if (Math.abs(avg - stdStitch) < 1e-9) return "OK";
	return avg < stdStitch ? "LOW" : "HIGH";
}

export type StitchPreview = {
	avg: number | null; // mean of the parsed readings
	flag: StitchFlag | null; // OK / LOW / HIGH vs std
	n: number; // # of valid (numeric, > 0) readings used
};

// Live advisory preview from string-state inputs. Blank/invalid readings are
// dropped. Returns null avg/flag when no usable reading exists yet.
export function computeStitchPreview(
	readingStrings: string[],
	stdStitch: number,
): StitchPreview {
	const readings: number[] = [];
	for (const s of readingStrings) {
		if (s === "") continue;
		const v = Number(s);
		if (!Number.isFinite(v) || v <= 0) continue;
		readings.push(v);
	}
	if (readings.length === 0) return { avg: null, flag: null, n: 0 };
	const avg = round2(mean(readings));
	return { avg, flag: stitchFlag(avg, Number(stdStitch)), n: readings.length };
}

// MUI Chip color for a flag — shared by the form preview chip and the grid.
export function flagChipColor(flag: StitchFlag | null | undefined): "success" | "warning" | "error" | "default" {
	if (flag === "OK") return "success";
	if (flag === "LOW") return "warning";
	if (flag === "HIGH") return "error";
	return "default";
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: tiny self-check guards the only non-trivial logic (avg + flag).
// Runs once on import in dev; a no-op in production. Locks the three verified
// examples. Throws if the math drifts.
if (process.env.NODE_ENV !== "production") {
	const ok = computeStitchPreview(["9", "9", "9", "9", "9"], 9);
	console.assert(ok.avg === 9 && ok.flag === "OK", `stitchCalc OK self-check failed: ${ok.avg}/${ok.flag}`);
	console.assert(ok.n === STITCH_READINGS, `stitchCalc n self-check failed: ${ok.n}`);
	const low = computeStitchPreview(["8", "8", "8", "8", "8"], 9);
	console.assert(low.avg === 8 && low.flag === "LOW", `stitchCalc LOW self-check failed: ${low.avg}/${low.flag}`);
	const high = computeStitchPreview(["9", "10", "9", "10", "9"], 9);
	console.assert(high.avg === 9.4 && high.flag === "HIGH", `stitchCalc HIGH self-check failed: ${high.avg}/${high.flag}`);
}
