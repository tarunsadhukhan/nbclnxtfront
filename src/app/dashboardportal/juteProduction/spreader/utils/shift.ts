/**
 * Spell-from-hour helper.  Mirrors src/juteProduction/services/shift.py on the backend.
 * Bucket cutoffs:
 *   A1 06-10, B1 11-13, A2 14-16, B2 17-21, C 22-05
 */
export function spellFromHour(hour: number): string {
	const h = Math.max(0, Math.min(23, Math.floor(hour)));
	if (h >= 6 && h <= 10) return "A1";
	if (h >= 11 && h <= 13) return "B1";
	if (h >= 14 && h <= 16) return "A2";
	if (h >= 17 && h <= 21) return "B2";
	return "C";
}

export function todayISO(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function currentHour(): number {
	return new Date().getHours();
}
