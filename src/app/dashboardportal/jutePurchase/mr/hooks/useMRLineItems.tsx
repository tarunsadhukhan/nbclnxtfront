import * as React from "react";
import { TextField } from "@mui/material";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import { SearchableSelect } from "@/components/ui/transaction";
import type { MRLineItem } from "../types/mrTypes";

type WarehouseOption = { value: number; label: string };

type UseMRLineItemsParams = {
	canEdit: boolean;
	handleLineFieldChange: (id: string, field: keyof MRLineItem, value: string | number | null) => void;
	warehouseOptions: WarehouseOption[];
};

export function useMRLineItems({
	canEdit,
	handleLineFieldChange,
	warehouseOptions,
}: UseMRLineItemsParams): TransactionLineColumn<MRLineItem>[] {
	return React.useMemo(
		(): TransactionLineColumn<MRLineItem>[] => [
			{
				id: "actualItemName",
				header: "Item",
				width: "1.4fr",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.actualItemName || "-"}</span>
				),
				getTooltip: ({ item }) => item.actualItemName || undefined,
			},
			{
				id: "actualQualityName",
				header: "Actual Quality",
				width: "1.2fr",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.actualQualityName || "-"}</span>
				),
				getTooltip: ({ item }) => item.actualQualityName || undefined,
			},
			{
				id: "unitConversion",
				header: "UOM",
				width: "0.6fr",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.unitConversion || "-"}</span>
				),
				getTooltip: ({ item }) => item.unitConversion || undefined,
			},
			{
				id: "actualQty",
				header: "Actual Qty",
				width: "0.9fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualQty != null ? item.actualQty.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualQty ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualQty",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualQty != null ? `Actual Qty: ${item.actualQty.toFixed(2)}` : undefined,
			},
			{
				id: "actualWeight",
				header: "Actual Weight",
				width: "1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualWeight != null ? item.actualWeight.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualWeight ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualWeight",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualWeight != null ? `Actual Weight: ${item.actualWeight.toFixed(2)}` : undefined,
			},
			{
				id: "allowableMoisture",
				header: "Allowable Moisture (%)",
				width: "1.1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.allowableMoisture != null ? item.allowableMoisture.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.allowableMoisture ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"allowableMoisture",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.allowableMoisture != null
						? `Allowable Moisture: ${item.allowableMoisture.toFixed(2)}%`
						: undefined,
			},
			{
				id: "actualMoisture",
				header: "Actual Moisture (%)",
				width: "1.1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualMoisture != null ? item.actualMoisture.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualMoisture ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualMoisture",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualMoisture != null ? `Actual Moisture: ${item.actualMoisture.toFixed(2)}%` : undefined,
			},
			{
				id: "claimDust",
				header: "Claim Dust (%)",
				width: "1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.claimDust != null ? item.claimDust.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.claimDust ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"claimDust",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.claimDust != null ? `Claim Dust: ${item.claimDust.toFixed(2)}%` : undefined,
			},
			{
				id: "shortageKgs",
				header: "Shortage (kgs)",
				width: "1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.shortageKgs != null ? item.shortageKgs.toFixed(0) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.shortageKgs ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"shortageKgs",
									e.target.value ? parseInt(e.target.value, 10) : null
								)
							}
							inputProps={{ min: 0, step: 1 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.shortageKgs != null ? `Shortage: ${item.shortageKgs.toFixed(0)} kgs` : undefined,
			},
			{
				id: "acceptedWeight",
				header: "Accepted Weight",
				width: "1.1fr",
				renderCell: ({ item }) => (
					<span className="text-xs font-semibold">
						{item.acceptedWeight != null ? item.acceptedWeight.toFixed(2) : "-"}
					</span>
				),
				getTooltip: ({ item }) =>
					item.acceptedWeight != null ? `Accepted Weight: ${item.acceptedWeight.toFixed(2)}` : undefined,
			},
			{
				id: "rate",
				header: "Rate",
				width: "0.9fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.rate != null ? item.rate.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.rate ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"rate",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => (item.rate != null ? `Rate: ${item.rate.toFixed(2)}` : undefined),
			},
			{
				id: "claimRate",
				header: "Claim Rate",
				width: "1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.claimRate != null ? item.claimRate.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.claimRate ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"claimRate",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.claimRate != null ? `Claim Rate: ${item.claimRate.toFixed(2)}` : undefined,
			},
			{
				id: "claimQuality",
				header: "Claim Quality",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.claimQuality || "-"}</span>;
					}
					return (
						<TextField
							size="small"
							value={item.claimQuality ?? ""}
							onChange={(e) => handleLineFieldChange(item.id, "claimQuality", e.target.value || null)}
							placeholder="Explanation of claim"
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => item.claimQuality || undefined,
			},
			{
				id: "waterDamageAmount",
				header: "Water Damage Amount",
				width: "1.2fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.waterDamageAmount != null ? item.waterDamageAmount.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.waterDamageAmount ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"waterDamageAmount",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.waterDamageAmount != null
						? `Water Damage Amount: ${item.waterDamageAmount.toFixed(2)}`
						: undefined,
			},
			{
				id: "premiumAmount",
				header: "Premium Amount",
				width: "1.1fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.premiumAmount != null ? item.premiumAmount.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.premiumAmount ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"premiumAmount",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.premiumAmount != null ? `Premium Amount: ${item.premiumAmount.toFixed(2)}` : undefined,
			},
			{
				id: "warehouse",
				header: "Warehouse",
				width: "1.4fr",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">{item.warehousePath || "-"}</span>
						);
					}
					const selectedOption = warehouseOptions.find((opt) => opt.value === item.warehouseId) ?? null;
					return (
						<SearchableSelect
							options={warehouseOptions}
							value={selectedOption}
							onChange={(next) => handleLineFieldChange(item.id, "warehouseId", next?.value ?? null)}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select warehouse"
							textFieldProps={{ size: "small" }}
						/>
					);
				},
				getTooltip: ({ item }) => item.warehousePath || undefined,
			},
		],
		[canEdit, handleLineFieldChange, warehouseOptions]
	);
}
