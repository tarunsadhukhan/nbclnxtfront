import type { EditableLineItem } from "../types/issueTypes";
import type { InventoryListItem } from "@/utils/issueService";

let lineIdSeed = 0;

/**
 * Generates a unique identifier for a line item.
 */
export const generateLineId = (): string => {
	lineIdSeed += 1;
	return `issue-line-${lineIdSeed}`;
};

/**
 * Creates a blank line item with default empty values.
 * Note: In simplified workflow, items come from InventorySearchTable,
 * so blank lines are rarely used except for trailing blank.
 */
export const createBlankLine = (): EditableLineItem => ({
	id: generateLineId(),
	// From inventory (read-only)
	grnNo: "",
	inwardDtlId: "",
	itemId: "",
	itemName: "",
	itemCode: "",
	itemGrpId: "",
	itemGrpName: "",
	uomId: "",
	uomName: "",
	rate: "",
	availableQty: "",
	// Editable
	quantity: "",
	expenseType: "",
	costFactor: "",
	machine: "",
	remarks: "",
});

/**
 * Creates a line item from an inventory selection.
 * Used when inserting items from InventorySearchTable.
 */
export const createLineFromInventory = (inv: InventoryListItem): EditableLineItem => ({
	id: generateLineId(),
	// From inventory (read-only)
	grnNo: inv.sr_no ?? "",
	inwardDtlId: String(inv.inward_dtl_id ?? ""),
	itemId: String(inv.item_id ?? ""),
	itemName: inv.item_name ?? "",
	itemCode: inv.full_item_code ?? inv.item_code ?? "",
	itemGrpId: String(inv.item_grp_id ?? ""),
	itemGrpName: inv.item_grp_name ?? "",
	uomId: String(inv.uom_id ?? ""),
	uomName: inv.uom_name ?? "",
	rate: String(inv.rate ?? ""),
	availableQty: String(inv.available_qty ?? ""),
	// Editable - default quantity to available
	quantity: String(inv.available_qty ?? ""),
	expenseType: "",
	costFactor: "",
	machine: "",
	remarks: "",
});

/**
 * Builds default form values for a new issue.
 */
export const buildDefaultFormValues = (): Record<string, unknown> => ({
	branch: "",
	department: "",
	date: new Date().toISOString().slice(0, 10),
	issue_no: "",
	project: "",
	issued_to: "",
	req_by: "",
	internal_note: "",
});

/**
 * Checks if a line item has any user-entered data.
 * Lines from inventory always have data if inwardDtlId is set.
 */
export const lineHasAnyData = (line: EditableLineItem): boolean =>
	Boolean(
		line.inwardDtlId ||
		line.itemId ||
		line.quantity ||
		line.remarks
	);

/**
 * Checks if a line item is complete and ready for submission.
 */
export const lineIsComplete = (line: EditableLineItem): boolean => {
	const qty = Number(line.quantity);
	return Boolean(line.itemId && line.uomId && Number.isFinite(qty) && qty > 0);
};
