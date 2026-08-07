"use client";

/**
 * @hook useJutePOFormSchemas
 * @description Generates MuiForm schema for Jute PO header form.
 */

import * as React from "react";
import type { Option, MuiFormMode } from "../types/jutePOTypes";

type FieldSchema = {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  required?: boolean;
  disabled?: boolean;
  options?: Option[];
  grid?: { xs?: number; sm?: number; md?: number };
  placeholder?: string;
  customValidate?: (value: unknown, values: Record<string, unknown>) => string | undefined;
};

type Schema = {
  fields: FieldSchema[];
};

type UseJutePOFormSchemasParams = {
  mode: MuiFormMode;
  branchOptions: Option[];
  mukamOptions: Option[];
  vehicleTypeOptions: Option[];
  supplierOptions: Option[];
  partyOptions: Option[];
  channelOptions: Option[];
  unitOptions: Option[];
  hasSupplierSelected: boolean;
};

export function useJutePOFormSchemas({
  mode,
  branchOptions,
  mukamOptions,
  vehicleTypeOptions,
  supplierOptions,
  partyOptions,
  channelOptions,
  unitOptions,
  hasSupplierSelected,
}: UseJutePOFormSchemasParams): Schema {
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  return React.useMemo(() => {
    const fields: FieldSchema[] = [
      // Row 1: Branch, PO Date, With/Without Indent
      {
        name: "branch",
        label: "Branch",
        type: "select",
        required: true,
        disabled: isViewMode || isEditMode,
        options: branchOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "poDate",
        label: "PO Date",
        type: "date",
        required: true,
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "withWithoutIndent",
        label: "Indent Type",
        type: "select",
        required: true,
        disabled: true, // Always disabled for now
        options: [
          { label: "Without Indent", value: "WITHOUT" },
          { label: "With Indent", value: "WITH" },
        ],
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "indentNo",
        label: "Indent No",
        type: "text",
        disabled: true, // Always disabled for now
        grid: { xs: 12, sm: 6, md: 3 },
      },

      // Row 2: Mukam, Unit, Supplier, Party
      {
        name: "mukam",
        label: "Mukam",
        type: "select",
        required: true,
        disabled: isViewMode,
        options: mukamOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "juteUnit",
        label: "Unit Conversion",
        type: "select",
        required: true,
        disabled: isViewMode,
        options: unitOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "supplier",
        label: "Supplier",
        type: "select",
        required: true,
        disabled: isViewMode,
        options: supplierOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "partyName",
        label: "Party Name",
        type: "select",
        disabled: isViewMode || !hasSupplierSelected, // Disabled until supplier is selected
        options: partyOptions,
        grid: { xs: 12, sm: 6, md: 3 },
        placeholder: hasSupplierSelected ? "Select party" : "Select supplier first",
      },

      // Row 3: Vehicle Type, Vehicle Qty, Channel Type, Credit Term
      {
        name: "vehicleType",
        label: "Vehicle Type",
        type: "select",
        required: true,
        disabled: isViewMode,
        options: vehicleTypeOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "vehicleQty",
        label: "Vehicle Qty",
        type: "number",
        required: true,
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
        customValidate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num <= 0) {
            return "Vehicle Qty must be greater than 0";
          }
          return undefined;
        },
      },
      {
        name: "channelType",
        label: "Channel Type",
        type: "select",
        required: true,
        disabled: isViewMode,
        options: channelOptions,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "creditTerm",
        label: "Credit Term (Days)",
        type: "number",
        required: true,
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
      },

      // Row 4: Delivery Timeline, Expected Date, Freight Charges, Remarks
      {
        name: "deliveryTimeline",
        label: "Delivery Timeline (Days)",
        type: "number",
        required: true,
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "expectedDate",
        label: "Expected Date",
        type: "date",
        disabled: true, // Always readonly (auto-calculated)
        grid: { xs: 12, sm: 6, md: 3 },
      },
      {
        name: "freightCharge",
        label: "Freight Charges",
        type: "number",
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
        placeholder: "Optional",
      },
      {
        name: "remarks",
        label: "Remarks",
        type: "text",
        disabled: isViewMode,
        grid: { xs: 12, sm: 6, md: 3 },
        placeholder: "Optional",
      },
    ];

    return { fields };
  }, [
    mode,
    isViewMode,
    isEditMode,
    branchOptions,
    mukamOptions,
    vehicleTypeOptions,
    supplierOptions,
    partyOptions,
    channelOptions,
    unitOptions,
    hasSupplierSelected,
  ]);
}
