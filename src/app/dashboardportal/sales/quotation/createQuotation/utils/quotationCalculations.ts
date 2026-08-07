import { isAmountDiscountMode, isPercentageDiscountMode } from "./quotationConstants";

/**
 * Calculates the GST split for a line item based on customer/shipping states.
 */
export const calculateLineTax = (
	amount: number,
	taxPercentage: number,
	customerState: string | undefined,
	shippingState: string | undefined,
	indiaGst: boolean,
) => {
	if (!indiaGst || !taxPercentage || !customerState || !shippingState) {
		return { igst: 0, cgst: 0, sgst: 0, total: 0 };
	}

	let igst = 0;
	let cgst = 0;
	let sgst = 0;

	const taxAmount = (amount * taxPercentage) / 100;

	if (customerState === shippingState) {
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
 * Calculates summary totals across all filled line items.
 * Simplified compared to PO: no additional charges, no advance percentage.
 *
 * - netAmount: sum of line item netAmount values
 * - totalIGST/totalCGST/totalSGST: sum of respective tax amounts
 * - grossAmount: netAmount + all taxes
 * - totalAmount: grossAmount (round_off can be applied externally)
 */
export const calculateTotals = (
	lineItems: Array<{
		netAmount?: number;
		igstAmount?: number;
		cgstAmount?: number;
		sgstAmount?: number;
	}>,
) => {
	const netAmount = lineItems.reduce((sum, line) => sum + (line.netAmount || 0), 0);
	const totalIGST = lineItems.reduce((sum, line) => sum + (line.igstAmount || 0), 0);
	const totalCGST = lineItems.reduce((sum, line) => sum + (line.cgstAmount || 0), 0);
	const totalSGST = lineItems.reduce((sum, line) => sum + (line.sgstAmount || 0), 0);
	const grossAmount = netAmount + totalIGST + totalCGST + totalSGST;
	const totalAmount = grossAmount;

	return {
		netAmount: Number(netAmount.toFixed(2)),
		totalIGST: Number(totalIGST.toFixed(2)),
		totalCGST: Number(totalCGST.toFixed(2)),
		totalSGST: Number(totalSGST.toFixed(2)),
		grossAmount: Number(grossAmount.toFixed(2)),
		totalAmount: Number(totalAmount.toFixed(2)),
	};
};
