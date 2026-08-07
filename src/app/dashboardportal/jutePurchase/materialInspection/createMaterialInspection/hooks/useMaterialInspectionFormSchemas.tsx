/**
 * @file useGateEntryFormSchemas.ts
 * @description Hook for generating MuiForm schema for gate entry.
 */

import * as React from "react";
import { TextField } from "@mui/material";
import type { MuiFormMode, Option } from "../types/MaterialInspectionTypes";
import { calculateNetWeight, calculateActualWeight } from "../utils/MaterialInspectionCalculations";

type UseGateEntryFormSchemasParams = {
	mode: MuiFormMode;
	branchOptions: Option[];
	mukamOptions: Option[];
	supplierOptions: Option[];
	partyOptions: Option[];
	poOptions: Option[];
	uomOptions: Option[];
	hasSupplierSelected: boolean;
	isSingleBranch: boolean;
	isEditMode: boolean;
};

export function useGateEntryFormSchemas({
	mode,
	branchOptions,
	mukamOptions,
	supplierOptions,
	partyOptions,
	poOptions,
	uomOptions,
	hasSupplierSelected,
	isSingleBranch,
	isEditMode,
}: UseGateEntryFormSchemasParams) {
	const isViewMode = mode === "view";

	return React.useMemo(
		() => ({
			fields: [
				// Row 1: Branch, Date
				{
					name: "branch",
					label: "Branch",
					type: "select" as const,
					required: true,
					options: branchOptions,
					disabled: true, // Always disabled - branch is set from gate entry and cannot be changed
					grid: { xs: 12, md: 4 },
				},
				{
					name: "entryDate",
					label: "Entry Date",
					type: "date" as const,
					required: true,
					disabled: true, // Always disabled - set from gate entry
					grid: { xs: 12, md: 4 },
				},

				// Row 2: Challan No, Challan Date, Vehicle No
				{
					name: "challanNo",
					label: "Challan No",
					type: "text" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "challanDate",
					label: "Challan Date",
					type: "date" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "vehicleNo",
					label: "Vehicle No",
					type: "text" as const,
					required: true,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},

				// Row 3: Driver Name, Transporter, PO (optional)
				{
					name: "driverName",
					label: "Driver Name",
					type: "text" as const,
					required: true,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "transporter",
					label: "Transporter",
					type: "text" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},

				// Row 4: PO Number (optional), Supplier (auto-filled from PO), Party
				{
					name: "poId",
					label: "PO Number",
					type: "select" as const,
					required: false,
					options: poOptions,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
					placeholder: "Select PO (Optional)",
				},
				{
					name: "supplier",
					label: "Supplier",
					type: "select" as const,
					required: false,
					options: supplierOptions,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "party",
					label: "Party",
					type: "select" as const,
					required: false,
					options: partyOptions,
					disabled: isViewMode || !hasSupplierSelected,
					grid: { xs: 12, md: 4 },
					placeholder: hasSupplierSelected ? "Select Party" : "Select Supplier first",
				},

				// Row 5: Jute UOM, Mukam, Marketing Slip
				{
					name: "juteUom",
					label: "Jute UOM",
					type: "select" as const,
					required: false,
					options: uomOptions,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "mukam",
					label: "Mukam",
					type: "select" as const,
					required: false,
					options: mukamOptions,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "marketingSlip",
					label: "Marketing Slip",
					type: "checkbox" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 4 },
				},

				// Row 6: Weights - Challan, Gross, Tare, Net (auto), Variable Shortage, Actual (auto)
				{
					name: "challanWeight",
					label: "Challan Weight (Kg)",
					type: "number" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 2 },
				},
				{
					name: "grossWeight",
					label: "Gross Weight (Kg)",
					type: "number" as const,
					required: true,
					disabled: isViewMode,
					grid: { xs: 12, md: 2 },
				},
				{
					name: "tareWeight",
					label: "Tare Weight (Kg)",
					type: "number" as const,
					required: false,
					disabled: true, // Always disabled - set from gate entry
					helperText: "Tare weight entry is done in Gate Entry",
					grid: { xs: 12, md: 2 },
					customValidate: (value: unknown, values: Record<string, unknown>) => {
						const tare = parseFloat(String(value)) || 0;
						const gross = parseFloat(String(values.grossWeight)) || 0;
						if (tare > 0 && gross > 0 && tare >= gross) {
							return "Tare weight must be less than gross weight";
						}
						return null;
					},
				},
				{
					name: "netWeight",
					label: "", // Empty label - the TextField inside render has its own label
					type: "custom" as const,
					required: false,
					grid: { xs: 12, md: 2 },
					render: ({ values }: { values: Record<string, unknown> }) => {
						const gross = parseFloat(String(values.grossWeight)) || 0;
						const tare = parseFloat(String(values.tareWeight)) || 0;
						const net = gross > 0 && tare > 0 && gross > tare ? calculateNetWeight(gross, tare) : 0;
						return (
							<TextField
								label="Net Weight (Kg)"
								value={net > 0 ? Math.round(net) : ""}
								disabled
								fullWidth
								size="small"
								InputProps={{ readOnly: true }}
							/>
						);
					},
				},
				{
					name: "variableShortage",
					label: "Variable Shortage (Kg)",
					type: "number" as const,
					required: false,
					disabled: true, // Always disabled - set from gate entry
					helperText: "Variable shortage entry is done in Gate Entry",
					grid: { xs: 12, md: 2 },
				},
				{
					name: "actualWeight",
					label: "", // Empty label - the TextField inside render has its own label
					type: "custom" as const,
					required: false,
					grid: { xs: 12, md: 2 },
					render: ({ values }: { values: Record<string, unknown> }) => {
						const gross = parseFloat(String(values.grossWeight)) || 0;
						const tare = parseFloat(String(values.tareWeight)) || 0;
						const shortage = parseFloat(String(values.variableShortage)) || 0;
						const net = gross > 0 && tare > 0 && gross > tare ? calculateNetWeight(gross, tare) : 0;
						const actual = net > 0 ? calculateActualWeight(net, shortage) : 0;
						return (
							<TextField
								label="Actual Weight (Kg)"
								value={actual > 0 ? Math.round(actual) : ""}
								disabled
								fullWidth
								size="small"
								InputProps={{ readOnly: true }}
							/>
						);
					},
				},

				// Row 7: Remarks (smaller)
				{
					name: "remarks",
					label: "Remarks",
					type: "text" as const,
					required: false,
					disabled: isViewMode,
					grid: { xs: 12, md: 12 },
					multiline: true,
					rows: 2,
				},

				
			],
		}),
		[
			mode,
			branchOptions,
			mukamOptions,
			supplierOptions,
			partyOptions,
			poOptions,
			uomOptions,
			hasSupplierSelected,
			isSingleBranch,
			isViewMode,
		]
	);
}
