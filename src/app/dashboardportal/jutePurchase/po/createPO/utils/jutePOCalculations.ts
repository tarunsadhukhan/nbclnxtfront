/**
 * Calculation functions for Jute Purchase Order.
 * Handles weight and amount calculations based on unit type.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Weight per bale in kg */
export const WEIGHT_PER_BALE_KG = 150;
/** Weight per bale in quintals */
export const WEIGHT_PER_BALE_QTL = 1.5;

/** Weight per loose unit in kg */
export const WEIGHT_PER_LOOSE_KG = 48;
/** Weight per loose unit in quintals */
export const WEIGHT_PER_LOOSE_QTL = 0.48;

/** Allowed variance percentage for vehicle weight validation */
export const VEHICLE_WEIGHT_TOLERANCE_PERCENT = 5;

// =============================================================================
// WEIGHT CALCULATION
// =============================================================================

/**
 * Calculate weight based on unit type (LOOSE or BALE).
 * 
 * For BALE: weight = 1.5 quintals (150 kg) per bale
 * For LOOSE: weight = 0.48 quintals (48 kg) per unit
 * 
 * @param quantity - The quantity value (number of bales or loose units)
 * @param _vehicleCapacityWeight - (Unused) Kept for API compatibility
 * @param _vehicleQty - (Unused) Kept for API compatibility
 * @param unitType - "LOOSE" or "BALE"
 * @returns Calculated weight in quintals
 */
export const calculateWeight = (
  quantity: number,
  _vehicleCapacityWeight: number,
  _vehicleQty: number,
  unitType: "LOOSE" | "BALE" | string
): number => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  if (unitType === "BALE") {
    // 1.5 quintals (150 kg) per bale
    return WEIGHT_PER_BALE_QTL * quantity;
  }

  // LOOSE: 0.48 quintals (48 kg) per unit
  return WEIGHT_PER_LOOSE_QTL * quantity;
};

// =============================================================================
// VEHICLE WEIGHT VALIDATION
// =============================================================================

export type VehicleWeightValidation = {
  isValid: boolean;
  totalLineWeight: number;
  expectedVehicleWeight: number;
  variancePercent: number;
  message: string;
};

/**
 * Validate that total line item weight is within ±5% of vehicle capacity.
 * 
 * @param totalLineWeight - Total weight of all line items in quintals
 * @param vehicleCapacityQtl - Weight capacity of one vehicle in quintals
 * @param vehicleQty - Number of vehicles
 * @returns Validation result with details
 */
export const validateVehicleWeight = (
  totalLineWeight: number,
  vehicleCapacityQtl: number,
  vehicleQty: number
): VehicleWeightValidation => {
  const expectedVehicleWeight = vehicleCapacityQtl * vehicleQty;
  
  if (expectedVehicleWeight <= 0) {
    return {
      isValid: false,
      totalLineWeight,
      expectedVehicleWeight,
      variancePercent: 0,
      message: "Vehicle capacity not configured",
    };
  }

  if (totalLineWeight <= 0) {
    return {
      isValid: false,
      totalLineWeight,
      expectedVehicleWeight,
      variancePercent: 0,
      message: "No line items with weight",
    };
  }

  const variance = totalLineWeight - expectedVehicleWeight;
  const variancePercent = (variance / expectedVehicleWeight) * 100;
  const absVariancePercent = Math.abs(variancePercent);

  const isValid = absVariancePercent <= VEHICLE_WEIGHT_TOLERANCE_PERCENT;

  let message = "";
  if (!isValid) {
    const direction = variancePercent > 0 ? "exceeds" : "is below";
    message = `Total weight (${totalLineWeight.toFixed(2)} Qtl) ${direction} vehicle capacity (${expectedVehicleWeight.toFixed(2)} Qtl) by ${absVariancePercent.toFixed(1)}%. Must be within ±${VEHICLE_WEIGHT_TOLERANCE_PERCENT}%.`;
  }

  return {
    isValid,
    totalLineWeight,
    expectedVehicleWeight,
    variancePercent,
    message,
  };
};

