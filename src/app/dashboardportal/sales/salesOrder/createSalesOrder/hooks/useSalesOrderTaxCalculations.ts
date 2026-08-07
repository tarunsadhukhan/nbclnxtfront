import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { EditableLineItem } from "../types/salesOrderTypes";

type UseSalesOrderTaxCalculationsParams = {
	mode: MuiFormMode;
	coConfig?: { india_gst?: number };
	billingToState?: string;
	shippingToState?: string;
	setLineItems: React.Dispatch<React.SetStateAction<EditableLineItem[]>>;
	/** When true, the next tax recalculation effect is skipped (auto-resets to false). */
	suppressRef?: React.MutableRefObject<boolean>;
};

export const useSalesOrderTaxCalculations = ({
	mode,
	coConfig,
	billingToState,
	shippingToState,
	setLineItems,
	suppressRef,
}: UseSalesOrderTaxCalculationsParams) => {
	const taxType = React.useMemo(() => {
		if (!coConfig?.india_gst) return "";
		if (billingToState && shippingToState) {
			return billingToState === shippingToState ? "CGST & SGST" : "IGST";
		}
		return "";
	}, [coConfig?.india_gst, billingToState, shippingToState]);

	React.useEffect(() => {
		if (mode === "view") return;
		if (suppressRef?.current) {
			suppressRef.current = false;
			return;
		}
		if (!coConfig?.india_gst || !billingToState || !shippingToState) return;

		setLineItems((prev) =>
			prev.map((item) => {
				const qty = Number(item.quantity) || 0;
				const rate = Number(item.rate) || 0;
				const discountAmount = item.discountAmount || 0;
				const amount = Math.max(0, qty * rate - discountAmount);
				const taxPct = item.taxPercentage || 0;
				if (!taxPct || !amount) {
					if (item.igstAmount === 0 && item.cgstAmount === 0 && item.sgstAmount === 0 && item.taxAmount === 0) return item;
					return { ...item, igstAmount: 0, cgstAmount: 0, sgstAmount: 0, taxAmount: 0 };
				}

				const taxAmount = (amount * taxPct) / 100;
				const isSameState = billingToState === shippingToState;
				let igst = 0, cgst = 0, sgst = 0;
				if (isSameState) {
					cgst = Math.round((taxAmount / 2) * 100) / 100;
					sgst = Math.round((taxAmount / 2) * 100) / 100;
				} else {
					igst = Math.round(taxAmount * 100) / 100;
				}
				const total = Math.round(taxAmount * 100) / 100;

				if (item.igstAmount === igst && item.cgstAmount === cgst && item.sgstAmount === sgst && item.taxAmount === total) return item;
				return { ...item, igstAmount: igst, cgstAmount: cgst, sgstAmount: sgst, taxAmount: total };
			}),
		);
	}, [coConfig?.india_gst, mode, setLineItems, shippingToState, billingToState]);

	return { taxType };
};
