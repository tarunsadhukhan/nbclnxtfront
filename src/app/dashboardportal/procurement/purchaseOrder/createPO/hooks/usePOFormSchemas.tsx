import React from "react";

import type { Schema, Field } from "@/components/ui/muiform";
import { TextField } from "@mui/material";

import type { Option } from "../types/poTypes";




export type UsePOHeaderSchemaParams = {
  branchOptions: Option[];
  supplierOptions: Option[];
  brokerOptions: Option[];
  supplierBranchOptions: Option[];
  branchAddressOptions: Option[];
  projectOptions: Option[];
  expenseOptions: Option[];
  coConfig?: { india_gst?: number };
  billingState?: string;
  shippingState?: string;
  taxType: string;
  expectedDate: string;
  mode: "create" | "edit" | "view";
  headerFieldsDisabled: boolean;
  /** When true, expense type and PO type are locked (line items already exist). */
  hasLineItems: boolean;
};

export type UsePOFooterSchemaParams = {
  coConfig?: { india_gst?: number };
  billingState?: string;
  shippingState?: string;
  taxType: string;
};

/**
 * Builds the header form schema for the PO create/edit page.
 */
export const usePOHeaderSchema = ({
  branchOptions,
  supplierOptions,
  brokerOptions,
  supplierBranchOptions,
  branchAddressOptions,
  projectOptions,
  expenseOptions,
  coConfig,
  billingState,
  shippingState,
  taxType,
  expectedDate,
  mode,
  headerFieldsDisabled,
  hasLineItems,
}: UsePOHeaderSchemaParams): Schema =>
  React.useMemo(() => {
    const fields: Field[] = [
      {
        name: "branch",
        label: "Branch",
        type: "select",
        options: branchOptions,
        required: true,
        disabled: mode !== "create",
        grid: { xs: 12, md: 4 },
      },
      { name: "date", label: "PO Date", type: "date", required: true, disabled: mode === "view", grid: { xs: 12, md: 4 } },
      { name: "supplier", label: "Supplier", type: "select", options: supplierOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "broker", label: "Broker", type: "select", options: brokerOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "supplier_branch", label: "Supplier Branch", type: "select", options: supplierBranchOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "billing_address", label: "Billing Address", type: "select", options: branchAddressOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "shipping_address", label: "Shipping Address", type: "select", options: branchAddressOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "tax_payable", label: "Tax Payable", type: "select", options: [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }], required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      {
        name: "credit_term",
        label: "Credit Term (days)",
        type: "custom",
        hideLabel: true,
        disabled: headerFieldsDisabled,
        render: ({ value, onChange, disabled: fieldDisabled }) => (
          <TextField
            label="Credit Term (days)"
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") { onChange(""); return; }
              // Allow only digits (no decimals, no signs)
              if (/^\d+$/.test(raw)) { onChange(raw); }
            }}
            onKeyDown={(e) => {
              if ([".", ",", "e", "E", "+", "-"].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (!/^\d+$/.test(pasted)) { e.preventDefault(); }
            }}
            type="number"
            inputProps={{ step: 1, min: 0 }}
            placeholder="days"
            disabled={fieldDisabled}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        ),
        grid: { xs: 12, md: 4 },
      },
      {
        name: "delivery_timeline",
        label: "Delivery Timeline (days)",
        type: "custom",
        hideLabel: true,
        required: true,
        disabled: headerFieldsDisabled,
        isEmpty: (value) => value === null || value === undefined || String(value).trim() === "",
        render: ({ value, onChange, disabled: fieldDisabled }) => (
          <TextField
            label="Delivery Timeline (days) *"
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") { onChange(""); return; }
              // Allow only digits (no decimals, no signs)
              if (/^\d+$/.test(raw)) { onChange(raw); }
            }}
            onKeyDown={(e) => {
              if ([".", ",", "e", "E", "+", "-"].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (!/^\d+$/.test(pasted)) { e.preventDefault(); }
            }}
            type="number"
            inputProps={{ step: 1, min: 0 }}
            placeholder="days"
            disabled={fieldDisabled}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        ),
        grid: { xs: 12, md: 4 },
      },
      {
        name: "expected_date",
        label: "Expected Date",
        type: "custom",
        hideLabel: true,
        render: () => (
          <TextField
            label="Expected Date"
            value={expectedDate || ""}
            disabled
            fullWidth
            size="small"
            placeholder="Auto-calculated"
            helperText={expectedDate ? undefined : "Set delivery timeline"}
            InputLabelProps={{ shrink: true }}
          />
        ),
        grid: { xs: 12, md: 4 },
      },
      { name: "expense_type", label: "Expense Type", type: "select", options: expenseOptions, required: true, disabled: headerFieldsDisabled || hasLineItems, grid: { xs: 12, md: 4 } },
      {
        name: "po_type",
        label: "PO Type",
        type: "select",
        options: [
          { label: "Regular", value: "Regular" },
          { label: "Open", value: "Open" },
        ],
        required: true,
        disabled: headerFieldsDisabled || hasLineItems,
        grid: { xs: 12, md: 4 },
      },
      { name: "project", label: "Project", type: "select", options: projectOptions, required: false, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "contact_person", label: "Contact Person", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
      { name: "contact_no", label: "Contact No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
    ];

    return { fields } satisfies Schema;
  }, [
    branchOptions,
    supplierOptions,
    brokerOptions,
    supplierBranchOptions,
    branchAddressOptions,
    projectOptions,
    expenseOptions,
    coConfig,
    billingState,
    shippingState,
    taxType,
    expectedDate,
    mode,
    headerFieldsDisabled,
    hasLineItems,
  ]);

/** Builds the schema for footer-only fields rendered below the line items. */
export const usePOFooterSchema = ({ coConfig, billingState, shippingState, taxType }: UsePOFooterSchemaParams): Schema =>
  React.useMemo(() => {
    const fields: Field[] = [
      { name: "footer_note", label: "Footer Note", type: "textarea", minRows: 1, grid: { xs: 12 } },
      { name: "internal_note", label: "Internal Note", type: "textarea", minRows: 1, grid: { xs: 12 } },
      { name: "terms_conditions", label: "Terms and Conditions", type: "textarea", minRows: 1, grid: { xs: 12 } },
      { name: "advance_percentage", label: "Advance Percentage", type: "text", grid: { xs: 12, md: 4 } },
    ];

    return { fields } satisfies Schema;
  }, [coConfig, billingState, shippingState, taxType]);
