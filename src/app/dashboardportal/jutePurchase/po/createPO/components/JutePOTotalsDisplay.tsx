"use client";

/**
 * @component JutePOTotalsDisplay
 * @description Displays the calculated totals for Jute PO (total weight and amount).
 * Shows vehicle weight validation status.
 */

import * as React from "react";
import { formatWeight, formatAmount, validateVehicleWeight, VEHICLE_WEIGHT_TOLERANCE_PERCENT } from "../utils/jutePOCalculations";

type JutePOTotalsDisplayProps = {
  totalWeight: number;
  totalAmount: number;
  lineCount: number;
  vehicleCapacityQtl?: number;
  vehicleQty?: number;
  percentageSum?: number;
  isLegacyPO?: boolean;
};

export function JutePOTotalsDisplay({
  totalWeight,
  totalAmount,
  lineCount,
  vehicleCapacityQtl = 0,
  vehicleQty = 1,
  percentageSum = 0,
  isLegacyPO = false,
}: JutePOTotalsDisplayProps) {
  const weightValidation = React.useMemo(
    () => validateVehicleWeight(totalWeight, vehicleCapacityQtl, vehicleQty),
    [totalWeight, vehicleCapacityQtl, vehicleQty]
  );

  const expectedWeight = vehicleCapacityQtl * vehicleQty;
  const hasVehicleCapacity = expectedWeight > 0;
  const pctValid = Math.abs(percentageSum - 100) <= 0.01;

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Summary</h4>

      <div className={`grid ${isLegacyPO ? "grid-cols-3" : "grid-cols-4"} gap-4`}>
        {/* Line Count */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Line Items</span>
          <span className="text-lg font-medium text-gray-900">{lineCount}</span>
        </div>

        {/* Percentage Sum (non-legacy only) */}
        {!isLegacyPO && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Total %</span>
            <span
              className={`text-lg font-medium ${
                percentageSum > 0
                  ? pctValid
                    ? "text-green-700"
                    : "text-red-600"
                  : "text-gray-900"
              }`}
            >
              {percentageSum.toFixed(2)} / 100.00
            </span>
            {percentageSum > 0 && !pctValid && (
              <span className="text-xs text-red-500">
                Percentages must sum to exactly 100.
              </span>
            )}
          </div>
        )}

        {/* Total Weight */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Weight</span>
          <span className={`text-lg font-medium ${
            hasVehicleCapacity && totalWeight > 0
              ? weightValidation.isValid
                ? "text-green-700"
                : "text-red-600"
              : "text-gray-900"
          }`}>
            {formatWeight(totalWeight)} Qtl
          </span>
          {isLegacyPO && hasVehicleCapacity && totalWeight > 0 && (
            <span className={`text-xs ${weightValidation.isValid ? "text-green-600" : "text-red-500"}`}>
              {weightValidation.isValid
                ? `Within ±${VEHICLE_WEIGHT_TOLERANCE_PERCENT}% of ${formatWeight(expectedWeight)} Qtl`
                : `${Math.abs(weightValidation.variancePercent).toFixed(1)}% ${weightValidation.variancePercent > 0 ? "over" : "under"} capacity`}
            </span>
          )}
          {!isLegacyPO && hasVehicleCapacity && (
            <span className="text-xs text-gray-600">
              of {formatWeight(expectedWeight)} Qtl capacity
            </span>
          )}
        </div>

        {/* Total Amount */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Amount</span>
          <span className="text-lg font-semibold text-green-700">₹ {formatAmount(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export default JutePOTotalsDisplay;
