/**
 * @file gateEntryFactories.ts
 * @description Factory functions for creating default values and blank items.
 */

import type { GateEntryFormValues, GateEntryLineItem } from "../types/MaterialInspectionTypes";

let lineIdSeed = 0;

/**
 * Generate a unique line ID.
 */
export const generateLineId = (): string => {
	lineIdSeed += 1;
	return `ge-line-${lineIdSeed}`;
};

/**
 * Create a blank line item for the gate entry.
 */
export const createBlankLine = (): GateEntryLineItem => ({
	id: generateLineId(),
	jute_mr_li_id: null,  // New lines don't have a database ID yet
	jutePoLiId: "",
	challanItem: "",
	challanQuality: "",
	challanQty: "",
	challanWeight: "",
	actualItem: "",
	actualQuality: "",
	actualQty: "",
	actualWeight: "",
	juteUom: "",
	allowableMoisture: "",
	remarks: "",
	moistureReadings: [],
	averageMoisture: null,
});

/**
 * Build default form values for create mode.
 */
export const buildDefaultFormValues = (): GateEntryFormValues => {
	const now = new Date();
	const dateStr = now.toISOString().slice(0, 10);
	const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

	return {
		branch: "",
		entryDate: dateStr,
		entryTime: timeStr,
		challanNo: "",
		challanDate: dateStr,
		vehicleNo: "",
		vehicleType: "",
		driverName: "",
		transporter: "",
		poId: "",
		juteUom: "LOOSE",
		mukam: "",
		supplier: "",
		party: "",
		grossWeight: "",
		tareWeight: "",
		challanWeight: "",
		netWeight: "",
		variableShortage: "",
		actualWeight: "",
		marketingSlip: false,
		remarks: "",
		outDate: "",
		outTime: "",
	};
};

/**
 * Check if a line item has any user-entered data.
 */
export const lineHasAnyData = (line: GateEntryLineItem): boolean =>
	Boolean(
		// A persisted row is never "blank" — useLineItems prunes trailing blank
		// rows, and pruning a DB row would drop it from the save payload, which
		// the backend reconcile then deactivates
		line.jute_mr_li_id ||
			line.challanItem ||
			line.challanQuality ||
			line.challanQty ||
			line.challanWeight ||
			line.actualItem ||
			line.actualQuality ||
			line.actualQty ||
			line.actualWeight ||
			line.allowableMoisture ||
			(line.moistureReadings?.length ?? 0) > 0 ||
			line.remarks
	);

/**
 * Check if a line item is complete (has required fields).
 */
export const lineIsComplete = (line: GateEntryLineItem): boolean => {
	const challanQty = Number(line.challanQty);
	return Boolean(line.challanItem && line.challanQuality && Number.isFinite(challanQty) && challanQty > 0);
};
