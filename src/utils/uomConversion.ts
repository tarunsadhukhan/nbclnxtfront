/** UOM conversion record for a specific item. */
export type UomConversionEntry = {
	mapFromId: string;
	mapFromName: string;
	mapToId: string;
	mapToName: string;
	relationValue: number;
	rounding: number;
};

export type ConvertedRateResult = {
	convertedRate: string;
	otherUomName: string;
} | null;

export type ConvertedQtyResult = {
	convertedQty: string;
	otherUomName: string;
} | null;

/**
 * Compute the converted rate for the "other" UOM.
 * - If selected UOM = mapFromId: convertedRate = rate / relationValue (show per mapToName)
 * - If selected UOM = mapToId: convertedRate = rate * relationValue (show per mapFromName)
 * Returns null if no conversion applies.
 */
export function computeConvertedRate(
	rate: string,
	selectedUomId: string,
	conversions: UomConversionEntry[] | undefined,
): ConvertedRateResult {
	if (!rate || !selectedUomId || !conversions?.length) return null;

	const rateNum = parseFloat(rate);
	if (isNaN(rateNum) || rateNum === 0) return null;

	for (const conv of conversions) {
		if (conv.relationValue === 0) continue;

		let convertedRate: number;
		let otherUomName: string;

		if (selectedUomId === conv.mapFromId) {
			convertedRate = rateNum / conv.relationValue;
			otherUomName = conv.mapToName;
		} else if (selectedUomId === conv.mapToId) {
			convertedRate = rateNum * conv.relationValue;
			otherUomName = conv.mapFromName;
		} else {
			continue;
		}

		const rounding = conv.rounding ?? 2;
		return {
			convertedRate: convertedRate.toFixed(rounding),
			otherUomName,
		};
	}

	return null;
}

/**
 * Compute the bales-only converted quantity for the selected UOM.
 * Searches conversions for a pair where one side is a "bale" UOM (name match),
 * then applies the standard qty conversion rule.
 * Returns null if no bale mapping is found for the selected UOM.
 */
export function computeConvertedQtyBales(
	qty: string,
	selectedUomId: string,
	conversions: UomConversionEntry[] | undefined,
): ConvertedQtyResult {
	if (!qty || !selectedUomId || !conversions?.length) return null;
	const qtyNum = parseFloat(qty);
	if (isNaN(qtyNum) || qtyNum === 0) return null;

	const isBale = (name?: string): boolean => !!name && /\bbales?\b/i.test(name);

	for (const conv of conversions) {
		if (conv.relationValue === 0) continue;
		let convertedQty: number;
		let otherUomName: string;
		if (selectedUomId === conv.mapFromId && isBale(conv.mapToName)) {
			convertedQty = qtyNum * conv.relationValue;
			otherUomName = conv.mapToName;
		} else if (selectedUomId === conv.mapToId && isBale(conv.mapFromName)) {
			convertedQty = qtyNum / conv.relationValue;
			otherUomName = conv.mapFromName;
		} else {
			continue;
		}
		const rounding = conv.rounding ?? 2;
		return { convertedQty: convertedQty.toFixed(rounding), otherUomName };
	}
	return null;
}

/**
 * Compute the converted quantity for the "other" UOM.
 * Inverse of `computeConvertedRate` — qty scales OPPOSITE to rate:
 * - If selected UOM = mapFromId: convertedQty = qty * relationValue (show as mapToName)
 * - If selected UOM = mapToId: convertedQty = qty / relationValue (show as mapFromName)
 * Returns null if no conversion applies or qty is empty/zero.
 */
export function computeConvertedQty(
	qty: string,
	selectedUomId: string,
	conversions: UomConversionEntry[] | undefined,
): ConvertedQtyResult {
	if (!qty || !selectedUomId || !conversions?.length) return null;

	const qtyNum = parseFloat(qty);
	if (isNaN(qtyNum) || qtyNum === 0) return null;

	for (const conv of conversions) {
		if (conv.relationValue === 0) continue;

		let convertedQty: number;
		let otherUomName: string;

		if (selectedUomId === conv.mapFromId) {
			convertedQty = qtyNum * conv.relationValue;
			otherUomName = conv.mapToName;
		} else if (selectedUomId === conv.mapToId) {
			convertedQty = qtyNum / conv.relationValue;
			otherUomName = conv.mapFromName;
		} else {
			continue;
		}

		const rounding = conv.rounding ?? 2;
		return {
			convertedQty: convertedQty.toFixed(rounding),
			otherUomName,
		};
	}

	return null;
}
