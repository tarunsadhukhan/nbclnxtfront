import type {
	EditableLineItem,
	ItemGroupRecord,
	Option,
	SupplierRecord,
} from "../types/inwardTypes";

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_SUPPLIERS: ReadonlyArray<SupplierRecord> = Object.freeze([]);
export const EMPTY_ITEM_GROUPS: ReadonlyArray<ItemGroupRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
export const EMPTY_LINE_ITEMS: ReadonlyArray<EditableLineItem> = Object.freeze([]);

/**
 * Default empty params used by setup hooks to prevent needless re-renders.
 */
export const EMPTY_SETUP_PARAMS: Readonly<{ branchId?: string }> = Object.freeze({});
