/**
 * Type definitions for Jute Purchase Order transaction page.
 * Includes form values, line items, master data records, and API response types.
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

export type Option = { label: string; value: string };

export type MuiFormMode = "create" | "edit" | "view";

// =============================================================================
// MASTER DATA RECORD TYPES
// =============================================================================

export type BranchRecord = {
  branch_id: number;
  branch_name: string;
  branch_code?: string;
};

export type MukamRecord = {
  mukam_id: number;
  mukam_name: string;
  mukam_code?: string;
};

export type VehicleTypeRecord = {
  vehicle_type_id: number;
  vehicle_type: string;
  capacity_weight: number; // Weight capacity in quintals
};

export type JuteSupplierRecord = {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  mukam_id?: number;
};

export type JutePartyRecord = {
  party_map_id: number;
  supplier_id: number;
  party_id: number;
  party_name: string;
};

export type JuteItemRecord = {
  item_id: number;
  item_code: string;
  item_desc: string;
  item_grp_id?: number;
  item_grp_desc?: string;
  default_uom_id?: number;
  default_uom?: string;
};

export type JuteQualityRecord = {
  item_id: number; // item_mst.item_id — quality IS an item; quality_id naming retired
  quality_name: string;
  item_grp_id: number;
};

// =============================================================================
// STATIC OPTION TYPES
// =============================================================================

export type ChannelOption = {
  value: string;
  label: string;
};

export type UnitOption = {
  value: "LOOSE" | "BALE";
  label: string;
};

export type CropYearOption = {
  value: string;
  label: string;
};

// =============================================================================
// LINE ITEM TYPES
// =============================================================================

export type JutePOLineItem = {
  id: string; // Client-side unique ID
  itemId: string;
  itemName?: string; // Display name (from API or resolved)
  quality: string;
  qualityName?: string; // Display name (from API or resolved)
  cropYear: string;
  marka: string;
  percentage: string; // Share of total vehicle capacity (0-100)
  quantity: string;
  uom: string;
  rate: string;
  allowableMoisture: string;
  weight: string; // Calculated, read-only
  amount: string; // Calculated, read-only
};

// =============================================================================
// FORM VALUES TYPE
// =============================================================================

export type JutePOFormValues = {
  branch: string;
  withWithoutIndent: string; // "WITH" or "WITHOUT" - disabled for now
  indentNo: string; // Disabled for now
  poDate: string;
  mukam: string;
  juteUnit: string; // "LOOSE" or "BALE"
  supplier: string;
  partyName: string; // Optional, only shows after supplier selected
  vehicleType: string;
  vehicleQty: string;
  channelType: string;
  creditTerm: string;
  deliveryTimeline: string;
  expectedDate: string; // Auto-calculated: poDate + deliveryTimeline
  freightCharge: string;
  remarks: string;
};

// =============================================================================
// SETUP DATA TYPE (API Response)
// =============================================================================

export type JutePOSetupData = {
  branches: BranchRecord[];
  mukams: MukamRecord[];
  vehicle_types: VehicleTypeRecord[];
  jute_items: JuteItemRecord[];
  suppliers: JuteSupplierRecord[]; // All suppliers for the company
  channel_options: ChannelOption[];
  unit_options: UnitOption[];
  crop_year_options: CropYearOption[];
};

// =============================================================================
// PO DETAILS TYPE (API Response for edit/view)
// =============================================================================

export type JutePODetails = {
  jute_po_id: number;
  po_num: string;
  po_date: string;
  branch_id: number;
  mukam_id: number;
  mukam?: string;
  jute_unit: string;
  supplier_id: number;
  supp_code: string;
  supplier_name?: string;
  party_id?: number;
  vehicle_type_id: number;
  vehicle_capacity?: number; // From jute_lorry_mst.weight
  vehicle_qty: number;
  channel_code: string;
  credit_term?: string;
  delivery_timeline?: string;
  frieght_charge?: number;
  remarks?: string;
  status_id: number;
  status?: string;
  weight?: number;
  po_val_wo_tax?: number;
  created_by?: number;
  updated_date_time?: string;
  line_items?: JutePOLineItemDetails[];
};

export type JutePOLineItemDetails = {
  jute_po_li_id: number;
  jute_po_id: number;
  item_grp_id: number;
  jute_group_name?: string;
  item_id?: number;
  quality_name?: string;
  crop_year?: number;
  marka?: string;
  quantity: number;
  uom?: string;
  rate: number;
  allowable_moisture?: number;
  weight: number;
  amount: number;
  percentage?: number | null;
};

// =============================================================================
// APPROVAL TYPES
// =============================================================================

export type ApprovalStatusId = 21 | 1 | 20 | 3 | 4 | 5 | 6;

export type ApprovalActionPermissions = {
  canSave?: boolean;
  canOpen?: boolean;
  canCancelDraft?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canReopen?: boolean;
  canClone?: boolean;
  canViewApprovalLog?: boolean;
};

export type ApprovalInfo = {
  statusId: ApprovalStatusId;
  statusLabel: string;
  statusColor: "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
};

// =============================================================================
// LABEL RESOLVERS TYPE
// =============================================================================

export type JutePOLabelResolvers = {
  branch: (id: string) => string;
  mukam: (id: string) => string;
  supplier: (id: string) => string;
  party: (id: string) => string;
  vehicleType: (id: string) => string;
  item: (id: string) => string;
  quality: (itemGrpId: string, qualityId: string) => string;
};

// Alias for compatibility with transaction components
export type EditableLineItem = JutePOLineItem;

// Field type for form schema - must match muiform.tsx FieldType
export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "custom";

// Schema type for MuiForm
export type Schema = {
  fields: Array<{
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    disabled?: boolean;
    options?: Array<{ label: string; value: string }>;
    grid?: { xs?: number; sm?: number; md?: number; lg?: number };
  }>;
};

// =============================================================================
// QUALITY CACHE TYPE
// =============================================================================

export type QualityCacheEntry = {
  qualities: JuteQualityRecord[];
  qualityLabelById: Record<string, string>;
};
