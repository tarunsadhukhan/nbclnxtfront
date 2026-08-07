import { isAmountDiscountType, isPercentageDiscountType } from "./deliveryOrderConstants";

/**
 * Calculates the GST split for a line item based on party/shipping states.
 */
export const calculateLineTax = (
	amount: number,
	taxPercentage: number,
	partyState: string | undefined,
	shippingState: string | undefined,
) => {
	if (!taxPercentage || !partyState || !shippingState) {
		return { igstAmount: 0, igstPercent: 0, cgstAmount: 0, cgstPercent: 0, sgstAmount: 0, sgstPercent: 0, gstTotal: 0 };
	}

	const taxAmount = (amount * taxPercentage) / 100;

	if (partyState === shippingState) {
		const half = taxAmount / 2;
		return {
			igstAmount: 0,
			igstPercent: 0,
			cgstAmount: Number(half.toFixed(2)),
			cgstPercent: Number((taxPercentage / 2).toFixed(2)),
			sgstAmount: Number(half.toFixed(2)),
			sgstPercent: Number((taxPercentage / 2).toFixed(2)),
			gstTotal: Number(taxAmount.toFixed(2)),
		};
	}

	return {
		igstAmount: Number(taxAmount.toFixed(2)),
		igstPercent: taxPercentage,
		cgstAmount: 0,
		cgstPercent: 0,
		sgstAmount: 0,
		sgstPercent: 0,
		gstTotal: Number(taxAmount.toFixed(2)),
	};
};

/**
 * Computes discount amount using either percentage or flat modes.
 */
export const calculateDiscountAmount = (
	qty: number,
	rate: number,
	discountType?: number,
	discountValue?: number,
): number => {
	if (!qty || !rate || !discountType || !discountValue) return 0;

	if (isPercentageDiscountType(discountType)) {
		return (discountValue / 100) * rate * qty;
	}

	if (isAmountDiscountType(discountType)) {
		return discountValue * qty;
	}

	return 0;
};

/**
 * Calculates line amount after discount.
 */
export const calculateLineAmount = (
	qty: number,
	rate: number,
	discountType?: number,
	discountValue?: number,
) => {
	const discountAmount = calculateDiscountAmount(qty, rate, discountType, discountValue);
	const baseAmount = qty * rate;
	const netAmount = Math.max(0, baseAmount - discountAmount);
	const discountedRate = qty > 0 ? netAmount / qty : rate;
	return { discountAmount, netAmount, discountedRate };
};

/**
 * Calculates summary totals across all delivery order line items.
 */
export const calculateDOTotals = (
	lineItems: Array<{ netAmount?: number; gstTotal?: number }>,
	freightCharges: number = 0,
	roundOffValue: number = 0,
) => {
	const grossAmount = lineItems.reduce((sum, line) => sum + (line.netAmount || 0), 0);
	const totalGST = lineItems.reduce((sum, line) => sum + (line.gstTotal || 0), 0);
	const totalIGST = lineItems.reduce((sum, line) => {
		const l = line as { igstAmount?: number };
		return sum + (l.igstAmount || 0);
	}, 0);
	const totalCGST = lineItems.reduce((sum, line) => {
		const l = line as { cgstAmount?: number };
		return sum + (l.cgstAmount || 0);
	}, 0);
	const totalSGST = lineItems.reduce((sum, line) => {
		const l = line as { sgstAmount?: number };
		return sum + (l.sgstAmount || 0);
	}, 0);
	const netAmount = grossAmount + totalGST + freightCharges + roundOffValue;
	return { grossAmount, totalGST, totalIGST, totalCGST, totalSGST, netAmount, freightCharges, roundOffValue };
};
