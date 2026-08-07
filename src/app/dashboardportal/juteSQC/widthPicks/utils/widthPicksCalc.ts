// Client-side preview for R-08-21 Width & Picks (on-loom dimensional QC). The
// server recomputes the width + picks summaries on save/read and is
// AUTHORITATIVE; this only reproduces the math for live display so the inspector
// sees the avg width / tolerance band / remark and the picks stats before save.
//
// WIDTH (over every row's width_cm):
//   avg_width = mean(width_cm)
//   tol_low   = std_width_cm * 0.995   (−0.5%)
//   tol_high  = std_width_cm * 1.005   (+0.5%)
//   remark    = '$' when avg_width < tol_low OR avg_width > tol_high, else ''
// PICKS (over the NON-NULL picks_dm only):
//   avg_picks = mean
//   stdev     = SAMPLE stdev (needs >=2 values, else null)
//   max/min/pick_count
//   NO CV%. NO MR correction.

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

function round4(x: number): number {
	return Math.round(x * 10000) / 10000;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// A blank input becomes NaN (not Number("")===0) so downstream validation flags
// missing values instead of silently treating them as 0.
function num(s: string): number {
	return s.trim() === "" ? NaN : Number(s);
}

export type LoomRowStrings = {
	loom_id: number | "";
	width_cm: string;
	picks_dm: string; // blank allowed (not pick-checked)
};

export const blankLoomRow = (): LoomRowStrings => ({
	loom_id: "",
	width_cm: "",
	picks_dm: "",
});

// ─── WIDTH summary ────────────────────────────────────────────────────────────
export type WidthSummaryCalc = {
	avg_width: number | null;
	tol_low: number | null;
	tol_high: number | null;
	remark: string; // '$' or ''
};

// mean of finite values; null when none.
function mean(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return null;
	return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// avg width over all rows + the +/-0.5% tolerance band around std_width_cm and
// the two-sided remark. widths are the finite width_cm of each row.
export function widthSummary(widths: number[], stdWidthCm: number): WidthSummaryCalc {
	const avg = mean(widths);
	const tolLow = Number.isFinite(stdWidthCm) && stdWidthCm > 0 ? stdWidthCm * 0.995 : null;
	const tolHigh = Number.isFinite(stdWidthCm) && stdWidthCm > 0 ? stdWidthCm * 1.005 : null;
	const remark =
		avg != null && tolLow != null && tolHigh != null && (avg < tolLow || avg > tolHigh)
			? "$"
			: "";
	return {
		avg_width: avg == null ? null : round2(avg),
		tol_low: tolLow == null ? null : round2(tolLow),
		tol_high: tolHigh == null ? null : round2(tolHigh),
		remark,
	};
}

// ─── PICKS summary (over non-null picks only) ─────────────────────────────────
export type PicksSummaryCalc = {
	avg_picks: number | null;
	stdev: number | null; // sample stdev; null when <2 values
	max_picks: number | null;
	min_picks: number | null;
	pick_count: number;
};

// Sample standard deviation (matches Python statistics.stdev: divide by n-1).
// Needs >=2 values; null otherwise.
export function sampleStdev(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length < 2) return null;
	const m = valid.reduce((a, b) => a + b, 0) / valid.length;
	const variance = valid.reduce((a, b) => a + (b - m) ** 2, 0) / (valid.length - 1);
	return Math.sqrt(variance);
}

// picks stats over only the entered (non-null) picks_dm values.
export function picksSummary(picks: number[]): PicksSummaryCalc {
	const valid = picks.filter((n) => Number.isFinite(n));
	if (valid.length === 0) {
		return { avg_picks: null, stdev: null, max_picks: null, min_picks: null, pick_count: 0 };
	}
	const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
	const sd = sampleStdev(valid);
	return {
		avg_picks: round2(avg),
		stdev: sd == null ? null : round4(sd),
		max_picks: Math.max(...valid),
		min_picks: Math.min(...valid),
		pick_count: valid.length,
	};
}

// ─── Live preview over the form's string rows ─────────────────────────────────
export function computeWidthSummary(rows: LoomRowStrings[], stdWidthCm: number): WidthSummaryCalc {
	const widths = rows.map((r) => num(r.width_cm)).filter((n) => Number.isFinite(n));
	return widthSummary(widths, stdWidthCm);
}

export function computePicksSummary(rows: LoomRowStrings[]): PicksSummaryCalc {
	const picks = rows.map((r) => num(r.picks_dm)).filter((n) => Number.isFinite(n));
	return picksSummary(picks);
}

// ponytail: tiny self-check guards the only non-trivial logic (width band /
// remark + sample stdev). Runs once on import in dev; a no-op in production.
// VERIFIED EXAMPLE: std_width 99.06, std_picks 24; rows width/pick =
// [100/24, 99.5/24, 100/25, 100/null] -> avg_width 99.88, tol 98.56..99.56,
// remark '$' (99.88>99.56); avg_picks 24.33, stdev 0.5774, max 25, min 24, count 3.
if (process.env.NODE_ENV !== "production") {
	const w = widthSummary([100, 99.5, 100, 100], 99.06);
	console.assert(
		w.avg_width === 99.88,
		`widthPicksCalc avg_width self-check failed: ${w.avg_width}`,
	);
	console.assert(
		w.tol_low === 98.56 && w.tol_high === 99.56,
		`widthPicksCalc tol band self-check failed: ${w.tol_low}..${w.tol_high}`,
	);
	console.assert(w.remark === "$", `widthPicksCalc remark self-check failed: ${w.remark}`);
	const p = picksSummary([24, 24, 25]);
	console.assert(
		p.avg_picks === 24.33,
		`widthPicksCalc avg_picks self-check failed: ${p.avg_picks}`,
	);
	console.assert(
		p.stdev != null && Math.abs(p.stdev - 0.5774) < 0.001,
		`widthPicksCalc stdev self-check failed: ${p.stdev}`,
	);
	console.assert(
		p.max_picks === 25 && p.min_picks === 24 && p.pick_count === 3,
		`widthPicksCalc picks max/min/count self-check failed: ${p.max_picks}/${p.min_picks}/${p.pick_count}`,
	);
}
