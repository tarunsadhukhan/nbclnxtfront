// Client-side preview for Humidity Recording (plant-wide dept temp/RH log). The
// server computes avg_temp / avg_rh on save/read and is AUTHORITATIVE; this only
// reproduces the math for live display so the operator sees the round averages
// before save. avg_temp = mean(temp_c over spots); avg_rh = mean(rh_pct over
// spots). Both rounded 2dp. NO std/CV.

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// Current device time as "HH:MM" — prefilled into a spot's reading_time (the
// operator may edit it).
export function nowHHMM(): string {
	const d = new Date();
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type SpotRowStrings = {
	spot_label: string;
	reading_time: string;
	temp_c: string;
	rh_pct: string;
};

export const blankSpotRow = (): SpotRowStrings => ({
	spot_label: "",
	reading_time: nowHHMM(),
	temp_c: "",
	rh_pct: "",
});

// A blank input becomes NaN (not Number("")===0) so downstream validation flags
// missing values instead of silently treating them as 0.
function num(s: string): number {
	return s.trim() === "" ? NaN : Number(s);
}

function mean(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return null;
	return round2(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export type RoundAverages = {
	avg_temp: number | null;
	avg_rh: number | null;
};

// Live round averages from string-state spot rows (advisory; server is
// authoritative). Wholly-blank rows are skipped so a trailing empty spot does not
// poison the averages.
export function computeRoundAverages(rows: SpotRowStrings[]): RoundAverages {
	const temps: number[] = [];
	const rhs: number[] = [];
	for (const r of rows) {
		const allBlank =
			r.temp_c.trim() === "" &&
			r.rh_pct.trim() === "" &&
			r.spot_label.trim() === "" &&
			r.reading_time.trim() === "";
		if (allBlank) continue;
		temps.push(num(r.temp_c));
		rhs.push(num(r.rh_pct));
	}
	return { avg_temp: mean(temps), avg_rh: mean(rhs) };
}

// ponytail: tiny self-check guards the only non-trivial logic (the two means).
// Runs once on import in dev; a no-op in production. Throws if the math drifts.
// Locked examples from spec: [17/81,17/80,17/81] -> 17.0/80.67;
// [17/75,16/78,17/76] -> 16.67/76.33.
if (process.env.NODE_ENV !== "production") {
	const a = computeRoundAverages([
		{ spot_label: "", reading_time: "", temp_c: "17", rh_pct: "81" },
		{ spot_label: "", reading_time: "", temp_c: "17", rh_pct: "80" },
		{ spot_label: "", reading_time: "", temp_c: "17", rh_pct: "81" },
	]);
	console.assert(
		a.avg_temp === 17.0 && a.avg_rh === 80.67,
		`humidityCalc self-check A failed: ${JSON.stringify(a)}`,
	);
	const b = computeRoundAverages([
		{ spot_label: "", reading_time: "", temp_c: "17", rh_pct: "75" },
		{ spot_label: "", reading_time: "", temp_c: "16", rh_pct: "78" },
		{ spot_label: "", reading_time: "", temp_c: "17", rh_pct: "76" },
	]);
	console.assert(
		b.avg_temp === 16.67 && b.avg_rh === 76.33,
		`humidityCalc self-check B failed: ${JSON.stringify(b)}`,
	);
}
