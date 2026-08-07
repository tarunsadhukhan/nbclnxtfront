"use client";

import React from "react";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import { SearchableSelect } from "@/components/ui/transaction";
import TextField from "@mui/material/TextField";
import type { EditableLineItem, Option, InwardLabelResolvers } from "../types/inwardTypes";

type UseInwardLineItemColumnsParams = {
	canEdit: boolean;
	labelResolvers: InwardLabelResolvers;
	getUomOptions: (groupId: string, itemId: string) => readonly Option[];
	handleLineFieldChange: (id: string, field: keyof EditableLineItem, value: string) => void;
};

/**
 * Hook to generate column definitions for inward line items table.
 *
 * Items can only be added via the "Add Items" dialog or "Select from PO"
 * dialog — there are no inline item group / item dropdowns. The table
 * displays the full item code (from the backend view) alongside the
 * item name, and keeps HSN, Qty, UOM, and Remarks editable.
 */
export const useInwardLineItemColumns = ({
	canEdit,
	labelResolvers,
	getUomOptions,
	handleLineFieldChange,
}: UseInwardLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] => {
	return React.useMemo(
		() => [
			// PO No column (read-only, shows source PO)
			{
				id: "poNo",
				header: "PO No.",
				width: "1fr",
				minWidth: "100px",
				renderCell: ({ item }) => (
					<span className="text-sm text-muted-foreground">{item.poNo || "-"}</span>
				),
				getTooltip: ({ item }) => item.poNo || undefined,
			},
			// Full Item Code column (read-only)
			{
				id: "itemCode",
				header: "Item Code",
				width: "1.5fr",
				minWidth: "150px",
				renderCell: ({ item }) => (
					<span className="block truncate text-sm font-mono text-slate-700">
						{item.itemCode || "-"}
					</span>
				),
				getTooltip: ({ item }) => item.itemCode || undefined,
			},
			// Item Name column (read-only)
			{
				id: "item",
				header: "Item",
				width: "2.4fr",
				minWidth: "225px",
				renderCell: ({ item }) => {
					const label = labelResolvers.item(item.itemGroup, item.item);
					return <span className="text-sm">{label || item.itemCode || "-"}</span>;
				},
				getTooltip: ({ item }) =>
					labelResolvers.item(item.itemGroup, item.item) || item.itemCode || undefined,
			},
			// HSN Code column
			{
				id: "hsnCode",
				header: "HSN",
				width: "1fr",
				minWidth: "100px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-sm">{item.hsnCode || "-"}</span>;
					}
					return (
						<TextField
							size="small"
							value={item.hsnCode || ""}
							onChange={(e) => handleLineFieldChange(item.id, "hsnCode", e.target.value)}
							placeholder="HSN Code"
							InputProps={{ readOnly: !!item.poDtlId }}
							sx={{ "& .MuiInputBase-input": { padding: "4px 8px", fontSize: "0.875rem" } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => item.hsnCode || undefined,
			},
			// Quantity column
			{
				id: "quantity",
				header: "Qty",
				width: "0.8fr",
				minWidth: "70px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-sm text-right w-full block">{item.quantity || "-"}</span>;
					}
					const hasError = Boolean(item.rowError);
					return (
						<div className="w-full">
							<TextField
								size="small"
								type="number"
								value={item.quantity}
								onChange={(e) => handleLineFieldChange(item.id, "quantity", e.target.value)}
								inputProps={{ min: 0, step: 1, className: "text-right text-sm" }}
								sx={{ "& .MuiInputBase-input": { padding: "4px 8px" } }}
								error={hasError}
								fullWidth
							/>
							{hasError ? (
								<span className="block text-[11px] text-red-600 mt-0.5 leading-tight">
									{item.rowError}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					if (item.rowError) return item.rowError;
					if (item.orderedQty != null && item.receivedQty != null) {
						const pending = item.orderedQty - item.receivedQty;
						return `Ordered: ${item.orderedQty}, Received: ${item.receivedQty}, Pending: ${pending}`;
					}
					return undefined;
				},
			},
			// UOM column
			{
				id: "uom",
				header: "UOM",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-sm">
								{labelResolvers.uom(item.itemGroup, item.item, item.uom)}
							</span>
						);
					}
					const options = getUomOptions(item.itemGroup, item.item);
					const value = options.find((opt) => opt.value === item.uom) ?? null;
					return (
						<SearchableSelect
							options={[...options]}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "uom", next?.value ?? "")}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="UOM"
							disabled={!item.item || !!item.poDtlId}
						/>
					);
				},
				getTooltip: ({ item }) =>
					labelResolvers.uom(item.itemGroup, item.item, item.uom) || undefined,
			},
			// Remarks column
			{
				id: "remarks",
				header: "Remarks",
				width: "1.2fr",
				minWidth: "120px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-sm">{item.remarks || "-"}</span>;
					}
					return (
						<TextField
							size="small"
							value={item.remarks}
							onChange={(e) => handleLineFieldChange(item.id, "remarks", e.target.value)}
							placeholder="Remarks"
							sx={{ "& .MuiInputBase-input": { padding: "4px 8px", fontSize: "0.875rem" } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => item.remarks || undefined,
			},
		],
		[canEdit, labelResolvers, getUomOptions, handleLineFieldChange]
	);
};
