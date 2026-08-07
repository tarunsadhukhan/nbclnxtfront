/**
 * Decide a background colour for a maturity cell based on actual vs target hours.
 *   green  — within ±2 hours of target
 *   yellow — below target by more than 2 hours
 *   red    — above target by more than 2 hours
 * Returns a Tailwind class string. Theme tokens aren't available for cell-level
 * conditionals, so we keep these as semantic CSS classes that can be themed later.
 */
export function maturityColorClass(actual: number, target: number): string {
	if (Number.isNaN(actual) || Number.isNaN(target)) return "";
	const diff = actual - target;
	if (Math.abs(diff) <= 2) return "bg-green-100 text-green-900";
	if (diff < -2) return "bg-yellow-100 text-yellow-900";
	return "bg-red-100 text-red-900";
}
