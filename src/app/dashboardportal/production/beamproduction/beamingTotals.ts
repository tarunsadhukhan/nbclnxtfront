/**
 * Beaming entry formulas — a live-preview mirror of the database view
 * vw_beaming_prod_hdr (legacy Smart Eye PayOProdBmg). The view stays the
 * source of truth; keep both in step.
 * Spec: docs/superpowers/specs/2026-09-13-beaming-entry-fortnight-design.md
 */

export interface BeamingLineInput {
  prodQty: number;
  rate: number;
}

export interface BeamingTotals {
  effHrs: number;
  divHrs: number;
  prodQty: number;
  prodValue: number;
  lhrValue: number;
  totalValue: number;
  kav: number;
  rate1: number;
  rate2: number;
  rate3: number;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Derived header values; KAV and rates come from the unrounded total. */
export function beamingTotals(machHrs: number, lostHrs: number, lines: BeamingLineInput[]): BeamingTotals {
  const effHrs = machHrs - lostHrs;
  const divHrs = machHrs * 3;
  const prodQty = lines.reduce((sum, l) => sum + l.prodQty, 0);
  const pv = lines.reduce((sum, l) => sum + l.prodQty * l.rate, 0);
  const lhv = effHrs > 0 ? (pv / effHrs) * lostHrs : 0;
  const tv = pv + lhv;
  const kav = tv / 20;
  return {
    effHrs,
    divHrs,
    prodQty,
    prodValue: round(pv, 2),
    lhrValue: round(lhv, 2),
    totalValue: round(tv, 2),
    kav: round(kav, 6),
    rate1: divHrs > 0 ? round((tv - kav) / divHrs, 6) : 0,
    rate2: round(kav / 32, 6),
    rate3: round(kav / 48, 6),
  };
}

/** "2026-08-31" -> "AUG/26/02" (MON/YY/fortnight); "" for an invalid date. */
export function periodLabel(isoDate: string): string {
  const m = ISO_DATE.exec(isoDate);
  const mon = m ? MONTHS[Number(m[2]) - 1] : undefined;
  if (!m || !mon) return "";
  return `${mon}/${m[1].slice(2)}/${Number(m[3]) <= 15 ? "01" : "02"}`;
}

/** True when the ISO date is the 15th or the last day of its month. */
export function isFortnightEnd(isoDate: string): boolean {
  const m = ISO_DATE.exec(isoDate);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  return day === 15 || day === new Date(year, month, 0).getDate();
}

/** The fortnight end (15th or month end) on or after an ISO date. */
export function fortnightEndFor(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const end = day <= 15 ? 15 : new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
}
