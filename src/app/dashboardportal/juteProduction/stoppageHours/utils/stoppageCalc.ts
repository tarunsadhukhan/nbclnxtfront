// Client-side helpers for the Stoppage Hours page.
//
// There is NO net_running_hours backend endpoint (locked decision). These helpers
// drive the live "net running hours" hint and the `Hours <= working_hours`
// validation purely on the client (SPEC §3.3, §11):
//
//   net_running_hours = working_hours - Σ stoppage_hours

/** Today as an ISO date string (YYYY-MM-DD) in local time, for default tran_date. */
export function todayISO(): string {
	const d = new Date();
	const tzOffset = d.getTimezoneOffset() * 60000;
	return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Sum of stoppage hours across a set of events (ignores non-finite values). */
export function sumStoppageHours(hours: Array<number | null | undefined>): number {
	return hours.reduce<number>((acc, h) => {
		const n = Number(h);
		return acc + (Number.isFinite(n) ? n : 0);
	}, 0);
}

/**
 * Net running hours = working_hours − Σ stoppage_hours, clamped at 0.
 * Used for the live hint shown beneath the Hours field (planned − entered).
 */
export function netRunningHours(workingHours: number, stoppageTotal: number): number {
	const net = Number(workingHours || 0) - Number(stoppageTotal || 0);
	return net < 0 ? 0 : net;
}

/**
 * Single-event validation (SPEC §2): a stoppage event is valid only when
 * 0 < stoppage_hours ≤ the selected spell's working_hours.
 */
export function isStoppageHoursValid(stoppageHours: number, workingHours: number): boolean {
	const h = Number(stoppageHours);
	const wh = Number(workingHours);
	return Number.isFinite(h) && h > 0 && Number.isFinite(wh) && wh > 0 && h <= wh;
}
