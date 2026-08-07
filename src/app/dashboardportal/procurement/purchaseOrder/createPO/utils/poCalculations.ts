import { isAmountDiscountMode, isPercentageDiscountMode } from "./poConstants";

/**
 * Calculates the GST split for a line item based on supplier/shipping states.
 */
export const calculateLineTax = (
	amount: number,
	taxPercentage: number,
	supplierState: string | undefined,
	shippingState: string | undefined,
	indiaGst: boolean,
) => {
	if (!indiaGst || !taxPercentage || !supplierState || !shippingState) {
		return { igst: 0, cgst: 0, sgst: 0, total: 0 };
	}

	let igst = 0;
	let cgst = 0;
	let sgst = 0;

	const taxAmount = (amount * taxPercentage) / 100;

	if (supplierState === shippingState) {
		cgst = taxAmount / 2;
		sgst = taxAmount / 2;
	} else {
		igst = taxAmount;
	}

	return {
		igst: Number(igst.toFixed(2)),
		cgst: Number(cgst.toFixed(2)),
		sgst: Number(sgst.toFixed(2)),
		total: Number(taxAmount.toFixed(2)),
	};
};

/**
 * Computes discount amount using either percentage or flat modes.
 * - Percentage: discount_amount = (discountValue / 100) * rate * qty
 * - Amount (PriceDiscount): discount_amount = discountValue * qty (per-item reduction)
 */
export const calculateDiscountAmount = (
	qty: number,
	rate: number,
	discountMode?: number,
	discountValue?: number,
): number => {
	if (!qty || !rate || !discountMode || !discountValue) {
		return 0;
	}

	if (isPercentageDiscountMode(discountMode)) {
		// Percentage discount: (discountValue% of rate) * qty
		return (discountValue / 100) * rate * qty;
	}

	if (isAmountDiscountMode(discountMode)) {
		// PriceDiscount: per-item reduction * qty
		return discountValue * qty;
	}

	return 0;
};

/**
 * Calculates net amount after discount along with the computed discount amount.
 */
export const calculateLineAmount = (
	qty: number,
	rate: number,
	discountMode?: number,
	discountValue?: number,
) => {
	const discountAmount = calculateDiscountAmount(qty, rate, discountMode, discountValue);
	const baseAmount = qty * rate;
	return {
		discountAmount,
		amount: Math.max(0, baseAmount - discountAmount),
	};
};

/**
 * Calculates summary totals across all line items.
 */
export const calculateTotals = (
	lineItems: Array<{ amount?: number; igstAmount?: number; cgstAmount?: number; sgstAmount?: number }>,
	advancePercentage: number,
) => {
	const netAmount = lineItems.reduce((sum, line) => sum + (line.amount || 0), 0);
	const totalIGST = lineItems.reduce((sum, line) => sum + (line.igstAmount || 0), 0);
	const totalSGST = lineItems.reduce((sum, line) => sum + (line.sgstAmount || 0), 0);
	const totalCGST = lineItems.reduce((sum, line) => sum + (line.cgstAmount || 0), 0);
	const totalAmount = netAmount + totalIGST + totalSGST + totalCGST;
	const advanceAmount = advancePercentage > 0 ? (netAmount * advancePercentage) / 100 : 0;
	return {
		netAmount,
		totalIGST,
		totalSGST,
		totalCGST,
		totalAmount,
		advanceAmount,
	};
};

/**
 * Calculates the expected delivery date based on PO date + timeline.
 */
export const calculateExpectedDate = (dateStr: string, timelineDays: number): string => {
	if (!dateStr || !timelineDays) return "";
	try {
		const date = new Date(dateStr);
		date.setDate(date.getDate() + timelineDays);
		return date.toISOString().slice(0, 10);
	} catch {
		return "";
	}
};

