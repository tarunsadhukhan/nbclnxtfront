import React from "react";

const formatCurrency = (value?: number): string => {
	if (value === undefined || value === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

type Totals = {
	netAmount: number;
	totalIGST: number;
	totalSGST: number;
	totalCGST: number;
	grossAmount: number;
	totalAmount: number;
};

type QuotationTotalsDisplayProps = {
	totals: Totals;
	showGSTBreakdown: boolean;
	roundOffValue?: number;
};

/**
 * Displays the computed quotation totals.
 * Simpler than PO: no additional charges or advance amount.
 */
export function QuotationTotalsDisplay({ totals, showGSTBreakdown, roundOffValue }: QuotationTotalsDisplayProps) {
	const grandTotal = totals.totalAmount + (roundOffValue || 0);

	return (
		<div className="flex justify-end">
			<div className="min-w-70 space-y-1">
				<div className="flex justify-between text-sm">
					<span className="text-slate-600">Net Amount:</span>
					<span>{formatCurrency(totals.netAmount)}</span>
				</div>

				{showGSTBreakdown && (
					<>
						{totals.totalIGST > 0 && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">IGST:</span>
								<span>{formatCurrency(totals.totalIGST)}</span>
							</div>
						)}
						{(totals.totalCGST > 0 || totals.totalSGST > 0) && (
							<>
								<div className="flex justify-between text-sm">
									<span className="text-slate-600">CGST:</span>
									<span>{formatCurrency(totals.totalCGST)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-slate-600">SGST:</span>
									<span>{formatCurrency(totals.totalSGST)}</span>
								</div>
							</>
						)}
					</>
				)}

				{roundOffValue != null && roundOffValue !== 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Round Off:</span>
						<span>{formatCurrency(roundOffValue)}</span>
					</div>
				)}

				<div className="border-t border-slate-300 my-1" />

				<div className="flex justify-between text-base font-semibold">
					<span>Grand Total:</span>
					<span className="text-primary">{formatCurrency(grandTotal)}</span>
				</div>
			</div>
		</div>
	);
}

export default QuotationTotalsDisplay;
