import type { EditableLineItem } from "../types/salesOrderTypes";

let lineIdCounter = 0;

export const createBlankLine = (): EditableLineItem => {
	lineIdCounter += 1;
	return {
		id: `so-line-${Date.now()}-${lineIdCounter}`,
		itemGroup: "",
		item: "",
		itemMake: "",
		quantity: "",
		rate: "",
		uom: "",
		discountValue: "",
		remarks: "",
	};
};

export const buildDefaultFormValues = (): Record<string, unknown> => ({
	branch: "",
	date: new Date().toISOString().split("T")[0],
	expiry_date: "",
	party: "",
	party_branch: "",
	quotation: "",
	invoice_type: "",
	broker: "",
	broker_commission_percent: "",
	billing_to: "",
	shipping_to: "",
	transporter: "",
	delivery_terms: "",
	payment_terms: "",
	buyer_order_no: "",
	buyer_order_date: "",
	delivery_days: "",
	committed_delivery_date: "",
	advance_amount: "",
	advance_note: "",
	freight_charges: "",
	footer_note: "",
	internal_note: "",
	terms_conditions: "",
});
