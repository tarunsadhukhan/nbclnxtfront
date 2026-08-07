/**
 * @file mrTypes.ts
 * @description Type definitions for Jute Material Receipt (MR) module.
 */

import type { ApprovalActionPermissions } from "@/components/ui/transaction";

export type MuiFormMode = "create" | "edit" | "view";

// Header from /juteMR/get_mr_by_id
export type JuteMRHeader = {
	jute_mr_id: number;
	branch_mr_no: number | null;
	mr_num: string | null;
	jute_mr_date: string;
	branch_id: number;
	branch_name: string;
	jute_supplier_id: number | null;
	supplier_name: string | null;
	party_id: string | null;
	party_name: string | null;
	party_branch_id: number | null;
	party_branch_name: string | null;
	party_address: string | null;
	party_gst_no: string | null;
	po_id: number | null;
	po_no: number | null;
	po_num: string | null;
	po_date: string | null;
	challan_no: string | null;
	challan_date: string | null;
	mukam_id: number | null;
	mukam: string | null;
	vehicle_no: string | null;
	unit_conversion: string | null;
	actual_weight: number | null;
	mr_weight: number | null;
	remarks: string | null;
	status_id: number | null;
	status: string | null;
	src_com_id: number | null;
	jute_gate_entry_date: string | null;
	updated_by: number | null;
	updated_date_time: string | null;
	co_name: string | null;
	co_logo: string | null;
	co_address1: string | null;
	co_address2: string | null;
	co_zipcode: number | null;
	// Approval-hierarchy fields populated by get_mr_by_id when a menu_id is
	// supplied. Drive level-aware action buttons: Approve/Reject follow
	// `permissions` (current-level approver only); the frontend shows Pending
	// only at the highest level (canApprove AND approval_level === max_approval_level).
	approval_level?: number | null;
	max_approval_level?: number | null;
	permissions?: ApprovalActionPermissions;
};

// Party branch option type
export type PartyBranchOption = {
	party_mst_branch_id: number;
	party_id: number;
	address: string | null;
	gst_no: string | null;
	party_name: string | null;
	display: string;
};

// Line item from get_jute_mr_line_items_query
export type JuteMRLineItemAPI = {
	jute_mr_li_id: number;
	jute_mr_id: number;
	jute_po_li_id: number | null;
	actual_item_grp_id: number | null;
	actual_group_name: string | null;
	actual_item_id: number | null;
	actual_quality_name: string | null;
	actual_qty: number | null;
	challan_weight: number | null;
	actual_weight: number | null;
	allowable_moisture: number | null;
	actual_moisture: string | null;
	claim_dust: number | null;
	shortage_kgs: number | null;
	accepted_weight: number | null;
	rate: number | null;
	po_rate: number | null;
	claim_rate: number | null;
	claim_quality: string | null;
	water_damage_amount: number | null;
	premium_amount: number | null;
	remarks: string | null;
	status: string | null;
	active: number | null;
	warehouse_id: number | null;
	warehouse_path: string | null;
	unit_conversion: string | null;
};

// UI line item type used in the MR page
export type MRLineItem = {
	id: string;
	juteMrLiId: number;
	actualItemId: number | null;
	actualItemName: string;
	actualQualityId: number | null;
	actualQualityName: string;
	actualQty: number | null;
	challanWeight: number | null;
	actualWeight: number | null;
	allowableMoisture: number | null;
	actualMoisture: number | null;
	claimDust: number | null;
	shortageKgs: number | null;
	acceptedWeight: number | null;
	rate: number | null;
	claimRate: number | null;
	claimQuality: string | null;
	waterDamageAmount: number | null;
	premiumAmount: number | null;
	remarks: string | null;
	warehouseId: number | null;
	warehousePath: string | null;
	unitConversion: string | null;
};
