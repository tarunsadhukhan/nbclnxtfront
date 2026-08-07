/**
 * Price Enquiry specific shared TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

// ---------------------------------------------------------------------------
// Setup / Master Data
// ---------------------------------------------------------------------------

/**
 * Enquiry setup data returned from backend during form initialization.
 */
export type EnquirySetupData = {
	branches: Array<{ branch_id: number; branch_name: string }>;
	suppliers: Array<{ party_id: number; supp_name: string; supp_code: string }>;
	expense_types: Array<{ expense_type_id: number; expense_type_name: string }>;
	projects: Array<{ project_id: number; prj_name: string }>;
};

// ---------------------------------------------------------------------------
// Indent Items
// ---------------------------------------------------------------------------

/**
 * Line item from an approved indent, available for selection
 * when creating an indent-based price enquiry.
 */
export type IndentLineItemForEnquiry = {
	indent_dtl_id: number;
	indent_id: number;
	indent_no: number;
	item_id: number;
	item_code: string;
	item_name: string;
	item_make_id: number | null;
	item_make_name: string | null;
	uom_id: number;
	uom_name: string;
	qty: number;
	remarks: string | null;
	dept_id: number | null;
};

// ---------------------------------------------------------------------------
// Enquiry Form (editable)
// ---------------------------------------------------------------------------

/**
 * Editable line item used in the enquiry creation/edit form.
 */
export type EnquiryLineItem = {
	id: string;
	indentDtlId?: number;
	indentNo?: string;
	itemId?: number;
	itemCode?: string;
	itemName?: string;
	itemMakeId?: number | null;
	itemMakeName?: string | null;
	uomId?: number;
	uomName?: string;
	qty?: number;
	remarks?: string;
};

/**
 * Supplier selection entry used when adding suppliers to an enquiry.
 */
export type EnquirySupplierEntry = {
	supplierId: number;
	supplierName: string;
	supplierCode: string;
	supplierBranchId?: number;
};

// ---------------------------------------------------------------------------
// Enquiry Details (read from backend)
// ---------------------------------------------------------------------------

/**
 * Full enquiry details returned from backend for view/edit modes.
 */
export type EnquiryDetails = {
	enquiry_id: number;
	enquiry_no: number;
	price_enquiry_date: string;
	price_enquiry_squence_no: string;
	branch_id: number;
	branch_name: string;
	status_id: number;
	status_name: string;
	enquiry_type: string;
	expense_type_id: number | null;
	expense_type_name: string | null;
	project_id: number | null;
	remarks: string | null;
	approval_level: number | null;
	items: EnquiryDetailItem[];
	suppliers: EnquirySupplierInfo[];
	responses: EnquiryResponseSummary[];
};

/**
 * Individual item line within an enquiry detail response.
 */
export type EnquiryDetailItem = {
	enquiry_dtl_id: number;
	indent_dtl_id: number | null;
	item_id: number;
	item_code: string;
	item_name: string;
	item_make_id: number | null;
	item_make_name: string | null;
	uom_id: number;
	uom_name: string;
	qty: number;
	remarks: string | null;
};

/**
 * Supplier associated with an enquiry.
 */
export type EnquirySupplierInfo = {
	enquiry_supplier_id: number;
	supplier_id: number;
	supp_name: string;
	supp_code: string;
	sent_date: string | null;
	sent_status: number;
};

/**
 * Summary of a supplier response within the enquiry detail.
 */
export type EnquiryResponseSummary = {
	proc_price_enquiry_response_id: number;
	supplier_id: number;
	supp_name: string;
	response_date: string;
	credit_days: number | null;
	delivery_days: number | null;
	gross_amount: number | null;
	net_amount: number | null;
	is_selected: number;
};

// ---------------------------------------------------------------------------
// Response Comparison
// ---------------------------------------------------------------------------

/**
 * Full response detail used in the comparison view across suppliers.
 */
export type ComparisonResponseDetail = {
	proc_price_enquiry_response_id: number;
	supplier_id: number;
	supp_name: string;
	supp_code: string;
	response_date: string;
	credit_days: number | null;
	delivery_days: number | null;
	payment_terms: string | null;
	terms_conditions: string | null;
	gross_amount: number | null;
	net_amount: number | null;
	is_selected: number;
	items: ComparisonItemDetail[];
};

/**
 * Individual item detail within a comparison response.
 */
export type ComparisonItemDetail = {
	enquiry_dtl_id: number;
	item_id: number;
	item_code: string;
	item_name: string;
	uom_name: string;
	qty: number;
	rate: number | null;
	discount_mode: number | null;
	discount_value: number | null;
	discount_amount: number | null;
	gross_amount: number | null;
	net_amount: number | null;
};

// ---------------------------------------------------------------------------
// Response Form
// ---------------------------------------------------------------------------

/**
 * Form data structure for creating/editing a supplier response.
 */
export type ResponseFormData = {
	responseDate: string;
	deliveryDays: number | null;
	creditDays: number | null;
	paymentTerms: string;
	termsConditions: string;
	remarks: string;
	items: ResponseLineItem[];
};

/**
 * Individual line item within a supplier response form.
 *
 * `uomId`/`itemMakeId` mirror the enquiry line so the saved response detail
 * rows carry the same unit/make identity (PO prefill depends on them).
 */
export type ResponseLineItem = {
	id: string;
	enquiryDtlId: number;
	itemId: number;
	itemCode: string;
	itemName: string;
	itemMakeId: number | null;
	uomId: number | null;
	uomName: string;
	qty: number;
	rate: number | null;
	discountMode: number | null;
	discountValue: number | null;
	discountAmount: number | null;
	grossAmount: number | null;
	netAmount: number | null;
};

// ---------------------------------------------------------------------------
// PO Prefill (from selected response)
// ---------------------------------------------------------------------------

/**
 * Data pre-filled into a Purchase Order from a selected enquiry response.
 */
export type POPrefillData = {
	supplier_id: number;
	supplier_branch_id: number | null;
	credit_days: number | null;
	delivery_days: number | null;
	terms_conditions: string | null;
	payment_terms: string | null;
	branch_id: number;
	expense_type_id: number | null;
	project_id: number | null;
	enquiry_id: number;
	items: POPrefillItem[];
};

/**
 * Individual item in the PO prefill payload.
 */
export type POPrefillItem = {
	item_id: number;
	item_code: string;
	hsn_code: string | null;
	item_make_id: number | null;
	item_make_name: string | null;
	uom_id: number;
	uom_name: string;
	qty: number;
	rate: number;
	discount_mode: number | null;
	discount_value: number | null;
	discount_amount: number | null;
	indent_dtl_id: number | null;
};
