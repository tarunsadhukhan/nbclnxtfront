import type { SRLineItem, SRTotals } from "../types/srTypes";
import { isPercentageDiscountMode, isAmountDiscountMode } from "./srConstants";

// Re-export shared GST calculation so existing imports continue to work.
export { calculateLineTax } from "@/utils/gstCalculations";

/**
 * Computes discount amount using either percentage or flat modes.
 * - Percentage: discount_amount = (discountValue / 100) * rate * qty
 * - Amount (PriceDiscount): discount_amount = discountValue * qty (per-item reduction)
 */
export const calculateDiscountAmount = (
	qty: number,
	rate: number,
	discountMode?: number | null,
	discountValue?: number | null,
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
 * When discountMode/discountValue are provided, computes discountAmount from them.
 * Otherwise falls back to the provided discountAmount.
 */
export const calculateLineAmountWithDiscount = (
	qty: number,
	rate: number,
	discountMode?: number | null,
	discountValue?: number | null,
): { discountAmount: number; amount: number } => {
	const discountAmount = calculateDiscountAmount(qty, rate, discountMode, discountValue);
	const baseAmount = qty * rate;
	return {
		discountAmount: Number(discountAmount.toFixed(2)),
		amount: Math.max(0, Number((baseAmount - discountAmount).toFixed(2))),
	};
};

/**
 * Calculates net amount after discount.
 */
export const calculateLineAmount = (
	qty: number,
	rate: number,
	discountAmount: number = 0,
): number => {
	const baseAmount = qty * rate;
	return Math.max(0, baseAmount - discountAmount);
};

/**
 * Calculates summary totals across all line items.
 */
export const calculateTotals = (lineItems: SRLineItem[]): SRTotals => {
	let grossAmount = 0;
	let totalDiscount = 0;
	let netAmount = 0;
	let totalIGST = 0;
	let totalCGST = 0;
	let totalSGST = 0;
	let totalTax = 0;
	let grandTotal = 0;

	for (const item of lineItems) {
		const lineGross = (item.approved_qty || 0) * (item.accepted_rate || 0);
		const lineDiscount = item.discount_amount || 0;
		grossAmount += lineGross;
		totalDiscount += lineDiscount;
		netAmount += item.amount || 0;
		totalIGST += item.igst_amount || 0;
		totalCGST += item.cgst_amount || 0;
		totalSGST += item.sgst_amount || 0;
		totalTax += item.tax_amount || 0;
		grandTotal += item.total_amount || 0;
	}

	return {
		grossAmount: Number(grossAmount.toFixed(2)),
		totalDiscount: Number(totalDiscount.toFixed(2)),
		netAmount: Number(netAmount.toFixed(2)),
		totalIGST: Number(totalIGST.toFixed(2)),
		totalCGST: Number(totalCGST.toFixed(2)),
		totalSGST: Number(totalSGST.toFixed(2)),
		totalTax: Number(totalTax.toFixed(2)),
		grandTotal: Number(grandTotal.toFixed(2)),
	};
};
