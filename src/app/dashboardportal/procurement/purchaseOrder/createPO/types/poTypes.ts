/**
 * Purchase Order specific shared TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

/**
 * Basic label/value tuple used across PO forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Additional charge option from master table.
 */
export type AdditionalChargeOption = {
	additional_charges_id: number;
	additional_charges_name: string;
	default_value: number | null; // Default tax percentage
};

/**
 * Additional charge line item for PO.
 */
export type POAdditionalCharge = {
	id: string; // Frontend-generated ID for tracking
	po_additional_id: number | null; // null for new charges
	additional_charges_id: number;
	additional_charges_name: string;
	qty: number;
	rate: number;
	net_amount: number;
	remarks: string;
	// Tax fields
	apply_tax: boolean;
	tax_pct: number;
	igst_amount: number;
	sgst_amount: number;
	cgst_amount: number;
	tax_amount: number;
};

/**
 * Raw additional charge from API.
 */
export type POAdditionalChargeRaw = {
	id?: string;
	po_additional_id?: number;
	po_id?: number;
	additionalChargesId?: string;
	additional_charges_id?: number;
	additionalChargesName?: string;
	additional_charges_name?: string;
	default_tax_pct?: number;
	qty?: number;
	rate?: number;
	netAmount?: number;
	net_amount?: number;
	remarks?: string;
	apply_tax?: boolean;
	tax_pct?: number;
	igst?: number;
	igst_amount?: number;
	sgst?: number;
	sgst_amount?: number;
	cgst?: number;
	cgst_amount?: number;
	tax_amount?: number;
};

/**
 * Normalized representation of a PO line item used in the UI.
 */
export type EditableLineItem = {
	id: string;
	indentDtlId?: string;
	/** Database PO detail line ID — present for existing rows loaded during edit, undefined for new rows */
	poDtlId?: string;
	indentNo?: string;
	department?: string;
	itemGroup: string;
	item: string;
	itemCode?: string;
	itemMake: string;
	quantity: string;
	rate: string;
	uom: string;
	discountMode?: number;
	discountValue: string;
	discountAmount?: number;
	amount?: number;
	remarks: string;
	taxPercentage?: number;
	igstAmount?: number;
	cgstAmount?: number;
	sgstAmount?: number;
	hsnCode?: string;
	taxAmount?: number;
	// Validation fields (direct PO and indent-based)
	rowError?: string;
	rowWarning?: string;
	maxPoQty?: number;
	minPoQty?: number;
	validationLogic?: 1 | 2 | 3;
	/** When true the quantity cell is auto-set from item master and locked (Logic 2 / Open indent) */
	isQuantityLocked?: boolean;
	/** Available outstanding qty from linked indent lines; enforced live for indent-based POs */
	availableIndentQty?: number;
	/** Minimum order quantity step from item master — entered qty must be a multiple of this */
	minOrderQty?: number;
};

/**
 * Response shape returned by GET /procurementPO/validate_item_for_po
 */
export type POItemValidationResult = {
	validation_logic: 1 | 2 | 3;
	po_type: string;
	expense_type_name: string;
	errors: string[];
	warnings: string[];
	// Logic 1
	branch_stock: number | null;
	outstanding_indent_qty: number | null;
	outstanding_po_qty: number | null;
	minqty: number | null;
	maxqty: number | null;
	min_order_qty: number | null;
	has_open_indent: boolean;
	has_open_po: boolean;
	stock_exceeds_max: boolean;
	max_po_qty: number | null;
	min_po_qty: number | null;
	// Logic 2
	fy_po_exists: boolean;
	fy_po_no: string | null;
	fy_indent_exists: boolean;
	fy_indent_no: string | null;
	has_minmax: boolean;
	regular_bom_outstanding: number | null;
	forced_qty: number | null;
};

/**
 * Supplier branch details as consumed by the PO UI.
 */
export type SupplierBranchRecord = {
	id: string;
	address: string;
	stateName?: string;
};

/**
 * Supplier master record as consumed by the PO UI.
 */
export type SupplierRecord = {
	id: string;
	name: string;
	code?: string;
	branches?: SupplierBranchRecord[];
};

