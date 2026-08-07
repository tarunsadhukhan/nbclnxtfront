import type { EditableLineItem } from "../types/poTypes";

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
 */
export const createBlankLine = (): EditableLineItem => ({
	id: generateLineId(),
	itemGroup: "",
	item: "",
	itemMake: "",
	quantity: "",
	rate: "",
	uom: "",
	discountValue: "",
	remarks: "",
});

/**
 * Default form values used when creating a new PO.
 */
export const buildDefaultFormValues = () => ({
	branch: "",
	date: new Date().toISOString().slice(0, 10),
	supplier: "",
	supplier_branch: "",
	billing_address: "",
	shipping_address: "",
	tax_payable: "Yes",
	credit_term: "",
	delivery_timeline: "",
	project: "",
	expense_type: "",
	po_type: "",
	contact_person: "",
	contact_no: "",
	footer_note: "",
	internal_note: "",
	terms_conditions: "",
	advance_percentage: "",
	expected_date: "",
	billing_state: "",
	shipping_state: "",
	tax_type: "",
});

