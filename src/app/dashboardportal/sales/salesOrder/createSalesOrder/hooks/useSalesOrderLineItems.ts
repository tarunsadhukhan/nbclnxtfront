import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode } from "@/components/ui/muiform";
import { toast } from "@/hooks/use-toast";
import type { SalesOrderLine } from "@/utils/salesOrderService";
import type { EditableLineItem, ItemGroupCacheEntry, ItemGroupRecord } from "../types/salesOrderTypes";
import { createBlankLine } from "../utils/salesOrderFactories";
import { computeHessianFields } from "../utils/hessianCalculations";
import { isGovtSkgOrder, isJuteYarnOrder } from "../utils/salesOrderConstants";

export const lineHasAnyData = (line: EditableLineItem) =>
	Boolean(line.itemGroup || line.item || line.itemMake || line.quantity || line.rate || line.uom || line.remarks);

export const lineIsComplete = (line: EditableLineItem) => {
	const qty = Number(line.quantity);
	const rate = Number(line.rate);
	return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0 && Number.isFinite(rate) && rate >= 0);
};

let lineIdCounter = 0;
const generateLineId = () => {
	lineIdCounter += 1;
	return `so-line-${Date.now()}-${lineIdCounter}`;
};

type UseSalesOrderLineItemsParams = {
	mode: MuiFormMode;
	coConfig?: { india_gst?: number };
	billingToState?: string;
	shippingToState?: string;
	itemGroupCache: Partial<Record<string, ItemGroupCacheEntry>>;
	itemGroupLoading: Partial<Record<string, boolean>>;
	ensureItemGroupData: (groupId: string) => void;
	itemGroups: ReadonlyArray<ItemGroupRecord>;
	/** Resolved invoice type code from form header (e.g. "hessian", "govt_skg") */
	invoiceTypeCode?: string;
	/** Broker commission percent from form header */
	brokeragePercent?: number;
};

