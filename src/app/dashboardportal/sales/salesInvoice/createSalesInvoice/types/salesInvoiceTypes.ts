import type { UomConversionEntry } from "@/utils/uomConversion";
export type { UomConversionEntry } from "@/utils/uomConversion";

export type Option = {
	label: string;
	value: string;
};

export type GovtSackingSourceRow = {
	invoice_id: number;
	invoice_no: number | string | null;
	invoice_date: string;
	party_id: number;
	party_name: string;
	sales_order_no: number | string | null;
	delivery_order_no: number | string | null;
	pcso_no: string | null;
	status_id: number;
};

export type GovtSackingSourceLine = {
	item_id: number;
	item_name: string;
	hsn_code: string | null;
	quantity: number;
	uom_id: number;
	uom_name: string | null;
	pack_sheet: number | null;
	net_weight: number | null;
	total_weight: number | null;
};

export type GovtSackingSourceHeader = {
	invoice_id: number;
	invoice_no: number | string | null;
	invoice_date: string;
	invoice_type: number;
	party_id: number;
	party_name: string;
	billing_to_id: number | null;
	shipping_to_id: number | null;
	billing_state_code: number | string | null;
	shipping_state_code: number | string | null;
	intra_inter_state: number | string | null;
	branch_id: number;
	co_id: number;
	sales_order_id: number | null;
	sales_order_no: number | string | null;
	sales_delivery_order_id: number | null;
	delivery_order_no: number | string | null;
	delivery_order_date?: string | null;
	transporter_id: number | null;
	transporter_name: string | null;
	transporter_address: string | null;
	transporter_state_code: string | null;
	transporter_state_name: string | null;
	transporter_branch_id: number | null;
	transporter_doc_no: string | null;
	transporter_doc_date: string | null;
	buyer_order_no: string | null;
	buyer_order_date: string | null;
	vehicle_no: string | null;
	container_no: string | null;
	pcso_no: string | null;
	pcso_date: string | null;
	administrative_office_address: string | null;
	destination_rail_head: string | null;
	loading_point: string | null;
	mode_of_transport: string | null;
	billing_party_name?: string | null;
	billing_address?: string | null;
	billing_address_additional?: string | null;
	billing_zip_code?: string | null;
	billing_state_name?: string | null;
	billing_gst_no?: string | null;
	shipping_party_name?: string | null;
	shipping_address?: string | null;
	shipping_address_additional?: string | null;
	shipping_zip_code?: string | null;
	shipping_state_name?: string | null;
	shipping_gst_no?: string | null;
	transporter_gst_no?: string | null;
	eway_bill_no?: string | null;
	eway_bill_date?: string | null;
	sales_order_no_formatted?: string | null;
	sales_order_date?: string | null;
	co_prefix?: string | null;
	branch_prefix?: string | null;
	invoice_no_formatted?: string | null;
	delivery_order_no_formatted?: string | null;
};

export type GovtSackingSourceDetail = {
	header: GovtSackingSourceHeader;
	lines: GovtSackingSourceLine[];
};

