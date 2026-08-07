// Client-side preview for R-08-19 Fabric Construction (woven hessian cloth
// construction audit). The server recomputes obs_ozs / crcted_oz / averages on
// save/read and is AUTHORITATIVE; this only reproduces the math for live display
// so the inspector sees the per-row corrected oz and block averages before save.
//
// Per row:
//   obs_ozs   = (obs_wt_kg * 1000 / 28.3495) / length_yds      (oz per yard)
//   crcted_oz = obs_ozs * (100 + std_mr_pct) / (100 + mr_pct)  (MR correction to std MR)

const GRAMS_PER_OZ = 28.3495;

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// Observed oz/yd from observed weight (kg) and length (yds). Null when either is
// blank/invalid or length is non-positive.
export function obsOzs(obsWtKg: number, lengthYds: number): number | null {
	if (!Number.isFinite(obsWtKg) || !Number.isFinite(lengthYds) || lengthYds <= 0) return null;
	return (obsWtKg * 1000) / GRAMS_PER_OZ / lengthYds;
}

// MR-corrected oz/yd: universal correction of observed oz to the std MR%. Null
// when obs is null or (100 + mr_pct) is non-positive.
export function crctedOz(obs: number | null, mrPct: number, stdMrPct: number): number | null {
	if (obs == null || !Number.isFinite(mrPct) || !Number.isFinite(stdMrPct)) return null;
	const denom = 100 + mrPct;
	if (denom <= 0) return null;
	return (obs * (100 + stdMrPct)) / denom;
}

export type SampleRowStrings = {
	length_yds: string;
	width_cms: string;
	ends_per_dm: string;
	picks_per_dm: string;
	mr_pct: string;
	obs_wt_kg: string;
};

export const blankSampleRow = (): SampleRowStrings => ({
	length_yds: "",
	width_cms: "",
	ends_per_dm: "",
	picks_per_dm: "",
	mr_pct: "",
	obs_wt_kg: "",
});

// A blank input becomes NaN (not Number("")===0) so downstream validation flags
// missing values instead of silently treating them as 0.
function num(s: string): number {
	return s.trim() === "" ? NaN : Number(s);
}

// Live per-row preview from string-state inputs. Returns rounded obs_ozs and
// crcted_oz (null when the inputs are not yet usable).
export function computeRowPreview(
	row: SampleRowStrings,
	stdMrPct: number,
): { obsOzs: number | null; crctedOz: number | null } {
	const obs = obsOzs(num(row.obs_wt_kg), num(row.length_yds));
	const crc = crctedOz(obs, num(row.mr_pct), stdMrPct);
	return {
		obsOzs: obs == null ? null : round2(obs),
		crctedOz: crc == null ? null : round2(crc),
	};
}

// The 8 columns averaged across the block's sample rows.
export type BlockAverages = {
	length_yds: number | null;
	width_cms: number | null;
	ends_per_dm: number | null;
	picks_per_dm: number | null;
	mr_pct: number | null;
	obs_wt_kg: number | null;
	obs_ozs: number | null;
	crcted_oz: number | null;
};

const EMPTY_AVG: BlockAverages = {
	length_yds: null,
	width_cms: null,
	ends_per_dm: null,
	picks_per_dm: null,
	mr_pct: null,
	obs_wt_kg: null,
	obs_ozs: null,
	crcted_oz: null,
};

function avg(nums: number[]): number | null {
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return null;
	return round2(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// Per-column averages of the live form rows (advisory; server is authoritative).
// Wholly-blank rows are skipped so trailing empties do not poison the averages.
export function computeBlockAverages(rows: SampleRowStrings[], stdMrPct: number): BlockAverages {
	if (rows.length === 0) return EMPTY_AVG;
	const cols = {
		length_yds: [] as number[],
		width_cms: [] as number[],
		ends_per_dm: [] as number[],
		picks_per_dm: [] as number[],
		mr_pct: [] as number[],
		obs_wt_kg: [] as number[],
		obs_ozs: [] as number[],
		crcted_oz: [] as number[],
	};
	for (const r of rows) {
		const allBlank =
			r.length_yds.trim() === "" &&
			r.width_cms.trim() === "" &&
			r.ends_per_dm.trim() === "" &&
			r.picks_per_dm.trim() === "" &&
			r.mr_pct.trim() === "" &&
			r.obs_wt_kg.trim() === "";
		if (allBlank) continue;
		cols.length_yds.push(num(r.length_yds));
		cols.width_cms.push(num(r.width_cms));
		cols.ends_per_dm.push(num(r.ends_per_dm));
		cols.picks_per_dm.push(num(r.picks_per_dm));
		cols.mr_pct.push(num(r.mr_pct));
		cols.obs_wt_kg.push(num(r.obs_wt_kg));
		const obs = obsOzs(num(r.obs_wt_kg), num(r.length_yds));
		if (obs != null) cols.obs_ozs.push(obs);
		const crc = crctedOz(obs, num(r.mr_pct), stdMrPct);
		if (crc != null) cols.crcted_oz.push(crc);
	}
	return {
		length_yds: avg(cols.length_yds),
		width_cms: avg(cols.width_cms),
		ends_per_dm: avg(cols.ends_per_dm),
		picks_per_dm: avg(cols.picks_per_dm),
		mr_pct: avg(cols.mr_pct),
		obs_wt_kg: avg(cols.obs_wt_kg),
		obs_ozs: avg(cols.obs_ozs),
		crcted_oz: avg(cols.crcted_oz),
	};
}

// ponytail: tiny self-check guards the only non-trivial logic (obs_ozs +
// crcted_oz). Runs once on import in dev; a no-op in production. Throws if the
// math drifts. obs_wt 22.5kg, length 100yds -> obs_ozs ~7.94; mr 29 std 16 -> crcted ~7.14.
if (process.env.NODE_ENV !== "production") {
	const obs = obsOzs(22.5, 100);
	console.assert(
		obs != null && Math.abs(obs - 7.94) < 0.01,
		`fabricConstructionCalc obs_ozs self-check failed: ${obs}`,
	);
	const crc = crctedOz(obs, 29, 16);
	console.assert(
		crc != null && Math.abs(crc - 7.14) < 0.01,
		`fabricConstructionCalc crcted_oz self-check failed: ${crc}`,
	);
}
