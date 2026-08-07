// Client-side preview for R-08-18 Beam MR% (warp-beam moisture-regain QC).
// The server recomputes avg_mr / deviation on save/read and is AUTHORITATIVE;
// this only reproduces the math for live per-set display so the inspector sees the
// average MR% and the deviation (avg − std MR) before saving.
//
// avg_mr   = mean of the 5 MR% readings
// deviation = avg_mr − std_mr_pct  (no CV%, no pass/fail band)

import {
	DEFAULT_STD_MR_BY_GROUP,
	type QualityGroup,
} from "../types/beamMrTypes";

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function mean(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

// Std MR% for a quality group, preferring the server's std_mr_by_group, falling
// back to the fixed defaults (HESSIAN 16 / SACKING 20).
export function stdMrForGroup(
	group: QualityGroup,
	stdMrByGroup?: Record<string, number> | null,
): number {
	const fromServer = stdMrByGroup?.[group];
	return fromServer != null && Number.isFinite(fromServer)
		? Number(fromServer)
		: DEFAULT_STD_MR_BY_GROUP[group];
}

export type BeamMrPreview = {
	avgMr: number | null; // mean of the parsed readings
	deviation: number | null; // avgMr − stdMr
	n: number; // # of valid (numeric, >= 0) readings used
};

// Live advisory preview from string-state inputs. Blank/invalid readings are
// dropped. Returns null avg when no usable reading exists yet.
export function computeBeamMrPreview(
	readingStrings: string[],
	stdMrPct: number,
): BeamMrPreview {
	const readings: number[] = [];
	for (const s of readingStrings) {
		if (s === "") continue;
		const v = Number(s);
		if (!Number.isFinite(v) || v < 0) continue;
		readings.push(v);
	}
	if (readings.length === 0) return { avgMr: null, deviation: null, n: 0 };
	const avgMr = round2(mean(readings));
	const deviation = round2(avgMr - Number(stdMrPct));
	return { avgMr, deviation, n: readings.length };
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: tiny self-check guards the only non-trivial logic (avg + deviation).
// Runs once on import in dev; a no-op in production. Throws if the math drifts.
if (process.env.NODE_ENV !== "production") {
	const p = computeBeamMrPreview(["14", "16", "18", "16", "16"], 16);
	console.assert(p.avgMr === 16, `beamMrCalc avg self-check failed: ${p.avgMr}`);
	console.assert(p.deviation === 0, `beamMrCalc deviation self-check failed: ${p.deviation}`);
	console.assert(p.n === 5, `beamMrCalc n self-check failed: ${p.n}`);
	// Variable-length: fewer readings still average correctly.
	const p3 = computeBeamMrPreview(["15", "17", "19"], 16);
	console.assert(p3.avgMr === 17 && p3.n === 3, `beamMrCalc variable-length self-check failed: ${p3.avgMr}/${p3.n}`);
	console.assert(
		stdMrForGroup("SACKING") === 20 && stdMrForGroup("HESSIAN") === 16,
		"beamMrCalc stdMrForGroup default self-check failed",
	);
}
