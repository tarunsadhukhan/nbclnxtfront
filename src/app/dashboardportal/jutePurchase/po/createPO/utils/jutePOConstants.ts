/**
 * Constants for Jute Purchase Order transaction page.
 * Includes status IDs, static options, and empty array defaults.
 */

import type {
  ApprovalStatusId,
  BranchRecord,
  MukamRecord,
  VehicleTypeRecord,
  JuteSupplierRecord,
  JutePartyRecord,
  JuteItemRecord,
  JuteQualityRecord,
  Option,
  ChannelOption,
  UnitOption,
  CropYearOption,
} from "../types/jutePOTypes";

// =============================================================================
// STATUS IDS
// =============================================================================

export const JUTE_PO_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

export const JUTE_PO_STATUS_LABELS: Record<ApprovalStatusId, string> = {
  [JUTE_PO_STATUS_IDS.DRAFT]: "Draft",
  [JUTE_PO_STATUS_IDS.OPEN]: "Open",
  [JUTE_PO_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
  [JUTE_PO_STATUS_IDS.APPROVED]: "Approved",
  [JUTE_PO_STATUS_IDS.REJECTED]: "Rejected",
  [JUTE_PO_STATUS_IDS.CLOSED]: "Closed",
  [JUTE_PO_STATUS_IDS.CANCELLED]: "Cancelled",
};

export const JUTE_PO_STATUS_COLORS: Record<
  ApprovalStatusId,
  "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info"
> = {
  [JUTE_PO_STATUS_IDS.DRAFT]: "default",
  [JUTE_PO_STATUS_IDS.OPEN]: "primary",
  [JUTE_PO_STATUS_IDS.PENDING_APPROVAL]: "warning",
  [JUTE_PO_STATUS_IDS.APPROVED]: "success",
  [JUTE_PO_STATUS_IDS.REJECTED]: "error",
  [JUTE_PO_STATUS_IDS.CLOSED]: "info",
  [JUTE_PO_STATUS_IDS.CANCELLED]: "default",
};

// =============================================================================
// STATIC OPTIONS
// =============================================================================

export const CHANNEL_OPTIONS: ChannelOption[] = [
  { value: "DOMESTIC", label: "Domestic" },
  { value: "IMPORT", label: "Import" },
  { value: "JCI", label: "JCI" },
  { value: "PTF", label: "PTF" },
];

export const UNIT_OPTIONS: UnitOption[] = [
  { value: "LOOSE", label: "Loose" },
  { value: "BALE", label: "Bale" },
];

export const WITH_WITHOUT_OPTIONS: Option[] = [
  { value: "WITHOUT", label: "Without Indent" },
  { value: "WITH", label: "With Indent" },
];

/**
 * Generate crop year options dynamically.
 * Returns options like: 24-25, 25-26, 26-27, etc.
 */
export const generateCropYearOptions = (): CropYearOption[] => {
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
  const options: CropYearOption[] = [];
  
  for (let i = -1; i < 3; i++) {
    const startYear = currentYear + i - 1;
    const endYear = currentYear + i;
    const value = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    options.push({ value, label: value });
  }
  
  return options;
};

export const CROP_YEAR_OPTIONS: CropYearOption[] = generateCropYearOptions();

// =============================================================================
// EMPTY ARRAYS (Immutable defaults to prevent re-renders)
// =============================================================================

export const EMPTY_BRANCHES: ReadonlyArray<BranchRecord> = Object.freeze([]);
export const EMPTY_MUKAMS: ReadonlyArray<MukamRecord> = Object.freeze([]);
export const EMPTY_VEHICLE_TYPES: ReadonlyArray<VehicleTypeRecord> = Object.freeze([]);
export const EMPTY_SUPPLIERS: ReadonlyArray<JuteSupplierRecord> = Object.freeze([]);
export const EMPTY_PARTIES: ReadonlyArray<JutePartyRecord> = Object.freeze([]);
export const EMPTY_JUTE_ITEMS: ReadonlyArray<JuteItemRecord> = Object.freeze([]);
export const EMPTY_QUALITIES: ReadonlyArray<JuteQualityRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
