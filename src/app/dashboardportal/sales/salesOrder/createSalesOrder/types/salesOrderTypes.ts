/**
 * Sales Order specific shared TypeScript definitions.
 */

export type { UomConversionEntry } from "@/utils/uomConversion";

export type Option = {
	label: string;
	value: string;
};

// ---------------------------------------------------------------------------
// Normalized UI Records
// ---------------------------------------------------------------------------

export type CustomerBranchRecord = {
	id: string;
	address: string;
	stateName?: string;
	fullAddress?: string;
};

export type CustomerRecord = {
	id: string;
	name: string;
	code?: string;
	entityType?: string;
	msmeStatus?: string;
	branches?: CustomerBranchRecord[];
};

export type BrokerRecord = {
	id: string;
	name: string;
};

export type TransporterRecord = {
	id: string;
	name: string;
};

export type ApprovedQuotationRecord = {
	id: string;
	quotationNo: string;
	quotationDate?: string;
	partyName?: string;
	netAmount?: number;
};

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

export type ItemGroupRecord = {
	id: string;
	label: string;
};

export type InvoiceTypeRecord = {
	id: string;
	name: string;
	typeCode: string;
};

export type ItemOption = Option & {
	defaultUomId?: string;
	defaultUomLabel?: string;
	defaultRate?: number;
	taxPercentage?: number;
	uomRounding?: number;
	rateRounding?: number;
	fullItemCode?: string;
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
	uomConversionsByItemId: Record<string, import("@/utils/uomConversion").UomConversionEntry[]>;
	/** Item-level UOM/quantity rounding (decimal places) */
	itemUomRoundingById: Record<string, number>;
	/** Item-level rate rounding (decimal places); default 2 */
	itemRateRoundingById: Record<string, number>;
	/** Full item code (group path + item code) from vw_item_with_group_path */
	itemFullCodeById: Record<string, string>;
};

export type AdditionalChargeMasterRecord = {
	additional_charges_id: number;
	additional_charges_name: string;
	default_value?: number | null;
};

export type SalesOrderSetupData = {
	customers: CustomerRecord[];
	brokers: BrokerRecord[];
	transporters: TransporterRecord[];
	approvedQuotations: ApprovedQuotationRecord[];
	itemGroups: ItemGroupRecord[];
	branchAddresses: BranchAddressRecord[];
	invoiceTypes: InvoiceTypeRecord[];
	coConfig?: {
		india_gst?: number;
		quotation_required?: number | boolean;
	};
	additionalChargesMaster: AdditionalChargeMasterRecord[];
	transportChargeRates: TransportChargeRateRecord[];
};

export type TransportChargeRateRecord = {
	id: number;
	mode_of_transport: string;
	additional_charges_id: number;
	rate_per_100pcs: number;
	co_id: number | null;
};

// ---------------------------------------------------------------------------
// Editable Line Item
// ---------------------------------------------------------------------------

