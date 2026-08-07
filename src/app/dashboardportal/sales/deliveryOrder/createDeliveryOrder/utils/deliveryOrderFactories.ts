import type { EditableLineItem } from "../types/deliveryOrderTypes";

let lineIdSeed = 0;

export const generateLineId = () => {
	lineIdSeed += 1;
	return `do-line-${lineIdSeed}`;
};

export const createBlankLine = (): EditableLineItem => ({
	id: generateLineId(),
	itemGroup: "",
	item: "",
	itemMake: "",
	quantity: "",
	rate: "",
	uom: "",
	remarks: "",
});

export const buildDefaultFormValues = () => ({
	branch: "",
	date: new Date().toISOString().slice(0, 10),
	expected_delivery_date: "",
	party: "",
	party_branch: "",
	sales_order: "",
	billing_to: "",
	shipping_to: "",
	transporter: "",
	vehicle_no: "",
	driver_name: "",
	driver_contact: "",
	eway_bill_no: "",
	eway_bill_date: "",
	footer_note: "",
	internal_note: "",
	freight_charges: "",
	round_off_value: "",
});
