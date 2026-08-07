import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { EditableLineItem, ItemGroupCacheMap, POLineItem } from "../types/inwardTypes";
import { createBlankLine, lineHasAnyData, generateLineId } from "../utils/inwardFactories";

type UseInwardLineItemsParams = {
	mode: MuiFormMode;
	itemGroupCache: ItemGroupCacheMap;
	itemGroupLoading: Partial<Record<string, boolean>>;
	ensureItemGroupData: (groupId: string) => void;
};

export type POItemsConfirmResult = {
	addedCount: number;
	duplicateCount: number;
	skippedNoPendingCount: number;
};

/**
 * Compute a row-level validation error for the given line.
 * Returns undefined when the row is valid.
 */
const computeRowError = (line: EditableLineItem): string | undefined => {
	if (!line.item) return undefined; // blank row — ignored
	const qty = Number(line.quantity);
	if (!line.quantity || !Number.isFinite(qty) || qty <= 0) {
		return "Quantity must be greater than zero";
	}
	if (!line.uom) {
		return "UOM is required";
	}
	if (line.poDtlId && line.orderedQty != null) {
		const pending = line.orderedQty - (line.receivedQty ?? 0);
		if (qty > pending) {
			return `Cannot exceed pending PO qty (${pending})`;
		}
	}
	return undefined;
};

/**
 * Hook to manage line items for the Inward transaction page.
 *
 * Items can only be added through the Add Items dialog or Select from PO
 * dialog — there is no inline item entry. This hook exposes:
 *   - handleLineFieldChange for editing hsn/qty/uom/remarks
 *   - handlePOItemsConfirm to merge PO-selected rows (returns counts for toasts)
 *   - filledLineItems / lineItemsValid for submission gating
 *   - hasRowErrors / firstRowError for the form's validation summary
 */
