import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode } from "@/components/ui/muiform";
import { toast } from "@/hooks/use-toast";
import type { QuotationLine } from "@/utils/quotationService";
import type { EditableLineItem, ItemGroupCacheEntry, ItemGroupRecord } from "../types/quotationTypes";
import { createBlankLine, generateLineId } from "../utils/quotationFactories";
import { calculateLineAmount as calculateLineAmountUtil, calculateLineTax } from "../utils/quotationCalculations";
import { isPercentageDiscountMode, isAmountDiscountMode } from "../utils/quotationConstants";

export const lineHasAnyData = (line: EditableLineItem) =>
	Boolean(line.itemGroup || line.item || line.itemMake || line.quantity || line.rate || line.uom || line.hsnCode || line.remarks);

export const lineIsComplete = (line: EditableLineItem) => {
	const qty = Number(line.quantity);
	const rate = Number(line.rate);
	return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0 && Number.isFinite(rate) && rate >= 0);
};

type UseQuotationLineItemsParams = {
	mode: MuiFormMode;
	coConfig?: { india_gst?: number };
	billingState?: string;
	shippingState?: string;
	itemGroupCache: Partial<Record<string, ItemGroupCacheEntry>>;
	itemGroupLoading: Partial<Record<string, boolean>>;
	ensureItemGroupData: (groupId: string) => void;
	itemGroups: ReadonlyArray<ItemGroupRecord>;
};

/**
 * Centralizes all line-item specific business logic for quotations.
 * Simplified from PO: no indent ingestion, no indentDtlId tracking.
 */
