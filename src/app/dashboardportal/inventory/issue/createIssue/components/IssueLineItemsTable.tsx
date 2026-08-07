"use client";

import React from "react";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type {
	EditableLineItem,
	Option,
	IssueLabelResolvers,
} from "../types/issueTypes";
import { SearchableSelect } from "@/components/ui/transaction/SearchableSelect";
import { TextField, Tooltip } from "@mui/material";

type UseIssueLineItemColumnsParams = {
	canEdit: boolean;
	expenseOptions: readonly Option[];
	costFactorOptions: readonly Option[];
	machineOptions: readonly Option[];
	labelResolvers: IssueLabelResolvers;
	handleLineFieldChange: (
		id: string,
		field: keyof EditableLineItem,
		value: string | number
	) => void;
};

/**
 * Hook that returns the column definitions for the Issue line items table.
 * Simplified version - items come from InventorySearchTable pre-populated.
 * Only editable fields: Quantity, ExpenseType, CostFactor, Machine, Remarks.
 */
export const useIssueLineItemColumns = ({
	canEdit,
	expenseOptions,
	costFactorOptions,
	machineOptions,
	labelResolvers,
	handleLineFieldChange,
}: UseIssueLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] => {
	return React.useMemo(
		() => [
			// SR No (read-only - from inventory)
			{
				id: "grnNo",
				header: "SR No",
				width: "1fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<span className="text-xs font-medium">
						{item.grnNo || "-"}
					</span>
				),
				getTooltip: ({ item }) =>
					item.grnNo ? `SR: ${item.grnNo}, Inward Dtl ID: ${item.inwardDtlId}` : undefined,
			},

			// Item Code (read-only - from inventory, hierarchical full_item_code)
			{
				id: "itemCode",
				header: "Item Code",
				width: "0.9fr",
				minWidth: "110px",
				renderCell: ({ item }) => (
					<Tooltip title={item.itemCode || ""} placement="top">
						<span className="text-xs font-mono truncate block">
							{item.itemCode || "-"}
						</span>
					</Tooltip>
				),
				getTooltip: ({ item }) => item.itemCode || undefined,
			},

			// Item Name (read-only - from inventory)
			{
				id: "itemName",
				header: "Item Name",
				width: "1.2fr",
				minWidth: "160px",
				renderCell: ({ item }) => (
					<Tooltip title={item.itemName || ""} placement="top">
						<span className="text-xs truncate block">
							{item.itemName || "-"}
						</span>
					</Tooltip>
				),
				getTooltip: ({ item }) => item.itemName || undefined,
			},

			// UOM (read-only - from inventory)
			{
				id: "uom",
				header: "UOM",
				width: "0.6fr",
				minWidth: "70px",
				renderCell: ({ item }) => (
					<span className="text-xs">
						{item.uomName || "-"}
					</span>
				),
			},

			// Available Qty (read-only - from inventory)
			{
				id: "availableQty",
				header: "Avail",
				width: "0.6fr",
				minWidth: "70px",
				renderCell: ({ item }) => (
					<span className="text-xs text-right block text-gray-500">
						{item.availableQty ? parseFloat(item.availableQty).toFixed(2) : "-"}
					</span>
				),
			},

			// Quantity (editable)
			{
				id: "quantity",
				header: "Qty",
				width: "0.7fr",
				minWidth: "90px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs text-right block">{item.quantity}</span>;
					}
					const maxQty = parseFloat(item.availableQty || "0");
					return (
						<Tooltip
							title={maxQty > 0 ? `Max available: ${maxQty}` : ""}
							placement="top"
						>
							<TextField
								type="number"
								size="small"
								value={item.quantity}
								onChange={(e) =>
									handleLineFieldChange(item.id, "quantity", e.target.value)
								}
								inputProps={{
									min: 0,
									max: maxQty > 0 ? maxQty : undefined,
									step: "0.01",
									style: { textAlign: "right" },
								}}
								fullWidth
								error={maxQty > 0 && parseFloat(item.quantity || "0") > maxQty}
								helperText={
									maxQty > 0 && parseFloat(item.quantity || "0") > maxQty
										? "Exceeds"
										: undefined
								}
							/>
						</Tooltip>
					);
				},
			},

			// Rate (read-only - from inventory)
			{
				id: "rate",
				header: "Rate",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => (
					<span className="text-xs text-right block">
						{item.rate ? parseFloat(item.rate).toFixed(2) : "-"}
					</span>
				),
			},

			// Expense Type (editable)
			{
				id: "expenseType",
				header: "Expense Type",
				width: "1.1fr",
				minWidth: "160px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{labelResolvers.expense(item.expenseType)}
							</span>
						);
					}
					const value =
						expenseOptions.find((opt) => opt.value === item.expenseType) ?? null;
					return (
						<SearchableSelect
							options={expenseOptions as Option[]}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "expenseType", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Expense"
							textFieldProps={{ size: "small" }}
						/>
					);
				},
			},

			// Cost Factor (editable)
			{
				id: "costFactor",
				header: "Cost Factor",
				width: "1fr",
				minWidth: "200px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{labelResolvers.costFactor(item.costFactor)}
							</span>
						);
					}
					const value =
						costFactorOptions.find((opt) => opt.value === item.costFactor) ?? null;
					return (
						<SearchableSelect
							options={costFactorOptions as Option[]}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "costFactor", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Cost Factor"
							textFieldProps={{ size: "small" }}
						/>
					);
				},
			},

			// Machine (editable - filtered by dept on parent)
			{
				id: "machine",
				header: "Machine",
				width: "1fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{labelResolvers.machine(item.machine)}
							</span>
						);
					}
					const value =
						machineOptions.find((opt) => opt.value === item.machine) ?? null;
					return (
						<SearchableSelect
							options={machineOptions as Option[]}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "machine", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Machine"
							textFieldProps={{ size: "small" }}
						/>
					);
				},
			},

			// Remarks (editable)
			{
				id: "remarks",
				header: "Remarks",
				width: "0.9fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.remarks}</span>;
					}
					return (
						<TextField
							size="small"
							value={item.remarks}
							onChange={(e) =>
								handleLineFieldChange(item.id, "remarks", e.target.value)
							}
							placeholder="Remarks"
							fullWidth
						/>
					);
				},
			},
		],
		[canEdit, expenseOptions, costFactorOptions, machineOptions, labelResolvers, handleLineFieldChange]
	);
};
