"use client";

/**
 * @hook useJutePOLineItems
 * @description Manages line items for Jute PO with auto-weight/amount calculation.
 */

import * as React from "react";
import type { JutePOLineItem, MuiFormMode, Option } from "../types/jutePOTypes";
import { createBlankLine, lineHasAnyData } from "../utils/jutePOFactories";
import {
  calculateWeight,
  calculateAmount,
  calculateWeightFromPercentage,
  calculateQuantityFromWeight,
  formatNumber,
} from "../utils/jutePOCalculations";
import { useLineItems } from "@/components/ui/transaction";

export type UseJutePOLineItemsParams = {
  mode: MuiFormMode;
  juteUnit: string;
  vehicleCapacity: number;
  vehicleQty: number;
  getQualityOptions: (itemId: string) => Option[];
  isLegacyPO?: boolean;
};

type UseJutePOLineItemsReturn = {
  lineItems: JutePOLineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<JutePOLineItem[]>>;
  replaceItems: (items: JutePOLineItem[]) => void;
  removeLineItems: (ids: string[]) => void;
  handleLineFieldChange: (id: string, field: keyof JutePOLineItem, value: string) => void;
  recalculateAllWeights: () => void;
};

export function useJutePOLineItems({
  mode,
  juteUnit,
  vehicleCapacity,
  vehicleQty,
  isLegacyPO = false,
}: UseJutePOLineItemsParams): UseJutePOLineItemsReturn {
  const {
    items: lineItems,
    setItems: setLineItems,
    replaceItems,
    removeItems: removeLineItems,
  } = useLineItems<JutePOLineItem>({
    createBlankItem: createBlankLine,
    hasData: lineHasAnyData,
    getItemId: (item) => item.id,
    maintainTrailingBlank: mode !== "view",
  });

  /**
   * Recalculate weight, derived quantity and amount for a single line item.
   * In non-legacy mode, percentage drives weight; quantity is derived (read-only).
   * In legacy mode, quantity drives weight (original behavior).
   */
  const recalculateLineWeightAmount = React.useCallback(
    (line: JutePOLineItem): JutePOLineItem => {
      const rate = Number(line.rate);

      if (!isLegacyPO) {
        const pct = Number(line.percentage);
        if (!Number.isFinite(pct) || pct <= 0) {
          return { ...line, weight: "", quantity: "", amount: "" };
        }
        const weight = calculateWeightFromPercentage(pct, vehicleCapacity, vehicleQty);
        const derivedQty = Math.round(calculateQuantityFromWeight(weight, juteUnit));
        const amount = calculateAmount(weight, rate);
        return {
          ...line,
          weight: weight > 0 ? formatNumber(weight, 2) : "",
          quantity: derivedQty > 0 ? formatNumber(derivedQty, 0) : "",
          amount: Number.isFinite(amount) && amount > 0 ? formatNumber(amount, 2) : "",
        };
      }

      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return { ...line, weight: "", amount: "" };
      }
      const weight = calculateWeight(qty, vehicleCapacity, vehicleQty, juteUnit);
      const amount = calculateAmount(weight, rate);
      return {
        ...line,
        weight: formatNumber(weight, 2),
        amount: Number.isFinite(amount) && amount > 0 ? formatNumber(amount, 2) : "",
      };
    },
    [juteUnit, vehicleCapacity, vehicleQty, isLegacyPO]
  );

  /**
   * Recalculate weights/amounts for all line items.
   * Called when vehicle type, vehicle qty, or unit type changes.
   */
  const recalculateAllWeights = React.useCallback(() => {
    setLineItems((prev) => prev.map(recalculateLineWeightAmount));
  }, [recalculateLineWeightAmount, setLineItems]);

  // Re-run calculations whenever header-level inputs change.
  React.useEffect(() => {
    setLineItems((prev) => prev.map(recalculateLineWeightAmount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juteUnit, vehicleCapacity, vehicleQty, isLegacyPO]);

  /**
   * Handle field change on a line item.
   */
  const handleLineFieldChange = React.useCallback(
    (id: string, field: keyof JutePOLineItem, rawValue: string) => {
      if (mode === "view") return;

      // Item change: reset quality
      if (field === "itemId") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            return { ...item, itemId: rawValue, quality: "" };
          })
        );
        return;
      }

      // In non-legacy mode, block direct edits to quantity (derived).
      if (field === "quantity" && !isLegacyPO) {
        return;
      }

      // Percentage, quantity (legacy), or rate change: recalculate weight and amount
      if (field === "percentage" || field === "quantity" || field === "rate") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: rawValue };
            return recalculateLineWeightAmount(updated);
          })
        );
        return;
      }

      // Other fields: simple update
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: rawValue } : item))
      );
    },
    [mode, setLineItems, recalculateLineWeightAmount, isLegacyPO]
  );

  return {
    lineItems,
    setLineItems,
    replaceItems,
    removeLineItems,
    handleLineFieldChange,
    recalculateAllWeights,
  };
}
