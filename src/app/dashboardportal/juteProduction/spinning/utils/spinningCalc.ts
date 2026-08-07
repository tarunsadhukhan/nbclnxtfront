// Client-side preview mirrors src/juteProduction/services/spinning_rules.py exactly.
// The server recomputes all values on save and is authoritative.
//
// Unit caution: the production constants baked into p100X (14400, 2.2046, 36)
// encode legacy unit conversions (count system, lb<->kg, inches<->yards). Do NOT
// "simplify" them — they reproduce the exact mill audit spreadsheet.

import type { DoffEntryRow } from "../types/spinningTypes";

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

function round3(x: number): number {
	return Math.round(x * 1000) / 1000;
}

// Doff tare = trolly + busket (sic) + bobbin weights.
export function computeTare(trollyWeight: number, busketWeight: number, bobbinWeight: number): number {
	return round3(Number(trollyWeight) + Number(busketWeight) + Number(bobbinWeight));
}

// Net doff weight = gross - tare.
export function computeNet(gross: number, tare: number): number {
	return round3(Number(gross) - Number(tare));
}

// 100%-efficiency production (kg) for one shift bucket.
// Returns 0 when framesX or tpi is zero/falsy (avoids div-by-zero).
export function p100X(
	speed: number,
	hrsX: number,
	actCount: number,
	spindle: number,
	framesX: number,
	tpi: number,
): number {
	if (!framesX || !tpi) return 0;
	return round2((speed * hrsX * 60 * actCount * spindle * framesX) / (tpi * 14400 * 2.2046 * 36));
}

// Planning-grid 100%-efficiency production preview for one frame/spell row.
// Mirrors the backend planning_grid p100prod term:
//   (std_speed * minutes * act_count * spindles) / (36 * 14400 * 2.2046 * std_tpi)
// rounded to 0 decimals. Returns 0 when std_tpi/spindles/act_count are zero
// (avoids div-by-zero). DISPLAY-ONLY preview — the server is authoritative.
export function p100ProdSpell(
	stdSpeed: number,
	minutes: number,
	actCount: number,
	spindles: number,
	stdTpi: number,
): number {
	if (!stdTpi || !spindles || !actCount) return 0;
	return Math.round(
		(Number(stdSpeed) * Number(minutes) * Number(actCount) * Number(spindles)) /
			(36 * 14400 * 2.2046 * Number(stdTpi)),
	);
}

// R-08-16 Yarn Parameter (Spinning SQC) count preview. The server recomputes
// these on save and is authoritative; this only mirrors the math for live display.
//   observed  = round( (wt450Gms / 450) * (14400 / 454), 2 )
//   corrected = round( observed / (100 + mrPct) * (100 + stdMrPct), 2 )
// Returns 0 when inputs are missing/invalid (callers show "—" for empty inputs).
export function observedCount(wt450Gms: number): number {
	if (!wt450Gms || Number(wt450Gms) <= 0) return 0;
	return round2((Number(wt450Gms) / 450) * (14400 / 454));
}

export function correctedCount(observed: number, mrPct: number, stdMrPct: number): number {
	const denom = 100 + Number(mrPct);
	if (!observed || !denom) return 0;
	return round2((Number(observed) / denom) * (100 + Number(stdMrPct)));
}

// Sample standard deviation (n-1 divisor) for the Spinning SQC QR/CV live
// preview. The server recomputes via Python `statistics` and is authoritative;
// this only mirrors the math for live display. Non-numeric/NaN values are
// ignored. Returns null when fewer than 2 numeric values remain (sample stdev
// is undefined for n < 2) — callers show "—" for an empty/insufficient set.
export function sampleStdDev(nums: number[]): number | null {
	const vals = (nums || [])
		.map((n) => Number(n))
		.filter((n) => Number.isFinite(n));
	const n = vals.length;
	if (n < 2) return null;
	const mean = vals.reduce((acc, v) => acc + v, 0) / n;
	const variance = vals.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1);
	return Math.sqrt(variance);
}

// Frame-wise production rollup — one row per (frame, yarn quality) with every
// doff net of the spell listed ("34 + 45 + 30"), summed and averaged.
// Display-only; mirrors winding's groupWinderWise.
export type FrameWiseRow = {
	id: string;
	frame: string;
	item_code: string;
	operators: string;
	doffs: number;
	weights: string;
	total: number;
	avg_doff: number;
	prev_avg_doff: number | null;
};

// Average net of every doff in the group, keyed the same way as the main rollup
// so the previous spell's averages line up frame-for-frame.
function frameAverages(rows: DoffEntryRow[]): Map<string, number> {
	const acc = new Map<string, { sum: number; n: number }>();
	for (const r of rows) {
		const key = `${r.mc_id ?? "-"}|${r.item_id ?? "-"}`;
		const g = acc.get(key) ?? { sum: 0, n: 0 };
		g.sum += Number(r.net_weight) || 0;
		g.n += 1;
		acc.set(key, g);
	}
	return new Map([...acc].map(([k, g]) => [k, round3(g.sum / g.n)]));
}

export function groupFrameWise(rows: DoffEntryRow[], prevRows: DoffEntryRow[] = []): FrameWiseRow[] {
	const prevAvg = frameAverages(prevRows);
	const map = new Map<
		string,
		{ frame: string; item_code: string; operators: Set<string>; nets: number[] }
	>();
	for (const r of rows) {
		const key = `${r.mc_id ?? "-"}|${r.item_id ?? "-"}`;
		let g = map.get(key);
		if (!g) {
			g = {
				frame: r.mech_code || r.machine_name || "—",
				item_code: r.item_code ?? "—",
				operators: new Set<string>(),
				nets: [],
			};
			map.set(key, g);
		}
		if (r.eb_name) g.operators.add(r.eb_name);
		g.nets.push(round3(Number(r.net_weight) || 0));
	}
	return [...map.entries()]
		.map(([id, g]) => {
			const total = round3(g.nets.reduce((a, b) => a + b, 0));
			return {
				id,
				frame: g.frame,
				item_code: g.item_code,
				operators: [...g.operators].sort().join(", ") || "—",
				doffs: g.nets.length,
				weights: g.nets.join(" + "),
				total,
				avg_doff: round3(total / g.nets.length),
				prev_avg_doff: prevAvg.get(id) ?? null,
			};
		})
		.sort((a, b) => a.frame.localeCompare(b.frame) || a.item_code.localeCompare(b.item_code));
}

// Previous shift = the spell before `spellId` in starting_time order (the order
// the setup endpoint returns them); on the day's first spell it rolls back to
// the last spell of the previous date. null when the spell isn't in the list.
export function prevShiftRef(
	spells: { spell_id: number }[],
	spellId: number | null,
	tranDate: string,
): { spellId: number; date: string } | null {
	if (spellId == null || spells.length === 0) return null;
	const idx = spells.findIndex((s) => s.spell_id === spellId);
	if (idx < 0) return null;
	if (idx > 0) return { spellId: spells[idx - 1].spell_id, date: tranDate };
	const d = new Date(`${tranDate}T00:00:00`);
	if (Number.isNaN(d.getTime())) return null;
	d.setDate(d.getDate() - 1);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return { spellId: spells[spells.length - 1].spell_id, date: `${d.getFullYear()}-${m}-${day}` };
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
