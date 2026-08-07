import type { EditableLineItem } from "../types/inwardTypes";

let lineIdSeed = 0;

/**
 * Generates a unique stable line identifier for optimistic UI operations.
 */
export const generateLineId = () => {
	lineIdSeed += 1;
	return `inward-line-${lineIdSeed}`;
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
	uom: "",
	remarks: "",
});

/**
 * Default form values used when creating a new Inward.
 */
export const buildDefaultFormValues = () => ({
	branch: "",
	supplier: "",
	challan_no: "",
	challan_date: "",
	invoice_no: "",
	invoice_date: "",
	inward_no: "",
	inward_date: new Date().toISOString().slice(0, 10),
	vehicle_no: "",
	driver_name: "",
	driver_contact_no: "",
	invoice_recvd_date: "",
	consignment_no: "",
	consignment_date: "",
	ewaybillno: "",
	ewaybill_date: "",
	despatch_remarks: "",
	receipts_remarks: "",
});

/**
 * Check if a line has any data (for filtering purposes).
 */
export const lineHasAnyData = (line: EditableLineItem): boolean =>
	Boolean(line.itemGroup || line.item || line.quantity || line.remarks);

/**
 * Check if a line is complete enough to be submitted.
 */
export const lineIsComplete = (line: EditableLineItem): boolean => {
	const qty = Number(line.quantity);
	return Boolean(line.item && line.uom && Number.isFinite(qty) && qty > 0);
};
