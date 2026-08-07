/**
 * @file gateEntryTypes.ts
 * @description Type definitions for Jute Gate Entry module.
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

export type MuiFormMode = "create" | "edit" | "view";

export type Option = { label: string; value: string };

// =============================================================================
// RECORD TYPES
// =============================================================================

export type BranchRecord = {
	branch_id: number;
	branch_name: string;
};

export type SupplierRecord = {
	supplier_id: number;
	supplier_name: string;
};

export type PartyRecord = {
	party_id: number;
	party_name: string;
};

export type MukamRecord = {
	mukam_id: number;
	mukam_name: string;
};

export type JuteItemRecord = {
	item_grp_id: number;
	item_grp_desc: string;
	parent_grp_id?: number;
	parent_grp_name?: string;
};

export type JuteQualityRecord = {
	item_id: number; // item_mst.item_id — quality IS an item; quality_id naming retired
	quality_name: string;
	item_grp_id: number;
};

export type OpenPORecord = {
	jute_po_id: number;
	po_num: string;
	po_date: string;
	branch_id?: number;
	supplier_id?: number;
	supplier_name?: string;
	mukam_name?: string;
	total_weight?: number;
	jute_uom?: string;
};

export type VehicleTypeRecord = {
	vehicle_type_id: number;
	vehicle_type: string;
	capacity_weight?: number;
};

// =============================================================================
// SETUP DATA
// =============================================================================

export type GateEntrySetupData = {
	branches: BranchRecord[];
	mukams: MukamRecord[];
	suppliers: SupplierRecord[];
	jute_items: JuteItemRecord[];
	open_pos: OpenPORecord[];
	uom_options: Option[];
	vehicle_types: VehicleTypeRecord[];
};

// =============================================================================
// FORM VALUES
// =============================================================================

export type GateEntryFormValues = {
	branch: string;
	entryDate: string;
	entryTime: string;
	challanNo: string;
	challanDate: string;
	vehicleNo: string;
	vehicleType: string;
	driverName: string;
	transporter: string;
	poId: string;
	juteUom: string;
	mukam: string;
	supplier: string;
	party: string;
	grossWeight: string;
	tareWeight: string;
	challanWeight: string;
	netWeight: string;
	variableShortage: string;
	actualWeight: string;
	marketingSlip: boolean;
	remarks: string;
	outDate: string;
	outTime: string;
};

// =============================================================================
// LINE ITEM TYPES
// =============================================================================

export type GateEntryLineItem = {
	id: string;
	jute_mr_li_id: number | null;  // Database ID from jute_mr_li table (null for new lines)
	jutePoLiId: string;  // Reference to PO line item (empty if no PO)
	challanItem: string;
	challanQuality: string;
	challanQty: string;
	challanWeight: string;
	actualItem: string;
	actualQuality: string;
	actualQty: string;
	actualWeight: string;
	juteUom: string;  // Per-line UOM (e.g. "LOOSE", "BALE")
	allowableMoisture: string;  // From PO or manually entered
	remarks: string;
	// Moisture reading fields for QC
	moistureReadings: number[];  // Array of individual moisture readings
	averageMoisture: number | null;  // Calculated average of readings
};

// Moisture reading state for tracking per line item
export type MoistureReadingState = {
	lineItemId: string;
	readings: number[];
	average: number | null;
};

// =============================================================================
// DETAILS (from API)
// =============================================================================

export type GateEntryDetails = {
	jute_gate_entry_id: number;
	entry_branch_seq: number | null;
	branch_id: number;
	branch_name: string;
	jute_gate_entry_date: string;
	in_time: string;
	out_date: string | null;
	out_time: string | null;
	challan_no: string;
	challan_date: string;
	challan_weight: number;
	vehicle_no: string;
	driver_name: string;
	transporter: string;
	po_id: number | null;
	po_num: string | null;
	jute_supplier_id: number;
	supplier_name: string;
	party_id: number | null;
	party_name: string | null;
	mukam_id: number | null;
	mukam: string;
	jute_uom: string;
	gross_weight: number;
	tare_weight: number;
	net_weight: number;
	variable_shortage: number | null;
	actual_weight: number;
	vehicle_type_id: number | null;
	marketing_slip: number | null;
	remarks: string | null;
	status_id: number;
	status: string;
	line_items: GateEntryLineItemAPI[];
};

export type GateEntryLineItemAPI = {
	jute_mr_li_id: number;  // Line item ID from jute_mr_li table
	jute_mr_id: number;  // Parent jute_mr ID
	jute_po_li_id: number | null;
	challan_item_grp_id: number | null;
	challan_group_name: string | null;
	challan_item_id: number | null;
	challan_quality_name: string | null;
	challan_quantity: number | null;
	challan_weight: number | null;
	actual_item_grp_id: number | null;
	actual_group_name: string | null;
	actual_item_id: number | null;  // item_mst.item_id — quality IS an item; quality_id naming is being retired
	actual_quality_name: string | null;
	actual_qty: number | null;  // Backend returns actual_qty (not actual_quantity)
	actual_weight: number | null;
	allowable_moisture: number | null;
	unit_conversion: string | null;  // Backend returns unit_conversion (not jute_uom)
	remarks: string | null;
	moisture_readings?: { moisture_percentage: number }[] | null;  // Persisted QC readings from jute_moisture_rdg
};

// =============================================================================
// PO DETAILS FOR AUTO-FILL
// =============================================================================

export type PODetailsForGateEntry = {
	jute_po_id: number;
	po_num: string;
	po_date: string;
	supplier_id: number;
	supplier_name: string;
	party_id: number | null;
	party_name: string | null;
	mukam_id: number | null;
	mukam_name: string | null;
	jute_uom: string;
	branch_id: number;
	line_items: POLineItemForGateEntry[];
};

export type POLineItemForGateEntry = {
	jute_po_li_id: number;
	item_grp_id: number | null;
	jute_group_name: string | null;
	item_id: number | null;  // jute_po_li.item_id — quality IS an item; quality_id naming retired
	quality_name: string | null;
	quantity: number | null;
	jute_uom: string | null;
	allowable_moisture: number | null;
};

// =============================================================================
// STATUS CONSTANTS
// =============================================================================

// Note: status_id remains in draft/IN state throughout the gate entry flow.
// The out_time field is used to restrict further editing in gate entry pages.
// For material inspection, qc_complete (qc_check flag) determines if QC is done.
export const GATE_ENTRY_STATUS = {
	IN: 1, // Vehicle entered
	// OUT: 5, // Not used - out_time presence determines OUT state
} as const;

export type GateEntryStatusId = (typeof GATE_ENTRY_STATUS)[keyof typeof GATE_ENTRY_STATUS];
