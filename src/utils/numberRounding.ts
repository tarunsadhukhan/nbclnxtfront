/**
 * Shared rounding helpers for transaction payloads sent to the backend.
 *
 * Rules enforced:
 * - `rate` and `discounted_rate` (item lines) → use item master `rate_rounding`,
 *   defaulting to 2 when unset.
 * - All amount-like fields (net_amount, total_amount, gst.*_amount, gross_amount,
 *   freight, round_off, additional charges) → 2 decimals.
 * - Non-finite values pass through unchanged.
 */

export function roundTo(value: number, decimals: number): number {
	if (!Number.isFinite(value) || decimals < 0) return value;
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

export function roundAmount(value: number): number {
	return roundTo(value, 2);
}

export function roundAmountOrUndefined(value: number | string | null | undefined): number | undefined {
	if (value == null || value === "") return undefined;
	const num = Number(value);
	if (!Number.isFinite(num)) return undefined;
	return roundTo(num, 2);
}

export function roundRate(value: number, rateRounding: number | null | undefined): number {
	const decimals = rateRounding == null ? 2 : Number(rateRounding);
	return roundTo(value, Number.isFinite(decimals) && decimals >= 0 ? decimals : 2);
}

export function roundRateOrUndefined(
	value: number | string | null | undefined,
	rateRounding: number | null | undefined,
): number | undefined {
	if (value == null || value === "") return undefined;
	const num = Number(value);
	if (!Number.isFinite(num)) return undefined;
	return roundRate(num, rateRounding);
}
