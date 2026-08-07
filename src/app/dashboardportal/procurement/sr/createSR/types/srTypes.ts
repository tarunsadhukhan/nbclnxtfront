/**
 * Stores Receipt (SR) specific TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

/**
 * Basic label/value tuple used across SR forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Warehouse option with branch association.
 */
export type WarehouseOption = {
	label: string;
	value: string;
	branchId?: number;
};

/**
 * A supplier's party branch, used to pick the supplier GST state on a
 * direct (no-PO) inward where the branch wasn't captured upstream.
 */
export type SupplierBranchOption = {
	party_mst_branch_id: number;
	state_id: number | null;
	state_name: string;
	gst_no?: string | null;
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
 * Additional charge line item for SR.
 */
export type SRAdditionalCharge = {
	id: string; // Frontend-generated ID for tracking
	inward_additional_id: number | null; // null for new charges
	additional_charges_id: number;
	additional_charges_name: string;
	qty: number;
	rate: number;
	net_amount: number;
	remarks: string;
	// Tax fields (optional)
	apply_tax: boolean;
	tax_pct: number;
	igst_amount: number;
	sgst_amount: number;
	cgst_amount: number;
	tax_amount: number;
};

/**
 * Reasons PO additional charges cannot be auto-populated onto an SR.
 */
export type PoAdditionalCandidateReason =
	| "no_po"
	| "missing_po_on_line"
	| "multiple_pos"
	| "incomplete_po_coverage";

/**
 * Server-computed candidate payload that tells the SR page whether it
 * can auto-fill additional charges from the originating PO.
 */
export type PoAdditionalCandidate = {
	eligible: boolean;
	reason: PoAdditionalCandidateReason | null;
	po_id: number | null;
	charges: SRAdditionalChargeRaw[];
};

/**
 * Raw additional charge from API.
 */
export type SRAdditionalChargeRaw = {
	proc_inward_additional_id?: number;
	inward_additional_id?: number; // Legacy alias
	inward_id?: number;
	additional_charges_id?: number;
	additional_charges_name?: string;
	default_tax_pct?: number;
	qty?: number;
	rate?: number;
	net_amount?: number;
	remarks?: string;
	apply_tax?: boolean;
	tax_pct?: number;
	igst_amount?: number;
	sgst_amount?: number;
	cgst_amount?: number;
	tax_amount?: number;
};

/**
 * Normalized representation of an SR line item used in the UI.
 */
export type SRLineItem = {
	id: string;
	po_no_formatted: string;
	inward_dtl_id: number;
	item_id: number;
	item_code: string;
	full_item_code?: string;
	item_name: string;
	item_grp_id: number;
	item_grp_name: string;
	item_make_name: string;
	accepted_item_make_name: string;
	uom_id: number;
	uom_name: string;
	approved_qty: number;
	rejected_qty: number;
	po_rate: number;
	accepted_rate: number;
	amount: number;
	discount_mode: number | null;
	discount_value: number | null;
	discount_amount: number;
	tax_percentage: number;
	igst_amount: number;
	cgst_amount: number;
	sgst_amount: number;
	tax_amount: number;
	total_amount: number;
	remarks: string;
	warehouse_id: number | null;
	warehouse_name: string;
	warehouse_path: string;
	hsn_code: string;
};

/**
 * SR header data from API.
 */
export type SRHeader = {
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_id: number;
	branch_name: string;
	supplier_id: number;
	supplier_name: string;
	supplier_branch_id: number | null;
	supplier_branch_options: SupplierBranchOption[];
	supplier_state_id: number | null;
	supplier_state_name: string;
	bill_branch_id: number | null;
	billing_branch_name: string;
	billing_state_id: number | null;
	billing_state_name: string;
	ship_branch_id: number | null;
	shipping_branch_name: string;
	shipping_state_id: number | null;
	shipping_state_name: string;
	india_gst: boolean;
	sr_no: string;
	sr_date: string;
	sr_status: number;
	sr_status_name: string;
	inspection_date: string;
	challan_no: string;
	challan_date: string;
	invoice_no: string;
	invoice_date: string;
	invoice_amount: number;
	invoice_recvd_date: string;
	vehicle_number: string;
	driver_name: string;
	driver_contact_no: string;
	consignment_no: string;
	consignment_date: string;
	ewaybillno: string;
	ewaybill_date: string;
	despatch_remarks: string;
	receipts_remarks: string;
	sr_remarks: string;
	gross_amount: number;
	net_amount: number;
};

/**
 * SR totals calculated from line items.
 */
export type SRTotals = {
	grossAmount: number;
	totalDiscount: number;
	netAmount: number;
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	totalTax: number;
	grandTotal: number;
};

/**
 * Raw line item structure from API before mapping.
 */
export type SRLineItemRaw = {
	po_no_formatted?: string;
	inward_dtl_id?: number;
	item_id?: number;
	item_code?: string;
	full_item_code?: string;
	item_name?: string;
	item_grp_id?: number;
	item_grp_name?: string;
	item_make_name?: string;
	accepted_item_make_name?: string;
	uom_id?: number;
	uom_name?: string;
	approved_qty?: number;
	rejected_qty?: number;
	po_rate?: number;
	rate?: number;
	accepted_rate?: number;
	amount?: number;
	discount_mode?: number | null;
	discount_value?: number | null;
	discount_amount?: number | null;
	tax_percentage?: number;
	remarks?: string;
	warehouse_id?: number | null;
	warehouse_name?: string;
	warehouse_path?: string;
	hsn_code?: string;
};

/**
 * Raw header structure from API before mapping.
 */
export type SRHeaderRaw = {
	inward_id?: number;
	inward_no?: string;
	inward_date?: string;
	branch_id?: number;
	branch_name?: string;
	supplier_id?: number;
	supplier_name?: string;
	supplier_branch_id?: number | null;
	supplier_branch_options?: SupplierBranchOption[];
	supplier_state_id?: number | null;
	supplier_state_name?: string;
	bill_branch_id?: number | null;
	billing_branch_name?: string;
	billing_state_id?: number | null;
	billing_state_name?: string;
	ship_branch_id?: number | null;
	shipping_branch_name?: string;
	shipping_state_id?: number | null;
	shipping_state_name?: string;
	india_gst?: boolean | number;
	sr_no?: string;
	sr_date?: string;
	sr_status?: number;
	sr_status_name?: string;
	inspection_date?: string;
	challan_no?: string;
	challan_date?: string;
	invoice_no?: string;
	invoice_date?: string;
	invoice_amount?: number;
	invoice_recvd_date?: string;
	vehicle_number?: string;
	driver_name?: string;
	driver_contact_no?: string;
	consignment_no?: string;
	consignment_date?: string;
	ewaybillno?: string;
	ewaybill_date?: string;
	despatch_remarks?: string;
	receipts_remarks?: string;
	sr_remarks?: string;
	gross_amount?: number;
	net_amount?: number;
};