export const useSalesOrderLineItems = ({
	mode,
	coConfig,
	billingToState,
	shippingToState,
	itemGroupCache,
	itemGroupLoading,
	ensureItemGroupData,
	itemGroups,
	invoiceTypeCode,
	brokeragePercent,
}: UseSalesOrderLineItemsParams) => {
	const {
		items: lineItems,
		setItems: setLineItems,
		replaceItems,
		removeItems: removeLineItems,
	} = useLineItems<EditableLineItem>({
		createBlankItem: createBlankLine,
		hasData: lineHasAnyData,
		getItemId: (item) => item.id,
		maintainTrailingBlank: false,
	});

	// Store in refs to keep calculateLineTax stable across renders
	const billingToStateRef = React.useRef(billingToState);
	billingToStateRef.current = billingToState;
	const shippingToStateRef = React.useRef(shippingToState);
	shippingToStateRef.current = shippingToState;
	const coConfigRef = React.useRef(coConfig);
	coConfigRef.current = coConfig;

	const calculateLineTax = React.useCallback((amount: number, taxPct: number) => {
		if (!taxPct || !amount) return { igst: 0, cgst: 0, sgst: 0, total: 0 };
		const taxAmount = (amount * taxPct) / 100;
		const isSameState = billingToStateRef.current && shippingToStateRef.current && billingToStateRef.current === shippingToStateRef.current;
		if (coConfigRef.current?.india_gst && isSameState) {
			const half = taxAmount / 2;
			return { igst: 0, cgst: Math.round(half * 100) / 100, sgst: Math.round(half * 100) / 100, total: Math.round(taxAmount * 100) / 100 };
		}
		return { igst: Math.round(taxAmount * 100) / 100, cgst: 0, sgst: 0, total: Math.round(taxAmount * 100) / 100 };
	}, []);

	/** Round a number to the specified decimal places. */
	const roundTo = React.useCallback((value: number, decimals: number | undefined): number => {
		if (decimals == null || decimals < 0) return value;
		const factor = Math.pow(10, decimals);
		return Math.round(value * factor) / factor;
	}, []);

	const calculateLineAmount = React.useCallback((qty: number, rate: number, discountMode?: number, discountValue?: number) => {
		const gross = qty * rate;
		let discountAmount = 0;
		if (discountMode === 1 && discountValue) {
			discountAmount = (gross * discountValue) / 100;
		} else if (discountMode === 2 && discountValue) {
			discountAmount = discountValue * qty;
		}
		return { amount: Math.max(0, gross - discountAmount), discountAmount };
	}, []);

	const isHessian = invoiceTypeCode === "hessian";
	const isGovtSkg = isGovtSkgOrder(invoiceTypeCode);
	const isJuteYarn = isJuteYarnOrder(invoiceTypeCode);

	/**
	 * Resolve the effective qty rounding for a line item.
	 * Priority: UOM-specific rounding from uom_item_map_mst > item-level uom_rounding from item_mst.
	 */
	const resolveQtyRounding = React.useCallback(
		(groupId: string, itemId: string, uomId: string): number | undefined => {
			const cache = itemGroupCache[groupId];
			if (!cache) return undefined;
			// Check UOM-specific rounding from conversions
			const conversions = cache.uomConversionsByItemId[itemId];
			if (conversions?.length) {
				for (const conv of conversions) {
					if (conv.mapFromId === uomId || conv.mapToId === uomId) {
						if (conv.rounding != null) return conv.rounding;
					}
				}
			}
			// Fall back to item-level uom_rounding
			const itemRounding = cache.itemUomRoundingById?.[itemId];
			return itemRounding ?? undefined;
		},
		[itemGroupCache],
	);

	/** Resolve rate rounding for an item. Default 2. */
	const resolveRateRounding = React.useCallback(
		(groupId: string, itemId: string): number => {
			const cache = itemGroupCache[groupId];
			return cache?.itemRateRoundingById?.[itemId] ?? 2;
		},
		[itemGroupCache],
	);

	/**
	 * Look up the conversion factor for an item given its billing/default UOM.
	 * Returns the relation_value from uom_item_map_mst.
	 *
	 * Checks both directions:
	 * - If billing UOM is mapFrom: relation_value = other UOM per billing UOM
	 *   (e.g. for hessian: MT→Bales, factor = bales per MT)
	 *   (e.g. for govt skg: 100pcs→Bales, factor = bales per 100pcs)
	 * - If billing UOM is mapTo: 1/relation_value gives the inverse
	 */
	const getConversionFactor = React.useCallback(
		(groupId: string, itemId: string, selectedUomId: string): number | undefined => {
			const cache = itemGroupCache[groupId];
			if (!cache) return undefined;
			const conversions = cache.uomConversionsByItemId[itemId];
			if (!conversions?.length) return undefined;
			// Prefer: billing UOM is the mapFrom side
			for (const conv of conversions) {
				if (conv.mapFromId === selectedUomId && conv.relationValue > 0) {
					return conv.relationValue;
				}
			}
			// Fallback: billing UOM is the mapTo side — invert the factor
			for (const conv of conversions) {
				if (conv.mapToId === selectedUomId && conv.relationValue > 0) {
					return 1 / conv.relationValue;
				}
			}
			return undefined;
		},
		[itemGroupCache],
	);

	/**
	 * Look up the bales conversion for a govt sacking item.
	 * Finds the UOM mapping where mapToName contains "bale" (case-insensitive),
	 * returns { factor, balesUomId } or undefined.
	 *
	 * If a known balesUomId is provided, uses that for an exact match first.
	 */
	const getGovtSkgBalesConversion = React.useCallback(
		(groupId: string, itemId: string, billingUomId: string, knownBalesUomId?: string): { factor: number; balesUomId: string } | undefined => {
			const cache = itemGroupCache[groupId];
			if (!cache) return undefined;
			const conversions = cache.uomConversionsByItemId[itemId];
			if (!conversions?.length) return undefined;

			// If we already know the bales UOM ID, find that exact conversion
			if (knownBalesUomId) {
				for (const conv of conversions) {
					if (conv.mapFromId === billingUomId && conv.mapToId === knownBalesUomId && conv.relationValue > 0) {
						return { factor: conv.relationValue, balesUomId: conv.mapToId };
					}
				}
			}

			// Otherwise find by name: look for "bale" in the target UOM name
			for (const conv of conversions) {
				if (conv.mapFromId === billingUomId && conv.relationValue > 0 && conv.mapToName.toLowerCase().includes("bale")) {
					return { factor: conv.relationValue, balesUomId: conv.mapToId };
				}
			}
			return undefined;
		},
		[itemGroupCache],
	);

	/**
	 * Apply hessian calculations to a line item.
	 * Updates quantity (MT), rate (billingRateMt), and all hessian annotation fields.
	 */
	const applyHessianToLine = React.useCallback(
		(line: EditableLineItem): EditableLineItem => {
			// Lazily resolve conversion factor from cache if not already set
			let convFactor = line.conversionFactor || 0;
			if (!convFactor && line.itemGroup && line.item && line.uom) {
				convFactor = getConversionFactor(line.itemGroup, line.item, line.uom) || 0;
				if (convFactor) line = { ...line, conversionFactor: convFactor };
			}
			if (!convFactor) return line;

			// Lazily resolve rate rounding from item_mst cache when not yet set.
			// Items added via the picker dialog may arrive before the group cache loads.
			if (line.rateRounding == null && line.itemGroup && line.item) {
				const resolved = resolveRateRounding(line.itemGroup, line.item);
				if (resolved != null) line = { ...line, rateRounding: resolved };
			}

			const qtyBales = Number(line.qtyBales) || 0;
			const rawRateMt = Number(line.rawRateMt) || 0;
			const brokPct = brokeragePercent ?? 0;

			const h = computeHessianFields(qtyBales, rawRateMt, convFactor, brokPct, line.qtyRounding ?? 3, line.rateRounding ?? 2);

			// Main table values: quantity = MT, rate = billing rate MT
			const updatedQuantity = String(h.qtyMt);
			const updatedRate = String(h.billingRateMt);

			const qty = h.qtyMt;
			const rate = h.billingRateMt;
			const { amount, discountAmount } = calculateLineAmount(qty, rate, line.discountType, Number(line.discountValue) || 0);
			const tax = calculateLineTax(amount, line.taxPercentage || 0);

			return {
				...line,
				quantity: updatedQuantity,
				rate: updatedRate,
				ratePerBale: h.ratePerBale,
				billingRateMt: h.billingRateMt,
				billingRateBale: h.billingRateBale,
				discountAmount,
				amount,
				igstAmount: tax.igst,
				cgstAmount: tax.cgst,
				sgstAmount: tax.sgst,
				taxAmount: tax.total,
			};
		},
		[brokeragePercent, calculateLineAmount, calculateLineTax, getConversionFactor, resolveRateRounding],
	);

	/**
	 * Apply jute yarn brokerage/rate calc to a line item. Mirrors hessian logic but
	 * without bales conversion: user enters juteYarnRawRate (pre-brokerage), system
	 * computes billing rate = rawRate * (1 - brokeragePct/100) and stores it in
	 * line.rate. Quantity, UOM, and amount otherwise behave like a regular line.
	 */
	const applyJuteYarnToLine = React.useCallback(
		(line: EditableLineItem): EditableLineItem => {
			// Lazily resolve rate rounding when not yet set (item picker path).
			if (line.rateRounding == null && line.itemGroup && line.item) {
				const resolved = resolveRateRounding(line.itemGroup, line.item);
				if (resolved != null) line = { ...line, rateRounding: resolved };
			}
			const rawRate = Number(line.juteYarnRawRate) || 0;
			const brokPct = brokeragePercent ?? 0;
			const rateRounding = line.rateRounding ?? 2;
			const billingRate = roundTo(rawRate - (rawRate * brokPct) / 100, rateRounding);

			const rawQty = Number(line.quantity) || 0;
			const qty = line.qtyRounding != null ? roundTo(rawQty, line.qtyRounding) : rawQty;
			const { amount, discountAmount } = calculateLineAmount(qty, billingRate, line.discountType, Number(line.discountValue) || 0);
			const tax = calculateLineTax(amount, line.taxPercentage || 0);

			return {
				...line,
				rate: billingRate ? String(billingRate) : "",
				juteYarnBillingRate: billingRate > 0 ? billingRate : undefined,
				discountAmount,
				amount,
				igstAmount: tax.igst,
				cgstAmount: tax.cgst,
				sgstAmount: tax.sgst,
				taxAmount: tax.total,
			};
		},
		[brokeragePercent, calculateLineAmount, calculateLineTax, roundTo, resolveRateRounding],
	);

	const mapLineToEditable = React.useCallback((line: SalesOrderLine, brokPctOverride?: number): EditableLineItem => {
		const groupId = line.itemGroup ? String(line.itemGroup) : "";
		const itemId = line.item ?? "";
		const uomId = line.uom ?? line.qtyUom ?? "";
		const qtyRound = groupId && itemId && uomId ? resolveQtyRounding(groupId, itemId, uomId) : undefined;
		const rateRound = groupId && itemId ? resolveRateRounding(groupId, itemId) : 2;

		const base: EditableLineItem = {
			id: line.id ? String(line.id) : generateLineId(),
			quotationLineitemId: line.quotationLineitemId,
			hsnCode: line.hsnCode,
			itemGroup: groupId,
			item: itemId,
			fullItemCode: line.fullItemCode ? String(line.fullItemCode) : (line.full_item_code ? String(line.full_item_code) : undefined),
			itemMake: line.itemMake ?? "",
			quantity: line.quantity != null ? String(line.quantity) : "",
			rate: line.rate != null ? String(line.rate) : "",
			uom: uomId,
			discountType: line.discountType ?? undefined,
			discountValue: line.discountedRate != null ? String(line.discountedRate) : "",
			discountAmount: line.discountAmount ?? undefined,
			amount: line.netAmount ?? undefined,
			remarks: line.remarks ?? "",
			taxPercentage: line.gst?.igstPercent ? Number(line.gst.igstPercent) : (line.gst?.cgstPercent ? Number(line.gst.cgstPercent) * 2 : undefined),
			igstAmount: line.gst?.igstAmount ?? undefined,
			cgstAmount: line.gst?.cgstAmount ?? undefined,
			sgstAmount: line.gst?.sgstAmount ?? undefined,
			taxAmount: line.gst?.gstTotal ?? undefined,
			qtyRounding: qtyRound,
			rateRounding: rateRound,
		};

		// Restore hessian fields when present (invoice_type = 2)
		const h = line.hessian;
		if (h) {
			const qtyMt = Number(line.quantity) || 0;
			const qtyBales = h.qtyBales ?? 0;
			const convFactor = qtyMt > 0 ? (qtyBales ?? 0) / qtyMt : 0;
			// Reverse the forward formula `billingRateMt = rawRateMt * (1 - brokPct/100)`
			// so rawRateMt = billingRateMt / (1 - brokPct/100). This recovers the exact
			// user-entered rate (billingRateMt is stored at 2-decimal precision and the
			// inverse is lossless for sensible brokerage values), whereas
			// `ratePerBale * convFactor` compounds rounding from two rounded fields.
			// Fall back to that product only when brokerage or billing data is missing.
			const brokPct = brokPctOverride ?? brokeragePercent ?? 0;
			const brokFactor = 1 - brokPct / 100;
			const billingRateMt = h.billingRateMt ?? 0;
			const rawRateMtRaw = billingRateMt > 0 && brokFactor > 0
				? billingRateMt / brokFactor
				: (h.ratePerBale ?? 0) * (convFactor || 1);
			const rawRateMt = Math.round(rawRateMtRaw * 100) / 100;
			base.qtyBales = qtyBales ? String(qtyBales) : "";
			base.rawRateMt = rawRateMt ? String(rawRateMt) : "";
			base.ratePerBale = h.ratePerBale ?? undefined;
			base.billingRateMt = h.billingRateMt ?? undefined;
			base.billingRateBale = h.billingRateBale ?? undefined;
			base.conversionFactor = convFactor || undefined;
		}

		// Restore jute detail fields when present (invoice_type = 4)
		const jd = line.juteDtl;
		if (jd) {
			base.juteClaimRate = jd.claimRate != null ? String(jd.claimRate) : "";
			base.juteClaimAmountDtl = jd.claimAmountDtl != null ? String(jd.claimAmountDtl) : "";
			base.juteClaimDesc = jd.claimDesc ?? "";
			base.juteUnitConversion = jd.unitConversion ?? "";
			base.juteQtyUnitConversion = jd.qtyUnitConversion != null ? String(jd.qtyUnitConversion) : "";
		}

		// Restore jute yarn raw rate when applicable. Backend stores only the billing
		// rate (line.rate); reverse the forward formula `billing = raw * (1 - brok%/100)`
		// to recover what the user originally entered.
		if (isJuteYarn) {
			const storedRate = Number(line.rate) || 0;
			const brokPct = brokPctOverride ?? brokeragePercent ?? 0;
			const brokFactor = 1 - brokPct / 100;
			const rawRate = storedRate > 0 && brokFactor > 0 ? storedRate / brokFactor : storedRate;
			const rounded = Math.round(rawRate * 100) / 100;
			base.juteYarnRawRate = rounded ? String(rounded) : "";
			base.juteYarnBillingRate = storedRate > 0 ? storedRate : undefined;
		}

		// Restore govt SKG detail fields when present (invoice_type = 5)
		const gd = line.govtskgDtl;
		if (gd) {
			base.govtskgPackSheet = gd.packSheet != null ? String(gd.packSheet) : "";
			base.govtskgNetWeight = gd.netWeight != null ? String(gd.netWeight) : "";
			base.govtskgTotalWeight = gd.totalWeight != null ? String(gd.totalWeight) : "";
			// Back-calculate bales from stored quantity when the UOM cache is already populated.
			// (Deferred effect below handles the case where cache loads later.)
			const qtyPer100 = Number(line.quantity) || 0;
			if (qtyPer100 > 0 && groupId && itemId && uomId) {
				const conv = getGovtSkgBalesConversion(groupId, itemId, uomId);
				if (conv && conv.factor > 0) {
					base.govtskgQtyBales = String(qtyPer100 * conv.factor);
					base.govtskgConversionFactor = conv.factor;
					base.govtskgBalesUomId = conv.balesUomId;
				}
			}
		}

		return base;
	}, [resolveQtyRounding, resolveRateRounding, getGovtSkgBalesConversion, brokeragePercent, isJuteYarn]);

	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string | number) => {
			if (mode === "view") return;
			const value = typeof rawValue === "number" ? String(rawValue) : rawValue;

			if (field === "itemGroup") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id ? { ...item, itemGroup: value, item: "", itemMake: "", uom: "", rate: "" } : item,
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
						toast({ variant: "destructive", title: "Duplicate item", description: "This item is already added." });
						return prev;
					}
					return prev.map((item) => {
						if (item.id !== id) return item;
						const cache = itemGroupCache[item.itemGroup ?? ""];
						const defaultRate = cache?.itemRateById[value];
						const defaultTax = cache?.itemTaxById[value];
						const defaultUom = cache?.items.find((opt) => opt.value === value)?.defaultUomId;
						const uomOptions = cache?.uomsByItemId[value] ?? [];
						let nextUom = item.uom;
						if (defaultUom && uomOptions.some((opt) => opt.value === defaultUom)) nextUom = defaultUom;
						else if (uomOptions.length) nextUom = uomOptions[0].value;
						const tax = calculateLineTax(0, defaultTax || 0);
						const qtyRound = resolveQtyRounding(item.itemGroup, value, nextUom);
						const rateRound = resolveRateRounding(item.itemGroup, value);
						const roundedRate = defaultRate != null ? roundTo(defaultRate, rateRound) : undefined;
						const updated: EditableLineItem = {
							...item, item: value, uom: nextUom,
							rate: roundedRate != null ? String(roundedRate) : item.rate,
							taxPercentage: defaultTax,
							igstAmount: tax.igst, cgstAmount: tax.cgst, sgstAmount: tax.sgst, taxAmount: tax.total,
							qtyRounding: qtyRound,
							rateRounding: rateRound,
						};
						// In hessian mode, also resolve the conversion factor for the new item
						if (isHessian && value && nextUom) {
							const convFactor = getConversionFactor(item.itemGroup, value, nextUom);
							updated.conversionFactor = convFactor;
							// Reset hessian user-entered fields — user must re-enter after item change
							updated.qtyBales = "";
							updated.rawRateMt = roundedRate != null ? String(roundedRate) : "";
							updated.ratePerBale = undefined;
							updated.billingRateMt = undefined;
							updated.billingRateBale = undefined;
							updated.quantity = "";
							updated.rate = "";
						}
						// In jute yarn mode, seed juteYarnRawRate from the default rate so the
						// billing rate can be derived immediately once qty is entered. The stored
						// `rate` stays empty until applyJuteYarnToLine runs (via qty or raw rate edits).
						if (isJuteYarn && value) {
							updated.juteYarnRawRate = roundedRate != null ? String(roundedRate) : "";
							updated.juteYarnBillingRate = undefined;
							updated.rate = "";
						}
						// In govt_skg mode, resolve the bales conversion factor
						if (isGovtSkg && value && nextUom) {
							const balesConv = getGovtSkgBalesConversion(item.itemGroup, value, nextUom);
							updated.govtskgConversionFactor = balesConv?.factor;
							updated.govtskgBalesUomId = balesConv?.balesUomId;
							// Reset govt skg bales field — user must re-enter after item change
							updated.govtskgQtyBales = "";
						}
						return updated;
					});
				});
				return;
			}

			// --- Hessian-specific fields (qtyBales, rawRateMt) ---
			if (isHessian && (field === "qtyBales" || field === "rawRateMt")) {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, [field]: sanitized };
						return applyHessianToLine(updated);
					}),
				);
				return;
			}

			// --- Jute Yarn: raw rate or quantity edits route through applyJuteYarnToLine
			// so billing rate, amount, and tax stay consistent with the brokerage formula. ---
			if (isJuteYarn && (field === "juteYarnRawRate" || field === "quantity")) {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, [field]: sanitized };
						return applyJuteYarnToLine(updated);
					}),
				);
				return;
			}

			// --- Govt SKG bales field ---
			if (isGovtSkg && field === "govtskgQtyBales") {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						// Lazily resolve bales conversion from cache if not already set
						let convFactor = item.govtskgConversionFactor || 0;
						let balesUomId = item.govtskgBalesUomId;
						if (!convFactor && item.itemGroup && item.item && item.uom) {
							const balesConv = getGovtSkgBalesConversion(item.itemGroup, item.item, item.uom, balesUomId);
							convFactor = balesConv?.factor || 0;
							balesUomId = balesConv?.balesUomId || balesUomId;
						}
						const bales = Number(sanitized) || 0;
						const quantity = convFactor > 0 ? bales / convFactor : 0;
						const rate = Number(item.rate) || 0;
						const amount = quantity * rate;
						const tax = calculateLineTax(amount, item.taxPercentage || 0);
						return {
							...item,
							govtskgConversionFactor: convFactor || item.govtskgConversionFactor,
							govtskgBalesUomId: balesUomId,
							govtskgQtyBales: sanitized,
							quantity: String(quantity),
							amount,
							igstAmount: tax.igst,
							cgstAmount: tax.cgst,
							sgstAmount: tax.sgst,
							taxAmount: tax.total,
						};
					}),
				);
				return;
			}

			// --- Govt SKG rate change: recalculate using bales-converted qty ---
			if (isGovtSkg && field === "rate" && id) {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, rate: sanitized };
						// If bales were entered, recalculate from bales
						if (item.govtskgQtyBales && Number(item.govtskgQtyBales)) {
							let convFactor = item.govtskgConversionFactor || 0;
							let balesUomId = item.govtskgBalesUomId;
							if (!convFactor && item.itemGroup && item.item && item.uom) {
								const balesConv = getGovtSkgBalesConversion(item.itemGroup, item.item, item.uom, balesUomId);
								convFactor = balesConv?.factor || 0;
								balesUomId = balesConv?.balesUomId || balesUomId;
							}
							const bales = Number(item.govtskgQtyBales) || 0;
							const quantity = convFactor > 0 ? bales / convFactor : 0;
							const rate = Number(sanitized) || 0;
							const amount = quantity * rate;
							const tax = calculateLineTax(amount, item.taxPercentage || 0);
							return {
								...updated,
								govtskgConversionFactor: convFactor || item.govtskgConversionFactor,
								govtskgBalesUomId: balesUomId,
								quantity: String(quantity),
								amount,
								igstAmount: tax.igst,
								cgstAmount: tax.cgst,
								sgstAmount: tax.sgst,
								taxAmount: tax.total,
							};
						}
						// No bales entered yet — just store rate, no amount calc
						return updated;
					}),
				);
				return;
			}

			if (field === "quantity" || field === "rate") {
				const sanitized = value.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, [field]: sanitized };
						// Apply rounding: quantity uses qtyRounding, rate uses rateRounding (default 2)
						const rawQty = Number(updated.quantity) || 0;
						const rawRate = Number(updated.rate) || 0;
						const qty = updated.qtyRounding != null ? roundTo(rawQty, updated.qtyRounding) : rawQty;
						const rate = roundTo(rawRate, updated.rateRounding ?? 2);
						const { amount, discountAmount } = calculateLineAmount(qty, rate, updated.discountType, Number(updated.discountValue) || 0);
						updated.discountAmount = discountAmount;
						updated.amount = amount;
						const tax = calculateLineTax(amount, updated.taxPercentage || 0);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						return updated;
					}),
				);
				return;
			}

			if (field === "discountType") {
				const modeValue = value ? Number(value) : undefined;
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, discountType: modeValue, discountValue: "" };
						const rawQty = Number(updated.quantity) || 0;
						const rawRate = Number(updated.rate) || 0;
						const qty = updated.qtyRounding != null ? roundTo(rawQty, updated.qtyRounding) : rawQty;
						const rate = roundTo(rawRate, updated.rateRounding ?? 2);
						const { amount, discountAmount } = calculateLineAmount(qty, rate, modeValue, 0);
						updated.discountAmount = discountAmount;
						updated.amount = amount;
						const tax = calculateLineTax(amount, updated.taxPercentage || 0);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
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
						const rawRate = Number(item.rate) || 0;
						const rate = roundTo(rawRate, item.rateRounding ?? 2);
						let discountValue = Number(sanitized) || 0;
						if (item.discountType === 1 && discountValue >= 100) discountValue = 99.99;
						else if (item.discountType === 2 && discountValue >= rate && rate > 0) discountValue = rate - 0.01;
						const updated = { ...item, discountValue: String(discountValue === 0 ? sanitized : discountValue) };
						const rawQty = Number(updated.quantity) || 0;
						const qty = updated.qtyRounding != null ? roundTo(rawQty, updated.qtyRounding) : rawQty;
						const { amount, discountAmount } = calculateLineAmount(qty, rate, item.discountType, discountValue);
						updated.discountAmount = discountAmount;
						updated.amount = amount;
						const tax = calculateLineTax(amount, updated.taxPercentage || 0);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						return updated;
					}),
				);
				return;
			}

			if (field === "uom") {
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const updated = { ...item, uom: value };
						// Update qty rounding based on new UOM
						updated.qtyRounding = resolveQtyRounding(item.itemGroup, item.item, value);
						// Recalculate amount with updated rounding
						const rawQty = Number(updated.quantity) || 0;
						const rawRate = Number(updated.rate) || 0;
						const qty = updated.qtyRounding != null ? roundTo(rawQty, updated.qtyRounding) : rawQty;
						const rate = roundTo(rawRate, updated.rateRounding ?? 2);
						const { amount, discountAmount } = calculateLineAmount(qty, rate, updated.discountType, Number(updated.discountValue) || 0);
						updated.discountAmount = discountAmount;
						updated.amount = amount;
						const tax = calculateLineTax(amount, updated.taxPercentage || 0);
						updated.igstAmount = tax.igst;
						updated.cgstAmount = tax.cgst;
						updated.sgstAmount = tax.sgst;
						updated.taxAmount = tax.total;
						return updated;
					}),
				);
				return;
			}

			setLineItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, [field]: value } as EditableLineItem : item)),
			);
		},
		[mode, setLineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData, isHessian, isGovtSkg, isJuteYarn, getConversionFactor, getGovtSkgBalesConversion, applyHessianToLine, applyJuteYarnToLine, calculateLineTax, calculateLineAmount, resolveQtyRounding, resolveRateRounding, roundTo],
	);

	const handleQuotationItemsConfirm = React.useCallback(
		(items: Array<Record<string, unknown>>) => {
			setLineItems((prev) => {
				const filledLines = prev.filter(lineHasAnyData);
				const newLines: EditableLineItem[] = items.map((item) => {
					const groupId = String(item.item_grp_id ?? "");
					const itemId = String(item.item_id ?? "");
					const uomId = String(item.uom_id ?? "");
					if (groupId && !itemGroupCache[groupId]) ensureItemGroupData(groupId);
					const qtyRound = groupId && itemId && uomId ? resolveQtyRounding(groupId, itemId, uomId) : undefined;
					const rateRound = groupId && itemId ? resolveRateRounding(groupId, itemId) : 2;
					return {
						id: generateLineId(),
						quotationLineitemId: item.sales_quotation_dtl_id ? Number(item.sales_quotation_dtl_id) : undefined,
						hsnCode: item.hsn_code ? String(item.hsn_code) : undefined,
						itemGroup: groupId,
						item: itemId,
						itemMake: item.item_make_id ? String(item.item_make_id) : "",
						quantity: String(item.quantity ?? ""),
						rate: String(item.rate ?? ""),
						uom: uomId,
						discountType: item.discount_type ? Number(item.discount_type) : undefined,
						discountValue: item.discounted_rate != null ? String(item.discounted_rate) : "",
						discountAmount: item.discount_amount ? Number(item.discount_amount) : undefined,
						amount: item.total_amount ? Number(item.total_amount) : undefined,
						remarks: item.remarks ? String(item.remarks) : "",
						taxPercentage: item.tax_percentage ? Number(item.tax_percentage) : undefined,
						qtyRounding: qtyRound,
						rateRounding: rateRound,
					};
				});
				return [...filledLines, ...newLines];
			});
		},
		[ensureItemGroupData, itemGroupCache, setLineItems, resolveQtyRounding, resolveRateRounding],
	);

	const filledLineItems = React.useMemo(() => lineItems.filter(lineHasAnyData), [lineItems]);

	const lineItemsValid = React.useMemo(() => {
		if (mode === "view") return true;
		if (!filledLineItems.length) return false;
		return filledLineItems.every(lineIsComplete);
	}, [filledLineItems, mode]);

	const itemGroupsFromLineItems: ItemGroupRecord[] = React.useMemo(() => {
		const groups = new Map<string, { id: string; label: string }>();
		itemGroups.forEach((grp) => groups.set(grp.id, grp));
		lineItems.forEach((line) => {
			if (line.itemGroup && !groups.has(line.itemGroup)) {
				const cachedLabel = itemGroupCache[line.itemGroup]?.groupLabel;
				groups.set(line.itemGroup, { id: line.itemGroup, label: cachedLabel || line.itemGroup });
			}
		});
		return Array.from(groups.values());
	}, [itemGroupCache, itemGroups, lineItems]);

	// --- Resolve conversion factors once cache loads ---
	// Items added from dialog don't have conversion factors until the setup_2 API returns.
	// This effect patches lines once the cache is available.
	React.useEffect(() => {
		if (!isGovtSkg && !isHessian) return;

		setLineItems((prev) => {
			let changed = false;
			const next = prev.map((line) => {
				// Govt SKG: resolve missing bales conversion factor OR back-fill bales
				// (when quantity is loaded from a saved order but govtskgQtyBales is empty)
				const needsFactor = !line.govtskgConversionFactor;
				const needsBalesBackfill = !line.govtskgQtyBales && Number(line.quantity) > 0;
				if (isGovtSkg && (needsFactor || needsBalesBackfill) && line.itemGroup && line.item && line.uom) {
					const balesConv = getGovtSkgBalesConversion(line.itemGroup, line.item, line.uom, line.govtskgBalesUomId);
					if (balesConv) {
						changed = true;
						let bales = Number(line.govtskgQtyBales) || 0;
						// Reverse-calculate bales from stored quantity when loading an existing order
						// (qty is saved in pricing units e.g. 100 pcs; bales = qty * conversionFactor)
						if (bales === 0 && Number(line.quantity) > 0) {
							bales = Number(line.quantity) * balesConv.factor;
						}
						const quantity = bales > 0 ? bales / balesConv.factor : 0;
						const rate = Number(line.rate) || 0;
						const amount = quantity * rate;
						const tax = calculateLineTax(amount, line.taxPercentage || 0);
						return {
							...line,
							govtskgConversionFactor: balesConv.factor,
							govtskgBalesUomId: balesConv.balesUomId,
							govtskgQtyBales: bales > 0 ? String(bales) : line.govtskgQtyBales,
							quantity: bales > 0 ? String(quantity) : line.quantity,
							amount: bales > 0 && rate > 0 ? amount : line.amount,
							igstAmount: bales > 0 && rate > 0 ? tax.igst : line.igstAmount,
							cgstAmount: bales > 0 && rate > 0 ? tax.cgst : line.cgstAmount,
							sgstAmount: bales > 0 && rate > 0 ? tax.sgst : line.sgstAmount,
							taxAmount: bales > 0 && rate > 0 ? tax.total : line.taxAmount,
						};
					}
				}
				// Hessian: resolve missing conversion factor and recalculate
				if (isHessian && !line.conversionFactor && line.itemGroup && line.item && line.uom) {
					const convFactor = getConversionFactor(line.itemGroup, line.item, line.uom);
					if (convFactor) {
						changed = true;
						return applyHessianToLine({ ...line, conversionFactor: convFactor });
					}
				}
				return line;
			});
			return changed ? next : prev;
		});
	}, [isGovtSkg, isHessian, itemGroupCache, setLineItems, getGovtSkgBalesConversion, getConversionFactor, calculateLineTax, applyHessianToLine]);

	// --- Hessian / Jute Yarn brokerage reactivity ---
	// When broker_commission_percent changes in the header, recalculate affected line items.
	const prevBrokerageRef = React.useRef(brokeragePercent);
	React.useEffect(() => {
		if (!isHessian && !isJuteYarn) return;
		if (mode === "view") return;
		if (prevBrokerageRef.current === brokeragePercent) return;
		prevBrokerageRef.current = brokeragePercent;

		setLineItems((prev) =>
			prev.map((line) => {
				if (isHessian && line.conversionFactor && line.rawRateMt) {
					return applyHessianToLine(line);
				}
				if (isJuteYarn && line.juteYarnRawRate) {
					return applyJuteYarnToLine(line);
				}
				return line;
			}),
		);
	}, [brokeragePercent, isHessian, isJuteYarn, mode, setLineItems, applyHessianToLine, applyJuteYarnToLine]);

	return {
		lineItems, setLineItems, replaceItems, removeLineItems,
		handleLineFieldChange, handleQuotationItemsConfirm,
		mapLineToEditable, lineHasAnyData, lineIsComplete,
		filledLineItems, lineItemsValid, itemGroupsFromLineItems,
	};
};
