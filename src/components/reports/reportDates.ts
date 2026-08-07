/** Shared date helpers for the jute report pages. */

const iso = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** First and last day of the current month as YYYY-MM-DD. */
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
}

/** The last `days` days ending today (inclusive), as YYYY-MM-DD. */
export function lastDaysRange(days: number): { from: string; to: string } {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: iso(from), to: iso(new Date()) };
}

/** Today as YYYY-MM-DD. */
export function todayIso(): string {
  return iso(new Date());
}

/** Yesterday as YYYY-MM-DD (default closing date for a stock snapshot). */
export function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return iso(d);
}

/** April 1 of the financial year containing `asOf`, as YYYY-MM-DD. */
export function fyStart(asOf: Date): string {
  const y = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
  return `${y}-04-01`;
}
