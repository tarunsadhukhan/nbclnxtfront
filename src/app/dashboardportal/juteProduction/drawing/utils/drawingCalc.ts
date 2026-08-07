// Client-side preview mirrors src/juteProduction/services/drawing_rules.py exactly.
// The server recomputes both values on save and is authoritative.

export const EFF_BASE_HOURS = 8;

export function computeDiffMeter(openMeter: number, closeMeter: number, wrapLimit: number): number {
	if (openMeter > closeMeter) {
		return closeMeter + wrapLimit - openMeter;
	}
	return closeMeter - openMeter;
}

export function computeEff(diffMeter: number, constMeter: number, wrkHours: number): number {
	if (diffMeter <= 0 || constMeter <= 0 || wrkHours <= 0) return 0;
	return Math.round((diffMeter / ((constMeter / EFF_BASE_HOURS) * wrkHours)) * 100 * 100) / 100;
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
