import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, ItemLastPurchaseInfo, Option } from "../types/poTypes";
import { DISCOUNT_MODE } from "../utils/poConstants";

/** Discount mode dropdown options */
const DISCOUNT_MODE_OPTIONS: Option[] = [
  { label: "None", value: "" },
  { label: "%", value: String(DISCOUNT_MODE.PERCENTAGE) },
  { label: "Amount", value: String(DISCOUNT_MODE.AMOUNT) },
];

type UsePOLineItemColumnsParams = {
  canEdit: boolean;
  getItemLabel: (groupId: string, itemId: string, itemCode?: string) => string;
  getUomOptions: (groupId: string, itemId: string) => Option[];
  getUomLabel: (groupId: string, itemId: string, uomId: string) => string;
  onFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
  getLastPurchaseInfo: (groupId: string, itemId: string) => ItemLastPurchaseInfo | undefined;
};

/**
 * Splits a "code — name" label into its parts. Mirrors the logic used in
 * the preview pane so the line items table and the preview agree on what
 * counts as the item's display name.
 */
const splitItemLabel = (label: string): { code: string; name: string } => {
  const idx = label.indexOf(" — ");
  if (idx < 0) return { code: label, name: label };
  return { code: label.substring(0, idx), name: label.substring(idx + 3) };
};

/**
 * Builds the TransactionLineColumn array used by the PO line items grid.
 * Separated so the heavy render logic stays out of page.tsx.
 */
