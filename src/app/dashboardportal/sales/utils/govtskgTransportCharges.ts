/**
 * Shared utility for computing Govt Sacking transport-mode-driven additional charges.
 * Used by both Sales Order and Sales Invoice pages.
 */

import type { AdditionalChargeRow } from "../salesOrder/createSalesOrder/components/AdditionalChargesSection";

export type TransportChargeRate = {
	id: number;
	mode_of_transport: string;
	additional_charges_id: number;
	rate_per_100pcs: number;
	co_id: number | null;
};

export type ChargeOption = {
	value: string;
	label: string;
	defaultValue?: number;
};

export const TRANSPORT_MODE_OPTIONS = [
	{ value: "CONCOR", label: "CONCOR" },
	{ value: "RAIL", label: "RAIL" },
	{ value: "ROAD", label: "ROAD" },
] as const;

const PRINTING_CHARGES_ID = "7";
const HANDLING_CHARGES_ID = "6";

let nextId = 1;
const genId = () => `transport_charge_${Date.now()}_${nextId++}`;

/**
 * Calculate GST split based on billing/shipping state comparison.
 * Same state -> CGST + SGST (split 50/50), different state -> IGST.
 */
function calculateChargeGst(
	netAmount: number,
	taxPct: number,
	billingToState: string | undefined,
	shippingToState: string | undefined,
): AdditionalChargeRow["gst"] {
	if (!taxPct || taxPct <= 0 || !netAmount) {
		return { igstAmount: 0, igstPercent: 0, cgstAmount: 0, cgstPercent: 0, sgstAmount: 0, sgstPercent: 0, gstTotal: 0 };
	}

	const taxAmount = (netAmount * taxPct) / 100;

	if (billingToState && shippingToState && billingToState === shippingToState) {
		const halfTax = Number((taxAmount / 2).toFixed(2));
		const halfPct = Number((taxPct / 2).toFixed(2));
		return {
			igstAmount: 0,
			igstPercent: 0,
			cgstAmount: halfTax,
			cgstPercent: halfPct,
			sgstAmount: halfTax,
			sgstPercent: halfPct,
			gstTotal: Number(taxAmount.toFixed(2)),
		};
	}

	return {
		igstAmount: Number(taxAmount.toFixed(2)),
		igstPercent: taxPct,
		cgstAmount: 0,
		cgstPercent: 0,
		sgstAmount: 0,
		sgstPercent: 0,
		gstTotal: Number(taxAmount.toFixed(2)),
	};
}

/**
 * Compute the additional charge rows that should exist for a given
 * transport mode and total line-item quantity.
 *
 * @param mode - Selected transport mode (CONCOR, RAIL, ROAD)
 * @param totalQty - Total quantity across all line items (in pieces)
 * @param rates - Transport charge rates from setup API
 * @param chargeOptions - Additional charges master for tax % lookup
 * @param lineTaxPct - Tax percentage from the line items to apply to these charges
 * @param billingToState - Billing-to party state name (for IGST vs CGST/SGST)
 * @param shippingToState - Shipping-to party state name
 * @returns Array of AdditionalChargeRow to upsert
 */
export function computeGovtskgTransportCharges(
	mode: string,
	totalQty: number,
	rates: TransportChargeRate[],
	chargeOptions: ChargeOption[],
	lineTaxPct?: number,
	billingToState?: string,
	shippingToState?: string,
): AdditionalChargeRow[] {
	if (!mode || totalQty <= 0 || !rates.length) return [];

	const modeRates = rates
		.filter((r) => r.mode_of_transport === mode)
		.sort((a, b) => b.additional_charges_id - a.additional_charges_id); // 7 (Printing) before 6 (Handling)
	const rows: AdditionalChargeRow[] = [];

	for (const mr of modeRates) {
		const chargeIdStr = String(mr.additional_charges_id);
		const option = chargeOptions.find((o) => o.value === chargeIdStr);
		const chargeName = option?.label ?? (chargeIdStr === PRINTING_CHARGES_ID ? "Printing Charges" : "2nd Handling Charges");
		const taxPctNum = lineTaxPct ?? (option?.defaultValue != null ? option.defaultValue : 0);
		const taxPct = String(taxPctNum);

		const netAmount = totalQty * mr.rate_per_100pcs;
		const gst = calculateChargeGst(netAmount, taxPctNum, billingToState, shippingToState);

		rows.push({
			id: genId(),
			additionalChargesId: chargeIdStr,
			chargeName,
			qty: String(totalQty),
			rate: String(mr.rate_per_100pcs),
			netAmount: netAmount.toFixed(2),
			remarks: "",
			taxPct,
			gst,
		});
	}

	return rows;
}

/**
 * Merge auto-computed transport charges into an existing additional charges array.
 * Upserts by additionalChargesId for transport-related charges (6, 7);
 * leaves other charges untouched.
 */
export function mergeTransportCharges(
	existing: AdditionalChargeRow[],
	computed: AdditionalChargeRow[],
	mode: string,
): AdditionalChargeRow[] {
	const transportChargeIds = new Set([PRINTING_CHARGES_ID, HANDLING_CHARGES_ID]);
	// Keep non-transport charges as-is
	const nonTransport = existing.filter((c) => !transportChargeIds.has(c.additionalChargesId));

	// For transport charges, use the computed rows (which already exclude
	// handling charges for ROAD mode since no rate row exists)
	return [...nonTransport, ...computed];
}

/**
 * Check if a charge row is a transport-auto-generated charge.
 */
export function isTransportCharge(chargeId: string): boolean {
	return chargeId === PRINTING_CHARGES_ID || chargeId === HANDLING_CHARGES_ID;
}
