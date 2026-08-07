import type { SRHeader, SRHeaderRaw, SRLineItem, SRLineItemRaw } from "../types/srTypes";
import { calculateLineTax, calculateLineAmountWithDiscount, calculateLineAmount } from "./srCalculations";

/**
 * Maps raw API header response to normalized SRHeader type.
 */
export const mapSRHeader = (raw: SRHeaderRaw | null | undefined): SRHeader => {
	if (!raw) {
		return {
			inward_id: 0,
			inward_no: "",
			inward_date: "",
			branch_id: 0,
			branch_name: "",
			supplier_id: 0,
			supplier_name: "",
			supplier_branch_id: null,
			supplier_branch_options: [],
			supplier_state_id: null,
			supplier_state_name: "",
			bill_branch_id: null,
			billing_branch_name: "",
			billing_state_id: null,
			billing_state_name: "",
			ship_branch_id: null,
			shipping_branch_name: "",
			shipping_state_id: null,
			shipping_state_name: "",
			india_gst: false,
			sr_no: "",
			sr_date: "",
			sr_status: 0,
			sr_status_name: "Pending",
			inspection_date: "",
			challan_no: "",
			challan_date: "",
			invoice_no: "",
			invoice_date: "",
			invoice_amount: 0,
			invoice_recvd_date: "",
			vehicle_number: "",
			driver_name: "",
			driver_contact_no: "",
			consignment_no: "",
			consignment_date: "",
			ewaybillno: "",
			ewaybill_date: "",
			despatch_remarks: "",
			receipts_remarks: "",
			sr_remarks: "",
			gross_amount: 0,
			net_amount: 0,
		};
	}

	return {
		inward_id: raw.inward_id ?? 0,
		inward_no: raw.inward_no ?? "",
		inward_date: raw.inward_date ?? "",
		branch_id: raw.branch_id ?? 0,
		branch_name: raw.branch_name ?? "",
		supplier_id: raw.supplier_id ?? 0,
		supplier_name: raw.supplier_name ?? "",
		supplier_branch_id: raw.supplier_branch_id ?? null,
		supplier_branch_options: raw.supplier_branch_options ?? [],
		supplier_state_id: raw.supplier_state_id ?? null,
		supplier_state_name: raw.supplier_state_name ?? "",
		bill_branch_id: raw.bill_branch_id ?? null,
		billing_branch_name: raw.billing_branch_name ?? "",
		billing_state_id: raw.billing_state_id ?? null,
		billing_state_name: raw.billing_state_name ?? "",
		ship_branch_id: raw.ship_branch_id ?? null,
		shipping_branch_name: raw.shipping_branch_name ?? "",
		shipping_state_id: raw.shipping_state_id ?? null,
		shipping_state_name: raw.shipping_state_name ?? "",
		india_gst: Boolean(raw.india_gst),
		sr_no: raw.sr_no ?? "",
		sr_date: raw.sr_date ?? "",
		sr_status: raw.sr_status ?? 0,
		sr_status_name: raw.sr_status_name ?? "Pending",
		inspection_date: raw.inspection_date ?? "",
		challan_no: raw.challan_no ?? "",
		challan_date: raw.challan_date ?? "",
		invoice_no: raw.invoice_no ?? "",
		invoice_date: raw.invoice_date ?? "",
		invoice_amount: raw.invoice_amount ?? 0,
		invoice_recvd_date: raw.invoice_recvd_date ?? "",
		vehicle_number: raw.vehicle_number ?? "",
		driver_name: raw.driver_name ?? "",
		driver_contact_no: raw.driver_contact_no ?? "",
		consignment_no: raw.consignment_no ?? "",
		consignment_date: raw.consignment_date ?? "",
		ewaybillno: raw.ewaybillno ?? "",
		ewaybill_date: raw.ewaybill_date ?? "",
		despatch_remarks: raw.despatch_remarks ?? "",
		receipts_remarks: raw.receipts_remarks ?? "",
		sr_remarks: raw.sr_remarks ?? "",
		gross_amount: raw.gross_amount ?? 0,
		net_amount: raw.net_amount ?? 0,
	};
};

/**
 * Maps raw API line item response to normalized SRLineItem type with calculated GST.
 */
export const mapSRLineItem = (
	raw: SRLineItemRaw,
	index: number,
	header: SRHeader,
): SRLineItem => {
	const acceptedRate = raw.accepted_rate ?? raw.po_rate ?? raw.rate ?? 0;
	const approvedQty = raw.approved_qty ?? 0;
	const discountMode = raw.discount_mode ?? null;
	const discountValue = raw.discount_value ?? null;

	// If discount mode/value are set, compute discount amount from them;
	// otherwise fall back to the raw discount_amount from API
	let discountAmount: number;
	let amount: number;
	if (discountMode && discountValue) {
		const calc = calculateLineAmountWithDiscount(approvedQty, acceptedRate, discountMode, discountValue);
		discountAmount = calc.discountAmount;
		amount = calc.amount;
	} else {
		discountAmount = raw.discount_amount ?? 0;
		amount = calculateLineAmount(approvedQty, acceptedRate, discountAmount);
	}

	const taxPercentage = raw.tax_percentage ?? 0;

	// Calculate GST based on states
	const tax = calculateLineTax(
		amount,
		taxPercentage,
		header.supplier_state_name,
		header.shipping_state_name || header.billing_state_name,
		header.india_gst,
	);

	return {
		id: raw.inward_dtl_id ? String(raw.inward_dtl_id) : `line-${index}`,
		po_no_formatted: raw.po_no_formatted ?? "",
		inward_dtl_id: raw.inward_dtl_id ?? 0,
		item_id: raw.item_id ?? 0,
		item_code: raw.item_code ?? "",
		full_item_code: raw.full_item_code ?? "",
		item_name: raw.item_name ?? "",
		item_grp_id: raw.item_grp_id ?? 0,
		item_grp_name: raw.item_grp_name ?? "",
		item_make_name: raw.item_make_name ?? "",
		accepted_item_make_name: raw.accepted_item_make_name ?? raw.item_make_name ?? "",
		uom_id: raw.uom_id ?? 0,
		uom_name: raw.uom_name ?? "",
		approved_qty: approvedQty,
		rejected_qty: raw.rejected_qty ?? 0,
		po_rate: raw.po_rate ?? raw.rate ?? 0,
		accepted_rate: acceptedRate,
		amount,
		discount_mode: discountMode,
		discount_value: discountValue,
		discount_amount: discountAmount,
		tax_percentage: taxPercentage,
		igst_amount: tax.igst,
		cgst_amount: tax.cgst,
		sgst_amount: tax.sgst,
		tax_amount: tax.total,
		total_amount: amount + tax.total,
		remarks: raw.remarks ?? "",
		warehouse_id: raw.warehouse_id ?? null,
		warehouse_name: raw.warehouse_name ?? "",
		warehouse_path: raw.warehouse_path ?? raw.warehouse_name ?? "",
		hsn_code: raw.hsn_code ?? "",
	};
};

/**
 * Maps array of raw line items to normalized SRLineItem array.
 */
export const mapSRLineItems = (
	rawItems: SRLineItemRaw[] | null | undefined,
	header: SRHeader,
): SRLineItem[] => {
	if (!rawItems || !Array.isArray(rawItems)) return [];
	return rawItems.map((item, index) => mapSRLineItem(item, index, header));
};