export const useInwardLineItems = ({
	mode,
	itemGroupCache,
	itemGroupLoading,
	ensureItemGroupData,
}: UseInwardLineItemsParams) => {
	const {
		items: lineItems,
		setItems: setLineItems,
		replaceItems,
		removeItems: removeLineItems,
	} = useLineItems<EditableLineItem>({
		createBlankItem: createBlankLine,
		hasData: lineHasAnyData,
		getItemId: (item) => item.id,
		// Dialog-only entry — never append a trailing blank row.
		maintainTrailingBlank: false,
	});

	/**
	 * Map API line to editable format.
	 */
	const mapLineToEditable = React.useCallback(
		(line: Record<string, unknown>): EditableLineItem => {
			const itemGroupId = String(line.item_grp_id ?? line.itemGroup ?? "");
			if (itemGroupId && !itemGroupCache[itemGroupId] && !itemGroupLoading[itemGroupId]) {
				ensureItemGroupData(itemGroupId);
			}

			return {
				id: String(line.inward_dtl_id ?? line.id ?? generateLineId()),
				poDtlId: line.po_dtl_id ? String(line.po_dtl_id) : undefined,
				poNo: line.po_no ? String(line.po_no) : undefined,
				itemGroup: itemGroupId,
				item: String(line.item_id ?? line.item ?? ""),
				itemCode: line.full_item_code ? String(line.full_item_code) : line.item_code ? String(line.item_code) : undefined,
				itemMake: String(line.item_make_id ?? line.itemMake ?? ""),
				orderedQty: typeof line.ordered_qty === "number" ? line.ordered_qty : undefined,
				receivedQty: typeof line.received_qty === "number" ? line.received_qty : undefined,
				quantity: String(line.quantity ?? line.qty ?? ""),
				uom: String(line.uom_id ?? line.uom ?? ""),
				remarks: String(line.remarks ?? ""),
				taxPercentage: typeof line.tax_percentage === "number" ? line.tax_percentage : undefined,
				hsnCode: line.hsn_code ? String(line.hsn_code) : undefined,
			};
		},
		[itemGroupCache, itemGroupLoading, ensureItemGroupData]
	);

	/**
	 * Handle a field change in a line item. Only editable fields flow through
	 * this handler: hsnCode, quantity, uom, remarks. itemGroup / item are
	 * no longer editable (dialog-only entry), so those branches are absent.
	 */
	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string) => {
			if (mode === "view") return;

			setLineItems((prev) =>
				prev.map((item) => {
					if (item.id !== id) return item;
					const next = { ...item, [field]: rawValue };
					// Recompute row error whenever quantity or uom changes
					if (field === "quantity" || field === "uom") {
						next.rowError = computeRowError(next);
					}
					return next;
				})
			);
		},
		[mode, setLineItems]
	);

	/**
	 * Handle confirmation of PO line items selection.
	 * Returns counts so the caller can surface toasts for skipped rows.
	 */
	const handlePOItemsConfirm = React.useCallback(
		(selectedItems: POLineItem[]): POItemsConfirmResult => {
			let skippedNoPendingCount = 0;

			const newLines: EditableLineItem[] = [];
			selectedItems.forEach((poItem) => {
				const pending =
					poItem.pending_qty ??
					(poItem.ordered_qty ?? 0) - (poItem.received_qty ?? 0);
				if (pending <= 0) {
					skippedNoPendingCount += 1;
					return;
				}

				const itemGroupId = String(poItem.item_grp_id ?? "");
				if (itemGroupId && !itemGroupCache[itemGroupId] && !itemGroupLoading[itemGroupId]) {
					ensureItemGroupData(itemGroupId);
				}

				newLines.push({
					id: generateLineId(),
					poDtlId: String(poItem.po_dtl_id),
					poNo: poItem.po_no,
					itemGroup: itemGroupId,
					item: String(poItem.item_id),
					itemCode: poItem.full_item_code || poItem.item_code,
					itemMake: poItem.item_make_id ? String(poItem.item_make_id) : "",
					orderedQty: poItem.ordered_qty,
					receivedQty: poItem.received_qty,
					quantity: String(pending),
					uom: String(poItem.uom_id ?? ""),
					remarks: poItem.remarks ?? "",
					taxPercentage: poItem.tax_percentage,
					hsnCode: poItem.hsn_code ?? undefined,
				});
			});

			// Dedupe against current state BEFORE scheduling the update. React state
			// updaters can run after this callback returns, so side effects inside
			// setLineItems are not reliably visible when we build the result counts.
			const existingPoDtlIds = new Set(
				lineItems.filter((line) => line.poDtlId).map((line) => line.poDtlId)
			);
			let duplicateCount = 0;
			const uniqueNewLines = newLines
				.filter((line) => {
					if (line.poDtlId && existingPoDtlIds.has(line.poDtlId)) {
						duplicateCount += 1;
						return false;
					}
					return true;
				})
				.map((l) => ({ ...l, rowError: computeRowError(l) }));

			if (uniqueNewLines.length > 0) {
				setLineItems((prev) => {
					const filledPrev = prev.filter(lineHasAnyData);
					return [...filledPrev, ...uniqueNewLines];
				});
			}

			return {
				addedCount: uniqueNewLines.length,
				duplicateCount,
				skippedNoPendingCount,
			};
		},
		[lineItems, setLineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData]
	);

	// Compute filled line items (non-blank)
	const filledLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems]
	);

	// Row-level error summary
	const hasRowErrors = React.useMemo(
		() => filledLineItems.some((l) => !!l.rowError),
		[filledLineItems]
	);

	const firstRowError = React.useMemo(
		() => filledLineItems.find((l) => !!l.rowError)?.rowError,
		[filledLineItems]
	);

	// Check if line items are valid for submission
	const lineItemsValid = React.useMemo(() => {
		if (filledLineItems.length === 0) return false;
		if (hasRowErrors) return false;
		return filledLineItems.every((line) => {
			const qty = Number(line.quantity);
			return Boolean(line.item && line.uom && Number.isFinite(qty) && qty > 0);
		});
	}, [filledLineItems, hasRowErrors]);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		mapLineToEditable,
		handleLineFieldChange,
		handlePOItemsConfirm,
		filledLineItems,
		lineItemsValid,
		hasRowErrors,
		firstRowError,
		computeRowError,
	};
};
