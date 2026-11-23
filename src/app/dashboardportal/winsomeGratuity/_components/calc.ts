/**
 * Winsome gratuity calculation — a line-by-line port of the legacy Smart-Eye forms
 * FrmGratuityCalc / FrmGratuityCalcActive_WIL (`Calc_Final`, `Grd_CellEndEdit`, `Get_Age`).
 * Legacy computed on screen and stored what the screen showed; the backend does the same.
 * Field names are the legacy column names, so documents round-trip unchanged.
 */

export type Val = string | number;
export type GratKind = "stl" | "calc";

export interface GratLine {
  GYear: Val;
  WorkingDays: Val;
  StrikeDays: Val;
  TSWAllow: string; // "Y" = strike days count as worked
  LockOutDays: Val;
  LockDownDays: Val;
  LayOffDays: Val;
  PreviousSTL: Val;
  STLEarned: Val;
  STLAvailed: Val;
  AdjDays: Val;
  Eligible: string;
  FinalCount: Val;
  TotalDays: Val;
  Remarks?: string;
  Settled?: string;
  LineStatus?: string;
}

export interface Nominee {
  NomineeName: string;
  PShare: Val;
  GShare: Val;
  GAmount: Val;
  Relation: string;
  Address: string;
}

export type GratHeader = Record<string, Val>;

export const DEATH = "DEATH";
export const BADLI_WITH_DOP = "BADLI WITH DATE OF PERMANENT";
export const BADLI_WITHOUT_DOP = "BADLI WITHOUT DATE OF PERMANENT";

/** VB Conversion.Val: blank / non-numeric -> 0. */
export const val = (v: Val | null | undefined): number => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** VB Strings.Format(x, "#0"): round half away from zero. */
export const fmt0 = (x: number): number =>
  Math.sign(x) * Math.round(Math.abs(x));

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;

export const blankLine = (year: number): GratLine => ({
  GYear: year,
  WorkingDays: 0,
  StrikeDays: 0,
  TSWAllow: "Y",
  LockOutDays: 0,
  LockDownDays: 0,
  LayOffDays: 0,
  PreviousSTL: 0,
  STLEarned: 0,
  STLAvailed: 0,
  AdjDays: 0,
  Eligible: "N",
  FinalCount: 0,
  TotalDays: 0,
  Remarks: "",
});

/**
 * Legacy dbo.GET_AGE(from, to): completed years / months / days between two ISO dates
 * (DATEDIFF(MONTH) with the "day not reached yet" correction, DATEADD clamping month ends).
 */
export function getAge(
  from: string,
  to: string,
): { y: number; m: number; d: number } | null {
  const f = parseIso(from);
  const t = parseIso(to);
  if (!f || !t) return null;
  const start = f.getUTCDate() > t.getUTCDate() ? addMonths(f, 1) : f;
  const months =
    (t.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (t.getUTCMonth() - start.getUTCMonth());
  const y = Math.trunc(months / 12);
  const m = months % 12;
  const d = Math.round(
    (t.getTime() - addMonths(f, y * 12 + m).getTime()) / 86_400_000,
  );
  return { y, m, d };
}

function parseIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

/** SQL Server DATEADD(MONTH): keeps the day, clamped to the target month's last day. */
function addMonths(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo, Math.min(d.getUTCDate(), last)));
}

/** Legacy TxtLastWagesAmt_KeyDown: rate per hour from the last wages, per day = 8 hours. */
export function ratesFromLastWages(perDay: Val, hours: Val) {
  const h = val(hours);
  const perHour = h ? round5(val(perDay) / h) : 0;
  return { AvgRatePerHour: perHour, AvgRatePerDay: round5(perHour * 8) };
}

/**
 * Legacy Grd_CellEndEdit: working + strike days capped at 365, the edited year loses its
 * eligibility flag until recalculated, and STL availed above 15 is refused (except the first year).
 */
export function editLine(
  lines: GratLine[],
  i: number,
  patch: Partial<GratLine>,
): GratLine[] {
  const l = { ...lines[i], ...patch, Eligible: "N" };
  if (val(l.WorkingDays) + val(l.StrikeDays) > 365)
    l.WorkingDays = 365 - val(l.StrikeDays);
  if (i > 0 && val(l.STLAvailed) > 15) l.STLAvailed = 0;
  return lines.map((x, j) => (j === i ? l : x));
}

/**
 * Legacy Calc_Final. Year-wise: total days = worked + adjusted + STL availed (+ strike days when
 * TSW is allowed); a year of 240+ days earns STL (worked / 20, max 15) and, from the eligibility
 * year on (5 continuous 240-day years when the 5-year check is on), counts towards gratuity.
 * Gratuity = applicable years x average rate per day x 15.
 *
 * `fc` is the legacy "FC" box (final count for badli years, default 0.5).
 * Differences kept from legacy: the STL form pays FinalGratuityAmt on the final applicable years,
 * the calculation form on the applicable years (and zeroes it when the net amount is 0).
 */
