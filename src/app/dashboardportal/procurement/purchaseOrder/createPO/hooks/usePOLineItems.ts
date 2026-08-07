import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode } from "@/components/ui/muiform";
import { toast } from "@/hooks/use-toast";
import type { POLine } from "@/utils/poService";
import { validateItemForPO } from "@/utils/poService";
import type { IndentLineItem } from "../../components/IndentLineItemsDialog";
import type { EditableLineItem, ItemGroupCacheEntry, ItemGroupRecord } from "../types/poTypes";
import { createBlankLine, generateLineId } from "../utils/poFactories";
import { calculateLineAmount as calculateLineAmountUtil, calculateLineTax } from "../utils/poCalculations";
import { isPercentageDiscountMode, isAmountDiscountMode, DISCOUNT_MODE } from "../utils/poConstants";

export const lineHasAnyData = (line: EditableLineItem) =>
	Boolean(line.itemGroup || line.item || line.itemMake || line.quantity || line.rate || line.uom || line.remarks);

export const lineIsComplete = (line: EditableLineItem) => {
	const qty = Number(line.quantity);
	const rate = Number(line.rate);
	return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0 && Number.isFinite(rate) && rate >= 0);
};

type UsePOLineItemsParams = {
	mode: MuiFormMode;
	coConfig?: { india_gst?: number; indent_required?: number | string | null };
	supplierBranchState?: string;
	shippingState?: string;
	itemGroupCache: Partial<Record<string, ItemGroupCacheEntry>>;
	itemGroupLoading: Partial<Record<string, boolean>>;
	ensureItemGroupData: (groupId: string) => void;
	itemGroups: ReadonlyArray<ItemGroupRecord>;
	allowManualEntry: boolean;
	/** Current PO type — "Regular" or "Open". Used for direct-entry validation. */
	poType?: string;
	/** Expense type ID selected in the PO header. Used for direct-entry validation. */
	expenseTypeId?: string;
	/** Branch ID for the PO — used to call the validation API. */
	branchId?: string;
	/** Company ID for the PO — used to call the validation API. */
	coId?: string;
	/** PO ID when editing — passed to validation API for qty adjustment in edit mode */
	poId?: string;
};

/**
 * Centralizes all line-item specific business logic (field changes, indent ingestion, validation).
 */
