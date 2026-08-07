/**
 * Factory functions for Jute Purchase Order.
 * Creates blank line items and default form values.
 */

import type { JutePOLineItem, JutePOFormValues } from "../types/jutePOTypes";

// =============================================================================
// LINE ITEM FACTORY
// =============================================================================

let lineIdSeed = 0;

/**
 * Generate a unique client-side ID for line items.
 */
export const generateLineId = (): string => {
  lineIdSeed += 1;
  return `jute-po-line-${lineIdSeed}`;
};

/**
 * Reset the line ID seed (useful for testing).
 */
export const resetLineIdSeed = (): void => {
  lineIdSeed = 0;
};

/**
 * Create a blank Jute PO line item.
 */
export const createBlankLine = (): JutePOLineItem => ({
  id: generateLineId(),
  itemId: "",
  quality: "",
  cropYear: "",
  marka: "",
  percentage: "",
  quantity: "",
  uom: "",
  rate: "",
  allowableMoisture: "",
  weight: "",
  amount: "",
});

/**
 * Check if a line item has any data entered.
 */
export const lineHasAnyData = (line: JutePOLineItem): boolean =>
  Boolean(
    line.itemId ||
    line.quality ||
    line.quantity ||
    line.percentage ||
    line.rate ||
    line.marka
  );

/**
 * Check if a line item is complete (has all required fields).
 */
export const lineIsComplete = (line: JutePOLineItem): boolean => {
  const qty = Number(line.quantity);
  const rate = Number(line.rate);
  return Boolean(
    line.itemId &&
    Number.isFinite(qty) && qty > 0 &&
    Number.isFinite(rate) && rate > 0
  );
};

// =============================================================================
// FORM VALUES FACTORY
// =============================================================================

/**
 * Build default form values for a new Jute PO.
 */
export const buildDefaultFormValues = (): JutePOFormValues => ({
  branch: "",
  withWithoutIndent: "WITHOUT", // Default to without indent
  indentNo: "",
  poDate: new Date().toISOString().slice(0, 10), // Today's date
  mukam: "",
  juteUnit: "LOOSE", // Default to loose
  supplier: "",
  partyName: "",
  vehicleType: "",
  vehicleQty: "",
  channelType: "",
  creditTerm: "",
  deliveryTimeline: "",
  expectedDate: "",
  freightCharge: "",
  remarks: "",
});
