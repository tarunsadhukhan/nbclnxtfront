/**
 * @file gateEntryConstants.ts
 * @description Constants for Jute Gate Entry module.
 */

import type { BranchRecord, SupplierRecord, MukamRecord, JuteItemRecord, OpenPORecord, Option } from "../types/MaterialInspectionTypes";

// =============================================================================
// STATUS CONSTANTS
// =============================================================================

// Note: status_id remains in draft/IN state throughout the gate entry flow.
// The out_time field is used to restrict further editing in gate entry pages.
// For material inspection, qc_complete (qc_check flag) determines if QC is done.
export const GATE_ENTRY_STATUS_IDS = {
	IN: 1,
	// OUT: 5, // Not used - out_time presence determines OUT state
} as const;

export const GATE_ENTRY_STATUS_LABELS: Record<number, string> = {
	[GATE_ENTRY_STATUS_IDS.IN]: "IN",
	// 5: "OUT", // Not used - out_time presence determines OUT state
};

// =============================================================================
// EMPTY ARRAYS (frozen to prevent mutations)
// =============================================================================

export const EMPTY_BRANCHES: ReadonlyArray<BranchRecord> = Object.freeze([]);
export const EMPTY_SUPPLIERS: ReadonlyArray<SupplierRecord> = Object.freeze([]);
export const EMPTY_MUKAMS: ReadonlyArray<MukamRecord> = Object.freeze([]);
export const EMPTY_JUTE_ITEMS: ReadonlyArray<JuteItemRecord> = Object.freeze([]);
export const EMPTY_OPEN_POS: ReadonlyArray<OpenPORecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);

// =============================================================================
// UOM OPTIONS
// =============================================================================

export const UOM_OPTIONS: Option[] = [
	{ value: "LOOSE", label: "Loose" },
	{ value: "BALE", label: "Bale" },
];