export const usePOLineItems = ({
	mode,
	coConfig,
	supplierBranchState,
	shippingState,
	itemGroupCache,
	itemGroupLoading,
	ensureItemGroupData,
	itemGroups,
	allowManualEntry,
	poType,
	expenseTypeId,
	branchId,
	coId,
	poId,
}: UsePOLineItemsParams) => {
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

	const indentItemGroupInfoRef = React.useRef<Map<string, { code?: string; name?: string }>>(new Map());

	const mapLineToEditable = React.useCallback((line: POLine): EditableLineItem => ({
		id: generateLineId(),
		poDtlId: line.id ? String(line.id) : undefined,
		indentDtlId: line.indentDtlId,
		indentNo: line.indentNo,
		itemGroup: line.itemGroup ? String(line.itemGroup) : "",
		item: line.item ?? "",
		itemCode: line.itemCode,
		itemMake: line.itemMake ?? "",
		hsnCode: line.hsnCode ?? "",
		quantity: line.quantity != null ? String(line.quantity) : "",
		rate: line.rate != null ? String(line.rate) : "",
		uom: line.uom ?? "",
		discountMode: line.discountMode,
		discountValue: line.discountValue != null ? String(line.discountValue) : "",
		discountAmount: line.discountAmount,
		amount: line.amount,
		remarks: line.remarks ?? "",
		taxPercentage: line.taxPercentage,
		igstAmount: line.igst,
		cgstAmount: line.cgst,
		sgstAmount: line.sgst,
		taxAmount: line.taxAmount,
	}), []);

	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string | number) => {
			if (mode === "view") return;

			let value = typeof rawValue === "number" ? String(rawValue) : rawValue;
			if (field === "taxPercentage") {
				value = value.replace(/[^0-9.]/g, "");
				if (value !== "" && Number(value) > 100) {
					toast({
						variant: "destructive",
						title: "Invalid tax",
						description: "Tax percentage cannot exceed 100%.",
					});
					value = "100";
				}
			}

			if (field === "itemGroup") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id
							? { ...item, itemGroup: value, item: "", itemMake: "", uom: "", rate: "" }
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
							description: "This item is already added to the PO. Please select a different item.",
						});
						return prev;
					}

					return prev.map((item) => {
						if (item.id !== id) return item;
						const groupId = item.itemGroup;
						const cache = itemGroupCache[groupId ?? ""];
						const defaultRate = cache?.itemRateById[value];
						const defaultTax = cache?.itemTaxById[value];
						const defaultHsn = cache?.itemHsnById[value];
						const defaultUom = cache?.items.find((opt) => opt.value === value)?.defaultUomId;
						const uomOptions = cache?.uomsByItemId[value] ?? [];
						let nextUom = item.uom;
						if (defaultUom && uomOptions.some((opt) => opt.value === defaultUom)) {
							nextUom = defaultUom;
						} else if (uomOptions.length) {
							nextUom = uomOptions[0].value;
						}
						const tax = calculateLineTax(0, defaultTax || 0, supplierBranchState, shippingState, !!coConfig?.india_gst);

						return {
							...item,
							item: value,
							uom: nextUom,
							rate: defaultRate != null ? String(defaultRate) : item.rate,
							hsnCode: defaultHsn ?? item.hsnCode,
							taxPercentage: defaultTax,
							igstAmount: tax.igst,
							cgstAmount: tax.cgst,
							sgstAmount: tax.sgst,
							taxAmount: tax.total,
							// Reset any previous validation state for this row
							rowError: undefined,
							rowWarning: undefined,
							validationLogic: undefined,
							isQuantityLocked: false,
							maxPoQty: undefined,
							minPoQty: undefined,						minOrderQty: undefined,						};
					});
				});

				// Async validation for direct (manual) PO entry
				if (allowManualEntry && value && coId && branchId && expenseTypeId) {
					void (async () => {
						try {
							const result = await validateItemForPO({
								coId,
								branchId,
								itemId: value,
								poType: poType ?? "Regular",
								expenseTypeId,
								poId,
							});
							if (!result) return;
							setLineItems((prev) =>
								prev.map((line) => {
									// Stale check: skip if row was already changed or cleared
									if (line.id !== id || line.item !== value) return line;
									const update: Partial<EditableLineItem> = {
										validationLogic: result.validation_logic,
										rowError: result.errors.length ? result.errors.join(" ") : undefined,
										rowWarning: result.warnings.length ? result.warnings.join(" ") : undefined,
									};
									if (result.validation_logic === 1) {
										update.maxPoQty = result.max_po_qty ?? undefined;
										update.minPoQty = result.min_po_qty ?? undefined;
										update.minOrderQty = result.min_order_qty ?? undefined;
									} else if (result.validation_logic === 2 && !result.errors.length && result.forced_qty != null) {
										// Logic 2: auto-fill and lock the quantity
										update.quantity = String(result.forced_qty);
										update.isQuantityLocked = true;
									}
									return { ...line, ...update };
								}),
							);
						} catch {
							// Silently ignore network errors — do not block the user
						}
					})();
				}
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
						updated.amount = amount;

						if (supplierBranchState && shippingState && coConfig?.india_gst) {
							const tax = calculateLineTax(
								amount,
								updated.taxPercentage || 0,
								supplierBranchState,
								shippingState,
								true,
							);
							updated.igstAmount = tax.igst;
							updated.cgstAmount = tax.cgst;
							updated.sgstAmount = tax.sgst;
							updated.taxAmount = tax.total;
						}

						// Live quantity bounds validation
						if (field === "quantity" && qty > 0) {
							const moq = updated.minOrderQty && updated.minOrderQty > 0 ? updated.minOrderQty : null;
							const isValidMultiple = moq === null || Math.abs(Math.round(qty / moq) - qty / moq) < 0.0001;
							if (updated.indentDtlId && updated.availableIndentQty != null) {
								// Indent-based line: qty must not exceed available outstanding
								if (qty > updated.availableIndentQty) {
									updated.rowError = `Cannot exceed outstanding indent qty (${updated.availableIndentQty})`;
								} else if (!isValidMultiple) {
									updated.rowError = `Qty must be a multiple of min order qty (${moq})`;
								} else {
									updated.rowError = undefined;
								}
							} else if (updated.validationLogic === 1) {
								// Logic 1: check max and min bounds, then multiple-of-moq
								if (updated.maxPoQty != null && qty > updated.maxPoQty) {
									updated.rowError = `Qty exceeds max PO qty (${updated.maxPoQty})`;
								} else if (updated.minPoQty != null && qty < updated.minPoQty) {
									updated.rowError = `Qty below min PO qty (${updated.minPoQty})`;
								} else if (!isValidMultiple) {
									updated.rowError = `Qty must be a multiple of min order qty (${moq})`;
								} else {
									updated.rowError = undefined;
								}
							}
						} else if (field === "quantity" && qty === 0) {
							// Clear bound errors when qty is cleared
							if (!updated.indentDtlId || updated.validationLogic === 1) {
								updated.rowError = undefined;
							}
						}

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
						// When switching modes or clearing, reset discount value and recalculate
						const updated = { ...item, discountMode: modeValue, discountValue: "" };
						const qty = Number(updated.quantity) || 0;
						const rate = Number(updated.rate) || 0;
						// No discount value yet after mode change
						const { amount, discountAmount } = calculateLineAmountUtil(qty, rate, modeValue, 0);
						updated.discountAmount = discountAmount;
						updated.amount = amount;

						if (supplierBranchState && shippingState && coConfig?.india_gst) {
							const tax = calculateLineTax(
								amount,
								updated.taxPercentage || 0,
								supplierBranchState,
								shippingState,
								true,
							);
							updated.igstAmount = tax.igst;
							updated.cgstAmount = tax.cgst;
							updated.sgstAmount = tax.sgst;
							updated.taxAmount = tax.total;
						}

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

						// Validation: % must be < 100; amount discount is not capped
						if (isPercentageDiscountMode(discountMode) && discountValue >= 100) {
							toast({
								variant: "destructive",
								title: "Invalid discount",
								description: "Percentage discount must be less than 100%.",
							});
							discountValue = 99.99;
						}

						const updated = { ...item, discountValue: String(discountValue === 0 ? sanitized : discountValue) };
						const qty = Number(updated.quantity) || 0;
						const { amount, discountAmount } = calculateLineAmountUtil(qty, rate, discountMode, discountValue);
						updated.discountAmount = discountAmount;
						updated.amount = amount;

						if (supplierBranchState && shippingState && coConfig?.india_gst) {
							const tax = calculateLineTax(
								amount,
								updated.taxPercentage || 0,
								supplierBranchState,
								shippingState,
								true,
							);
							updated.igstAmount = tax.igst;
							updated.cgstAmount = tax.cgst;
							updated.sgstAmount = tax.sgst;
							updated.taxAmount = tax.total;
						}

						return updated;
					}),
				);
				return;
			}

			setLineItems((prev) =>
				prev.map((item) => {
					if (item.id === id) {
						const updated = { ...item, [field]: value } as EditableLineItem;
						if (field === "taxPercentage" && supplierBranchState && shippingState && coConfig?.india_gst) {
							const qty = Number(updated.quantity) || 0;
							const rate = Number(updated.rate) || 0;
							const discountMode = updated.discountMode;
							const discountValue = Number(updated.discountValue) || 0;
							const { amount } = calculateLineAmountUtil(qty, rate, discountMode, discountValue);

							const tax = calculateLineTax(
								amount,
								Number(value) || 0,
								supplierBranchState,
								shippingState,
								true,
							);
							updated.igstAmount = tax.igst;
							updated.cgstAmount = tax.cgst;
							updated.sgstAmount = tax.sgst;
							updated.taxAmount = tax.total;
						}
						return updated;
					}
					return item;
				}),
			);
		},
		[allowManualEntry, branchId, coConfig, coId, ensureItemGroupData, expenseTypeId, itemGroupCache, itemGroupLoading, mode, poId, poType, setLineItems, shippingState, supplierBranchState],
	);

	const handleIndentItemsConfirm = React.useCallback(
		(selectedItems: IndentLineItem[]) => {
			setLineItems((prev) => {
				const filledLines = prev.filter((line) => lineHasAnyData(line));

				const existingIndentDtlIds = new Set(
					filledLines.map((line) => line.indentDtlId).filter((id): id is string => Boolean(id)),
				);
				const existingItemIds = new Set(filledLines.map((line) => line.item).filter((id): id is string => Boolean(id)));

				const newItems = selectedItems.filter((item) => {
					const indentDtlId = String(item.indent_dtl_id);
					const itemId = String(item.item_id);
					return !existingIndentDtlIds.has(indentDtlId) && !existingItemIds.has(itemId);
				});

				const skippedCount = selectedItems.length - newItems.length;
				if (skippedCount > 0) {
					toast({
						variant: "default",
						title: "Some items skipped",
						description: `${skippedCount} item(s) were not added because they already exist in the PO.`,
					});
				}

				if (newItems.length === 0) {
					return prev;
				}

				const uniqueItemGroupIds = Array.from(new Set(newItems.map((item) => String(item.item_grp_id))));
				uniqueItemGroupIds.forEach((groupId) => {
					if (groupId && !itemGroupCache[groupId]) {
						ensureItemGroupData(groupId);
					}
				});

				const newLines = newItems.map((item) => {
					// Prefer outstanding qty (unfulfilled) over original indent qty
					const availableQty = item.outstanding_qty != null ? item.outstanding_qty : (item.qty ?? 0);
					return {
						id: generateLineId(),
						indentDtlId: String(item.indent_dtl_id),
						indentNo: item.indent_no,
						itemGroup: String(item.item_grp_id),
						item: String(item.item_id),
						itemCode: item.full_item_code || item.item_code,
						itemMake: item.item_make_id ? String(item.item_make_id) : "",
						quantity: String(availableQty),
						rate: "",
						uom: String(item.uom_id),
						discountValue: "",
						remarks: item.remarks || "",
						taxPercentage: item.tax_percentage,
						hsnCode: itemGroupCache[String(item.item_grp_id)]?.itemHsnById[String(item.item_id)] ?? "",
						/** Max enterable qty for indent-based row = outstanding */
						availableIndentQty: availableQty,
						/** Qty is always editable for indent items (inc. open indent); validation enforces the cap and MOQ multiples */
						isQuantityLocked: false,
						minOrderQty: item.min_order_qty ?? undefined,
					};
				});

				newItems.forEach((item) => {
					const groupId = String(item.item_grp_id);
					if (!indentItemGroupInfoRef.current.has(groupId)) {
						indentItemGroupInfoRef.current.set(groupId, {
							code: item.item_grp_code,
							name: item.item_grp_name,
						});
					}
				});

				return [...filledLines, ...newLines];
			});
		},
		[ensureItemGroupData, itemGroupCache, setLineItems],
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
				// Priority: 1. cache groupLabel, 2. indentItemGroupInfoRef, 3. fall back to ID
				const cachedLabel = itemGroupCache[line.itemGroup]?.groupLabel;
				if (cachedLabel) {
					groups.set(line.itemGroup, { id: line.itemGroup, label: cachedLabel });
				} else {
					const indentInfo = indentItemGroupInfoRef.current.get(line.itemGroup);
					const labelParts = indentInfo ? [indentInfo.code, indentInfo.name].filter(Boolean) : [];
					const label = labelParts.length ? labelParts.join(" — ") : line.itemGroup;
					groups.set(line.itemGroup, { id: line.itemGroup, label });
				}
			}
		});
		return Array.from(groups.values());
	}, [itemGroupCache, itemGroups, lineItems]);

	/**
	 * Re-runs item validation for all lines loaded in edit mode.
	 *
	 * - Indent-based lines: immediately sets `availableIndentQty` to the loaded quantity
	 *   (conservative cap), then asynchronously fetches `minOrderQty` for the item.
	 * - Direct-entry lines: fires the full `validateItemForPO` call to populate
	 *   `validationLogic`, `maxPoQty`, `minPoQty`, and `minOrderQty`.
	 *
	 * Pass `overrideParams` to supply the freshly-loaded header values (branch ID,
	 * expense type, PO type) before React has flushed the `setFormValues` state update.
	 */
	const revalidateLoadedLines = React.useCallback(
		(
			lines: EditableLineItem[],
			overrideParams?: {
				branchId?: string;
				coId?: string;
				expenseTypeId?: string;
				poType?: string;
				/**
				 * Optional callback fired when the backend returns blocking errors
				 * for a line. Used by the dialog-add flow to surface a toast so
				 * the user knows why a freshly added row is invalid.
				 */
				onValidationError?: (line: EditableLineItem, errors: string[]) => void;
			},
		) => {
			if (mode === "view") return;

			const resolvedBranchId = overrideParams?.branchId ?? branchId;
			const resolvedCoId = overrideParams?.coId ?? coId;
			const resolvedExpenseTypeId = overrideParams?.expenseTypeId ?? expenseTypeId;
			const resolvedPoType = overrideParams?.poType ?? poType ?? "Regular";
			const onValidationError = overrideParams?.onValidationError;

			lines.forEach((line) => {
				if (!line.item) return;

				if (line.indentDtlId) {
					// Indent-based line: cap available qty to the committed qty in the PO
					const currentQty = Number(line.quantity) || 0;
					setLineItems((prev) =>
						prev.map((l) => (l.id === line.id ? { ...l, availableIndentQty: currentQty } : l)),
					);

					// Fire validation API to retrieve minOrderQty (non-blocking)
					if (resolvedCoId && resolvedBranchId && resolvedExpenseTypeId) {
						void (async () => {
							try {
								const result = await validateItemForPO({
									coId: resolvedCoId,
									branchId: resolvedBranchId,
									itemId: line.item!,
									poType: resolvedPoType,
									expenseTypeId: resolvedExpenseTypeId,
									poId,
								});
								if (!result) return;
								setLineItems((prev) =>
									prev.map((l) =>
										l.id === line.id ? { ...l, minOrderQty: result.min_order_qty ?? undefined } : l,
									),
								);
							} catch {
								// Silently ignore — do not block editing
							}
						})();
					}
					return;
				}

				// Direct-entry line: run full validation to populate bounds
				if (allowManualEntry && resolvedCoId && resolvedBranchId && resolvedExpenseTypeId) {
					void (async () => {
						try {
							const result = await validateItemForPO({
								coId: resolvedCoId,
								branchId: resolvedBranchId,
								itemId: line.item!,
								poType: resolvedPoType,
								expenseTypeId: resolvedExpenseTypeId,
								poId,
							});
							if (!result) return;
							setLineItems((prev) =>
								prev.map((l) => {
									if (l.id !== line.id) return l;
									const update: Partial<EditableLineItem> = {
										validationLogic: result.validation_logic,
										rowError: result.errors.length ? result.errors.join(" ") : undefined,
										rowWarning: result.warnings.length ? result.warnings.join(" ") : undefined,
										minOrderQty: result.min_order_qty ?? undefined,
									};
									if (result.validation_logic === 1) {
										update.maxPoQty = result.max_po_qty ?? undefined;
										update.minPoQty = result.min_po_qty ?? undefined;
									}
									// In edit mode we do NOT auto-fill qty from forced_qty (logic 2) —
									// the user already has a qty; only validate from here on.
									return { ...l, ...update };
								}),
							);
							if (result.errors.length && onValidationError) {
								onValidationError(line, result.errors);
							}
						} catch {
							// Silently ignore — do not block editing
						}
					})();
				}
			});
		},
		[allowManualEntry, branchId, coId, expenseTypeId, mode, poId, poType, setLineItems],
	);

	// Backfill HSN codes from cache when item group data loads after indent items were added
	React.useEffect(() => {
		if (mode === "view") return;
		setLineItems((prev) => {
			let changed = false;
			const next = prev.map((line) => {
				if (line.hsnCode || !line.item || !line.itemGroup) return line;
				const hsn = itemGroupCache[line.itemGroup]?.itemHsnById[line.item];
				if (!hsn) return line;
				changed = true;
				return { ...line, hsnCode: hsn };
			});
			return changed ? next : prev;
		});
	}, [itemGroupCache, mode, setLineItems]);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
		handleIndentItemsConfirm,
		mapLineToEditable,
		revalidateLoadedLines,
		lineHasAnyData,
		lineIsComplete,
		filledLineItems,
		lineItemsValid,
		itemGroupsFromLineItems,
	};
};

