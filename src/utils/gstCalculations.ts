/**
 * Shared GST calculation utilities.
 *
 * These functions encapsulate the India-GST logic used across PO, SR, and
 * future Inward modules. Import from here instead of duplicating the logic
 * in each module's local `*Calculations.ts` file.
 */

/**
 * Calculate GST split for a line item based on state comparison.
 *
 * - Same state (supplier & shipping) -> CGST + SGST (split 50/50)
 * - Different states -> IGST (full amount)
 * - Returns zeros when GST is disabled, tax percentage is zero, or
 *   either state is missing/undefined.
 */
export const calculateLineTax = (
	amount: number,
	taxPercentage: number,
	supplierState: string | undefined,
	shippingState: string | undefined,
	indiaGst: boolean,
): { igst: number; cgst: number; sgst: number; total: number } => {
	if (!indiaGst || !taxPercentage || !supplierState || !shippingState) {
		return { igst: 0, cgst: 0, sgst: 0, total: 0 };
	}

	const taxAmount = (amount * taxPercentage) / 100;

	if (supplierState === shippingState) {
		const half = Number((taxAmount / 2).toFixed(2));
		return { igst: 0, cgst: half, sgst: half, total: Number(taxAmount.toFixed(2)) };
	}

	return {
		igst: Number(taxAmount.toFixed(2)),
		cgst: 0,
		sgst: 0,
		total: Number(taxAmount.toFixed(2)),
	};
};

/**
 * Get the tax type label for display.
 *
 * Returns "CGST & SGST" for intra-state, "IGST" for inter-state,
 * or empty string when GST is not applicable.
 */
export const getTaxTypeLabel = (
	supplierState: string | undefined,
	shippingState: string | undefined,
	indiaGst: boolean,
): string => {
	if (!indiaGst || !supplierState || !shippingState) return "";
	return supplierState === shippingState ? "CGST & SGST" : "IGST";
};
