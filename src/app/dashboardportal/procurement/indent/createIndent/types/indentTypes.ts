/**
 * Indent-specific shared TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

/**
 * Basic label/value tuple used across Indent forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Normalized representation of an Indent line item used in the UI.
 */
export type EditableLineItem = {
	id: string;
	department: string;
	itemGroup: string;
	item: string;
	itemMake: string;
	quantity: string;
	uom: string;
	remarks: string;
};

/**
 * Department record as consumed by the Indent UI.
 */
export type DepartmentRecord = {
	id: string;
	name: string;
	branchId?: string;
};

/**
 * Project record as consumed by the Indent UI.
 */
export type ProjectRecord = {
	id: string;
	name: string;
	branchId?: string;
};

/**
 * Expense type option displayed in Indent header.
 */
export type ExpenseRecord = {
	id: string;
	name: string;
};

/**
 * Item group option displayed in line items table.
 */
export type ItemGroupRecord = {
	id: string;
	label: string;
};

/**
 * Item option metadata including default UOM info.
 */
export type ItemOption = Option & {
	defaultUomId?: string;
	defaultUomLabel?: string;
	/** Full item code (group prefix + item code) as stored in item_mst. */
	itemCode?: string;
	/** Pure item name without group prefix. */
	itemName?: string;
};

/**
 * Cached metadata for an item group to avoid redundant network calls.
 */
export type ItemGroupCacheEntry = {
	items: ItemOption[];
	makes: Option[];
	uomsByItemId: Record<string, Option[]>;
	itemLabelById: Record<string, string>;
	/** Full item code keyed by item id (group prefix + item code). */
	itemCodeById: Record<string, string>;
	/** Pure item name keyed by item id (no group prefix). */
	itemNameById: Record<string, string>;
	makeLabelById: Record<string, string>;
	uomLabelByItemId: Record<string, Record<string, string>>;
};

/**
 * Normalized setup data returned by `fetchIndentSetup1`.
 */
export type IndentSetupData = {
	departments: DepartmentRecord[];
	projects: ProjectRecord[];
	expenses: ExpenseRecord[];
	itemGroups: ItemGroupRecord[];
	indentTitles: string[];
};

/**
 * Label resolvers used in the Indent UI.
 */
export type IndentLabelResolvers = {
	department: (id: string) => string;
	itemGroup: (id: string) => string;
	item: (groupId: string, itemId: string) => string;
	/** Pure item name for display (no group prefix). */
	itemName: (groupId: string, itemId: string) => string;
	/** Full item code (group prefix + item code) for display. */
	itemCode: (groupId: string, itemId: string) => string;
	itemMake: (groupId: string, makeId: string) => string;
	uom: (groupId: string, itemId: string, uomId: string) => string;
};

/**
 * Validation result returned from the backend for a single line item.
 */
export type ItemValidationResult = {
	validationLogic: 1 | 2 | 3;
	errors: string[];
	branchStock: number;
	minqty: number | null;
	maxqty: number | null;
	/** Calculated minimum indent qty (may be a multiple of reorder qty, always >= minqty). Used for UI validation. */
	minIndentQty: number | null;
	minOrderQty: number | null;
	leadTime: number | null;
	outstandingIndentQty: number;
	hasOpenIndent: boolean;
	stockExceedsMax: boolean;
	maxIndentQty: number | null;
	hasMinMax: boolean;
	fyDuplicateIndentNo: number | null;
	forcedQty: number | null;
	regularBomOutstanding: number;
	warnings: string[];
};

/**
 * Per-line validation state managed by the useIndentItemValidation hook.
 */
export type LineItemValidationState = {
	loading: boolean;
	result: ItemValidationResult | null;
	error: string | null;
};
