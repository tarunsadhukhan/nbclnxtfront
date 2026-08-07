"use client";

import * as React from "react";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import { Button } from "../button";
import { useBulkSelection } from "./useBulkSelection";

export type TransactionLineColumn<TItem> = {
  id: string;
  header: React.ReactNode;
  width?: string;
  /** Minimum width for the column (e.g. "130px"). Prevents the column from shrinking below this when the viewport is narrow or zoomed in. */
  minWidth?: string;
  className?: string;
  renderCell: (context: { item: TItem; index: number; canEdit: boolean }) => React.ReactNode;
  getTooltip?: (context: { item: TItem; index: number; canEdit: boolean }) => string | undefined;
};

export type TransactionLineItemsProps<TItem> = {
  title?: string;
  subtitle?: string;
  items: TItem[];
  getItemId: (item: TItem) => string;
  canEdit: boolean;
  columns: TransactionLineColumn<TItem>[];
  onRemoveSelected?: (ids: string[]) => void;
  placeholder?: string;
  selectable?: boolean;
  selectionColumnWidth?: string;
  removeSelectedLabel?: string;
  className?: string;
  /** Optional action element rendered in the line items header (e.g. "Add Items" button) */
  headerAction?: React.ReactNode;
};

export function TransactionLineItems<TItem>({
  title = "Line Items",
  subtitle,
  items,
  getItemId,
  canEdit,
  columns,
  onRemoveSelected,
  placeholder,
  selectable,
  selectionColumnWidth = "48px",
  removeSelectedLabel = "Remove Selected",
  className,
  headerAction,
}: TransactionLineItemsProps<TItem>) {
  const allowSelection = selectable ?? canEdit;

  const selection = useBulkSelection({
    items,
    getId: getItemId,
    enabled: canEdit && allowSelection,
  });

  const gridTemplateColumns = React.useMemo(() => {
    const widths = columns.map((column) => {
      const w = column.width ?? "1fr";
      const min = column.minWidth;
      // If the width is already a fixed px value, use it directly (no minmax needed)
      if (w.endsWith("px")) return w;
      // If a minWidth is specified, wrap in minmax(min, w)
      if (min) return `minmax(${min}, ${w})`;
      // Default: use minmax with a sensible floor of 80px
      return `minmax(80px, ${w})`;
    });
    const parts = allowSelection ? [selectionColumnWidth, ...widths] : widths;
    return parts.join(" ");
  }, [columns, allowSelection, selectionColumnWidth]);

  // Calculate minimum width from column minWidths for horizontal scrolling
  const estimatedMinWidth = React.useMemo(() => {
    const parseMinPx = (col: TransactionLineColumn<TItem>): number => {
      // If width is a fixed px value, use that
      const w = col.width ?? "1fr";
      if (w.endsWith("px")) return parseInt(w, 10) || 80;
      // If minWidth is specified, use it
      if (col.minWidth) return parseInt(col.minWidth, 10) || 80;
      // Default floor per column
      return 80;
    };
    const baseWidth = columns.reduce((sum, col) => sum + parseMinPx(col), 0);
    const selectionWidth = allowSelection ? 48 : 0;
    return Math.max(800, baseWidth + selectionWidth);
  }, [columns, allowSelection]);

  const handleRemoveSelected = React.useCallback(() => {
    if (!onRemoveSelected || !selection.hasSelection) return;
    onRemoveSelected(selection.selectedIds);
    selection.clear();
  }, [onRemoveSelected, selection]);

  const effectivePlaceholder = placeholder ?? (canEdit ? "Add items to build the transaction." : "No line items available.");

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-800">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex gap-2 print-hidden">
          {headerAction}
          {canEdit && allowSelection && onRemoveSelected ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveSelected}
              disabled={!selection.hasSelection}
            >
              {removeSelectedLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto" style={{ width: "100%" }}>
        <div 
          className="transaction-grid-container"
          style={{ minWidth: `${estimatedMinWidth}px` }}
        >
          <div
            className="transaction-grid-header"
            style={{ gridTemplateColumns }}
          >
                  {allowSelection ? (
                    <div className="flex items-center justify-center">
                      {canEdit ? (
                        <Checkbox
                          size="small"
                          sx={{ p: 0.25, "& .MuiSvgIcon-root": { fontSize: 18 } }}
                          checked={selection.allSelected}
                          indeterminate={selection.indeterminate}
                          onChange={selection.toggleAll}
                          className="print-hidden"
                          aria-label="Select all line items"
                        />
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </div>
                  ) : null}
            {columns.map((column) => (
              <span key={column.id} className="truncate">
                {column.header}
              </span>
            ))}
          </div>

          {items.length ? (
            items.map((item, index) => {
              const itemId = getItemId(item);
              const rowClass = index % 2 === 0 ? "transaction-grid-row-even" : "transaction-grid-row-odd";

              return (
                <div
                  key={itemId}
                  className={`transaction-grid-row ${rowClass}`}
                  style={{ gridTemplateColumns }}
                >
                  {allowSelection ? (
                    <div className="flex items-center justify-center">
                      {canEdit ? (
                        <Checkbox
                          size="small"
                          sx={{ p: 0.25, "& .MuiSvgIcon-root": { fontSize: 18 } }}
                          checked={selection.isSelected(itemId)}
                          onChange={() => selection.toggleRow(itemId)}
                          className="print-hidden"
                          aria-label="Select line item"
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {columns.map((column) => {
                    const content = column.renderCell({ item, index, canEdit });
                    const rawTooltip = column.getTooltip?.({ item, index, canEdit });
                    const tooltipContent = typeof rawTooltip === 'string' ? rawTooltip.trim() : undefined;
                    const node = React.isValidElement(content) ? content : <span>{content}</span>;
                    
                    // Always wrap in the same structure to prevent focus loss when tooltip content changes
                    const wrapped = (
                      <Tooltip 
                        title={tooltipContent || ""} 
                        arrow 
                        placement="top" 
                        enterDelay={400}
                        disableHoverListener={!tooltipContent}
                        disableFocusListener={!tooltipContent}
                        disableTouchListener={!tooltipContent}
                      >
                        <div className="w-full">{node}</div>
                      </Tooltip>
                    );

                    return (
                      <div key={column.id} className={column.className ?? "transaction-grid-cell"}>
                        {wrapped}
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="transaction-grid-empty">{effectivePlaceholder}</div>
          )}
        </div>
      </div>
    </div>
  );
}
