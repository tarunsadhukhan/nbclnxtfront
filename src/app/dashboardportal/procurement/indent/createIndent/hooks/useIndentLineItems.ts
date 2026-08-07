import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { IndentLine } from "@/utils/indentService";
import type { EditableLineItem, ItemGroupCacheEntry } from "../types/indentTypes";
import { createBlankLine, generateLineId, lineHasAnyData, lineIsComplete } from "../utils/indentFactories";

type UseIndentLineItemsParams = {
	mode: MuiFormMode;
	itemGroupCache: Partial<Record<string, ItemGroupCacheEntry>>;
	itemGroupLoading: Partial<Record<string, boolean>>;
	ensureItemGroupData: (groupId: string) => void;
};

/**
 * Centralizes all line-item specific business logic:
 * - Field changes with proper cascading (itemGroup -> item, item -> uom)
 * - Line validation
 * - Cache interactions
 */
export const useIndentLineItems = ({
	mode,
	itemGroupCache,
	itemGroupLoading,
	ensureItemGroupData,
}: UseIndentLineItemsParams) => {
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

	const mapLineToEditable = React.useCallback((line: IndentLine): EditableLineItem => ({
		id: line.id ? String(line.id) : generateLineId(),
		department: line.department ?? "",
		itemGroup: line.itemGroup ?? "",
		item: line.item ?? "",
		itemMake: line.itemMake ?? "",
		quantity: line.quantity != null ? String(line.quantity) : "",
		uom: line.uom ?? "",
		remarks: line.remarks ?? "",
	}), []);

	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string) => {
			if (mode === "view") return;

			// When itemGroup changes, reset dependent fields
			if (field === "itemGroup") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id
							? {
									...item,
									itemGroup: rawValue,
									item: "",
									itemMake: "",
									uom: "",
								}
							: item
					)
				);
				// Ensure cache is loaded for the new group
				if (rawValue && !itemGroupCache[rawValue] && !itemGroupLoading[rawValue]) {
					void ensureItemGroupData(rawValue);
				}
				return;
			}

			// When item changes, try to auto-select UOM
			if (field === "item") {
				let groupToFetch: string | null = null;
				setLineItems((prev) =>
					prev.map((item) => {
						if (item.id !== id) return item;
						const currentGroup = item.itemGroup;
						if (rawValue && currentGroup && !itemGroupCache[currentGroup]) {
							groupToFetch = currentGroup;
						}
						let nextUom = item.uom;
						if (!rawValue) {
							nextUom = "";
						} else {
							const cache = itemGroupCache[currentGroup ?? ""];
							const options = cache?.uomsByItemId[rawValue] ?? [];
							const defaultUom = cache?.items.find((option) => option.value === rawValue)?.defaultUomId;
							if (nextUom && options.some((option) => option.value === nextUom)) {
								// keep existing UOM
							} else if (options.length) {
								nextUom = options[0].value;
							} else if (defaultUom) {
								nextUom = defaultUom;
							} else {
								nextUom = "";
							}
						}
						return {
							...item,
							item: rawValue,
							uom: nextUom,
						};
					})
				);
				if (groupToFetch && !itemGroupCache[groupToFetch] && !itemGroupLoading[groupToFetch]) {
					void ensureItemGroupData(groupToFetch);
				}
				return;
			}

			// Sanitize quantity input
			if (field === "quantity") {
				const sanitized = rawValue.replace(/[^0-9.]/g, "");
				setLineItems((prev) =>
					prev.map((item) => (item.id === id ? { ...item, quantity: sanitized } : item))
				);
				return;
			}

			// Default field update
			setLineItems((prev) =>
				prev.map((item) =>
					item.id === id ? { ...item, [field]: rawValue } as EditableLineItem : item
				)
			);
		},
		[mode, ensureItemGroupData, itemGroupCache, itemGroupLoading, setLineItems]
	);

	// Effect to prefill UOM when cache loads
	React.useEffect(() => {
		if (!Object.keys(itemGroupCache).length) return;
		setLineItems((prev) => {
			let changed = false;
			const next = prev.map((item) => {
				if (!item.item || item.uom) return item;
				const cache = itemGroupCache[item.itemGroup];
				if (!cache) return item;
				const options = cache.uomsByItemId[item.item] ?? [];
				const defaultUom = cache.items.find((opt) => opt.value === item.item)?.defaultUomId;
				const newUom = options[0]?.value ?? defaultUom ?? "";
				if (!newUom || newUom === item.uom) return item;
				changed = true;
				return { ...item, uom: newUom };
			});
			return changed ? next : prev;
		});
	}, [itemGroupCache, setLineItems]);

	// Effect to ensure item group data is loaded for existing lines
	React.useEffect(() => {
		lineItems.forEach((item) => {
			const groupId = item.itemGroup;
			if (!groupId) return;
			if (itemGroupCache[groupId] || itemGroupLoading[groupId]) return;
			void ensureItemGroupData(groupId);
		});
	}, [lineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData]);

	// Derived state: filled line items
	const filledLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems]
	);

	// Derived state: validation status
	const lineItemsValid = React.useMemo(() => {
		if (!filledLineItems.length) return false;
		return filledLineItems.every(lineIsComplete);
	}, [filledLineItems]);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		mapLineToEditable,
		handleLineFieldChange,
		filledLineItems,
		lineItemsValid,
	};
};
