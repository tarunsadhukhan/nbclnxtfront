/**
 * @file gateEntryCalculations.ts
 * @description Calculation functions for Jute Gate Entry.
 */

import type { GateEntryLineItem } from "../types/MaterialInspectionTypes";

/**
 * Calculate net weight from gross and tare weights.
 */
export const calculateNetWeight = (grossWeight: number, tareWeight: number): number => {
	const net = grossWeight - tareWeight;
	return Math.max(0, net);
};

/**
 * Calculate actual weight from net weight and variable shortage.
 * actual_weight = net_weight - variable_shortage
 */
export const calculateActualWeight = (netWeight: number, variableShortage: number): number => {
	const actual = netWeight - variableShortage;
	return Math.max(0, actual);
};

/**
 * Calculate challan weight for a line item based on proportion.
 * Formula: (header challan weight / total challan qty) * line challan qty
 */
export const calculateChallanWeight = (
	headerChallanWeight: number,
	totalChallanQty: number,
	lineChallanQty: number
): number => {
	if (!totalChallanQty || totalChallanQty === 0) return 0;
	return (headerChallanWeight / totalChallanQty) * lineChallanQty;
};

/**
 * Calculate line item actual weight based on proportion of header actual weight.
 * Uses header actual_weight (net - variable_shortage) and actual qty proportions.
 */
export const calculateLineActualWeight = (
	headerActualWeight: number,
	totalActualQty: number,
	lineActualQty: number
): number => {
	if (!totalActualQty || totalActualQty === 0) return 0;
	return (headerActualWeight / totalActualQty) * lineActualQty;
};

/**
 * Get total challan quantity from all line items.
 */
export const getTotalChallanQty = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.challanQty) || 0), 0);

/**
 * Get total actual quantity from all line items.
 */
export const getTotalActualQty = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.actualQty) || 0), 0);

/**
 * Get total challan weight from all line items.
 */
export const getTotalChallanWeight = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.challanWeight) || 0), 0);

/**
 * Get total actual weight from all line items.
 */
export const getTotalActualWeight = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.actualWeight) || 0), 0);

/**
 * Recalculate all line item weights based on header values and quantities.
 * Line item actual weight is based on header actual_weight (net - variable_shortage)
 * distributed proportionally by actual quantity.
 */
export const recalculateLineItemWeights = (
	lineItems: GateEntryLineItem[],
	headerChallanWeight: number,
	headerActualWeight: number
): GateEntryLineItem[] => {
	const totalChallanQty = getTotalChallanQty(lineItems);
	const totalActualQty = getTotalActualQty(lineItems);

	return lineItems.map((li, index) => {
		const lineChallanQty = parseFloat(li.challanQty) || 0;
		const lineActualQty = parseFloat(li.actualQty) || 0;

		let challanWeightValue = "";
		if (totalChallanQty > 0) {
			if (lineChallanQty > 0) {
				challanWeightValue = String(calculateChallanWeight(headerChallanWeight, totalChallanQty, lineChallanQty).toFixed(2));
			}
		} else if (index === 0 && lineItems.length === 1 && headerChallanWeight > 0) {
			// If only one line exists and no qty yet, assign full weight
			challanWeightValue = String(headerChallanWeight.toFixed(2));
		}

		let actualWeightValue = "";
		if (totalActualQty > 0) {
			if (lineActualQty > 0) {
				actualWeightValue = String(Math.round(calculateLineActualWeight(headerActualWeight, totalActualQty, lineActualQty)));
			}
		} else if (index === 0 && lineItems.length === 1 && headerActualWeight > 0) {
			// If only one line exists and no qty yet, assign full weight
			actualWeightValue = String(Math.round(headerActualWeight));
		}

		return {
			...li,
			challanWeight: challanWeightValue,
			actualWeight: actualWeightValue,
		};
	});
};

/**
 * Calculate line item totals summary.
 */
export const calculateLineItemTotals = (lineItems: GateEntryLineItem[]) => ({
	totalChallanQty: getTotalChallanQty(lineItems),
	totalChallanWeight: getTotalChallanWeight(lineItems),
	totalActualQty: getTotalActualQty(lineItems),
	totalActualWeight: getTotalActualWeight(lineItems),
	validLineCount: lineItems.filter((li) => li.challanItem || li.actualItem).length,
});