export const usePOLineItemColumns = ({
  canEdit,
  getItemLabel,
  getUomOptions,
  getUomLabel,
  onFieldChange,
  getLastPurchaseInfo,
}: UsePOLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
  React.useMemo(
    () => [
      {
        id: "indentNo",
        header: "Indent No",
        width: "0.9fr",
        minWidth: "100px",
        renderCell: ({ item }) => (
          <span className="block truncate text-sm font-mono text-slate-700">{item.indentNo || "-"}</span>
        ),
        getTooltip: ({ item }) => item.indentNo || undefined,
      },
      {
        id: "itemCode",
        header: "Item Code",
        width: "1.3fr",
        minWidth: "140px",
        renderCell: ({ item }) => {
          const cachedLabel = getItemLabel(item.itemGroup, item.item, item.itemCode);
          const code = item.itemCode || splitItemLabel(cachedLabel).code || "-";
          return <span className="block truncate text-sm font-mono text-slate-700">{code}</span>;
        },
        getTooltip: ({ item }) => {
          const cachedLabel = getItemLabel(item.itemGroup, item.item, item.itemCode);
          return item.itemCode || splitItemLabel(cachedLabel).code || undefined;
        },
      },
      {
        id: "itemName",
        header: "Item Name",
        width: "2fr",
        minWidth: "200px",
        renderCell: ({ item }) => {
          const cachedLabel = getItemLabel(item.itemGroup, item.item, item.itemCode);
          const { code, name } = splitItemLabel(cachedLabel);
          // If the cached label collapses to just the code (no " — " separator),
          // fall back to the raw label so we don't show a redundant code twice.
          const displayName = name && name !== code ? name : cachedLabel || "-";
          return (
            <div className="flex flex-col gap-0.5 w-full">
              <span className="block truncate text-sm text-slate-700">{displayName}</span>
              {item.rowError && (
                <p className="text-xs text-red-600 leading-tight">{item.rowError}</p>
              )}
              {!item.rowError && item.rowWarning && (
                <p className="text-xs text-amber-600 leading-tight">{item.rowWarning}</p>
              )}
            </div>
          );
        },
        getTooltip: ({ item }) => {
          const cachedLabel = getItemLabel(item.itemGroup, item.item, item.itemCode);
          const { code, name } = splitItemLabel(cachedLabel);
          return name && name !== code ? name : cachedLabel || undefined;
        },
      },
      {
        id: "hsnCode",
        header: "HSN",
        width: "0.7fr",
        minWidth: "90px",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-sm">{item.hsnCode || "-"}</span>;
          }
          return (
            <Input
              type="text"
              value={item.hsnCode ?? ""}
              onChange={(e) => onFieldChange(item.id, "hsnCode", e.target.value)}
              placeholder="HSN"
              className="h-8 text-sm"
            />
          );
        },
        getTooltip: ({ item }) => (item.hsnCode ? `HSN: ${item.hsnCode}` : undefined),
      },
      {
        id: "rate",
        header: "Rate",
        width: "0.8fr",
        minWidth: "80px",
        renderCell: ({ item }) => {
          const lastPurchase = item.item ? getLastPurchaseInfo(item.itemGroup, item.item) : undefined;
          if (!canEdit) {
            return (
              <div className="flex flex-col gap-0.5 w-full">
                <span className="block truncate text-sm">{item.rate || "-"}</span>
                {lastPurchase && (
                  <p className="text-xs text-muted-foreground leading-tight" title={`Last purchased from ${lastPurchase.supplierName ?? "N/A"} on ${lastPurchase.date ?? "N/A"}`}>
                    Prev: {lastPurchase.rate.toFixed(2)}
                  </p>
                )}
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-0.5 w-full">
              <Input
                type="text"
                value={item.rate}
                onChange={(e) => onFieldChange(item.id, "rate", e.target.value)}
                placeholder="0.00"
                className="h-8 text-sm"
              />
              {lastPurchase && (
                <p className="text-xs text-muted-foreground leading-tight" title={`Last purchased from ${lastPurchase.supplierName ?? "N/A"} on ${lastPurchase.date ?? "N/A"}`}>
                  Prev: {lastPurchase.rate.toFixed(2)}
                </p>
              )}
            </div>
          );
        },
        getTooltip: ({ item }) => {
          const lastPurchase = item.item ? getLastPurchaseInfo(item.itemGroup, item.item) : undefined;
          const parts: string[] = [];
          if (item.rate) parts.push(`Rate: ${item.rate}`);
          if (lastPurchase) parts.push(`Last: ${lastPurchase.rate.toFixed(2)} from ${lastPurchase.supplierName ?? "N/A"} on ${lastPurchase.date ?? "N/A"}`);
          return parts.length ? parts.join("\n") : undefined;
        },
      },
      {
        id: "quantity",
        header: "Quantity",
        width: "0.8fr",
        minWidth: "80px",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-sm">{item.quantity || "-"}</span>;
          }
          // Lock quantity for Logic 2 (Open PO) only
          if (item.isQuantityLocked) {
            return (
              <div className="flex flex-col gap-0.5 w-full">
                <span
                  className="text-sm h-8 flex items-center px-2 bg-muted rounded cursor-not-allowed text-muted-foreground"
                  title="Quantity is fixed for this item"
                >
                  {item.quantity || "0"}
                </span>
                {item.rowError && (
                  <p className="text-xs text-red-600 leading-tight">{item.rowError}</p>
                )}
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-0.5 w-full">
              <Input
                type="text"
                value={item.quantity}
                onChange={(e) => onFieldChange(item.id, "quantity", e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
              />
              {item.rowError && (
                <p className="text-xs text-red-600 leading-tight">{item.rowError}</p>
              )}
            </div>
          );
        },
        getTooltip: ({ item }) => (item.quantity ? `Quantity: ${item.quantity}` : undefined),
      },
      {
        id: "uom",
        header: "Unit",
        width: "0.6fr",
        minWidth: "80px",
        renderCell: ({ item }) => {
          const options = getUomOptions(item.itemGroup, item.item);
          const label = getUomLabel(item.itemGroup, item.item, item.uom);
          if (!canEdit) {
            return <span className="block truncate text-sm">{label || "-"}</span>;
          }
          const value = options.find((o) => o.value === item.uom) ?? null;
          return (
            <SearchableSelect<Option>
              options={options}
              value={value}
              onChange={(next) => onFieldChange(item.id, "uom", next?.value ?? "")}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              placeholder="UOM"
            />
          );
        },
        getTooltip: ({ item }) => getUomLabel(item.itemGroup, item.item, item.uom) || undefined,
      },
      {
        id: "discountMode",
        header: "Disc. Type",
        width: "0.7fr",
        minWidth: "90px",
        renderCell: ({ item }) => {
          const currentVal = item.discountMode != null ? String(item.discountMode) : "";
          const label = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal)?.label || "-";
          if (!canEdit) {
            return <span className="block truncate text-sm">{label}</span>;
          }
          const value = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal) ?? DISCOUNT_MODE_OPTIONS[0];
          return (
            <SearchableSelect<Option>
              options={DISCOUNT_MODE_OPTIONS}
              value={value}
              onChange={(next) => onFieldChange(item.id, "discountMode", next?.value ?? "")}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              placeholder="Type"
            />
          );
        },
        getTooltip: ({ item }) => {
          const currentVal = item.discountMode != null ? String(item.discountMode) : "";
          const label = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal)?.label;
          return label && label !== "None" ? `Discount Type: ${label}` : undefined;
        },
      },
      {
        id: "discountValue",
        header: "Disc. Value",
        width: "0.7fr",
        minWidth: "80px",
        renderCell: ({ item }) => {
          const hasDiscountMode = item.discountMode != null && item.discountMode !== 0;
          if (!canEdit) {
            return <span className="block truncate text-sm">{item.discountValue || "-"}</span>;
          }
          return (
            <Input
              type="text"
              value={item.discountValue}
              onChange={(e) => onFieldChange(item.id, "discountValue", e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
              disabled={!hasDiscountMode}
            />
          );
        },
        getTooltip: ({ item }) => (item.discountValue ? `Discount Value: ${item.discountValue}` : undefined),
      },
      {
        id: "discountAmount",
        header: "Disc. Amt",
        width: "0.7fr",
        minWidth: "80px",
        renderCell: ({ item }) => (
          <span className="block truncate text-sm">{item.discountAmount?.toFixed(2) || "0.00"}</span>
        ),
        getTooltip: ({ item }) => (item.discountAmount ? `Discount Amount: ${item.discountAmount.toFixed(2)}` : undefined),
      },
      {
        id: "taxPercentage",
        header: "Tax%",
        width: "0.6fr",
        minWidth: "70px",
        renderCell: ({ item }) => {
          const hasTax = item.taxPercentage != null && String(item.taxPercentage) !== "";
          if (!canEdit) {
            return (
              <span className="block truncate text-sm">{hasTax ? `${item.taxPercentage}%` : "-"}</span>
            );
          }
          return (
            <Input
              type="text"
              inputMode="decimal"
              value={item.taxPercentage ?? ""}
              onChange={(e) => onFieldChange(item.id, "taxPercentage", e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
          );
        },
        getTooltip: ({ item }) =>
          item.taxPercentage != null && String(item.taxPercentage) !== "" ? `Tax: ${item.taxPercentage}%` : undefined,
      },
      {
        id: "amount",
        header: "Amount",
        width: "0.8fr",
        minWidth: "90px",
        renderCell: ({ item }) => <span className="block truncate text-sm font-medium">{item.amount?.toFixed(2) || "0.00"}</span>,
        getTooltip: ({ item }) => (item.amount ? `Amount: ${item.amount.toFixed(2)}` : undefined),
      },
    ],
    [canEdit, getItemLabel, getUomOptions, getUomLabel, onFieldChange, getLastPurchaseInfo],
  );

/**
 * Determines whether users should see the extra blank line that enables manual entry.
 * Indent-mandatory configurations (`indent_required = 1`) hide the blank line entirely.
 */
export const shouldAllowManualLineEntry = (mode: MuiFormMode, indentRequired?: number | string | null): boolean => {
  if (mode === "view") return false;
  if (indentRequired == null) return true;
  return Number(indentRequired) !== 1;
};

export default usePOLineItemColumns;
