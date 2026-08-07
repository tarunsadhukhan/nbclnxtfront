// Shared Hessian (invoice_type_id = 2) computation utility.
// MIRROR CONTRACT: keep in lockstep with vowerp3be/src/sales/hessian_calculations.py.
// Any change to formulas or rounding here MUST be applied there too.

export type HessianComputedFields = {
	qtyMt: number;
	ratePerBale: number;
	billingRateMt: number;
	billingRateBale: number;
};

const roundTo = (n: number, decimals: number): number => {
	const p = 10 ** decimals;
	return Math.round(n * p) / p;
};

/**
 * @param qtyBales     User-entered quantity in bales
 * @param rawRateMt    Pre-brokerage rate per MT
 * @param convFactor   Bales per MT from uom_item_map_mst.relation_value
 * @param brokeragePct Broker commission percent from header (e.g. 1.5 = 1.5%)
 * @param qtyRounding  Decimals for qtyMt (default 3; Sales Order passes 4 for legacy parity)
 * @param rateRounding Decimals for billing rate (post-brokerage) from item_mst.rate_rounding (default 2)
 */
export function computeHessianFields(
	qtyBales: number,
	rawRateMt: number,
	convFactor: number,
	brokeragePct: number,
	qtyRounding: number = 3,
	rateRounding: number = 2,
): HessianComputedFields {
	const qtyMt = convFactor > 0 ? qtyBales / convFactor : 0;
	const ratePerBale = convFactor > 0 ? rawRateMt / convFactor : 0;
	const billingRateMt = rawRateMt - (rawRateMt * brokeragePct) / 100;
	const billingRateBale = convFactor > 0 ? billingRateMt / convFactor : 0;
	return {
		qtyMt: roundTo(qtyMt, qtyRounding),
		ratePerBale: roundTo(ratePerBale, 2),
		billingRateMt: roundTo(billingRateMt, rateRounding),
		billingRateBale: roundTo(billingRateBale, rateRounding),
	};
}
