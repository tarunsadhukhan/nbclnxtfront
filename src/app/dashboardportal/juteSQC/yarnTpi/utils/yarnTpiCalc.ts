// Client-side preview for R-08-17 Yarn TPI & TPI CV%. The server recomputes
// every stat on save and is AUTHORITATIVE; this only reproduces the math for
// live display while the inspector punches the 20-cell TPI reading grid.
//
// CV% = (sample stdev / mean) × 100. Sample stdev uses the (n-1) divisor and is
// undefined for n < 2 → null (callers render "—").

export const TPI_READING_COUNT = 20;

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

// Drop blanks/non-numeric; keep the numeric TPI readings. Trailing blanks are
// allowed in the grid, so this is the canonical "used readings" set.
export function numericReadings(readings: (string | number | null)[]): number[] {
	return readings
		.filter((r) => r !== "" && r !== null && r !== undefined)
		.map((r) => Number(r))
		.filter((n) => Number.isFinite(n));
}

// Sample standard deviation (n-1 divisor). null for n < 2.
export function sampleStdDev(nums: number[]): number | null {
	const n = nums.length;
	if (n < 2) return null;
	const mean = nums.reduce((acc, v) => acc + v, 0) / n;
	const variance = nums.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1);
	return Math.sqrt(variance);
}

export type YarnTpiPreview = {
	avg_tpi: number | null;
	std_dev: number | null;
	cv_pct: number | null;
	min_tpi: number | null;
	max_tpi: number | null;
	n: number;
};

// Live preview from the raw (string) grid state.
export function computeTpiPreview(readings: (string | number | null)[]): YarnTpiPreview {
	const nums = numericReadings(readings);
	const n = nums.length;
	if (n === 0) {
		return { avg_tpi: null, std_dev: null, cv_pct: null, min_tpi: null, max_tpi: null, n: 0 };
	}
	const avg = nums.reduce((acc, v) => acc + v, 0) / n;
	const sd = sampleStdDev(nums);
	const cv = sd != null && avg !== 0 ? (sd / avg) * 100 : null;
	return {
		avg_tpi: round2(avg),
		std_dev: sd != null ? round2(sd) : null,
		cv_pct: cv != null ? round2(cv) : null,
		min_tpi: round2(Math.min(...nums)),
		max_tpi: round2(Math.max(...nums)),
		n,
	};
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: tiny self-check — runs only when YARN_TPI_SELFCHECK=1 under node,
// never in the Next bundle. Verifies the CV% formula against a known series.
if (typeof process !== "undefined" && process.env?.YARN_TPI_SELFCHECK === "1") {
	const p = computeTpiPreview(["10", "12", "14", "", null]);
	console.assert(p.n === 3, "n");
	console.assert(p.avg_tpi === 12, "avg");
	console.assert(p.min_tpi === 10 && p.max_tpi === 14, "min/max");
	// stdev of [10,12,14] (n-1) = 2; CV% = 2/12*100 = 16.67
	console.assert(p.std_dev === 2, "stdev");
	console.assert(p.cv_pct === 16.67, "cv%");
	console.log("yarnTpiCalc self-check passed");
}
