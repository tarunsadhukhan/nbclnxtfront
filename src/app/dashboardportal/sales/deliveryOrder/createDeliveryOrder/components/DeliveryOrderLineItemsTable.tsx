import React from "react";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, Option, UomConversionEntry } from "../types/deliveryOrderTypes";
import { computeConvertedRate, computeConvertedQty, computeConvertedQtyBales } from "@/utils/uomConversion";
import { isGovtInvoice, isBalesUomName } from "../utils/deliveryOrderConstants";

type UseDOLineItemColumnsParams = {
	canEdit: boolean;
	getItemOptions: (groupId: string) => Option[];
	getMakeOptions: (groupId: string) => Option[];
	getUomOptions: (groupId: string, itemId: string) => Option[];
	getUomLabel: (groupId: string, itemId: string, uomId: string, fallbackName?: string) => string;
	handleLineFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
	invoiceTypeId?: string;
	getUomConversions?: (groupId: string, itemId: string) => UomConversionEntry[] | undefined;
};

export const useDOLineItemColumns = ({
	canEdit,
	getItemOptions,
	getMakeOptions,
	getUomOptions,
	getUomLabel,
	handleLineFieldChange,
	invoiceTypeId,
	getUomConversions,
}: UseDOLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
	React.useMemo(
		() => [
			{
				id: "itemCode",
				header: "Item Code",
				width: "1.5fr",
				minWidth: "140px",
				renderCell: ({ item }) => (
					<span className="block truncate text-sm">{item.itemCode || "-"}</span>
				),
				getTooltip: ({ item }) => item.itemCode || undefined,
			},
			{
				id: "item",
				header: "Item",
				width: "2.25fr",
				minWidth: "225px",
				renderCell: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					const label = options.find((o) => o.value === item.item)?.label ?? item.itemName ?? "-";
					return <span className="block truncate text-sm">{label}</span>;
				},
				getTooltip: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					return options.find((o) => o.value === item.item)?.label || item.itemName || undefined;
				},
			},
			{
				id: "itemMake",
				header: "Make",
				width: "1fr",
				minWidth: "130px",
				renderCell: ({ item }) => {
					const options = getMakeOptions(item.itemGroup);
					const label = options.find((o) => o.value === item.itemMake)?.label ?? item.itemMake ?? "-";
					if (!canEdit) {
						return <span className="block truncate text-sm">{label}</span>;
					}
					const value = options.find((o) => o.value === item.itemMake) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "itemMake", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Make"
						/>
					);
				},
			},
			{
				id: "quantity",
				header: "Qty",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const isGovtSkg = isGovtInvoice(invoiceTypeId);
					const isHessian = invoiceTypeId === "2";
					// Compute bales on-the-fly when the stored bales field is missing (e.g., view mode before back-fill runs)
					let balesValue = isHessian ? (item.hessianQtyBales ?? "") : (item.govtskgQtyBales ?? "");
					if ((isGovtSkg || isHessian) && !balesValue && item.quantity && getUomConversions) {
						const conv = computeConvertedQtyBales(item.quantity, item.uom, getUomConversions(item.itemGroup, item.item));
						if (conv) balesValue = conv.convertedQty;
					}
					const displayValue = (isGovtSkg || isHessian) ? balesValue : item.quantity;
					const fieldKey: keyof EditableLineItem = isHessian
						? "hessianQtyBales"
						: isGovtSkg
							? "govtskgQtyBales"
							: "quantity";
					const govtSkgAnnotation = isGovtSkg && item.quantity && Number(item.quantity)
						? `= ${Number(item.quantity).toFixed(2)} per 100 pcs`
						: null;
					const hessianAnnotation = isHessian && item.quantity && Number(item.quantity)
						? `= ${Number(item.quantity).toFixed(3)} MT`
						: null;
					// Legacy annotation for non-govt, non-hessian lines where UOM conversion exists (rare path)
					const legacyBalesConv = !isGovtSkg && !isHessian && getUomConversions
						? computeConvertedQty(item.quantity, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;
					const legacyBalesLine = legacyBalesConv && isBalesUomName(legacyBalesConv.otherUomName)
						? `\u2248 ${legacyBalesConv.convertedQty} ${legacyBalesConv.otherUomName}`
						: null;
					const annotation = govtSkgAnnotation || hessianAnnotation || legacyBalesLine;

					if (canEdit) {
						return (
							<div className="flex flex-col gap-0.5">
								<Input
									type="text"
									value={displayValue}
									onChange={(e) => handleLineFieldChange(item.id, fieldKey, e.target.value)}
									placeholder={(isGovtSkg || isHessian) ? "Bales" : "0"}
									className="h-8 text-sm"
								/>
								{annotation ? (
									<span className="text-[11px] text-muted-foreground leading-tight truncate">
										{annotation}
									</span>
								) : null}
							</div>
						);
					}

					return (
						<div className="flex flex-col gap-0.5">
							<span className="block truncate text-sm">{displayValue || "-"}</span>
							{annotation ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{annotation}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					const isGovtSkg = isGovtInvoice(invoiceTypeId);
					const isHessian = invoiceTypeId === "2";
					if (isGovtSkg) {
						const parts: string[] = [];
						if (item.govtskgQtyBales) parts.push(`Bales: ${item.govtskgQtyBales}`);
						if (item.quantity) parts.push(`Qty: ${item.quantity} per 100 pcs`);
						return parts.length ? parts.join("\n") : undefined;
					}
					if (isHessian) {
						const parts: string[] = [];
						if (item.hessianQtyBales) parts.push(`Bales: ${item.hessianQtyBales}`);
						if (item.quantity) parts.push(`Qty: ${item.quantity} MT`);
						return parts.length ? parts.join("\n") : undefined;
					}
					if (!item.quantity) return undefined;
					const balesConv = getUomConversions
						? computeConvertedQty(item.quantity, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;
					if (balesConv && isBalesUomName(balesConv.otherUomName)) {
						return `Quantity: ${item.quantity} (\u2248 ${balesConv.convertedQty} ${balesConv.otherUomName})`;
					}
					return `Quantity: ${item.quantity}`;
				},
			},
			{
				id: "uom",
				header: "UOM",
				width: "0.6fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const options = getUomOptions(item.itemGroup, item.item);
					const label = getUomLabel(item.itemGroup, item.item, item.uom, item.uomName);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					let value = options.find((o) => o.value === item.uom) ?? null;
					if (!value && item.uom) {
						value = { value: item.uom, label };
					}
					const resolvedOptions = value && !options.some((o) => o.value === item.uom)
						? [value, ...options]
						: options;
					return (
						<SearchableSelect<Option>
							options={resolvedOptions}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "uom", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="UOM"
						/>
					);
				},
				getTooltip: ({ item }) => getUomLabel(item.itemGroup, item.item, item.uom, item.uomName) || undefined,
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

					if (canEdit) {
						return (
							<div className="flex flex-col gap-0.5">
								<Input
									type="text"
									value={item.rate}
									onChange={(e) => handleLineFieldChange(item.id, "rate", e.target.value)}
									placeholder="0.00"
									className="h-8 text-sm"
								/>
								{conversion ? (
									<span className="text-[11px] text-muted-foreground leading-tight truncate">
										{"\u2248"} {conversion.convertedRate} / {conversion.otherUomName}
									</span>
								) : null}
							</div>
						);
					}

					return (
						<div className="flex flex-col gap-0.5">
							<span className="block truncate text-sm">{item.rate || "-"}</span>
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
				id: "amount",
				header: "Amount",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) => <span className="block truncate text-sm font-medium">{item.netAmount?.toFixed(2) || "0.00"}</span>,
				getTooltip: ({ item }) => (item.netAmount ? `Amount: ${item.netAmount.toFixed(2)}` : undefined),
			},
			{
				id: "taxAmount",
				header: "GST",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const taxAmount = (item.igstAmount ?? 0) + (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0);
					const hasTax = taxAmount > 0;
					if (item.taxPercentage != null && hasTax) {
						return <span className="block truncate text-sm">{item.taxPercentage}% = {taxAmount.toFixed(2)}</span>;
					}
					if (item.taxPercentage != null) {
						return <span className="block truncate text-sm">{item.taxPercentage}%</span>;
					}
					return <span className="block truncate text-sm">{hasTax ? taxAmount.toFixed(2) : "-"}</span>;
				},
				getTooltip: ({ item }) => {
					const taxAmount = (item.igstAmount ?? 0) + (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0);
					const parts: string[] = [];
					if (item.taxPercentage != null) parts.push(`Tax: ${item.taxPercentage}%`);
					if (taxAmount > 0) parts.push(`GST: ${taxAmount.toFixed(2)}`);
					return parts.length ? parts.join("\n") : undefined;
				},
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
							onChange={(e) => handleLineFieldChange(item.id, "remarks", e.target.value)}
							placeholder=""
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.remarks || "-"}</span>
					),
				getTooltip: ({ item }) => (item.remarks ? item.remarks : undefined),
			},
		],
		[canEdit, getItemOptions, getMakeOptions, getUomOptions, getUomLabel, handleLineFieldChange, invoiceTypeId, getUomConversions],
	);

export default useDOLineItemColumns;
