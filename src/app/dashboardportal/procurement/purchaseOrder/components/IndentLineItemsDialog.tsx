"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Option } from "@/components/ui/muiform";
import { getAllApprovedIndents, getIndentLineItems, type ApprovedIndent } from "@/utils/poService";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

export type IndentLineItem = {
  indent_dtl_id: number;
  indent_id: number;
  indent_no: string;
  /** Indent type from proc_indent.indent_type_id — e.g. "Regular", "Open", "BOM" */
  indent_type?: string;
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  item_grp_id: number;
  item_grp_code: string;
  item_grp_name: string;
  qty: number;
  /** Outstanding (unfulfilled) qty for this indent line — from vw_proc_indent_outstanding */
  outstanding_qty?: number;
  /** Minimum order quantity step from item master */
  min_order_qty?: number;
  uom_id: number;
  uom_name: string;
  item_make_id?: number;
  item_make_name?: string;
  dept_id?: number;
  dept_name?: string;
  tax_percentage?: number;
  remarks?: string;
  expense_type_id?: number;
};

type IndentLineItemsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedItems: IndentLineItem[]) => void;
  branchId?: number | string;
  coId?: number | string;
  poDate?: string;
};

export function IndentLineItemsDialog({
  open,
  onOpenChange,
  onConfirm,
  branchId,
  coId,
  poDate,
}: IndentLineItemsDialogProps) {
  const [selectedIndent, setSelectedIndent] = React.useState<ApprovedIndent | null>(null);
  const [approvedIndents, setApprovedIndents] = React.useState<ApprovedIndent[]>([]);
  const [indentOptions, setIndentOptions] = React.useState<Option[]>([]);
  const [lineItems, setLineItems] = React.useState<IndentLineItem[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [loadingIndents, setLoadingIndents] = React.useState(false);
  const [loadingLineItems, setLoadingLineItems] = React.useState(false);

  const loadApprovedIndents = React.useCallback(async () => {
    if (!branchId) return;
    setLoadingIndents(true);
    try {
      const branchIdNum = typeof branchId === "string" ? Number(branchId) : branchId;
      const coIdNum = coId ? (typeof coId === "string" ? Number(coId) : coId) : undefined;
      const response = await getAllApprovedIndents(branchIdNum, coIdNum);
      const indents = (response.data || []).filter((indent) => {
        if (!poDate) return true;
        return indent.indent_date <= poDate;
      });
      setApprovedIndents(indents);
      const options: Option[] = indents.map((indent) => ({
        label: `${indent.indent_no} - ${indent.branch_name} (${indent.indent_date})`,
        value: String(indent.indent_id),
      }));
      setIndentOptions(options);
    } catch (error) {
      console.error("Error loading approved indents:", error);
    } finally {
      setLoadingIndents(false);
    }
  }, [branchId, coId, poDate]);

  // Load approved indents when dialog opens
  React.useEffect(() => {
    if (open) {
      loadApprovedIndents();
    }
  }, [open, branchId, coId, loadApprovedIndents]);

  const handleIndentSelect = React.useCallback(async (indentId: string | null) => {
    if (!indentId) {
      setSelectedIndent(null);
      setLineItems([]);
      setSelectedItems(new Set());
      return;
    }

    // Find the indent in the approvedIndents array
    const indent = approvedIndents.find((i) => String(i.indent_id) === indentId);
    if (!indent) {
      console.error("[IndentDialog] Indent not found for ID:", indentId, "Available indents:", approvedIndents.map(i => i.indent_id));
      return;
    }

    setSelectedIndent(indent);
    setLoadingLineItems(true);
    setSelectedItems(new Set()); // Reset selection when new indent is selected
    try {
      const response = await getIndentLineItems(indentId);
      const itemsWithExpense = (response.line_items || []).map((item: any) => ({
        ...item,
        expense_type_id: response.expenseType ? Number(response.expenseType) : undefined,
      }));
      setLineItems(itemsWithExpense as IndentLineItem[]);
    } catch (error) {
      console.error("Error loading indent line items:", error);
      setLineItems([]);
    } finally {
      setLoadingLineItems(false);
    }
  }, [approvedIndents]);

  React.useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedIndent(null);
      setLineItems([]);
      setSelectedItems(new Set());
    }
  }, [open]);

  const handleToggleItem = React.useCallback((indentDtlId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(indentDtlId)) {
        next.delete(indentDtlId);
      } else {
        next.add(indentDtlId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = React.useCallback(() => {
    if (selectedItems.size === lineItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(lineItems.map((item) => item.indent_dtl_id)));
    }
  }, [lineItems, selectedItems.size]);

  const handleConfirm = React.useCallback(() => {
    const selected = lineItems.filter((item) => selectedItems.has(item.indent_dtl_id));
    onConfirm(selected);
    onOpenChange(false);
  }, [lineItems, selectedItems, onConfirm, onOpenChange]);


  const allSelected = lineItems.length > 0 && selectedItems.size === lineItems.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < lineItems.length;

  const selectedIndentOption: Option | null = selectedIndent
    ? { label: `${selectedIndent.indent_no} - ${selectedIndent.branch_name} (${selectedIndent.indent_date})`, value: String(selectedIndent.indent_id) }
    : null;

  // Ref to control the Autocomplete open state
  const [autocompleteOpen, setAutocompleteOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-y-visible">
        <DialogHeader>
          <DialogTitle>Select Indent and Line Items</DialogTitle>
          <DialogDescription>
            Select an approved indent to view its line items. Select the items you want to add to the PO.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-visible">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Approved Indent</label>
            <Autocomplete<Option, false, false, false>
              open={autocompleteOpen}
              onOpen={() => setAutocompleteOpen(true)}
              onClose={() => setAutocompleteOpen(false)}
              options={indentOptions}
              value={selectedIndentOption}
              onChange={(_, newOpt) => {
                // Close the dropdown immediately on selection
                setAutocompleteOpen(false);
                
                if (!newOpt) {
                  handleIndentSelect(null);
                  return;
                }
                // newOpt is the full Option object with { label, value }
                // Find the indent from approvedIndents using the value
                const indentId = String(newOpt.value);
                const indent = approvedIndents.find((i) => String(i.indent_id) === indentId);
                if (indent) {
                  // Set the indent immediately and load line items
                  setSelectedIndent(indent);
                  setLoadingLineItems(true);
                  setSelectedItems(new Set());
                  getIndentLineItems(indentId)
                    .then((response) => {
                      const itemsWithExpense = (response.line_items || []).map((item: any) => ({
                        ...item,
                        expense_type_id: response.expenseType ? Number(response.expenseType) : undefined,
                      }));
                      setLineItems(itemsWithExpense as IndentLineItem[]);
                    })
                    .catch((error) => {
                      console.error("Error loading indent line items:", error);
                      setLineItems([]);
                    })
                    .finally(() => {
                      setLoadingLineItems(false);
                    });
                }
              }}
              getOptionLabel={(opt: Option) => opt.label}
              isOptionEqualToValue={(o: Option, v: Option) => String(o.value) === String(v.value)}
              disabled={loadingIndents}
              loading={loadingIndents}
              noOptionsText="No indents available"
              disablePortal
              openOnFocus
              blurOnSelect
              selectOnFocus
              handleHomeEndKeys
              ListboxProps={{ style: { maxHeight: 260, overflowY: "auto" } }}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li
                    key={key}
                    {...otherProps}
                  >
                    {option.label}
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={loadingIndents ? "Loading indents..." : "Search and select an indent"}
                  size="small"
                  fullWidth
                />
              )}
            />
          </div>

          {loadingLineItems && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading line items...
            </div>
          )}

          {!loadingLineItems && lineItems.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-md min-h-0">
              <div className="sticky top-0 bg-background border-b z-10 p-2 flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = someSelected;
                    }
                  }}
                />
                <span className="text-sm font-medium">Select All</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {selectedItems.size} of {lineItems.length} selected
                </span>
              </div>

              <div className="divide-y">
                {lineItems.map((item) => {
                  const isSelected = selectedItems.has(item.indent_dtl_id);
                  return (
                    <div
                      key={item.indent_dtl_id}
                      className="p-3 hover:bg-muted/50 flex items-start gap-3"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleItem(item.indent_dtl_id)}
                        className="mt-1"
                      />
                      <div className="flex-1 grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-2 min-w-0">
                          <div className="font-medium truncate">{item.full_item_code || item.item_code || "-"}</div>
                          <div className="text-muted-foreground text-xs truncate">{item.item_name || "-"}</div>
                        </div>
                        <div className="col-span-3 min-w-0">
                          <div className="text-muted-foreground text-xs">Item Group</div>
                          <div className="wrap-break-word">{item.item_grp_code || "-"} {item.item_grp_name ? `- ${item.item_grp_name}` : ""}</div>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="text-muted-foreground text-xs">Quantity</div>
                          <div>{item.qty || 0} {item.uom_name || ""}</div>
                          {item.outstanding_qty !== undefined && item.outstanding_qty !== null && (
                            <div className="text-xs text-amber-600 mt-0.5">
                              Outstanding: {item.outstanding_qty} {item.uom_name || ""}
                            </div>
                          )}
                        </div>
                        <div className="col-span-1 min-w-0">
                          <div className="text-muted-foreground text-xs">Make</div>
                          <div className="truncate">{item.item_make_name || "-"}</div>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="text-muted-foreground text-xs">Department</div>
                          <div className="truncate">{item.dept_name || "-"}</div>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="text-muted-foreground text-xs">Tax %</div>
                          <div>{item.tax_percentage ? `${item.tax_percentage}%` : "-"}</div>
                        </div>
                        {item.remarks && (
                          <div className="col-span-12 mt-1">
                            <div className="text-muted-foreground text-xs">Remarks</div>
                            <div className="text-xs">{item.remarks}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loadingLineItems && lineItems.length === 0 && selectedIndent && (
            <div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
              No line items available for this indent.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedItems.size === 0 || loading || lineItems.length === 0}
          >
            Add Selected Items ({selectedItems.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

