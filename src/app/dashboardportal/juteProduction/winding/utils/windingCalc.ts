// Client-side preview for the Winding doff net. Mirrors the backend
// src/juteProduction/services/winding_rules.py EXACTLY. The server recomputes
// all values on save and is authoritative — these helpers are display-only so
// the operator sees the net before pressing Save.

import type { WindingDoffRow } from "../types/windingTypes";

// Net-weight gate (kg): 1 <= net <= 500 (constants.py WINDING_NET_MIN /
// WINDING_NET_MAX). One weighing = one person = one row, so there is no split
// and the gate applies to the single net.
export const WINDING_NET_MIN = 1;
export const WINDING_NET_MAX = 500;

// Jugar (spindle leftover) weight band (kg): 0 < weight <= 100.
export const JUGAR_MIN = 0;
export const JUGAR_MAX = 100;

// Spindle-count band per person/spell on the quality entry: 1..30.
export const SPINDLE_MIN = 1;
export const SPINDLE_MAX = 30;

function round3(x: number): number {
	return Math.round(x * 1000) / 1000;
}

// Net weight of one doff (kg) — one weighing by one winder.
//   net = grosswt - trollywt - spoolwt
// May be <= 0 — caller gates Save on net > 0 (mirrors the BE 400).
export function computeWindingNet(grosswt: number, trollywt: number, spoolwt: number): number {
	return round3(Number(grosswt) - Number(trollywt) - Number(spoolwt));
}

// Stored per-row gross weight.
//   row_gross_wt = net + trollywt + spoolwt
export function computeWindingRowGrossWt(
	net: number,
	trollywt: number,
	spoolwt: number,
): number {
	return round3(Number(net) + Number(trollywt) + Number(spoolwt));
}

// A doff net must fall within [WINDING_NET_MIN, WINDING_NET_MAX].
export function validateWindingNet(net: number): boolean {
	return WINDING_NET_MIN <= net && net <= WINDING_NET_MAX;
}

// Winder-wise production rollup — one row per (winder, yarn quality) with every
// doff net of the day listed ("34 + 45 + 30") and summed. Display-only.
export type WinderWiseRow = {
	id: string;
	winder: string;
	item_code: string;
	weights: string;
	total: number;
};

export function groupWinderWise(rows: WindingDoffRow[]): WinderWiseRow[] {
	const map = new Map<string, { winder: string; item_code: string; nets: number[] }>();
	for (const r of rows) {
		const key = `${r.eb_id ?? "-"}|${r.item_id ?? "-"}`;
		let g = map.get(key);
		if (!g) {
			g = {
				winder: [r.emp_code, r.worker_name].filter(Boolean).join(" - ") || "—",
				item_code: r.item_code ?? "—",
				nets: [],
			};
			map.set(key, g);
		}
		g.nets.push(round3(Number(r.production_qty) || 0));
	}
	return [...map.entries()]
		.map(([id, g]) => ({
			id,
			winder: g.winder,
			item_code: g.item_code,
			weights: g.nets.join(" + "),
			total: round3(g.nets.reduce((a, b) => a + b, 0)),
		}))
		.sort((a, b) => a.winder.localeCompare(b.winder) || a.item_code.localeCompare(b.item_code));
}