export type EditableLineItem = {
	id: string;
	quotationLineitemId?: number | null;
	hsnCode?: string;
	itemGroup: string;
	item: string;
	itemMake: string;
	quantity: string;
	rate: string;
	uom: string;
	discountType?: number;
	discountValue: string;
	discountAmount?: number;
	amount?: number;
	remarks: string;
	taxPercentage?: number;
	igstAmount?: number;
	cgstAmount?: number;
	sgstAmount?: number;
	taxAmount?: number;
	// --- Rounding ---
	/** Decimal places for quantity (from item_mst.uom_rounding or uom_item_map_mst.rounding) */
	qtyRounding?: number;
	/** Decimal places for rate (from item_mst.rate_rounding, default 2) */
	rateRounding?: number;
	// --- Hessian (invoice_type_id = 2) ---
	/** Qty entered in bales (user-entered); quantity field stores the MT equivalent */
	qtyBales?: string;
	/** Raw rate per MT before brokerage deduction (user-entered); rate field stores billing rate */
	rawRateMt?: string;
	/** Converted rate per bale (rawRateMt / conversionFactor) */
	ratePerBale?: number;
	/** billing rate = rawRateMt − (rawRateMt × brokerage%) */
	billingRateMt?: number;
	/** billing rate per bale = billingRateMt / conversionFactor */
	billingRateBale?: number;
	/** Bales-to-MT conversion factor from uom_item_map_mst */
	conversionFactor?: number;
	// --- Jute (invoice_type_id = 4) ---
	juteClaimRate?: string;
	juteClaimAmountDtl?: string;
	juteClaimDesc?: string;
	juteUnitConversion?: string;
	juteQtyUnitConversion?: string;
	// --- Jute Yarn (jute_yarn): mirrors hessian brokerage/rate handling, no bales conversion ---
	/** Raw rate before brokerage deduction (user-entered); rate field stores billing rate */
	juteYarnRawRate?: string;
	/** billing rate = juteYarnRawRate − (juteYarnRawRate × brokerage%) */
	juteYarnBillingRate?: number;
	// --- Govt SKG (invoice_type_id = 5) ---
	govtskgPackSheet?: string;
	govtskgNetWeight?: string;
	govtskgTotalWeight?: string;
	/** Qty entered in bales (user-entered); quantity field stores the 100-pcs equivalent */
	govtskgQtyBales?: string;
	/** map_to_id for the bales UOM from uom_item_map_mst (e.g. 172) */
	govtskgBalesUomId?: string;
	/** Bales-to-billing-UOM conversion factor from uom_item_map_mst */
	govtskgConversionFactor?: number;
	// --- Full item code (from vw_item_with_group_path) ---
	fullItemCode?: string;
};

// ---------------------------------------------------------------------------
// Raw API Records (for mapping)
// ---------------------------------------------------------------------------

export type CustomerRecordRaw = {
	id?: string | number;
	party_id?: string | number;
	party_name?: string;
	name?: string;
	party_code?: string;
	entity_type?: string;
	msme_status?: string;
	branches?: CustomerBranchRecordRaw[];
};

export type CustomerBranchRecordRaw = {
	id?: string | number;
	party_mst_branch_id?: string | number;
	address?: string;
	address_additional?: string;
	zip_code?: string | number;
	state_name?: string;
	state?: string;
};

export type BrokerRecordRaw = {
	id?: string | number;
	broker_id?: string | number;
	party_id?: string | number;
	broker_name?: string;
	broker_code?: string;
	party_name?: string;
	name?: string;
};

export type TransporterRecordRaw = {
	id?: string | number;
	transporter_id?: string | number;
	party_id?: string | number;
	transporter_name?: string;
	transporter_code?: string;
	party_name?: string;
	name?: string;
};

export type ApprovedQuotationRecordRaw = {
	sales_quotation_id?: string | number;
	quotation_no?: string;
	quotation_date?: string;
	party_name?: string;
	net_amount?: number;
};

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

export type InvoiceTypeRecordRaw = {
	invoice_type_id?: string | number;
	invoice_type_name?: string;
};

export type ItemGroupRecordRaw = {
	id?: string | number;
	item_grp_id?: string | number;
	item_grp_code_display?: string;
	code?: string;
	item_grp_name_display?: string;
	name?: string;
};

export type ItemOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	item_code?: string;
	full_item_code?: string;
	item_name?: string;
	uom_id?: string | number | null;
	uom_name?: string | null;
	rate?: number | string | null;
	tax_percentage?: number | string | null;
	uom_rounding?: number | null;
	rate_rounding?: number | null;
};

export type ItemMakeOptionRaw = {
	id?: string | number;
	item_make_id?: string | number;
	item_make_name?: string;
	name?: string;
};

export type ItemUomOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	map_from_id?: string | number;
	map_from_name?: string;
	map_to_id?: string | number;
	mapToId?: string | number;
	uom_id?: string | number;
	uom_name?: string;
	relation_value?: number | null;
	rounding?: number | null;
};

export type SalesOrderSetup1ResponseRaw = {
	customers?: CustomerRecordRaw[];
	brokers?: BrokerRecordRaw[];
	transporters?: TransporterRecordRaw[];
	approved_quotations?: ApprovedQuotationRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	invoice_types?: InvoiceTypeRecordRaw[];
	co_config?: Record<string, unknown>;
	branches?: Array<Record<string, unknown>>;
	additional_charges_master?: Array<Record<string, unknown>>;
	transport_charge_rates?: Array<Record<string, unknown>>;
};

export type SalesOrderSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};
