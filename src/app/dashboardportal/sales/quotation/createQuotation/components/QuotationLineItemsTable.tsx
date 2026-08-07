import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, Option } from "../types/quotationTypes";
import { DISCOUNT_MODE } from "../utils/quotationConstants";

/** Discount mode dropdown options */
const DISCOUNT_MODE_OPTIONS: Option[] = [
	{ label: "None", value: "" },
	{ label: "%", value: String(DISCOUNT_MODE.PERCENTAGE) },
	{ label: "Amount", value: String(DISCOUNT_MODE.AMOUNT) },
];

type UseQuotationLineItemColumnsParams = {
	canEdit: boolean;
	itemGroupOptions: Option[];
	getItemGroupLabel: (groupId: string) => string;
	getItemOptions: (groupId: string) => Option[];
	getItemLabel: (groupId: string, itemId: string, itemCode?: string) => string;
	getMakeOptions: (groupId: string) => Option[];
	getMakeLabel: (groupId: string, makeId: string) => string;
	getUomOptions: (groupId: string, itemId: string) => Option[];
	getUomLabel: (groupId: string, itemId: string, uomId: string) => string;
	onFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
};

/**
 * Builds the TransactionLineColumn array used by the quotation line items grid.
 * Includes HSN Code and Item Make columns (not present in PO).
 */
export const useQuotationLineItemColumns = ({
	canEdit,
	itemGroupOptions,
	getItemGroupLabel,
	getItemOptions,
	getItemLabel,
	getMakeOptions,
	getMakeLabel,
	getUomOptions,
	getUomLabel,
	onFieldChange,
}: UseQuotationLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
	React.useMemo(
		() => [
			{
				id: "itemGroup",
				header: "Item Group",
				width: "1.3fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					const label = getItemGroupLabel(item.itemGroup);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					const value = itemGroupOptions.find((o) => o.value === item.itemGroup) ?? null;
					return (
						<SearchableSelect<Option>
							options={itemGroupOptions}
							value={value}
							onChange={(next) => onFieldChange(item.id, "itemGroup", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select group"
						/>
					);
				},
				getTooltip: ({ item }) => getItemGroupLabel(item.itemGroup) || undefined,
			},
			{
				id: "item",
				header: "Item",
				width: "1.8fr",
				minWidth: "200px",
				renderCell: ({ item }) => {
					const label = getItemLabel(item.itemGroup, item.item, item.itemCode);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label}</span>;
					}
					const options = getItemOptions(item.itemGroup);
					const value = options.find((o) => o.value === item.item) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => onFieldChange(item.id, "item", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select item"
						/>
					);
				},
				getTooltip: ({ item }) => getItemLabel(item.itemGroup, item.item, item.itemCode) || undefined,
			},
			{
				id: "itemMake",
				header: "Make",
				width: "1fr",
				minWidth: "120px",
				renderCell: ({ item }) => {
					const label = getMakeLabel(item.itemGroup, item.itemMake);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					const options = getMakeOptions(item.itemGroup);
					const value = options.find((o) => o.value === item.itemMake) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => onFieldChange(item.id, "itemMake", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Make"
						/>
					);
				},
				getTooltip: ({ item }) => getMakeLabel(item.itemGroup, item.itemMake) || undefined,
			},
			{
				id: "hsnCode",
				header: "HSN Code",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.hsnCode}
							onChange={(e) => onFieldChange(item.id, "hsnCode", e.target.value)}
							placeholder="HSN"
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.hsnCode || "-"}</span>
					),
				getTooltip: ({ item }) => (item.hsnCode ? `HSN: ${item.hsnCode}` : undefined),
			},
			{
				id: "quantity",
				header: "Qty",
				width: "0.7fr",
				minWidth: "70px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.quantity}
							onChange={(e) => onFieldChange(item.id, "quantity", e.target.value)}
							placeholder="0"
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.quantity || "-"}</span>
					),
				getTooltip: ({ item }) => (item.quantity ? `Qty: ${item.quantity}` : undefined),
			},
			{
				id: "uom",
				header: "UOM",
				width: "0.6fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const options = getUomOptions(item.itemGroup, item.item);
					const label = getUomLabel(item.itemGroup, item.item, item.uom);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					const value = options.find((o) => o.value === item.uom) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => onFieldChange(item.id, "uom", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="UOM"
						/>
					);
				},
				getTooltip: ({ item }) => getUomLabel(item.itemGroup, item.item, item.uom) || undefined,
			},
			{
				id: "rate",
				header: "Rate",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.rate}
							onChange={(e) => onFieldChange(item.id, "rate", e.target.value)}
							placeholder="0.00"
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.rate || "-"}</span>
					),
				getTooltip: ({ item }) => (item.rate ? `Rate: ${item.rate}` : undefined),
			},
			{
				id: "discountMode",
				header: "Disc. Type",
				width: "0.65fr",
				minWidth: "85px",
				renderCell: ({ item }) => {
					const currentVal = item.discountMode != null ? String(item.discountMode) : "";
					const label = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal)?.label || "-";
					if (!canEdit) {
						return <span className="block truncate text-sm">{label}</span>;
					}
					const value = DISCOUNT_MODE_OPTIONS.find((o) => o.value === currentVal) ?? DISCOUNT_MODE_OPTIONS[0];
					return (
						<SearchableSelect<Option>
							options={DISCOUNT_MODE_OPTIONS}
							value={value}
							onChange={(next) => onFieldChange(item.id, "discountMode", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Type"
						/>
					);
				},
			},
			{
				id: "discountValue",
				header: "Disc. Val",
				width: "0.6fr",
				minWidth: "70px",
				renderCell: ({ item }) => {
					const hasDiscountMode = item.discountMode != null && item.discountMode !== 0;
					if (!canEdit) {
						return <span className="block truncate text-sm">{item.discountValue || "-"}</span>;
					}
					return (
						<Input
							type="text"
							value={item.discountValue}
							onChange={(e) => onFieldChange(item.id, "discountValue", e.target.value)}
							placeholder="0"
							className="h-8 text-sm"
							disabled={!hasDiscountMode}
						/>
					);
				},
			},
			{
				id: "netAmount",
				header: "Amount",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) => <span className="block truncate text-sm font-medium">{item.netAmount?.toFixed(2) || "0.00"}</span>,
				getTooltip: ({ item }) => (item.netAmount ? `Amount: ${item.netAmount.toFixed(2)}` : undefined),
			},
			{
				id: "remarks",
				header: "Remarks",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.remarks}
							onChange={(e) => onFieldChange(item.id, "remarks", e.target.value)}
							placeholder="..."
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.remarks || "-"}</span>
					),
			},
		],
		[canEdit, itemGroupOptions, getItemGroupLabel, getItemOptions, getItemLabel, getMakeOptions, getMakeLabel, getUomOptions, getUomLabel, onFieldChange],
	);

export default useQuotationLineItemColumns;
