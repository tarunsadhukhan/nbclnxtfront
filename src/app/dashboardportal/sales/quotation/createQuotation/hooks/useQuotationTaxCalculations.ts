import React from "react";
import type { EditableLineItem } from "../types/quotationTypes";
import { calculateLineTax } from "../utils/quotationCalculations";

type UseQuotationTaxCalculationsParams = {
	coConfig?: { india_gst?: number };
	billingState?: string;
	shippingState?: string;
	setLineItems: React.Dispatch<React.SetStateAction<EditableLineItem[]>>;
};

/**
 * Determines IGST vs CGST+SGST based on billing/shipping states
 * and recalculates all line items' tax when states change.
 */
export const useQuotationTaxCalculations = ({
	coConfig,
	billingState,
	shippingState,
	setLineItems,
}: UseQuotationTaxCalculationsParams) => {
	const taxType = React.useMemo(() => {
		if (!billingState || !shippingState) return "";
		return billingState === shippingState ? "CGST & SGST" : "IGST";
	}, [billingState, shippingState]);

	// Recalculate tax on all lines when states change
	React.useEffect(() => {
		if (!billingState || !shippingState) return;
		const indiaGst = !!coConfig?.india_gst;

		setLineItems((prev) =>
			prev.map((item) => {
				if (!item.taxPercentage || !item.netAmount) return item;
				const tax = calculateLineTax(item.netAmount, item.taxPercentage, billingState, shippingState, indiaGst);
				return {
					...item,
					igstAmount: tax.igst,
					cgstAmount: tax.cgst,
					sgstAmount: tax.sgst,
					taxAmount: tax.total,
				};
			}),
		);
	}, [billingState, shippingState, coConfig?.india_gst, setLineItems]);

	return { taxType };
};
