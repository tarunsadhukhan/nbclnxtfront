import type { AdditionalChargeRow } from "../components/AdditionalChargesSection";

type LineForTotals = {
	amount?: number;
	taxAmount?: number;
};

export type SalesOrderTotals = {
	grossAmount: number;
	totalTax: number;
	freightCharges: number;
	additionalChargesTotal: number;
	netAmount: number;
};

type ComputeTotalsInput = {
	lineItems: ReadonlyArray<LineForTotals>;
	additionalCharges: ReadonlyArray<Pick<AdditionalChargeRow, "netAmount" | "gst">>;
	freightCharges: number;
};

/**
 * Aggregate sales order totals.
 *
 * Line `amount` is pre-tax net. `totalTax` includes GST from both line items
 * and additional charges. `additionalChargesTotal` is the pre-tax net of
 * additional charges (their GST is folded into `totalTax`), so
 * `netAmount = grossAmount + totalTax + freightCharges + additionalChargesTotal`
 * sums every component exactly once.
 */
export function computeSalesOrderTotals({
	lineItems,
	additionalCharges,
	freightCharges,
}: ComputeTotalsInput): SalesOrderTotals {
	const grossAmount = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);
	const lineItemsTax = lineItems.reduce((sum, li) => sum + (li.taxAmount ?? 0), 0);

	const additionalChargesNet = additionalCharges.reduce(
		(sum, c) => sum + (parseFloat(c.netAmount) || 0),
		0,
	);
	const additionalChargesTax = additionalCharges.reduce(
		(sum, c) => sum + (c.gst?.gstTotal ?? 0),
		0,
	);

	const totalTax = lineItemsTax + additionalChargesTax;
	const freight = Number(freightCharges) || 0;
	const netAmount = grossAmount + totalTax + freight + additionalChargesNet;

	return {
		grossAmount,
		totalTax,
		freightCharges: freight,
		additionalChargesTotal: additionalChargesNet,
		netAmount,
	};
}
