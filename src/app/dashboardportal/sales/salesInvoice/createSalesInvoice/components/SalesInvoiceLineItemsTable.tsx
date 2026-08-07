import React from "react";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, Option, UomConversionEntry } from "../types/salesInvoiceTypes";
import { computeConvertedRate, computeConvertedQtyBales } from "@/utils/uomConversion";
import { DISCOUNT_TYPE, isRawJuteInvoice, isHessianInvoice, isGovtSkgInvoice } from "../utils/salesInvoiceConstants";

const DISCOUNT_TYPE_OPTIONS: Option[] = [
	{ label: "None", value: "" },
	{ label: "%", value: String(DISCOUNT_TYPE.PERCENTAGE) },
	{ label: "Amount", value: String(DISCOUNT_TYPE.AMOUNT) },
];

type UseInvoiceLineItemColumnsParams = {
	canEdit: boolean;
	itemGroupOptions: Option[];
	getItemGroupLabel: (groupId: string) => string;
	getItemOptions: (groupId: string) => Option[];
	getItemLabel: (groupId: string, itemId: string, fallbackName?: string) => string;
	getUomOptions: (groupId: string, itemId: string) => Option[];
	getUomLabel: (groupId: string, itemId: string, uomId: string) => string;
	onFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
	invoiceTypeId?: string;
	getUomConversions?: (groupId: string, itemId: string) => UomConversionEntry[] | undefined;
};

