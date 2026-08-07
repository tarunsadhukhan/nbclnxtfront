/**
 * Delivery Order specific shared TypeScript definitions.
 */

import type { UomConversionEntry } from "@/utils/uomConversion";
export type { UomConversionEntry } from "@/utils/uomConversion";

export type Option = {
	label: string;
	value: string;
};

export type CustomerBranchRecord = {
	id: string;
	name?: string;
	address?: string;
	stateName?: string;
	stateId?: number;
	gstNo?: string;
	fullAddress?: string;
};

export type CustomerRecord = {
	id: string;
	name: string;
	code?: string;
	branches?: CustomerBranchRecord[];
};

export type TransporterRecord = {
	id: string;
	name: string;
	code?: string;
};

export type BrokerRecord = {
	id: string;
	name: string;
	code?: string;
};

export type ApprovedSalesOrderRecord = {
	id: string;
	salesNo: string;
	salesOrderDate?: string;
	partyId?: string;
	partyName?: string;
	netAmount?: number;
	invoiceType?: string;
	brokerId?: string;
	billingToId?: string;
	shippingToId?: string;
	transporterId?: string;
	pcsoNo?: string;
	pcsoDate?: string;
};

export type InvoiceTypeRecord = {
	id: string;
	name: string;
};

export type ItemGroupRecord = {
	id: string;
	label: string;
};

export type CompanyBranchRecord = {
	id: string;
	name?: string;
	address1?: string;
	address2?: string;
	zipcode?: string;
	stateName?: string;
	stateCode?: string;
	gstNo?: string;
};

export type CompanyBranchRecordRaw = {
	branch_id?: string | number;
	branch_name?: string;
	branch_address1?: string;
	branch_address2?: string;
	branch_zipcode?: string | number;
	state_id?: number;
	state_code?: string;
	state_name?: string;
	gst_no?: string;
	contact_no?: string;
};

export type ItemOption = Option & {
	defaultUomId?: string;
	defaultUomLabel?: string;
	defaultRate?: number;
	taxPercentage?: number;
	rateRounding?: number;
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
	itemRateRoundingById: Record<string, number>;
	uomConversionsByItemId: Record<string, UomConversionEntry[]>;
};

export type EditableLineItem = {
	id: string;
	salesOrderDtlId?: number;
	hsnCode?: string;
	itemGroup: string;
	item: string;
	itemCode?: string;
	itemName?: string;
	itemMake: string;
	quantity: string;
	rate: string;
	uom: string;
	uomName?: string;
	discountType?: number;
	discountedRate?: number;
	discountAmount?: number;
	netAmount?: number;
	totalAmount?: number;
	remarks: string;
	taxPercentage?: number;
	igstAmount?: number;
	igstPercent?: number;
	cgstAmount?: number;
	cgstPercent?: number;
	sgstAmount?: number;
	sgstPercent?: number;
	gstTotal?: number;
	/** Decimals to round `rate` / `discounted_rate` to (from item_mst.rate_rounding; defaults to 2) */
	rateRounding?: number;
	/** Govt SKG: qty entered in bales (user-entered); quantity field stores the 100-pcs equivalent */
	govtskgQtyBales?: string;
	/** Govt SKG: map_to_id for the bales UOM from uom_item_map_mst */
	govtskgBalesUomId?: string;
	/** Govt SKG: bales-to-billing-UOM conversion factor from uom_item_map_mst */
	govtskgConversionFactor?: number;
	/** Hessian: qty entered in bales (user-entered); quantity field stores the MT equivalent */
	hessianQtyBales?: string;
	/** Hessian: map_to_id for the bales UOM from uom_item_map_mst */
	hessianBalesUomId?: string;
	/** Hessian: bales-per-MT conversion factor from uom_item_map_mst.relation_value */
	hessianConversionFactor?: number;
};

export type DOSetupData = {
	customers: CustomerRecord[];
	transporters: TransporterRecord[];
	brokers: BrokerRecord[];
	approvedSalesOrders: ApprovedSalesOrderRecord[];
	itemGroups: ItemGroupRecord[];
	invoiceTypes: InvoiceTypeRecord[];
	branches: CompanyBranchRecord[];
};

// Raw API response types

export type CustomerBranchRecordRaw = {
	id?: string | number;
	party_mst_branch_id?: string | number;
	party_branch_name?: string;
	address?: string;
	address_additional?: string;
	zip_code?: string;
	branch_address1?: string;
	fatory_address?: string; // production typo - do not fix
	state_name?: string;
	state_id?: number;
	state_code?: string;
	gst_no?: string;
};

export type CustomerRecordRaw = {
	id?: string | number;
	party_id?: string | number;
	supp_name?: string;
	party_name?: string;
	name?: string;
	supp_code?: string;
	party_code?: string;
	branches?: CustomerBranchRecordRaw[];
};

export type TransporterRecordRaw = {
	id?: string | number;
	transporter_id?: string | number;
	party_id?: string | number;
	transporter_name?: string;
	transporter_code?: string;
	name?: string;
};

export type BrokerRecordRaw = {
	id?: string | number;
	broker_id?: string | number;
	party_id?: string | number;
	broker_name?: string;
	broker_code?: string;
	name?: string;
};

export type ApprovedSalesOrderRecordRaw = {
	id?: string | number;
	sales_order_id?: string | number;
	sales_no?: string;
	sales_order_no?: string;
	sales_order_date?: string;
	party_id?: string | number;
	party_name?: string;
	net_amount?: number;
	invoice_type?: string | number;
	broker_id?: string | number;
	billing_to_id?: string | number;
	shipping_to_id?: string | number;
	transporter_id?: string | number;
	pcso_no?: string | null;
	pcso_date?: string | null;
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
	item_name?: string;
	uom_id?: string | number | null;
	uom_name?: string | null;
	rate?: number | string | null;
	tax_percentage?: number | string | null;
	rate_rounding?: number | string | null;
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
	map_to_id?: string | number;
	mapToId?: string | number;
	uom_id?: string | number;
	uom_name?: string;
	map_from_id?: string | number;
	map_from_name?: string;
	relation_value?: number | null;
	rounding?: number | null;
};

export type DOSetup1ResponseRaw = {
	customers?: CustomerRecordRaw[];
	transporters?: TransporterRecordRaw[];
	brokers?: BrokerRecordRaw[];
	approved_sales_orders?: ApprovedSalesOrderRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	invoice_types?: InvoiceTypeRecordRaw[];
	branches?: unknown[];
};

export type DOSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};