// =============================================================================
// PERCENTAGE-BASED CALCULATIONS
// =============================================================================

export const calculateWeightFromPercentage = (
  percentage: number,
  vehicleCapacityQtl: number,
  vehicleQty: number,
): number => {
  if (!percentage || !vehicleCapacityQtl || !vehicleQty) return 0;
  return (percentage / 100) * vehicleCapacityQtl * vehicleQty;
};

export const calculateQuantityFromWeight = (
  weightQtl: number,
  juteUnit: "BALE" | "LOOSE" | string,
): number => {
  const perUnit = juteUnit === "BALE" ? WEIGHT_PER_BALE_QTL : WEIGHT_PER_LOOSE_QTL;
  return perUnit > 0 ? weightQtl / perUnit : 0;
};

export const validatePercentageSum = (
  lineItems: Array<{ percentage: string; itemId?: string }>,
  epsilon = 0.01,
): { valid: boolean; sum: number; message: string } => {
  const relevant = lineItems.filter((li) => li.itemId);
  const sum = relevant.reduce((acc, li) => acc + (Number(li.percentage) || 0), 0);
  const valid = Math.abs(sum - 100) <= epsilon;
  return {
    valid,
    sum,
    message: valid ? "" : `Line item percentages must sum to 100 (got ${sum.toFixed(2)})`,
  };
};

// =============================================================================
// AMOUNT CALCULATION
// =============================================================================

/**
 * Calculate line item amount.
 * 
 * @param weight - Calculated weight
 * @param rate - Rate per unit weight
 * @returns Calculated amount (weight * rate)
 */
export const calculateAmount = (weight: number, rate: number): number => {
  if (!Number.isFinite(weight) || !Number.isFinite(rate)) {
    return 0;
  }
  return weight * rate;
};

// =============================================================================
// EXPECTED DATE CALCULATION
// =============================================================================

/**
 * Calculate expected delivery date.
 * 
 * @param poDate - PO date string (YYYY-MM-DD)
 * @param deliveryTimeline - Number of days for delivery
 * @returns Expected date string (YYYY-MM-DD)
 */
export const calculateExpectedDate = (
  poDate: string,
  deliveryTimeline: number
): string => {
  if (!poDate || !Number.isFinite(deliveryTimeline) || deliveryTimeline <= 0) {
    return "";
  }

  try {
    const date = new Date(poDate);
    if (isNaN(date.getTime())) {
      return "";
    }

    date.setDate(date.getDate() + deliveryTimeline);
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

// =============================================================================
// TOTALS CALCULATION
// =============================================================================

/**
 * Calculate totals for all line items.
 * 
 * @param lineItems - Array of line items with weight and amount
 * @returns Object with totalWeight, totalAmount, and validLineCount
 */
export const calculateTotals = (
  lineItems: Array<{ weight: string; amount: string; itemId?: string; quantity?: string }>
): { totalWeight: number; totalAmount: number; validLineCount: number } => {
  let totalWeight = 0;
  let totalAmount = 0;
  let validLineCount = 0;

  for (const line of lineItems) {
    const weight = Number(line.weight);
    const amount = Number(line.amount);
    const qty = Number(line.quantity);

    if (Number.isFinite(weight) && weight > 0) {
      totalWeight += weight;
    }
    if (Number.isFinite(amount) && amount > 0) {
      totalAmount += amount;
    }
    if (line.itemId && Number.isFinite(qty) && qty > 0) {
      validLineCount += 1;
    }
  }

  return { totalWeight, totalAmount, validLineCount };
};

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format a number to a fixed decimal string.
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(decimals);
};

/**
 * Format a number as currency (INR).
 * 
 * @param value - Number to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "₹0.00";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
};

/**
 * Format weight value.
 * @param value - Weight in quintals
 * @returns Formatted weight string
 */
export const formatWeight = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.00";
  }
  return value.toFixed(2);
};

/**
 * Format amount value.
 * @param value - Amount
 * @returns Formatted amount string
 */
export const formatAmount = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.00";
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format date string.
 * @param dateStr - ISO date string
 * @returns Formatted date (DD/MM/YYYY)
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};
