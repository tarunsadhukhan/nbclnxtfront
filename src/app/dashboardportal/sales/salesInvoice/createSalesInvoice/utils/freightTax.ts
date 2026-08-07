export const FREIGHT_GST_PERCENT = 18;
export const FREIGHT_HSN = "996519";

export type FreightTaxBreakdown = {
	cgst: number;
	sgst: number;
	igst: number;
	total: number;
};

export function computeFreightTax(
	amount: number,
	intraInterState: number | string | null | undefined,
): FreightTaxBreakdown {
	const intra = String(intraInterState ?? "") === "0";
	const total = +(amount * (FREIGHT_GST_PERCENT / 100)).toFixed(2);
	if (intra) {
		// Balance the halves so cgst + sgst === total for odd-paise totals
		// (matches the backend, which computes sgst = total - cgst).
		const cgst = +(total / 2).toFixed(2);
		const sgst = +(total - cgst).toFixed(2);
		return { cgst, sgst, igst: 0, total };
	}
	return { cgst: 0, sgst: 0, igst: total, total };
}