/**
 * Broker record as consumed by the PO UI.
 */
export type BrokerRecord = {
	id: string;
	name: string;
	code?: string;
};

/**
 * Company branch/billing address details as consumed by the PO UI.
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
 * Project option displayed in PO header.
 */
export type ProjectRecord = {
	id: string;
	name: string;
	branchId?: string;
};

/**
 * Expense type option displayed in PO header.
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
 * Individual item option metadata returned from setup API.
 */
export type ItemOption = Option & {
	defaultUomId?: string;
	defaultUomLabel?: string;
	defaultRate?: number;
	taxPercentage?: number;
	hsnCode?: string;
	lastPurchaseRate?: number;
	lastPurchaseDate?: string;
	lastSupplierName?: string;
};

/**
 * Cached metadata for an item group to avoid redundant network calls.
 */
export type ItemLastPurchaseInfo = {
	rate: number;
	date: string | null;
	supplierName: string | null;
};

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
	itemHsnById: Record<string, string>;
	itemLastPurchaseById: Record<string, ItemLastPurchaseInfo>;
};

/**
 * Normalized setup data returned by `fetchPOSetup1`.
 */
export type POSetupData = {
	suppliers: SupplierRecord[];
	brokers: BrokerRecord[];
	projects: ProjectRecord[];
	expenses: ExpenseRecord[];
	itemGroups: ItemGroupRecord[];
	coConfig?: {
		india_gst?: number;
		indent_required?: number;
		back_date_allowable?: number;
	};
	branchAddresses: BranchAddressRecord[];
	additionalChargeOptions: AdditionalChargeOption[];
};

/**
 * Aggregated totals for additional charges.
 */
export type AdditionalChargesTotals = {
	baseAmount: number;  // Sum of net_amount (before tax)
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	totalTax: number;
	totalAmount: number; // baseAmount + totalTax
};

/**
 * Raw supplier structure returned by API responses before mapping.
 */
export type SupplierRecordRaw = {
	id?: string | number;
	party_id?: string | number;
	supplier_name?: string;
	supp_name?: string;
	name?: string;
	supplier_code?: string;
	supp_code?: string;
	branches?: SupplierBranchRecordRaw[];
};

/**
 * Raw supplier branch representation from API responses.
 */
export type SupplierBranchRecordRaw = {
	id?: string | number;
	party_mst_branch_id?: string | number;
	branch_address1?: string;
	branch_address2?: string;
	state_name?: string;
	state?: string;
};

/**
 * Raw broker representation from API responses.
 */
export type BrokerRecordRaw = {
	id?: string | number;
	broker_id?: string | number;
	party_id?: string | number;
	broker_name?: string;
	broker_code?: string;
	name?: string;
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
 * Raw project representation from API responses.
 */
export type ProjectRecordRaw = {
	id?: string | number;
	project_id?: string | number;
	prj_name?: string;
	project_name?: string;
	name?: string;
	branch_id?: string | number | null;
};

/**
 * Raw expense representation from API responses.
 */
export type ExpenseRecordRaw = {
	id?: string | number;
	expense_type_id?: string | number;
	expense_type_name?: string;
	name?: string;
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
 * Raw item option as returned by setup api's `items` collection.
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
	hsn_code?: string | null;
	last_purchase_rate?: number | string | null;
	last_purchase_date?: string | null;
	last_supplier_name?: string | null;
};

/**
 * Raw item make option as returned by setup api's `makes` collection.
 */
export type ItemMakeOptionRaw = {
	id?: string | number;
	item_make_id?: string | number;
	item_make_name?: string;
	name?: string;
};

/**
 * Raw UOM mapping as returned by setup api's `uoms` collection.
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
 * Raw response for `fetchPOSetup1`.
 */
export type POSetup1ResponseRaw = {
	suppliers?: SupplierRecordRaw[];
	brokers?: BrokerRecordRaw[];
	projects?: ProjectRecordRaw[];
	expense_types?: ExpenseRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	co_config?: Record<string, unknown>;
	branch_addresses?: BranchAddressRecordRaw[];
};

/**
 * Raw response for `fetchPOSetup2`.
 */
export type POSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};

