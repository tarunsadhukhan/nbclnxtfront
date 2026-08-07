// Client-side preview for R-08-02 Emulsion (daily jute-oil recipe log). The
// server recomputes both derived values on save/read and is AUTHORITATIVE; this
// only reproduces the math for live display so the operator sees them before save.
//
// theoretical_oil_pct = oil_used_ltr / tank_capacity_ltr * 100  (REFERENCE only,
//   shown beside the MEASURED oil_pct_in_emulsion; null when tank <= 0)
// oil_pct_status = 'OK'   when low <= measured <= high
//                  'LOW'  when measured < low
//                  'HIGH' when measured > high      (display-only)

import type { OilPctStatus } from "../types/emulsionTypes";

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// Reference theoretical oil %: oil/tank*100. Null when inputs are invalid or
// tank capacity is non-positive (div-guard).
export function theoreticalOilPct(
	oilUsed: number,
	tankCapacity: number,
): number | null {
	if (!Number.isFinite(oilUsed) || !Number.isFinite(tankCapacity)) return null;
	if (tankCapacity <= 0) return null;
	return round2((oilUsed / tankCapacity) * 100);
}

// Measured oil % vs the std band. Null when any input is invalid.
export function oilPctStatus(
	oilPct: number,
	low: number,
	high: number,
): OilPctStatus | null {
	if (!Number.isFinite(oilPct) || !Number.isFinite(low) || !Number.isFinite(high)) return null;
	if (oilPct < low) return "LOW";
	if (oilPct > high) return "HIGH";
	return "OK";
}

// MUI Chip color for a status — shared by the form preview chip and the grid.
export function statusChipColor(
	status: OilPctStatus | string | null | undefined,
): "success" | "warning" | "error" | "default" {
	if (status === "OK") return "success";
	if (status === "LOW") return "warning";
	if (status === "HIGH") return "error";
	return "default";
}

// ponytail: tiny self-check guards the only non-trivial logic (theoretical % +
// status). Runs once on import in dev; a no-op in production. Locks the spec's
// verified example.
if (process.env.NODE_ENV !== "production") {
	const t = theoreticalOilPct(170, 1000);
	console.assert(t === 17.0, `emulsionCalc theoretical(170,1000) self-check failed: ${t}`);
	console.assert(
		oilPctStatus(16.5, 16, 17) === "OK",
		`emulsionCalc status(16.5,16,17) self-check failed: ${oilPctStatus(16.5, 16, 17)}`,
	);
	console.assert(
		oilPctStatus(15, 16, 17) === "LOW",
		`emulsionCalc status(15,16,17) self-check failed: ${oilPctStatus(15, 16, 17)}`,
	);
	console.assert(
		oilPctStatus(18, 16, 17) === "HIGH",
		`emulsionCalc status(18,16,17) self-check failed: ${oilPctStatus(18, 16, 17)}`,
	);
	console.assert(
		theoreticalOilPct(1, 0) === null,
		"emulsionCalc div-guard (tank=0) self-check failed",
	);
}
