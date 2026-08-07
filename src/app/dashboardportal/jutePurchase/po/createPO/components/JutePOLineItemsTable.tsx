"use client";

/**
 * @component JutePOLineItemsTable
 * @description Line items table for Jute PO with editable columns.
 * Columns: Item, Quality, Crop Year, Marka, Qty, Rate, Moisture, Weight (calculated), Amount (calculated)
 */

import * as React from "react";
import { TransactionLineColumn, SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { JutePOLineItem, Option, JutePOLabelResolvers } from "../types/jutePOTypes";
import { CROP_YEAR_OPTIONS } from "../utils/jutePOConstants";
import { formatWeight, formatAmount } from "../utils/jutePOCalculations";

type UseJutePOLineItemColumnsParams = {
  canEdit: boolean;
  itemOptions: Option[];
  getQualityOptions: (itemId: string) => Option[];
  labelResolvers: JutePOLabelResolvers;
  handleLineFieldChange: (id: string, field: keyof JutePOLineItem, value: string) => void;
  isLegacyPO?: boolean;
};

export function useJutePOLineItemColumns({
  canEdit,
  itemOptions,
  getQualityOptions,
  labelResolvers,
  handleLineFieldChange,
  isLegacyPO = false,
}: UseJutePOLineItemColumnsParams): TransactionLineColumn<JutePOLineItem>[] {
  return React.useMemo<TransactionLineColumn<JutePOLineItem>[]>(
    () => [
      {
        id: "item",
        header: "Item",
        width: "1.5fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          if (!canEdit) {
            // Use itemName from API data if available, otherwise fallback to label resolver
            const displayName = item.itemName || labelResolvers.item(item.itemId);
            return <span className="text-xs">{displayName}</span>;
          }
          const value = itemOptions.find((opt) => opt.value === item.itemId) ?? null;
          return (
            <SearchableSelect<Option>
              options={itemOptions}
              value={value}
              onChange={(next: Option | null) => handleLineFieldChange(item.id, "itemId", next?.value ?? "")}
              getOptionLabel={(opt: Option) => opt.label}
              getOptionKey={(opt: Option) => opt.value}
              isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
              placeholder="Select item"
              disabled={!canEdit}
            />
          );
        },
        getTooltip: ({ item }: { item: JutePOLineItem }) => item.itemName || labelResolvers.item(item.itemId) || undefined,
      },
      {
        id: "quality",
        header: "Quality",
        width: "1.2fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          const qualityOptions = item.itemId ? getQualityOptions(item.itemId) : [];
          if (!canEdit) {
            // Use qualityName from API data if available, otherwise fallback to label resolver
            const displayName = item.qualityName || labelResolvers.quality(item.itemId, item.quality);
            return <span className="text-xs">{displayName}</span>;
          }
          const value = qualityOptions.find((opt) => opt.value === item.quality) ?? null;
          return (
            <SearchableSelect<Option>
              options={qualityOptions}
              value={value}
              onChange={(next: Option | null) => handleLineFieldChange(item.id, "quality", next?.value ?? "")}
              getOptionLabel={(opt: Option) => opt.label}
              getOptionKey={(opt: Option) => opt.value}
              isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
              placeholder="Select quality"
              disabled={!canEdit || !item.itemId}
            />
          );
        },
        getTooltip: ({ item }: { item: JutePOLineItem }) => item.qualityName || labelResolvers.quality(item.itemId, item.quality) || undefined,
      },
      {
        id: "cropYear",
        header: "Crop Year",
        width: "0.9fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          if (!canEdit) {
            return <span className="text-xs">{item.cropYear}</span>;
          }
          const value = CROP_YEAR_OPTIONS.find((opt) => opt.value === item.cropYear) ?? null;
          return (
            <SearchableSelect<Option>
              options={CROP_YEAR_OPTIONS}
              value={value}
              onChange={(next: Option | null) => handleLineFieldChange(item.id, "cropYear", next?.value ?? "")}
              getOptionLabel={(opt: Option) => opt.label}
              getOptionKey={(opt: Option) => opt.value}
              isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
              placeholder="Year"
              disabled={!canEdit}
            />
          );
        },
      },
      {
        id: "marka",
        header: "Marka",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          if (!canEdit) {
            return <span className="text-xs">{item.marka || "-"}</span>;
          }
          return (
            <Input
              value={item.marka ?? ""}
              onChange={(e) => handleLineFieldChange(item.id, "marka", e.target.value)}
              placeholder="Marka"
              disabled={!canEdit}
              className="h-8 text-xs"
            />
          );
        },
      },
      ...(isLegacyPO
        ? [
            {
              id: "quantity",
              header: "Qty",
              width: "0.7fr",
              renderCell: ({ item }: { item: JutePOLineItem }) => {
                if (!canEdit) {
                  return <span className="text-xs text-right">{item.quantity || "-"}</span>;
                }
                return (
                  <Input
                    type="number"
                    value={item.quantity ?? ""}
                    onChange={(e) => handleLineFieldChange(item.id, "quantity", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                    className="h-8 text-xs text-right"
                  />
                );
              },
            } as TransactionLineColumn<JutePOLineItem>,
          ]
        : [
            {
              id: "percentage",
              header: "%",
              width: "0.7fr",
              renderCell: ({ item }: { item: JutePOLineItem }) => {
                if (!canEdit) {
                  return <span className="text-xs text-right">{item.percentage || "-"}</span>;
                }
                return (
                  <Input
                    type="number"
                    value={item.percentage ?? ""}
                    onChange={(e) => handleLineFieldChange(item.id, "percentage", e.target.value)}
                    placeholder="0.00"
                    disabled={!canEdit}
                    className="h-8 text-xs text-right"
                    min={0}
                    max={100}
                    step={0.01}
                  />
                );
              },
              getTooltip: ({ item }: { item: JutePOLineItem }) =>
                item.percentage ? `Share of total vehicle capacity: ${item.percentage}%` : undefined,
            } as TransactionLineColumn<JutePOLineItem>,
            {
              id: "quantity",
              header: "Qty (Bales/Drums)",
              width: "0.9fr",
              renderCell: ({ item }: { item: JutePOLineItem }) => (
                <span className="text-xs text-right font-medium">{item.quantity || "-"}</span>
              ),
              getTooltip: ({ item }: { item: JutePOLineItem }) =>
                item.quantity ? `Derived quantity: ${item.quantity}` : undefined,
            } as TransactionLineColumn<JutePOLineItem>,
          ]),
      {
        id: "rate",
        header: "Rate (per Qtl)",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          if (!canEdit) {
            return <span className="text-xs text-right">{formatAmount(parseFloat(item.rate) || 0)}</span>;
          }
          return (
            <Input
              type="number"
              value={item.rate ?? ""}
              onChange={(e) => handleLineFieldChange(item.id, "rate", e.target.value)}
              placeholder="0.00"
              disabled={!canEdit}
              className="h-8 text-xs text-right"
            />
          );
        },
      },
      {
        id: "allowableMoisture",
        header: "Moisture %",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => {
          if (!canEdit) {
            return <span className="text-xs text-right">{item.allowableMoisture || "-"}</span>;
          }
          return (
            <Input
              type="number"
              value={item.allowableMoisture ?? ""}
              onChange={(e) => handleLineFieldChange(item.id, "allowableMoisture", e.target.value)}
              placeholder="0"
              disabled={!canEdit}
              className="h-8 text-xs text-right"
            />
          );
        },
      },
      {
        id: "weight",
        header: "Weight (Qtl)",
        width: "0.9fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right font-medium">{formatWeight(parseFloat(item.weight) || 0)}</span>
        ),
        getTooltip: ({ item }: { item: JutePOLineItem }) => `Calculated weight: ${formatWeight(parseFloat(item.weight) || 0)} Qtl`,
      },
      {
        id: "amount",
        header: "Amount",
        width: "1fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right font-medium">{formatAmount(parseFloat(item.amount) || 0)}</span>
        ),
        getTooltip: ({ item }: { item: JutePOLineItem }) => `Line total: ${formatAmount(parseFloat(item.amount) || 0)}`,
      },
    ],
    [canEdit, itemOptions, getQualityOptions, labelResolvers, handleLineFieldChange]
  );
}

export default useJutePOLineItemColumns;
