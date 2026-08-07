/**
 * Sales Quotation specific shared TypeScript definitions.
 * Adapted from PO types but simplified for the quotation workflow
 * (no indent references, no additional charges, no advance percentage).
 */

/**
 * Basic label/value tuple used across quotation forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Normalized representation of a quotation line item used in the UI.
 */
export type EditableLineItem = {
	id: string;
	itemGroup: string;
	item: string;
	itemCode?: string;
	itemMake: string;
	hsnCode: string;
	quantity: string;
	rate: string;
	uom: string;
	discountMode?: number;
	discountValue: string;
	discountAmount?: number;
	netAmount?: number;
	totalAmount?: number;
	remarks: string;
	taxPercentage?: number;
	igstAmount?: number;
	cgstAmount?: number;
	sgstAmount?: number;
	taxAmount?: number;
	/** Enquiry-flow cost basis (AMCL Phase 1) — carried when the line was pre-filled from an enquiry. */
	enquiryDtlId?: string | null;
	costSnapshotId?: string | null;
	baseCost?: number | null;
	overheadPct?: number | null;
	marginPct?: number | null;
};

/**
 * Customer master record as consumed by the quotation UI.
 */
export type CustomerRecord = {
	id: string;
	name: string;
	code?: string;
};

/**
 * Customer branch details as consumed by the quotation UI.
 */
export type CustomerBranchRecord = {
	id: string;
	partyId: string;
	branchName: string;
	address: string;
	stateName?: string;
	stateId?: number;
	gstNo?: string;
};

/**
 * Broker master record as consumed by the quotation UI.
 */
export type BrokerRecord = {
	id: string;
	name: string;
	code?: string;
};

/**
 * Company branch/billing address details as consumed by the quotation UI.
 */
export type BranchAddressRecord = {
	id: string;
	name: string;
	address1?: string;
	address2?: string;
	zipcode?: string;
	stateName?: string;
	stateId?: number;
	fullAddress?: string;
};

/**
 * Item group option displayed in line items table.
 */
export type ItemGroupRecord = {
	id: string;
	label: string;
};

/**
 * Individual item option metadata returned from setup API.
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
 * Normalized setup data returned by `fetchQuotationSetup1`.
 */
export type QuotationSetupData = {
	customers: CustomerRecord[];
	customerBranches: CustomerBranchRecord[];
	brokers: BrokerRecord[];
	itemGroups: ItemGroupRecord[];
	coConfig?: {
		india_gst?: number;
		back_date_allowable?: number;
	};
	branchAddresses: BranchAddressRecord[];
};

/**
 * Raw customer structure returned by API responses before mapping.
 */
export type CustomerRecordRaw = {
	id?: string | number;
	party_id?: string | number;
	supp_name?: string;
	party_name?: string;
	name?: string;
	supp_code?: string;
	party_code?: string;
	code?: string;
};

/**
 * Raw customer branch representation from API responses.
 */
export type CustomerBranchRecordRaw = {
	id?: string | number;
	party_mst_branch_id?: string | number;
	party_id?: string | number;
	party_branch_name?: string;
	branch_name?: string;
	fatory_address?: string;
	factory_address?: string;
	address?: string;
	state_name?: string;
	state_id?: number;
	gst_no?: string;
};

/**
 * Raw broker representation from API responses.
 */
export type BrokerRecordRaw = {
	id?: string | number;
	broker_id?: string | number;
	broker_name?: string;
	name?: string;
	broker_code?: string;
	code?: string;
};

/**
 * Raw branch/billing address representation from API responses.
 */
export type BranchAddressRecordRaw = {
	id?: string | number;
	branch_id?: string | number;
	branch_name?: string;
	branch_address1?: string;
	branch_address2?: string;
	branch_zipcode?: string;
	state_name?: string;
	state_id?: number;
};

/**
 * Raw item group representation from API responses.
 */
export type ItemGroupRecordRaw = {
	id?: string | number;
	item_grp_id?: string | number;
	item_grp_code_display?: string;
	code?: string;
	item_grp_name_display?: string;
	name?: string;
};

/**
 * Raw item option as returned by setup API's `items` collection.
 */
export type ItemOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	item_code?: string;
	item_name?: string;
	uom_id?: string | number | null;
	uom_name?: string | null;
	rate?: number | string | null;
	tax_percentage?: number | string | null;
};

/**
 * Raw item make option as returned by setup API's `makes` collection.
 */
export type ItemMakeOptionRaw = {
	id?: string | number;
	item_make_id?: string | number;
	item_make_name?: string;
	name?: string;
};

/**
 * Raw UOM mapping as returned by setup API's `uoms` collection.
 */
export type ItemUomOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	map_to_id?: string | number;
	mapToId?: string | number;
	uom_id?: string | number;
	uom_name?: string;
};

/**
 * Raw response for `fetchQuotationSetup1`.
 */
export type QuotationSetup1ResponseRaw = {
	customers?: CustomerRecordRaw[];
	customer_branches?: CustomerBranchRecordRaw[];
	brokers?: BrokerRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	co_config?: Record<string, unknown>;
	branch_addresses?: BranchAddressRecordRaw[];
};

/**
 * Raw response for `fetchQuotationSetup2`.
 */
export type QuotationSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};
