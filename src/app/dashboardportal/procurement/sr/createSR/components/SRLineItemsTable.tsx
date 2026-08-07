"use client";

import * as React from "react";
import { Autocomplete, TextField, Typography } from "@mui/material";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { SRLineItem, WarehouseOption, Option } from "../types/srTypes";
import { DISCOUNT_MODE } from "../utils/srConstants";

/** Discount mode dropdown options */
const DISCOUNT_MODE_OPTIONS: Option[] = [
	{ label: "None", value: "" },
	{ label: "%", value: String(DISCOUNT_MODE.PERCENTAGE) },
	{ label: "Amount", value: String(DISCOUNT_MODE.AMOUNT) },
];

/**
 * Format currency for display.
 */
const formatCurrency = (value?: number): string => {
	if (value === undefined || value === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

/**
 * Editable number cell component for rate editing.
 */
type EditableNumberCellProps = {
	initialValue: number;
	disabled: boolean;
	onCommit: (value: number) => void;
};

const EditableNumberCell: React.FC<EditableNumberCellProps> = ({
	initialValue,
	disabled,
	onCommit,
}) => {
	const [localValue, setLocalValue] = React.useState<string>(String(initialValue));

	React.useEffect(() => {
		setLocalValue(String(initialValue));
	}, [initialValue]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setLocalValue(val);
		const numVal = Number(val) || 0;
		if (numVal >= 0) {
			onCommit(numVal);
		}
	};

	return (
		<TextField
			type="number"
			size="small"
			variant="outlined"
			value={localValue}
			disabled={disabled}
			onChange={handleChange}
			inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
			sx={{ width: "100%" }}
		/>
	);
};

type UseSRLineItemColumnsParams = {
	canEdit: boolean;
	onLineItemChange: (id: string, field: keyof SRLineItem, value: unknown) => void;
	warehouseOptions: WarehouseOption[];
};

/**
 * Returns column definitions for SR line items.
 */
export const useSRLineItemColumns = ({
	canEdit,
	onLineItemChange,
	warehouseOptions,
}: UseSRLineItemColumnsParams): TransactionLineColumn<SRLineItem>[] => {
	// Build warehouse label map for display
	const warehouseLabelMap = React.useMemo(() => {
		const map: Record<string, string> = {};
		for (const opt of warehouseOptions) {
			map[opt.value] = opt.label;
		}
		return map;
	}, [warehouseOptions]);

	return React.useMemo(
		() => [
			{
				id: "po_no_formatted",
				header: "PO No.",
				width: "1fr",
				minWidth: "100px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap title={item.po_no_formatted || undefined}>
						{item.po_no_formatted || "-"}
					</Typography>
				),
				getTooltip: ({ item }) => item.po_no_formatted || undefined,
			},
			{
				id: "item_code",
				header: "Item Code",
				width: "1.2fr",
				minWidth: "150px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap sx={{ fontFamily: "monospace" }} title={item.full_item_code || item.item_code || undefined}>
						{item.full_item_code || item.item_code || "-"}
					</Typography>
				),
				getTooltip: ({ item }) => item.full_item_code || item.item_code || undefined,
			},
			{
				id: "item_name",
				header: "Item",
				width: "1.8fr",
				minWidth: "200px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap title={item.item_name || undefined}>
						{item.item_name || "-"}
					</Typography>
				),
				getTooltip: ({ item }) => item.item_name || undefined,
			},
			{
				id: "accepted_item_make_name",
				header: "Make",
				width: "0.8fr",
				minWidth: "100px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap title={item.accepted_item_make_name || undefined}>
						{item.accepted_item_make_name || "-"}
					</Typography>
				),
				getTooltip: ({ item }) => item.accepted_item_make_name || undefined,
			},
			{
				id: "hsn_code",
				header: "HSN",
				width: "0.7fr",
				minWidth: "100px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<Typography variant="body2" noWrap title={item.hsn_code || undefined}>
								{item.hsn_code || "-"}
							</Typography>
						);
					}
					return (
						<TextField
							size="small"
							variant="outlined"
							value={item.hsn_code ?? ""}
							onChange={(e) => {
								onLineItemChange(item.id, "hsn_code", e.target.value);
							}}
							placeholder="HSN Code"
							sx={{ width: "100%" }}
						/>
					);
				},
				getTooltip: ({ item }) => item.hsn_code || undefined,
			},
			{
				id: "uom_name",
				header: "UOM",
				width: "0.5fr",
				minWidth: "65px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap>{item.uom_name || "-"}</Typography>
				),
			},
			{
				id: "approved_qty",
				header: "Qty",
				width: "0.5fr",
				minWidth: "70px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{item.approved_qty}
					</Typography>
				),
			},
			{
				id: "po_rate",
				header: "PO Rate",
				width: "0.6fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<Typography variant="body2" color="text.secondary" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{formatCurrency(item.po_rate)}
					</Typography>
				),
			},
			{
				id: "accepted_rate",
				header: "Accept Rate",
				width: "0.7fr",
				minWidth: "110px",
				renderCell: ({ item }) => (
					<EditableNumberCell
						initialValue={item.accepted_rate}
						disabled={!canEdit}
						onCommit={(val) => onLineItemChange(item.id, "accepted_rate", val)}
					/>
				),
			},
			{
				id: "discount_mode",
				header: "Disc. Type",
				width: "0.7fr",
				minWidth: "110px",
				renderCell: ({ item }) => {
					const currentVal = item.discount_mode != null ? String(item.discount_mode) : "";
					const label = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal)?.label || "None";
					if (!canEdit) {
						return (
							<Typography variant="body2" noWrap>
								{label}
							</Typography>
						);
					}
					const selected = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal) ?? DISCOUNT_MODE_OPTIONS[0];
					return (
						<Autocomplete
							size="small"
							options={DISCOUNT_MODE_OPTIONS}
							value={selected}
							onChange={(_, newValue) => {
								onLineItemChange(item.id, "discount_mode", newValue?.value ?? "");
							}}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(opt, val) => opt.value === val.value}
							disableClearable
							renderInput={(params) => (
								<TextField {...params} variant="outlined" size="small" placeholder="Type" />
							)}
							sx={{ width: "100%" }}
						/>
					);
				},
			},
			{
				id: "discount_value",
				header: "Disc. Val",
				width: "0.5fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const hasDiscountMode = item.discount_mode != null && item.discount_mode !== 0;
					if (!canEdit) {
						return (
							<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
								{hasDiscountMode && item.discount_value ? item.discount_value : "-"}
							</Typography>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							variant="outlined"
							value={item.discount_value ?? ""}
							disabled={!hasDiscountMode}
							onChange={(e) => {
								const val = Number(e.target.value) || 0;
								onLineItemChange(item.id, "discount_value", val);
							}}
							inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
							placeholder="0"
							sx={{ width: "100%" }}
						/>
					);
				},
			},
			{
				id: "discount_amount",
				header: "Disc. Amt",
				width: "0.6fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{formatCurrency(item.discount_amount)}
					</Typography>
				),
			},
			{
				id: "warehouse_id",
				header: "Warehouse *",
				width: "1fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						const warehouseLabel = item.warehouse_id ? warehouseLabelMap[String(item.warehouse_id)] || item.warehouse_path || item.warehouse_name : "-";
						return (
							<Typography variant="body2" noWrap sx={{ textAlign: "center", width: "100%" }}>
								{warehouseLabel}
							</Typography>
						);
					}

					// Find the matching option, or build a fallback from the item's own data
					let selectedOption = warehouseOptions.find(
						(opt) => String(opt.value) === String(item.warehouse_id)
					) ?? null;

					// If not in the dropdown list, inject a synthetic option so the
					// Autocomplete `value` always matches one of the `options`.
					let effectiveOptions = warehouseOptions;
					if (!selectedOption && item.warehouse_id) {
						selectedOption = { label: item.warehouse_path || item.warehouse_name || `Warehouse ${item.warehouse_id}`, value: String(item.warehouse_id) };
						effectiveOptions = [...warehouseOptions, selectedOption];
					}

					return (
						<Autocomplete
							size="small"
							options={effectiveOptions}
							value={selectedOption}
							onChange={(_, newValue) => {
								onLineItemChange(item.id, "warehouse_id", newValue ? Number(newValue.value) : null);
							}}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(opt, val) => opt.value === val.value}
							renderOption={(props, option) => {
								const { key, ...rest } = props;
								return (
									<li key={`wh-${option.value}-${item.id}`} {...rest}>
										{option.label}
									</li>
								);
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder="Select warehouse"
									variant="outlined"
									size="small"
									error={item.warehouse_id === null || item.warehouse_id === undefined}
								/>
							)}
							sx={{ width: "100%" }}
						/>
					);
				},
				getTooltip: ({ item }) => {
					if (item.warehouse_id) {
						return warehouseLabelMap[String(item.warehouse_id)] || item.warehouse_path || item.warehouse_name || undefined;
					}
					return "Warehouse is required";
				},
			},
			{
				id: "amount",
				header: "Amount",
				width: "0.7fr",
				minWidth: "100px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{formatCurrency(item.amount)}
					</Typography>
				),
			},
			{
				id: "tax_percentage",
				header: "Tax %",
				width: "0.5fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
								{item.tax_percentage}%
							</Typography>
						);
					}
					return (
						<EditableNumberCell
							initialValue={item.tax_percentage}
							disabled={!canEdit}
							onCommit={(val) => onLineItemChange(item.id, "tax_percentage", val)}
						/>
					);
				},
			},
			{
				id: "tax_amount",
				header: "Tax Amt",
				width: "0.6fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<Typography variant="body2" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{formatCurrency(item.tax_amount)}
					</Typography>
				),
			},
			{
				id: "total_amount",
				header: "Total",
				width: "0.7fr",
				minWidth: "100px",
				renderCell: ({ item }) => (
					<Typography variant="body2" fontWeight={600} color="primary" noWrap sx={{ textAlign: "right", width: "100%" }}>
						{formatCurrency(item.total_amount)}
					</Typography>
				),
			},
		],
		[canEdit, onLineItemChange, warehouseOptions, warehouseLabelMap],
	);
};