export type CustomerBranchRecord = {
	id: string;
	name?: string;
	address?: string;
	fullAddress?: string;
	stateName?: string;
	stateId?: number;
	stateCode?: string;
	gstNo?: string;
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

export type ApprovedDeliveryOrderRecord = {
	id: string;
	deliveryOrderNo: string;
	deliveryOrderDate?: string;
	partyId?: number;
	partyName?: string;
	netAmount?: number;
	salesOrderId?: number;
	salesOrderDate?: string;
	salesOrderNo?: string;
	invoiceType?: number;
	billingToId?: number;
	shippingToId?: number;
	transporterId?: number;
};

export type ApprovedSalesOrderRecord = {
	id: string;
	salesOrderNo: string;
	salesOrderDate?: string;
	partyId?: number;
	partyName?: string;
	paymentTerms?: number;
	invoiceType?: number;
	brokerId?: number;
	billingToId?: number;
	shippingToId?: number;
	transporterId?: number;
	buyerOrderNo?: string;
	buyerOrderDate?: string;
};

export type InvoiceTypeRecord = {
	id: string;
	name: string;
};

export type ItemGroupRecord = {
	id: string;
	label: string;
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
	deliveryOrderDtlId?: number;
	salesOrderDtlId?: number;
	hsnCode?: string;
	itemGroup: string;
	item: string;
	itemCode?: string;
	itemName?: string;
	fullItemCode?: string;
	itemMake: string;
	quantity: string;
	rate: string;
	uom: string;
	/** Unit name resolved by the backend (e.g. "Qntl"); used for display when the
	 *  lazy item-group UOM cache isn't loaded (e.g. view mode). */
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
	// Raw Jute detail fields (invoice_type = 5)
	juteClaimAmountDtl?: number;
	juteClaimDesc?: string;
	juteClaimRate?: number;
	juteUnitConversion?: string;
	juteQtyUnitConversion?: number;
	// Hessian detail fields (invoice_type = 2)
	hessianQtyBales?: number;
	hessianRatePerBale?: number;
	hessianBillingRateMt?: number;
	hessianBillingRateBale?: number;
	/** Bales-per-MT conversion factor from uom_item_map_mst.relation_value */
	hessianConversionFactor?: number;
	/** Decimals to round qtyMt to (from uom_item_map_mst.rounding; falls back to 3) */
	hessianQtyRounding?: number;
	// Govt Sacking detail fields (invoice_type = 3)
	govtskgPackSheet?: number;
	govtskgNetWeight?: number;
	govtskgTotalWeight?: number;
	/** Qty entered in bales (user-entered); quantity field stores the 100-pcs equivalent */
	govtskgQtyBales?: string;
	/** map_to_id for the bales UOM from uom_item_map_mst */
	govtskgBalesUomId?: string;
	/** Bales-to-billing-UOM conversion factor from uom_item_map_mst */
	govtskgConversionFactor?: number;
};

export type MukamRecord = {
	mukam_id: number;
	mukam_name: string;
};

export type BankDetailRecord = {
	id: string;
	bankName: string;
	bankBranch?: string;
	accNo: string;
	ifscCode: string;
};

export type CompanyRecord = {
	co_name?: string;
	co_address1?: string;
	co_address2?: string;
	co_zipcode?: number;
	co_cin_no?: string;
	co_email_id?: string;
	co_pan_no?: string;
	state_name?: string;
	state_code?: string;
};

export type InvoiceSetupData = {
	customers: CustomerRecord[];
	transporters: TransporterRecord[];
	brokers: BrokerRecord[];
	approvedDeliveryOrders: ApprovedDeliveryOrderRecord[];
	approvedSalesOrders: ApprovedSalesOrderRecord[];
	itemGroups: ItemGroupRecord[];
	invoiceTypes: InvoiceTypeRecord[];
	mukamList: MukamRecord[];
	branches?: Array<{
		branch_id: number;
		branch_name: string;
		branch_address1?: string;
		branch_address2?: string;
		branch_zipcode?: number;
		state_id?: number;
		state_code?: string;
		state_name?: string;
		gst_no?: string;
		contact_no?: string;
	}>;
	bankDetails?: BankDetailRecord[];
	company?: CompanyRecord;
	additionalChargesMaster: AdditionalChargeMasterRecord[];
	transportChargeRates: TransportChargeRateRecord[];
};

export type AdditionalChargeMasterRecord = {
	additional_charges_id: number;
	additional_charges_name: string;
	default_value: number | null;
};

export type TransportChargeRateRecord = {
	id: number;
	mode_of_transport: string;
	additional_charges_id: number;
	rate_per_100pcs: number;
	co_id: number | null;
};

export type CustomerBranchRecordRaw = {
	id?: string | number;
	party_mst_branch_id?: string | number;
	party_branch_name?: string;
	address?: string;
	address_additional?: string;
	zip_code?: string;
	branch_address1?: string;
	fatory_address?: string;
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

export type ApprovedDeliveryOrderRecordRaw = {
	id?: string | number;
	sales_delivery_order_id?: string | number;
	delivery_order_no?: string;
	do_no?: string;
	delivery_order_date?: string;
	party_id?: number;
	party_name?: string;
	net_amount?: number;
	sales_order_id?: number;
	sales_order_date?: string;
	sales_order_no?: string;
	invoice_type?: number;
	billing_to_id?: number;
	shipping_to_id?: number;
	transporter_id?: number;
};

export type ApprovedSalesOrderRecordRaw = {
	id?: string | number;
	sales_order_id?: string | number;
	sales_order_no?: string;
	sales_order_date?: string;
	party_id?: number;
	party_name?: string;
	payment_terms?: number;
	invoice_type?: number;
	broker_id?: number;
	billing_to_id?: number;
	shipping_to_id?: number;
	transporter_id?: number;
	buyer_order_no?: string;
	buyer_order_date?: string;
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

export type BankDetailRecordRaw = {
	bank_detail_id?: number;
	bank_name?: string;
	bank_branch?: string;
	acc_no?: string;
	ifsc_code?: string;
};

export type InvoiceSetup1ResponseRaw = {
	customers?: CustomerRecordRaw[];
	transporters?: TransporterRecordRaw[];
	brokers?: BrokerRecordRaw[];
	approved_delivery_orders?: ApprovedDeliveryOrderRecordRaw[];
	approved_sales_orders?: ApprovedSalesOrderRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	invoice_types?: InvoiceTypeRecordRaw[];
	mukam_list?: Array<{ mukam_id?: number; mukam_name?: string }>;
	branches?: unknown[];
	bank_details?: BankDetailRecordRaw[];
	company?: CompanyRecord;
};

export type InvoiceSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};

export type InvoiceFormValues = {
	branch?: string;
	date?: string;
	party?: string;
	party_branch?: string;
	delivery_order?: string;
	billing_to?: string;
	shipping_to?: string;
	transporter?: string;
	vehicle_no?: string;
	eway_bill_no?: string;
	eway_bill_date?: string;
	challan_no?: string;
	challan_date?: string;
	invoice_type?: string;
	footer_note?: string;
	internal_note?: string;
	terms_conditions?: string;
	freight_charges?: string;
	round_off?: string;
	due_date?: string;
	type_of_sale?: string;
	tax_id?: string;
	transporter_address?: string;
	transporter_state_code?: string;
	transporter_state_name?: string;
	container_no?: string;
	contract_no?: string;
	contract_date?: string;
	consignment_no?: string;
	consignment_date?: string;
	shipping_state_code?: string;
	intra_inter_state?: string;
	payment_terms?: string;
	sales_order_id?: string;
	sales_order_date?: string;
	billing_state_code?: string;
	jute_mr_no?: string;
	jute_claim_amount?: string;
	jute_claim_description?: string;
	jute_mukam_id?: string;
	govtskg_pcso_no?: string;
	govtskg_pcso_date?: string;
	govtskg_admin_office_address?: string;
	govtskg_destination_rail_head?: string;
	govtskg_loading_point?: string;
	govtskg_pack_sheet?: string;
	govtskg_net_weight?: string;
	govtskg_total_weight?: string;
	// Transporter GST fields
	transporter_branch_id?: number;
	transporter_gst_no?: string;
	transporter_doc_no?: string;
	transporter_doc_date?: string;
	// Buyer order fields
	buyer_order_no?: string;
	buyer_order_date?: string;
	// e-Invoice fields (manual entry now, portal auto-fill later)
	irn?: string;
	ack_no?: string;
	ack_date?: string;
	qr_code?: string;
	// Submission history (read-only)
	e_invoice_submission_history?: EInvoiceSubmission[];
	// Line items
	lineItems?: EditableLineItem[];
};

export type TransporterBranchRecord = {
	id: number;
	gst_no: string;
	address: string;
	state_id: number;
};

export type EInvoiceSubmission = {
	response_id: number;
	submission_status: "Draft" | "Submitted" | "Accepted" | "Rejected" | "Error";
	submitted_date_time: string;
	irn_from_response?: string;
	error_message?: string;
	submitted_by?: number;
};

export type InvoiceDetails = InvoiceFormValues & {
	// Details response includes all form values plus computed fields
	partyName?: string;
	billingAddress?: string;
	shippingAddress?: string;
};
