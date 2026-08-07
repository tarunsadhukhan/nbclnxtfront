/**
 * @file useGateEntryLineItemColumns.tsx
 * @description Hook for generating line item column definitions.
 */

import * as React from "react";
import { SearchableSelect } from "@/components/ui/transaction";
import { TextField } from "@mui/material";
import { MenuItem, Select } from "@mui/material";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { GateEntryLineItem, Option, JuteItemRecord, JuteQualityRecord } from "../types/MaterialInspectionTypes";
import { UOM_OPTIONS } from "../utils/MaterialInspectionConstants";
import { MoistureButton } from "../components/MoistureReadingDialog";

type UseGateEntryLineItemColumnsParams = {
	canEdit: boolean;
	juteItems: JuteItemRecord[];
	qualitiesByItem: Record<string, JuteQualityRecord[]>;
	handleLineFieldChange: (id: string, field: keyof GateEntryLineItem, value: string) => void;
	getItemLabel: (itemId: string) => string;
	getQualityLabel: (qualityId: string) => string;
	// Moisture dialog handler
	onOpenMoistureDialog?: (lineItemId: string) => void;
};

export function useGateEntryLineItemColumns({
	canEdit,
	juteItems,
	qualitiesByItem,
	handleLineFieldChange,
	getItemLabel,
	getQualityLabel,
	onOpenMoistureDialog,
}: UseGateEntryLineItemColumnsParams): TransactionLineColumn<GateEntryLineItem>[] {
	// Build item options
	const itemOptions = React.useMemo<Option[]>(
		() =>
			juteItems.map((i) => ({
				label: i.item_grp_desc,
				value: String(i.item_grp_id),
			})),
		[juteItems]
	);

	// Get quality options for a specific item
	const getQualityOptions = React.useCallback(
		(itemId: string): Option[] => {
			const qualities = qualitiesByItem[itemId] ?? [];
			return qualities.map((q) => ({
				label: q.quality_name,
				value: String(q.item_id),
			}));
		},
		[qualitiesByItem]
	);

	return React.useMemo(
		(): TransactionLineColumn<GateEntryLineItem>[] => [
			// Challan columns
			{
				id: "challanItem",
				header: "Challan Item",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{getItemLabel(item.challanItem)}</span>;
					}
					const value = itemOptions.find((opt) => opt.value === item.challanItem) ?? null;
					return (
						<SearchableSelect
							options={itemOptions}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "challanItem", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select item"
						/>
					);
				},
				getTooltip: ({ item }) => getItemLabel(item.challanItem) || undefined,
			},
			{
				id: "challanQuality",
				header: "Challan Quality",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{getQualityLabel(item.challanQuality)}</span>;
					}
					const qualityOpts = getQualityOptions(item.challanItem);
					const value = qualityOpts.find((opt) => opt.value === item.challanQuality) ?? null;
					return (
						<SearchableSelect
							options={qualityOpts}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "challanQuality", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder={item.challanItem ? "Select quality" : "Select item first"}
							disabled={!item.challanItem}
						/>
					);
				},
				getTooltip: ({ item }) => getQualityLabel(item.challanQuality) || undefined,
			},
			{
				id: "challanQty",
				header: "Challan Qty",
				width: "0.8fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.challanQty || "-"}</span>;
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.challanQty}
							onChange={(e) =>
								handleLineFieldChange(item.id, "challanQty", e.target.value)
							}
							placeholder="Qty"
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
			},
			{
				id: "challanWeight",
				header: "Challan Wt",
				width: "0.8fr",
				renderCell: ({ item }) => (
					<span className="text-xs text-slate-600">
						{item.challanWeight ? Math.round(parseFloat(item.challanWeight)) : "-"}
					</span>
				),
			},

			// Actual columns
			{
				id: "actualItem",
				header: "Actual Item",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{getItemLabel(item.actualItem)}</span>;
					}
					const value = itemOptions.find((opt) => opt.value === item.actualItem) ?? null;
					return (
						<SearchableSelect
							options={itemOptions}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "actualItem", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select item"
						/>
					);
				},
				getTooltip: ({ item }) => getItemLabel(item.actualItem) || undefined,
			},
			{
				id: "actualQuality",
				header: "Actual Quality",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{getQualityLabel(item.actualQuality)}</span>;
					}
					const qualityOpts = getQualityOptions(item.actualItem);
					const value = qualityOpts.find((opt) => opt.value === item.actualQuality) ?? null;
					return (
						<SearchableSelect
							options={qualityOpts}
							value={value}
							onChange={(next) =>
								handleLineFieldChange(item.id, "actualQuality", next?.value ?? "")
							}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder={item.actualItem ? "Select quality" : "Select item first"}
							disabled={!item.actualItem}
						/>
					);
				},
				getTooltip: ({ item }) => getQualityLabel(item.actualQuality) || undefined,
			},
			{
				id: "actualQty",
				header: "Actual Qty",
				width: "0.8fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.actualQty || "-"}</span>;
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualQty}
							onChange={(e) =>
								handleLineFieldChange(item.id, "actualQty", e.target.value)
							}
							placeholder="Qty"
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
			},
			{
				id: "actualWeight",
				header: "Actual Wt",
				width: "0.8fr",
				renderCell: ({ item }) => (
					<span className="text-xs text-slate-600">
						{item.actualWeight ? Math.round(parseFloat(item.actualWeight)) : "-"}
					</span>
				),
			},
			// UOM column
			{
				id: "juteUom",
				header: "UOM",
				width: "0.7fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.juteUom || "-"}</span>;
					}
					return (
						<Select
							size="small"
							value={item.juteUom || ""}
							onChange={(e) =>
								handleLineFieldChange(item.id, "juteUom", e.target.value)
							}
							displayEmpty
							sx={{ "& .MuiSelect-select": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						>
							<MenuItem value="" sx={{ fontSize: "0.75rem" }}>
								<em>-</em>
							</MenuItem>
							{UOM_OPTIONS.map((opt) => (
								<MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.75rem" }}>
									{opt.label}
								</MenuItem>
							))}
						</Select>
					);
				},
			},
			// Allowable Moisture column
			{
				id: "allowableMoisture",
				header: "Allow. Moist %",
				width: "0.8fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.allowableMoisture || "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.allowableMoisture}
							onChange={(e) =>
								handleLineFieldChange(item.id, "allowableMoisture", e.target.value)
							}
							placeholder="%"
							inputProps={{ min: 0, max: 100, step: 0.1 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
			},
			// Moisture Reading button column
			{
				id: "moistureReading",
				header: "Moisture",
				width: "0.7fr",
				renderCell: ({ item }) => {
					const hasReadings = item.moistureReadings && item.moistureReadings.length > 0;
					
					if (!canEdit && !hasReadings) {
						return <span className="text-xs text-slate-400">-</span>;
					}
					
					if (!canEdit && hasReadings) {
						return (
							<span className="text-xs font-medium text-green-600">
								{item.averageMoisture != null ? `${item.averageMoisture.toFixed(1)}%` : "-"}
							</span>
						);
					}
					
					return (
						<MoistureButton
							onClick={() => onOpenMoistureDialog?.(item.id)}
							hasReadings={hasReadings}
							averageMoisture={item.averageMoisture}
							disabled={!canEdit}
						/>
					);
				},
			},
		],
		[
			canEdit,
			itemOptions,
			getQualityOptions,
			handleLineFieldChange,
			getItemLabel,
			getQualityLabel,
			onOpenMoistureDialog,
		]
	);
}
