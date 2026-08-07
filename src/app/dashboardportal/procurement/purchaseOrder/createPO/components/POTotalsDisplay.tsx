import React from "react";
import type { AdditionalChargesTotals } from "../types/poTypes";

/**
 * Format currency for display.
 */
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
  totalAmount: number;
  advanceAmount: number;
};

type POTotalsDisplayProps = {
  totals: Totals;
  showGSTBreakdown: boolean;
  /** Detailed breakdown of additional charges including tax split */
  chargesTotals?: AdditionalChargesTotals;
};

/**
 * Displays the computed PO totals.
 * Additional charges tax is combined with line items tax.
 */
export function POTotalsDisplay({ totals, showGSTBreakdown, chargesTotals }: POTotalsDisplayProps) {
  // Use detailed chargesTotals if available
  const chargesBase = chargesTotals?.baseAmount ?? 0;
  const chargesIGST = chargesTotals?.totalIGST ?? 0;
  const chargesCGST = chargesTotals?.totalCGST ?? 0;
  const chargesSGST = chargesTotals?.totalSGST ?? 0;
  const chargesTax = chargesTotals?.totalTax ?? 0;

  // Combined taxes (line items + additional charges)
  const combinedIGST = totals.totalIGST + chargesIGST;
  const combinedCGST = totals.totalCGST + chargesCGST;
  const combinedSGST = totals.totalSGST + chargesSGST;

  // Grand total = line items total + additional charges (base + tax)
  const grandTotalWithCharges = totals.totalAmount + chargesBase + chargesTax;

  return (
    <div className="flex justify-end">
      <div className="min-w-70 space-y-1">
        {/* Net Amount (line items only) */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Net Amount:</span>
          <span>{formatCurrency(totals.netAmount)}</span>
        </div>

        {/* Additional Charges (base amount before tax) */}
        {chargesBase > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Additional Charges:</span>
            <span>{formatCurrency(chargesBase)}</span>
          </div>
        )}

        {/* GST Breakdown - combined from line items and additional charges */}
        {showGSTBreakdown && (
          <>
            {combinedIGST > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGST:</span>
                <span>{formatCurrency(combinedIGST)}</span>
              </div>
            )}
            {(combinedCGST > 0 || combinedSGST > 0) && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">CGST:</span>
                  <span>{formatCurrency(combinedCGST)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">SGST:</span>
                  <span>{formatCurrency(combinedSGST)}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* Divider */}
        <div className="border-t border-slate-300 my-1" />

        {/* Grand Total */}
        <div className="flex justify-between text-base font-semibold">
          <span>Grand Total:</span>
          <span className="text-primary">{formatCurrency(grandTotalWithCharges)}</span>
        </div>

        {/* Advance Amount */}
        {totals.advanceAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Advance Amount:</span>
            <span>{formatCurrency(totals.advanceAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default POTotalsDisplay;
