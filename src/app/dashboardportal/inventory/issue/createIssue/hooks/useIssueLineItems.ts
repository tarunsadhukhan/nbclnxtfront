import React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { EditableLineItem } from "../types/issueTypes";
import {
	createBlankLine,
	lineHasAnyData,
} from "../utils/issueFactories";
import type { MuiFormMode } from "@/components/ui/muiform";

type UseIssueLineItemsParams = {
	mode: MuiFormMode;
};

/**
 * Hook for managing issue line items with CRUD operations.
 * Items are pre-populated from InventorySearchTable, so only
 * editable fields (quantity, expenseType, costFactor, machine, remarks)
 * can be changed via handleLineFieldChange.
 */
export const useIssueLineItems = ({ mode }: UseIssueLineItemsParams) => {
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

	/**
	 * Handles field changes on a single line item.
	 * Only editable fields are: quantity, expenseType, costFactor, machine, remarks
	 */
	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string | number) => {
			if (mode === "view") return;

			const value = String(rawValue);

			// Only allow changes to editable fields
			const editableFields: (keyof EditableLineItem)[] = [
				"quantity",
				"expenseType",
				"costFactor",
				"machine",
				"remarks",
			];

			if (!editableFields.includes(field)) {
				// Read-only fields cannot be changed via handleLineFieldChange
				return;
			}

			setLineItems((prev) =>
				prev.map((item) =>
					item.id === id ? { ...item, [field]: value } : item
				)
			);
		},
		[mode, setLineItems]
	);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
	};
};
