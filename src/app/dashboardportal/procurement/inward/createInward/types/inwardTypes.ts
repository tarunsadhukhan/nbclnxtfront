/**
 * Inward-specific shared TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

/**
 * Basic label/value tuple used across Inward forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Normalized representation of an Inward line item used in the UI.
 * Based on PO line items structure since inward receives items from PO.
 */
export type EditableLineItem = {
	id: string;
	poDtlId?: string;
	poNo?: string;
	itemGroup: string;
	item: string;
	itemCode?: string;
	itemMake: string;
	orderedQty?: number;
	receivedQty?: number;
	quantity: string;  // Quantity being received in this inward
	uom: string;
	rate?: string;  // PO rate (stored as string for form handling)
	amount?: number;
	remarks: string;
	taxPercentage?: number;
	hsnCode?: string;
	rowError?: string;
	rowWarning?: string;
};

/**
 * Supplier record as consumed by the Inward UI.
 */
export type SupplierRecord = {
	id: string;
	name: string;
	code?: string;
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
	defaultRate?: number;
	taxPercentage?: number;
};

/**
 * Cached metadata for an item group to avoid redundant network calls.
 */
export type ItemGroupCacheEntry = {
	groupLabel?: string;
	items: ItemOption[];
	makes: Option[];
	uomsByItemId: Record<string, Option[]>;
	itemLabelById: Record<string, string>;
	makeLabelById: Record<string, string>;
	uomLabelByItemId: Record<string, Record<string, string>>;
	itemRateById: Record<string, number>;
	itemTaxById: Record<string, number>;
};

/**
 * Item group cache map type - values may be undefined if not yet loaded.
 * Used when consuming the cache from `useDeferredOptionCache`.
 */
export type ItemGroupCacheMap = Partial<Record<string, ItemGroupCacheEntry>>;

/**
 * Normalized setup data returned by `fetchInwardSetup1`.
 */
export type InwardSetupData = {
	suppliers: SupplierRecord[];
	itemGroups: ItemGroupRecord[];
	coConfig?: {
		india_gst?: number;
		po_required?: number;
	};
};

/**
 * Label resolvers used in the Inward UI.
 */
export type InwardLabelResolvers = {
	supplier: (id: string) => string;
	itemGroup: (id: string) => string;
	item: (groupId: string, itemId: string) => string;
	itemMake: (groupId: string, makeId: string) => string;
	uom: (groupId: string, itemId: string, uomId: string) => string;
};

/**
 * PO line item returned from API for selection dialog.
 */
export type POLineItem = {
	po_dtl_id: number;
	po_id: number;
	po_no: string;
	item_id: number;
	item_code: string;
	full_item_code?: string;
	item_name: string;
	item_grp_id: number;
	item_grp_code: string;
	item_grp_name: string;
	ordered_qty: number;
	received_qty: number;
	pending_qty: number;
	rate: number;
	uom_id: number;
	uom_name: string;
	item_make_id?: number;
	item_make_name?: string;
	tax_percentage?: number;
	amount?: number;
	remarks?: string;
	hsn_code?: string;
};