export const useQuotationLineItems = ({
	mode,
	coConfig,
	billingState,
	shippingState,
	itemGroupCache,
	itemGroupLoading,
	ensureItemGroupData,
	itemGroups,
}: UseQuotationLineItemsParams) => {
	const {
		items: lineItems,
		setItems: setLineItems,
		replaceItems,
		removeItems: removeLineItems,
	} = useLineItems<EditableLineItem>({
		createBlankItem: createBlankLine,
		hasData: lineHasAnyData,
		getItemId: (item) => item.id,
		maintainTrailingBlank: mode !== "view",
	});

	const mapLineToEditable = React.useCallback((line: QuotationLine): EditableLineItem => {
		// get_quotation_by_id returns GST nested under `gst` and discount under
		// `discountType`/`discountAmount`. Fall back to the legacy flat fields.
		const gst = line.gst ?? undefined;
		const igstAmount = gst?.igstAmount ?? line.igst ?? undefined;
		const cgstAmount = gst?.cgstAmount ?? line.cgst ?? undefined;
		const sgstAmount = gst?.sgstAmount ?? line.sgst ?? undefined;
		// Total tax % = IGST% (inter-state) or CGST% + SGST% (intra-state).
		const taxPercentage =
			line.taxPercentage ??
			(gst?.igstAmount != null && gst.igstPercent != null
				? gst.igstPercent
				: (gst?.cgstPercent ?? 0) + (gst?.sgstPercent ?? 0)) ??
			undefined;
		return {
			id: line.id ? String(line.id) : generateLineId(),
			itemGroup: line.itemGroup ? String(line.itemGroup) : "",
			item: line.item ?? "",
			itemCode: line.itemCode,
			itemMake: line.itemMake ?? "",
			hsnCode: line.hsnCode ?? "",
			quantity: line.quantity != null ? String(line.quantity) : "",
			rate: line.rate != null ? String(line.rate) : "",
			uom: line.uom ?? "",
			discountMode: line.discountType ?? line.discountMode,
			discountValue: line.discountValue != null ? String(line.discountValue) : "",
			discountAmount: line.discountAmount,
			netAmount: line.netAmount,
			totalAmount: line.totalAmount,
			remarks: line.remarks ?? "",
			taxPercentage: taxPercentage != null ? Number(taxPercentage) : undefined,
			igstAmount: igstAmount ?? undefined,
			cgstAmount: cgstAmount ?? undefined,
			sgstAmount: sgstAmount ?? undefined,
			taxAmount: (igstAmount ?? 0) + (cgstAmount ?? 0) + (sgstAmount ?? 0),
		};
	}, []);

	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string | number) => {
			if (mode === "view") return;

			const value = typeof rawValue === "number" ? String(rawValue) : rawValue;

			if (field === "itemGroup") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id
							? { ...item, itemGroup: value, item: "", itemMake: "", uom: "", rate: "", hsnCode: "" }
							: item,
					),
				);
				if (value && !itemGroupCache[value] && !itemGroupLoading[value]) {
					void ensureItemGroupData(value);
				}
				return;
			}

			if (field === "item") {
				setLineItems((prev) => {
					const isDuplicate = prev.some((line) => line.id !== id && line.item === value && lineHasAnyData(line));

					if (isDuplicate && value) {
						toast({
							variant: "destructive",
							title: "Duplicate item",
							description: "This item is already added to the quotation. Please select a different item.",
						});
						return prev;
					}

					return prev.map((item) => {
						if (item.id !== id) return item;
						const groupId = item.itemGroup;
						const cache = itemGroupCache[groupId ?? ""];
						const defaultRate = cache?.itemRateById[value];
						const defaultTax = cache?.itemTaxById[value];
						const defaultUom = cache?.items.find((opt) => opt.value === value)?.defaultUomId;
						const uomOptions = cache?.uomsByItemId[value] ?? [];
						let nextUom = item.uom;
						if (defaultUom && uomOptions.some((opt) => opt.value === defaultUom)) {
							nextUom = defaultUom;
						} else if (uomOptions.length) {
							nextUom = uomOptions[0].value;
						}
						const tax = calculateLineTax(0, defaultTax || 0, billingState, shippingState, !!coConfig?.india_gst);

						return {
							...item,
							item: value,
							uom: nextUom,
							rate: defaultRate != null ? String(defaultRate) : item.rate,
							taxPercentage: defaultTax,
							igstAmount: tax.igst,
							cgstAmount: tax.cgst,
							sgstAmount: tax.sgst,
							taxAmount: tax.total,
						};
					});
				});
				return;
			}

			if (field === "quantity" || field === "rate") {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, [field]: sanitized };
						const qty = Number(updated.quantity) || 0;
						const rate = Number(updated.rate) || 0;
						const discountMode = updated.discountMode;
						const discountValue = Number(updated.discountValue) || 0;
						const { amount, discountAmount } = calculateLineAmountUtil(qty, rate, discountMode, discountValue);
						updated.discountAmount = discountAmount;
						updated.netAmount = amount;

						const tax = calculateLineTax(
							amount,
							updated.taxPercentage || 0,
							billingState,
							shippingState,
							!!coConfig?.india_gst,
						);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						updated.totalAmount = amount + tax.total;

						return updated;
					}),
				);
				return;
			}

			if (field === "discountMode") {
				const modeValue = value ? Number(value) : undefined;
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, discountMode: modeValue, discountValue: "" };
						const qty = Number(updated.quantity) || 0;
						const rate = Number(updated.rate) || 0;
						const { amount, discountAmount } = calculateLineAmountUtil(qty, rate, modeValue, 0);
						updated.discountAmount = discountAmount;
						updated.netAmount = amount;

						const tax = calculateLineTax(
							amount,
							updated.taxPercentage || 0,
							billingState,
							shippingState,
							!!coConfig?.india_gst,
						);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						updated.totalAmount = amount + tax.total;

						return updated;
					}),
				);
				return;
			}

			if (field === "discountValue") {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const rate = Number(item.rate) || 0;
						const discountMode = item.discountMode;
						let discountValue = Number(sanitized) || 0;

						if (isPercentageDiscountMode(discountMode) && discountValue >= 100) {
							toast({
								variant: "destructive",
								title: "Invalid discount",
								description: "Percentage discount must be less than 100%.",
							});
							discountValue = 99.99;
						} else if (isAmountDiscountMode(discountMode) && discountValue >= rate && rate > 0) {
							toast({
								variant: "destructive",
								title: "Invalid discount",
								description: "Discount amount must be less than the rate.",
							});
							discountValue = rate - 0.01;
						}

						const updated = { ...item, discountValue: String(discountValue === 0 ? sanitized : discountValue) };
						const qty = Number(updated.quantity) || 0;
						const { amount, discountAmount } = calculateLineAmountUtil(qty, rate, discountMode, discountValue);
						updated.discountAmount = discountAmount;
						updated.netAmount = amount;

						const tax = calculateLineTax(
							amount,
							updated.taxPercentage || 0,
							billingState,
							shippingState,
							!!coConfig?.india_gst,
						);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						updated.totalAmount = amount + tax.total;

						return updated;
					}),
				);
				return;
			}

			// Default: just set the field (hsnCode, remarks, itemMake, uom, taxPercentage, etc.)
			setLineItems((prev) =>
				prev.map((item) => {
					if (item.id === id) {
						const updated = { ...item, [field]: value } as EditableLineItem;
						if (field === "taxPercentage") {
							const qty = Number(updated.quantity) || 0;
							const rate = Number(updated.rate) || 0;
							const discountMode = updated.discountMode;
							const discountValue = Number(updated.discountValue) || 0;
							const { amount } = calculateLineAmountUtil(qty, rate, discountMode, discountValue);

							const tax = calculateLineTax(
								amount,
								Number(value) || 0,
								billingState,
								shippingState,
								!!coConfig?.india_gst,
							);
							updated.igstAmount = tax.igst;
							updated.cgstAmount = tax.cgst;
							updated.sgstAmount = tax.sgst;
							updated.taxAmount = tax.total;
							updated.totalAmount = amount + tax.total;
						}
						return updated;
					}
					return item;
				}),
			);
		},
		[coConfig, ensureItemGroupData, itemGroupCache, itemGroupLoading, mode, setLineItems, shippingState, billingState],
	);

	const filledLineItems = React.useMemo(() => lineItems.filter(lineHasAnyData), [lineItems]);

	const lineItemsValid = React.useMemo(() => {
		if (mode === "view") return true;
		if (!filledLineItems.length) return false;
		return filledLineItems.every(lineIsComplete);
	}, [filledLineItems, mode]);

	const itemGroupsFromLineItems: ItemGroupRecord[] = React.useMemo(() => {
		const groups = new Map<string, { id: string; label: string }>();
		itemGroups.forEach((grp) => {
			groups.set(grp.id, grp);
		});
		lineItems.forEach((line) => {
			if (line.itemGroup && !groups.has(line.itemGroup)) {
				const cachedLabel = itemGroupCache[line.itemGroup]?.groupLabel;
				if (cachedLabel) {
					groups.set(line.itemGroup, { id: line.itemGroup, label: cachedLabel });
				} else {
					groups.set(line.itemGroup, { id: line.itemGroup, label: line.itemGroup });
				}
			}
		});
		return Array.from(groups.values());
	}, [itemGroupCache, itemGroups, lineItems]);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
		mapLineToEditable,
		lineHasAnyData,
		lineIsComplete,
		filledLineItems,
		lineItemsValid,
		itemGroupsFromLineItems,
	};
};
