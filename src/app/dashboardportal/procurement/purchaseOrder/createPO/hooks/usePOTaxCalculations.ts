import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { EditableLineItem } from "../types/poTypes";
import { calculateLineTax } from "../utils/poCalculations";

type UsePOTaxCalculationsParams = {
	mode: MuiFormMode;
	coConfig?: { india_gst?: number };
	supplierBranchState?: string;
	shippingState?: string;
	setLineItems: React.Dispatch<React.SetStateAction<EditableLineItem[]>>;
};

/**
 * Handles GST-specific recalculations and derives the current tax type label.
 */
export const usePOTaxCalculations = ({
	mode,
	coConfig,
	supplierBranchState,
	shippingState,
	setLineItems,
}: UsePOTaxCalculationsParams) => {
	const taxType = React.useMemo(() => {
		if (!coConfig?.india_gst) return "";
		if (supplierBranchState && shippingState) {
			return supplierBranchState === shippingState ? "CGST & SGST" : "IGST";
		}
		return "";
	}, [coConfig?.india_gst, supplierBranchState, shippingState]);

	React.useEffect(() => {
		if (mode === "view") return;

		// Only recalculate when GST is enabled and both states are known.
		// This prevents wiping out existing tax amounts (e.g. immediately
		// after loading an existing PO in edit mode) before address/state
		// information has been resolved from setup APIs.
		if (!coConfig?.india_gst || !supplierBranchState || !shippingState) return;

		setLineItems((prev) =>
			prev.map((item) => {
				const qty = Number(item.quantity) || 0;
				const rate = Number(item.rate) || 0;
				const discountAmount = item.discountAmount || 0;
				const amount = Math.max(0, qty * rate - discountAmount);

				const tax = calculateLineTax(
					amount,
					item.taxPercentage || 0,
					supplierBranchState,
					shippingState,
					!!coConfig?.india_gst,
				);

				if (
					item.igstAmount === tax.igst &&
					item.cgstAmount === tax.cgst &&
					item.sgstAmount === tax.sgst &&
					item.taxAmount === tax.total
				) {
					return item;
				}

				return {
					...item,
					igstAmount: tax.igst,
					cgstAmount: tax.cgst,
					sgstAmount: tax.sgst,
					taxAmount: tax.total,
				};
			}),
		);
	}, [coConfig?.india_gst, mode, setLineItems, shippingState, supplierBranchState]);

	return { taxType };
};