export function calcGratuity(
  kind: GratKind,
  header: GratHeader,
  input: GratLine[],
  nominees: Nominee[],
  fc = 0.5,
): { header: GratHeader; lines: GratLine[]; nominees: Nominee[] } {
  const h: GratHeader = { ...header };
  const lines = input.map((l) => ({ ...l }));
  const fiveYr = h.FiveYear240Validation === "Y";
  const deathWithLic =
    String(h.TEReason ?? "").toUpperCase() === DEATH &&
    String(h.PolicyID ?? "") !== "";
  const docType = String(h.DocType ?? "");
  const hasPolicy = String(h.PolicyNo ?? "") !== "";
  const periodY = val(h.PeriodInYears);
  const periodM = val(h.PeriodInMonth);
  const dopYear = parseIso(String(h.DoP ?? ""))?.getUTCFullYear() ?? 0;
  let efy = val(h.EligiblityStartingYear);
  let run = 0;

  lines.forEach((l, i) => {
    const tsw = l.TSWAllow === "Y";
    const wd = val(l.WorkingDays);
    const total =
      wd + val(l.AdjDays) + val(l.STLAvailed) + (tsw ? val(l.StrikeDays) : 0);
    if (total >= 240) {
      if (fiveYr) {
        run++;
        if (run === 5 && efy === 0) efy = val(lines[i - 4].GYear);
      } else {
        efy = val(l.GYear);
      }
      if (deathWithLic && efy === 0) efy = val(l.GYear);
      l.STLEarned = fmt0(wd / 20);
    } else {
      run = 0;
    }
    l.TotalDays = total;
    if (total >= 240 && efy !== 0) {
      l.STLEarned = fmt0(wd / 20);
      // ponytail: legacy STL form compared DoP with GYear as strings (never true); the
      // calculation form's year comparison is used for both.
      if (docType === BADLI_WITHOUT_DOP) {
        l.FinalCount = hasPolicy ? 1 : fc;
      } else if (docType === BADLI_WITH_DOP && dopYear > val(l.GYear)) {
        l.FinalCount = hasPolicy ? (periodM > 6 ? fc : 1) : fc;
      } else {
        l.FinalCount = l.Eligible === "Y" ? 1 : 0;
      }
    }
    if (val(l.STLEarned) > 15) l.STLEarned = 15;
  });

  const maxAppl = periodM > 6 ? periodY + 1 : periodY;
  let noOfAppl = 0;
  let payNoOfAppl = 0;
  for (const l of lines) {
    const tsw = l.TSWAllow === "Y";
    const worked = val(l.WorkingDays) + val(l.AdjDays) + val(l.STLAvailed);
    const fromEfy = efy <= val(l.GYear) && efy > 0;
    if (val(l.STLEarned) > 0) {
      const ok = fiveYr
        ? fromEfy && (tsw ? val(l.TotalDays) >= 240 : worked >= 240)
        : tsw
          ? val(l.TotalDays) >= 240
          : worked >= 240;
      if (ok) {
        l.Eligible = "Y";
        l.FinalCount = 1;
      }
    }
    if (l.Eligible === "Y") noOfAppl++;
    if (val(l.STLEarned) > 0) payNoOfAppl += val(l.FinalCount);
  }

  const pct = val(h.FinalPayPercent);
  payNoOfAppl = pct
    ? Math.ceil(noOfAppl * (pct / 100))
    : fmt0(payNoOfAppl);
  h.EligiblityStartingYear = efy;
  h.MaxApplicableYrs = maxAppl;
  h.NoOfApplicableYrs = noOfAppl;
  h.NonEligibleYrs = maxAppl - noOfAppl;
  h.FinalNoOfApplicableYrs = payNoOfAppl;
  h.FinalMaxApplicableYrs = maxAppl + val(h.MaxAdjApplicableYrs);
  h.FinalNonEligibleYrs = maxAppl - fmt0(payNoOfAppl);

  h.FinalGratuityAmt = 0;
  h.FinalNetAmt = 0;
  const rate = val(h.AvgRatePerDay);
  const plus = val(h.LCSAAmt) - val(h.AdvanceAgainstGrat);
  if (rate > 0) {
    h.GratuityAmt = fmt0(noOfAppl * rate * 15);
    h.NetAmt = val(h.GratuityAmt) + plus;
    if (kind === "stl") {
      h.FinalGratuityAmt = fmt0(payNoOfAppl * rate * 15);
      h.FinalNetAmt = val(h.FinalGratuityAmt) + plus;
    } else if (val(h.NetAmt) !== 0) {
      h.FinalGratuityAmt = fmt0(noOfAppl * rate * 15);
      h.FinalNetAmt = val(h.FinalGratuityAmt) + plus;
    }
  }

  const net = val(h.FinalNetAmt);
  return {
    header: h,
    lines,
    nominees: nominees.map((n) => ({
      ...n,
      GAmount: fmt0(net * (val(n.GShare) / 100)),
    })),
  };
}