export const useInvoiceLineItemColumns = ({
	canEdit,
	itemGroupOptions,
	getItemGroupLabel,
	getItemOptions,
	getItemLabel,
	getUomOptions,
	getUomLabel,
	onFieldChange,
	invoiceTypeId,
	getUomConversions,
}: UseInvoiceLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
	React.useMemo(
		() => [
			{
				id: "itemCode",
				header: "Item Code",
				width: "1.5fr",
				minWidth: "163px",
				renderCell: ({ item }) => {
					const code = item.fullItemCode || item.itemCode || "-";
					return <span className="block truncate text-sm">{code}</span>;
				},
				getTooltip: ({ item }) => item.fullItemCode || item.itemCode || undefined,
			},
			{
				id: "item",
				header: "Item",
				width: "2fr",
				minWidth: "200px",
				renderCell: ({ item }) => {
					const label = getItemLabel(item.itemGroup, item.item, item.itemName);
					return <span className="block truncate text-sm">{label || "-"}</span>;
				},
				getTooltip: ({ item }) => getItemLabel(item.itemGroup, item.item, item.itemName) || undefined,
			},
			{
				id: "rate",
				header: "Rate",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const showConversion = invoiceTypeId === "2";
					const conversion = showConversion && getUomConversions
						? computeConvertedRate(item.rate, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;
					return (
						<div className="flex flex-col gap-0.5">
							{canEdit ? (
								<Input
									type="text"
									value={item.rate}
									onChange={(e) => onFieldChange(item.id, "rate", e.target.value)}
									placeholder="0.00"
									className="h-8 text-sm"
								/>
							) : (
								<span className="block truncate text-sm">{item.rate || "-"}</span>
							)}
							{conversion ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{"\u2248"} {conversion.convertedRate} / {conversion.otherUomName}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					if (!item.rate) return undefined;
					const showConversion = invoiceTypeId === "2";
					const conversion = showConversion && getUomConversions
						? computeConvertedRate(item.rate, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;
					if (conversion) {
						return `Rate: ${item.rate} (\u2248 ${conversion.convertedRate} / ${conversion.otherUomName})`;
					}
					return `Rate: ${item.rate}`;
				},
			},
			{
				id: "quantity",
				header: "Quantity",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const isGovtSkg = isGovtSkgInvoice(invoiceTypeId);
					// Compute bales on-the-fly when govtskgQtyBales is missing (e.g., view mode before back-fill)
					let balesValue = item.govtskgQtyBales ?? "";
					if (isGovtSkg && !balesValue && item.quantity && getUomConversions) {
						const conv = computeConvertedQtyBales(item.quantity, item.uom, getUomConversions(item.itemGroup, item.item));
						if (conv) balesValue = conv.convertedQty;
					}
					const displayValue = isGovtSkg ? balesValue : item.quantity;
					const fieldKey: keyof EditableLineItem = isGovtSkg ? "govtskgQtyBales" : "quantity";
					const govtSkgAnnotation = isGovtSkg && item.quantity && Number(item.quantity)
						? `= ${Number(item.quantity).toFixed(2)} per 100 pcs`
						: null;
					if (canEdit) {
						return (
							<div className="flex flex-col gap-0.5">
								<Input
									type="text"
									value={displayValue}
									onChange={(e) => onFieldChange(item.id, fieldKey, e.target.value)}
									placeholder={isGovtSkg ? "Bales" : "0"}
									className="h-8 text-sm"
								/>
								{govtSkgAnnotation ? (
									<span className="text-[11px] text-muted-foreground leading-tight truncate">
										{govtSkgAnnotation}
									</span>
								) : null}
							</div>
						);
					}
					return (
						<div className="flex flex-col gap-0.5">
							<span className="block truncate text-sm">{displayValue || "-"}</span>
							{govtSkgAnnotation ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{govtSkgAnnotation}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					const isGovtSkg = isGovtSkgInvoice(invoiceTypeId);
					if (isGovtSkg) {
						const parts: string[] = [];
						if (item.govtskgQtyBales) parts.push(`Bales: ${item.govtskgQtyBales}`);
						if (item.quantity) parts.push(`Qty: ${item.quantity} per 100 pcs`);
						return parts.length ? parts.join("\n") : undefined;
					}
					return item.quantity ? `Quantity: ${item.quantity}` : undefined;
				},
			},
			{
				id: "uom",
				header: "Unit",
				width: "0.6fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const options = getUomOptions(item.itemGroup, item.item);
					const cachedLabel = getUomLabel(item.itemGroup, item.item, item.uom);
					// Prefer the unit name stored on the line (resolved by the backend).
					// `getUomLabel` falls back to the raw uom id when the item-group UOM
					// cache isn't loaded, which is what happens in view mode.
					const label = item.uomName || (cachedLabel !== item.uom ? cachedLabel : "");
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					const value =
						options.find((o) => o.value === item.uom) ??
						(item.uom ? { value: item.uom, label: item.uomName || item.uom } : null);
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
				getTooltip: ({ item }) => {
					const cachedLabel = getUomLabel(item.itemGroup, item.item, item.uom);
					return item.uomName || (cachedLabel !== item.uom ? cachedLabel : undefined) || undefined;
				},
			},
			{
				id: "discountType",
				header: "Disc. Type",
				width: "0.7fr",
				minWidth: "90px",
				renderCell: ({ item }) => {
					const currentVal = item.discountType != null ? String(item.discountType) : "";
					const label = DISCOUNT_TYPE_OPTIONS.find((o) => o.value === currentVal)?.label || "-";
					if (!canEdit) {
						return <span className="block truncate text-sm">{label}</span>;
					}
					const value = DISCOUNT_TYPE_OPTIONS.find((o) => o.value === currentVal) ?? DISCOUNT_TYPE_OPTIONS[0];
					return (
						<SearchableSelect<Option>
							options={DISCOUNT_TYPE_OPTIONS}
							value={value}
							onChange={(next) => onFieldChange(item.id, "discountType", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Type"
						/>
					);
				},
				getTooltip: ({ item }) => {
					const currentVal = item.discountType != null ? String(item.discountType) : "";
					const label = DISCOUNT_TYPE_OPTIONS.find((o) => o.value === currentVal)?.label;
					return label && label !== "None" ? `Discount Type: ${label}` : undefined;
				},
			},
			{
				id: "discountedRate",
				header: "Disc. Rate",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const hasDiscountType = item.discountType != null && item.discountType !== 0;
					if (!canEdit) {
						return <span className="block truncate text-sm">{item.discountedRate?.toFixed(2) || "-"}</span>;
					}
					return (
						<Input
							type="text"
							value={item.discountedRate ?? ""}
							onChange={(e) => onFieldChange(item.id, "discountedRate", e.target.value)}
							placeholder="0"
							className="h-8 text-sm"
							disabled={!hasDiscountType}
						/>
					);
				},
				getTooltip: ({ item }) => (item.discountedRate ? `Discounted Rate: ${item.discountedRate.toFixed(2)}` : undefined),
			},
			{
				id: "discountAmount",
				header: "Disc. Amt",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => (
					<span className="block truncate text-sm">{item.discountAmount?.toFixed(2) || "0.00"}</span>
				),
				getTooltip: ({ item }) => (item.discountAmount ? `Discount Amount: ${item.discountAmount.toFixed(2)}` : undefined),
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
				width: "1fr",
				minWidth: "100px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.remarks}
							onChange={(e) => onFieldChange(item.id, "remarks", e.target.value)}
							placeholder=""
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.remarks || "-"}</span>
					),
				getTooltip: ({ item }) => (item.remarks ? item.remarks : undefined),
			},
			// --- Raw Jute (type 5) line item columns ---
			...(isRawJuteInvoice(invoiceTypeId) ? [
				{
					id: "juteClaimRate" as const,
					header: "Claim Rate",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.juteClaimRate ?? ""}
								onChange={(e) => onFieldChange(item.id, "juteClaimRate", e.target.value)}
								placeholder="0"
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteClaimRate ?? "-"}</span>
						),
				},
				{
					id: "juteClaimAmountDtl" as const,
					header: "Claim Amt",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.juteClaimAmountDtl ?? ""}
								onChange={(e) => onFieldChange(item.id, "juteClaimAmountDtl", e.target.value)}
								placeholder="0"
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteClaimAmountDtl ?? "-"}</span>
						),
				},
				{
					id: "juteClaimDesc" as const,
					header: "Claim Desc",
					width: "1fr",
					minWidth: "100px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.juteClaimDesc ?? ""}
								onChange={(e) => onFieldChange(item.id, "juteClaimDesc", e.target.value)}
								placeholder=""
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteClaimDesc || "-"}</span>
						),
				},
				{
					id: "juteUnitConversion" as const,
					header: "Unit Conv.",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.juteUnitConversion ?? ""}
								onChange={(e) => onFieldChange(item.id, "juteUnitConversion", e.target.value)}
								placeholder=""
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteUnitConversion || "-"}</span>
						),
				},
				{
					id: "juteQtyUnitConversion" as const,
					header: "Qty (Conv.)",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.juteQtyUnitConversion ?? ""}
								onChange={(e) => onFieldChange(item.id, "juteQtyUnitConversion", e.target.value)}
								placeholder="0"
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteQtyUnitConversion ?? "-"}</span>
						),
				},
			] as TransactionLineColumn<EditableLineItem>[] : []),
			// --- Hessian (type 2) line item columns ---
			// Qty Bales is the only editable input: Qty (MT), Rate/MT, and Rate/Bale
			// are derived from it and the Rate column via uom_item_map_mst.
			...(isHessianInvoice(invoiceTypeId) ? [
				{
					id: "hessianQtyBales" as const,
					header: "Qty Bales",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) =>
						canEdit ? (
							<Input
								type="text"
								value={item.hessianQtyBales ?? ""}
								onChange={(e) => onFieldChange(item.id, "hessianQtyBales", e.target.value)}
								placeholder="0"
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.hessianQtyBales ?? "-"}</span>
						),
				},
				{
					id: "hessianRatePerBale" as const,
					header: "Rate/Bale",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) => {
						const rate = Number(item.rate) || 0;
						const factor = item.hessianConversionFactor || 0;
						const derived = factor > 0 && rate > 0 ? (rate / factor).toFixed(2) : (item.hessianRatePerBale ?? "-");
						return <span className="block truncate text-sm text-muted-foreground">{derived}</span>;
					},
				},
				{
					id: "hessianBillingRateMt" as const,
					header: "Rate/MT",
					width: "0.7fr",
					minWidth: "80px",
					renderCell: ({ item }: { item: EditableLineItem }) => {
						const rate = Number(item.rate) || 0;
						const display = rate > 0 ? rate.toFixed(2) : (item.hessianBillingRateMt ?? "-");
						return <span className="block truncate text-sm text-muted-foreground">{display}</span>;
					},
				},
				{
					id: "hessianBillingRateBale" as const,
					header: "Rate/Bale (Bill)",
					width: "0.8fr",
					minWidth: "90px",
					renderCell: ({ item }: { item: EditableLineItem }) => {
						const rate = Number(item.rate) || 0;
						const factor = item.hessianConversionFactor || 0;
						const derived = factor > 0 && rate > 0 ? (rate / factor).toFixed(2) : (item.hessianBillingRateBale ?? "-");
						return <span className="block truncate text-sm text-muted-foreground">{derived}</span>;
					},
				},
			] as TransactionLineColumn<EditableLineItem>[] : []),
		],
		[canEdit, itemGroupOptions, getItemGroupLabel, getItemOptions, getItemLabel, getUomOptions, getUomLabel, onFieldChange, invoiceTypeId, getUomConversions],
	);

export default useInvoiceLineItemColumns;
