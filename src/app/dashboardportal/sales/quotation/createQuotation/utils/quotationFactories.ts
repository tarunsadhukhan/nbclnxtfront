import type { EditableLineItem } from "../types/quotationTypes";

let lineIdSeed = 0;

/**
 * Generates a unique stable line identifier for optimistic UI operations.
 */
export const generateLineId = () => {
	lineIdSeed += 1;
	return `line-${lineIdSeed}`;
};

/**
 * Creates a blank line scaffold that the UI can bind to.
 * Includes hsnCode field; no department/indentDtlId/indentNo (quotation has none).
 */
export const createBlankLine = (): EditableLineItem => ({
	id: generateLineId(),
	itemGroup: "",
	item: "",
	itemMake: "",
	hsnCode: "",
	quantity: "",
	rate: "",
	uom: "",
	discountValue: "",
	remarks: "",
});

/**
 * Default form values used when creating a new quotation.
 */
export const buildDefaultFormValues = () => ({
	branch: "",
	quotation_date: new Date().toISOString().slice(0, 10),
	customer: "",
	broker: "",
	billing_address: "",
	shipping_address: "",
	brokerage_percentage: "",
	payment_terms: "",
	delivery_terms: "",
	delivery_days: "",
	quotation_expiry_date: "",
	footer_notes: "",
	internal_note: "",
	terms_condition: "",
});
