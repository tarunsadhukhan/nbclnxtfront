/**
 * Hook for managing jute issue line items.
 */

import * as React from "react";
import type { EditableLineItem, StockOutstandingItem } from "../types/juteIssueTypes";
import {
  createBlankLine,
  lineHasAnyData,
  calculateIssueValue,
} from "../utils/juteIssueFactories";
import { createLineFromStock } from "../utils/juteIssueMappers";

type UseJuteIssueLineItemsParams = {
  mode: "create" | "edit" | "view";
};

type UseJuteIssueLineItemsReturn = {
  lineItems: EditableLineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<EditableLineItem[]>>;
  addLineFromStock: (
    stock: StockOutstandingItem,
    yarnTypeId: string,
    quantity: number,
    weight: number
  ) => void;
  removeLineItem: (id: string) => void;
  updateLineItem: (id: string, field: keyof EditableLineItem, value: string | number) => void;
  replaceItems: (items: EditableLineItem[]) => void;
  calculateTotals: () => { totalWeight: number; totalValue: number; totalQty: number };
};

export const useJuteIssueLineItems = ({
  mode,
}: UseJuteIssueLineItemsParams): UseJuteIssueLineItemsReturn => {
  const [lineItems, setLineItems] = React.useState<EditableLineItem[]>([]);

  // Add a line item from stock selection
  const addLineFromStock = React.useCallback(
    (
      stock: StockOutstandingItem,
      yarnTypeId: string,
      quantity: number,
      weight: number
    ) => {
      if (mode === "view") return;

      const newLine = createLineFromStock(stock, yarnTypeId, quantity, weight);
      setLineItems((prev) => [...prev, newLine]);
    },
    [mode]
  );

  // Remove a line item
  const removeLineItem = React.useCallback(
    (id: string) => {
      if (mode === "view") return;
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    },
    [mode]
  );

  // Update a single field in a line item
  const updateLineItem = React.useCallback(
    (id: string, field: keyof EditableLineItem, value: string | number) => {
      if (mode === "view") return;

      setLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updated = { ...item, [field]: value };

          // Recalculate issue_value if weight changes
          if (field === "weight") {
            const weight = Number(value) || 0;
            updated.issue_value = calculateIssueValue(weight, item.actual_rate);
          }

          return updated;
        })
      );
    },
    [mode]
  );

  // Replace all items (used when loading from API)
  const replaceItems = React.useCallback((items: EditableLineItem[]) => {
    setLineItems(items);
  }, []);

  // Calculate totals for summary
  const calculateTotals = React.useCallback(() => {
    let totalWeight = 0;
    let totalValue = 0;
    let totalQty = 0;

    for (const item of lineItems) {
      totalWeight += Number(item.weight) || 0;
      totalValue += Number(item.issue_value) || 0;
      totalQty += Number(item.quantity) || 0;
    }

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      totalQty: Math.round(totalQty * 100) / 100,
    };
  }, [lineItems]);

  return {
    lineItems,
    setLineItems,
    addLineFromStock,
    removeLineItem,
    updateLineItem,
    replaceItems,
    calculateTotals,
  };
};
