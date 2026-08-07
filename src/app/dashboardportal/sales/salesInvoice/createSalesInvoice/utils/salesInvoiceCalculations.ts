import { isAmountDiscountType, isPercentageDiscountType } from "./salesInvoiceConstants";

export const calculateLineTax = (
	amount: number,
	taxPercentage: number,
	companyBranchStateId: number | undefined,
	shippingBranchStateId: number | undefined,
) => {
	if (!taxPercentage || !companyBranchStateId || !shippingBranchStateId) {
		return { igstAmount: 0, igstPercent: 0, cgstAmount: 0, cgstPercent: 0, sgstAmount: 0, sgstPercent: 0, gstTotal: 0 };
	}

	const taxAmount = (amount * taxPercentage) / 100;

	if (companyBranchStateId === shippingBranchStateId) {
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

export const calculateLineAmount = (
	qty: number,
	rate: number,
	discountType?: number,
	discountValue?: number,
) => {
	const discountAmountRaw = calculateDiscountAmount(qty, rate, discountType, discountValue);
	const discountAmount = Number(discountAmountRaw.toFixed(2));
	const baseAmount = qty * rate;
	const netAmount = Number(Math.max(0, baseAmount - discountAmount).toFixed(2));
	const discountedRate = qty > 0 ? Number((netAmount / qty).toFixed(2)) : rate;
	return { discountAmount, netAmount, discountedRate };
};

export const calculateInvoiceTotals = (
	lineItems: Array<{ netAmount?: number; gstTotal?: number }>,
	freightCharges: number = 0,
	roundOff: number = 0,
	claimAmount: number = 0,
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
	const netAmount = grossAmount - claimAmount + totalGST + freightCharges + roundOff;
	return { grossAmount, totalGST, totalIGST, totalCGST, totalSGST, netAmount, freightCharges, roundOff, claimAmount };
};
