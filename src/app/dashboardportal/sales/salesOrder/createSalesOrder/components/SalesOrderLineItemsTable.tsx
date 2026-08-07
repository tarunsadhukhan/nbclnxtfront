import React from "react";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, Option, UomConversionEntry } from "../types/salesOrderTypes";
import { computeConvertedRate } from "@/utils/uomConversion";
import { isHessianOrder, isGovtSkgOrder, isJuteOrder, isJuteYarnOrder } from "../utils/salesOrderConstants";

type UseSalesOrderLineItemColumnsParams = {
	canEdit: boolean;
	invoiceTypeCode?: string;
	itemGroupOptions: Option[];
	itemGroupLoading: Partial<Record<string, boolean>>;
	getItemOptions: (groupId: string) => Option[];
	getMakeOptions: (groupId: string) => Option[];
	getUomOptions: (groupId: string, itemId: string) => Option[];
	getUomConversions?: (groupId: string, itemId: string) => UomConversionEntry[] | undefined;
	getItemGroupLabel: (groupId: string) => string;
	getItemFullCode?: (groupId: string, itemId: string) => string | undefined;
	handleLineFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
};

export const useSalesOrderLineItemColumns = ({
	canEdit,
	invoiceTypeCode,
	itemGroupOptions,
	itemGroupLoading,
	getItemOptions,
	getMakeOptions,
	getUomOptions,
	getUomConversions,
	getItemGroupLabel,
	getItemFullCode,
	handleLineFieldChange,
}: UseSalesOrderLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
	React.useMemo(
		() => [
			{
				id: "itemCode",
				header: "Item Code",
				width: "1.5fr",
				minWidth: "163px",
				renderCell: ({ item }) => {
					const code = item.fullItemCode || getItemFullCode?.(item.itemGroup, item.item) || "-";
					return <span className="block truncate text-sm">{code}</span>;
				},
				getTooltip: ({ item }) => item.fullItemCode || getItemFullCode?.(item.itemGroup, item.item) || undefined,
			},
			{
				id: "item",
				header: "Item",
				width: "2.25fr",
				minWidth: "225px",
				renderCell: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					const label = options.find((o) => o.value === item.item)?.label ?? item.item ?? "-";
					return <span className="block truncate text-sm">{label}</span>;
				},
				getTooltip: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					return options.find((o) => o.value === item.item)?.label ?? item.item ?? undefined;
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
					const isHessian = isHessianOrder(invoiceTypeCode);
					const isGovtSkg = isGovtSkgOrder(invoiceTypeCode);
					// Hessian: qty input is bales, show MT annotation
					// Govt Skg: qty input is bales, show per 100 pcs annotation
					const displayValue = isHessian
						? (item.qtyBales ?? "")
						: isGovtSkg
							? (item.govtskgQtyBales ?? "")
							: item.quantity;
					const fieldKey: keyof EditableLineItem = isHessian
						? "qtyBales"
						: isGovtSkg
							? "govtskgQtyBales"
							: "quantity";
					const qtyRounding = item.qtyRounding;
					const mtAnnotation = isHessian && item.quantity && Number(item.quantity)
						? `\u2248 ${Number(item.quantity).toFixed(qtyRounding ?? 3)} MT`
						: null;
					const govtSkgAnnotation = isGovtSkg && item.quantity && Number(item.quantity)
						? `= ${Number(item.quantity).toFixed(qtyRounding ?? 2)} per 100 pcs`
						: null;
					// Show rounded display for non-special types when rounding is set
					const formattedQty = !isHessian && !isGovtSkg && displayValue && qtyRounding != null && Number(displayValue)
						? Number(displayValue).toFixed(qtyRounding)
						: displayValue;
					const annotation = mtAnnotation || govtSkgAnnotation;

					if (canEdit) {
						return (
							<div className="flex flex-col gap-0.5">
								<Input
									type="text"
									value={displayValue}
									onChange={(e) => handleLineFieldChange(item.id, fieldKey, e.target.value)}
									placeholder={isHessian || isGovtSkg ? "Bales" : "0"}
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
							<span className="block truncate text-sm">{formattedQty || "-"}</span>
							{annotation ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{annotation}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					const isHessian = isHessianOrder(invoiceTypeCode);
					const isGovtSkg = isGovtSkgOrder(invoiceTypeCode);
					const parts: string[] = [];
					if (isHessian && item.qtyBales) parts.push(`Bales: ${item.qtyBales}`);
					if (isHessian && item.quantity) parts.push(`\u2248 ${item.quantity} MT`);
					if (isGovtSkg && item.govtskgQtyBales) parts.push(`Bales: ${item.govtskgQtyBales}`);
					if (isGovtSkg && item.quantity) parts.push(`Qty: ${item.quantity} per 100 pcs`);
					if (!isHessian && !isGovtSkg && item.quantity) parts.push(`Quantity: ${item.quantity}`);
					return parts.length ? parts.join("\n") : undefined;
				},
			},
			{
				id: "uom",
				header: "UOM",
				width: "0.6fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const options = getUomOptions(item.itemGroup, item.item);
					const label = options.find((o) => o.value === item.uom)?.label ?? item.uom ?? "-";
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					const value = options.find((o) => o.value === item.uom) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "uom", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="UOM"
						/>
					);
				},
			},
			{
				id: "rate",
				header: "Rate",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const isHessian = isHessianOrder(invoiceTypeCode);
					const isJuteYarn = isJuteYarnOrder(invoiceTypeCode);

					if (isJuteYarn) {
						const displayValue = item.juteYarnRawRate ?? item.rate ?? "";
						const uomOptions = getUomOptions(item.itemGroup, item.item);
						const uomLabel = uomOptions.find((o) => o.value === item.uom)?.label ?? "";
						const billingDecimals = item.rateRounding ?? 2;
						const annotations: { label: string }[] = [];
						if (item.juteYarnBillingRate != null && item.juteYarnBillingRate > 0) {
							annotations.push({ label: `Billing: ${item.juteYarnBillingRate.toFixed(billingDecimals)}${uomLabel ? ` / ${uomLabel}` : ""}` });
						}

						if (canEdit) {
							return (
								<div className="flex flex-col gap-0.5">
									<Input
										type="text"
										value={displayValue}
										onChange={(e) => handleLineFieldChange(item.id, "juteYarnRawRate", e.target.value)}
										placeholder={`Rate${uomLabel ? ` / ${uomLabel}` : ""}`}
										className="h-8 text-sm"
									/>
									{annotations.map((a, i) => (
										<span key={i} className="text-[11px] text-muted-foreground leading-tight truncate">
											{a.label}
										</span>
									))}
								</div>
							);
						}

						return (
							<div className="flex flex-col gap-0.5">
								<span className="block truncate text-sm">{displayValue || "-"}</span>
								{annotations.map((a, i) => (
									<span key={i} className="text-[11px] text-muted-foreground leading-tight truncate">
										{a.label}
									</span>
								))}
							</div>
						);
					}

					if (isHessian) {
						// Hessian mode: input is rawRateMt (pre-brokerage rate per MT)
						const displayValue = item.rawRateMt ?? item.rate ?? "";
						const billingDecimals = item.rateRounding ?? 2;
						const annotations: { label: string }[] = [];
						if (item.ratePerBale != null && item.ratePerBale > 0) {
							annotations.push({ label: `\u2248 ${item.ratePerBale.toFixed(2)} / Bale` });
						}
						if (item.billingRateMt != null && item.billingRateMt > 0) {
							annotations.push({ label: `Billing: ${item.billingRateMt.toFixed(billingDecimals)} / MT` });
						}
						if (item.billingRateBale != null && item.billingRateBale > 0) {
							annotations.push({ label: `Billing: ${item.billingRateBale.toFixed(billingDecimals)} / Bale` });
						}

						if (canEdit) {
							return (
								<div className="flex flex-col gap-0.5">
									<Input
										type="text"
										value={displayValue}
										onChange={(e) => handleLineFieldChange(item.id, "rawRateMt", e.target.value)}
										placeholder="Rate / MT"
										className="h-8 text-sm"
									/>
									{annotations.map((a, i) => (
										<span key={i} className="text-[11px] text-muted-foreground leading-tight truncate">
											{a.label}
										</span>
									))}
								</div>
							);
						}

						return (
							<div className="flex flex-col gap-0.5">
								<span className="block truncate text-sm">{displayValue || "-"}</span>
								{annotations.map((a, i) => (
									<span key={i} className="text-[11px] text-muted-foreground leading-tight truncate">
										{a.label}
									</span>
								))}
							</div>
						);
					}

					// Non-hessian: existing conversion annotation behaviour
					const conversion = getUomConversions
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

					const rateRounding = item.rateRounding ?? 2;
					const formattedRate = item.rate && Number(item.rate) ? Number(item.rate).toFixed(rateRounding) : item.rate;

					return (
						<div className="flex flex-col gap-0.5">
							<span className="block truncate text-sm">{formattedRate || "-"}</span>
							{conversion ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{"\u2248"} {conversion.convertedRate} / {conversion.otherUomName}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					const isHessian = isHessianOrder(invoiceTypeCode);
					const parts: string[] = [];
					if (isHessian) {
						const billingDecimals = item.rateRounding ?? 2;
						if (item.rawRateMt) parts.push(`Rate: ${item.rawRateMt} / MT`);
						if (item.ratePerBale) parts.push(`\u2248 ${item.ratePerBale.toFixed(2)} / Bale`);
						if (item.billingRateMt) parts.push(`Billing: ${item.billingRateMt.toFixed(billingDecimals)} / MT`);
					} else if (isJuteYarnOrder(invoiceTypeCode)) {
						const billingDecimals = item.rateRounding ?? 2;
						if (item.juteYarnRawRate) parts.push(`Rate: ${item.juteYarnRawRate}`);
						if (item.juteYarnBillingRate) parts.push(`Billing: ${item.juteYarnBillingRate.toFixed(billingDecimals)}`);
					} else {
						const conversion = getUomConversions
							? computeConvertedRate(item.rate, item.uom, getUomConversions(item.itemGroup, item.item))
							: null;
						if (item.rate) parts.push(`Rate: ${item.rate}`);
						if (conversion) parts.push(`\u2248 ${conversion.convertedRate} / ${conversion.otherUomName}`);
					}
					return parts.length ? parts.join("\n") : undefined;
				},
			},
			{
				id: "amount",
				header: "Amount",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<span className="block truncate text-sm font-medium">{item.amount != null ? item.amount.toFixed(2) : "-"}</span>
				),
				getTooltip: ({ item }) => (item.amount ? `Amount: ${item.amount.toFixed(2)}` : undefined),
			},
			{
				id: "taxAmount",
				header: "GST",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const hasTax = item.taxAmount != null && item.taxAmount > 0;
					if (item.taxPercentage != null && hasTax) {
						return <span className="block truncate text-sm">{item.taxPercentage}% = {item.taxAmount!.toFixed(2)}</span>;
					}
					if (item.taxPercentage != null) {
						return <span className="block truncate text-sm">{item.taxPercentage}%</span>;
					}
					return <span className="block truncate text-sm">{hasTax ? item.taxAmount!.toFixed(2) : "-"}</span>;
				},
				getTooltip: ({ item }) => {
					const parts: string[] = [];
					if (item.taxPercentage != null) parts.push(`Tax: ${item.taxPercentage}%`);
					if (item.taxAmount != null && item.taxAmount > 0) parts.push(`GST: ${item.taxAmount.toFixed(2)}`);
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
							placeholder="Remarks"
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.remarks || "-"}</span>
					),
			},
			...(isJuteOrder(invoiceTypeCode) ? [
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
								onChange={(e) => handleLineFieldChange(item.id, "juteClaimRate", e.target.value)}
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
								onChange={(e) => handleLineFieldChange(item.id, "juteClaimAmountDtl", e.target.value)}
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
								onChange={(e) => handleLineFieldChange(item.id, "juteClaimDesc", e.target.value)}
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
								onChange={(e) => handleLineFieldChange(item.id, "juteUnitConversion", e.target.value)}
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
								onChange={(e) => handleLineFieldChange(item.id, "juteQtyUnitConversion", e.target.value)}
								placeholder="0"
								className="h-8 text-sm"
							/>
						) : (
							<span className="block truncate text-sm">{item.juteQtyUnitConversion ?? "-"}</span>
						),
				},
			] as TransactionLineColumn<EditableLineItem>[] : []),
		],
		[canEdit, invoiceTypeCode, itemGroupOptions, itemGroupLoading, getItemOptions, getMakeOptions, getUomOptions, getUomConversions, getItemGroupLabel, getItemFullCode, handleLineFieldChange],
	);
