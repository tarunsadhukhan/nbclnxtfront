import type { EditableLineItem } from "../types/indentTypes";

let lineIdSeed = 0;

/**
 * Generates a unique identifier for a line item.
 */
export const generateLineId = (): string => {
	lineIdSeed += 1;
	return `line-${lineIdSeed}`;
};

/**
 * Creates a blank line item with default empty values.
 */
export const createBlankLine = (): EditableLineItem => ({
	id: generateLineId(),
	department: "",
	itemGroup: "",
	item: "",
	itemMake: "",
	quantity: "",
	uom: "",
	remarks: "",
});

/**
 * Builds default form values for a new indent.
 */
export const buildDefaultFormValues = (): Record<string, unknown> => ({
	branch: "",
	indent_type: "",
	expense_type: "",
	date: new Date().toISOString().slice(0, 10),
	indent_no: "",
	project: "",
	requester: "",
	remarks: "",
});

/**
 * Checks if a line item has any user-entered data.
 */
export const lineHasAnyData = (line: EditableLineItem): boolean =>
	Boolean(
		line.department ||
		line.itemGroup ||
		line.item ||
		line.itemMake ||
		line.quantity ||
		line.uom ||
		line.remarks
	);

/**
 * Checks if a line item is complete and ready for submission.
 */
export const lineIsComplete = (line: EditableLineItem): boolean => {
	const qty = Number(line.quantity);
	return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0);
};
