/**
 * @file useGateEntryLineItems.ts
 * @description Hook for managing gate entry line items with calculations.
 */

import * as React from "react";
import { useLineItems } from "@/components/ui/transaction";
import type { MuiFormMode, GateEntryLineItem, Option } from "../types/MaterialInspectionTypes";
import { createBlankLine, lineHasAnyData } from "../utils/MaterialInspectionFactories";
import { recalculateLineItemWeights } from "../utils/MaterialInspectionCalculations";

type UseGateEntryLineItemsParams = {
	mode: MuiFormMode;
	headerChallanWeight: number;
	headerActualWeight: number;
	getQualityOptions: (itemId: string) => Option[];
};

export function useGateEntryLineItems({
	mode,
	headerChallanWeight,
	headerActualWeight,
	getQualityOptions,
}: UseGateEntryLineItemsParams) {
	const {
		items: lineItems,
		setItems: setLineItems,
		replaceItems,
		removeItems: removeLineItems,
	} = useLineItems<GateEntryLineItem>({
		createBlankItem: createBlankLine,
		hasData: lineHasAnyData,
		getItemId: (item) => item.id,
		maintainTrailingBlank: mode !== "view",
	});

	// Recalculate weights when header values change. CREATE-only: in edit this
	// fired on load (formValues transition 0 -> saved header weights) and replaced
	// every persisted per-line weight with a header-proportional share — proven on
	// sls MR 27960 where the original April gate weights were rewritten at QC save.
	// Qty edits in any mode still recalc via handleLineFieldChange below.
	React.useEffect(() => {
		if (mode !== "create") return;
		if (headerChallanWeight <= 0 && headerActualWeight <= 0) return;

		setLineItems((prev) => {
			if (prev.length === 0) return prev;

			return recalculateLineItemWeights(prev, headerChallanWeight, headerActualWeight);
		});
	}, [headerChallanWeight, headerActualWeight, mode, setLineItems]);

	/**
	 * Handle field changes with cascading logic.
	 */
	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof GateEntryLineItem, rawValue: string) => {
			if (mode === "view") return;

			// Handle challanItem change -> reset quality
			if (field === "challanItem") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id
							? { ...item, challanItem: rawValue, challanQuality: "" }
							: item
					)
				);
				return;
			}

			// Handle actualItem change -> reset quality
			if (field === "actualItem") {
				setLineItems((prev) =>
					prev.map((item) =>
						item.id === id
							? { ...item, actualItem: rawValue, actualQuality: "" }
							: item
					)
				);
				return;
			}

			// Handle quantity changes -> trigger weight recalculation
			if (field === "challanQty" || field === "actualQty") {
				setLineItems((prev) => {
					const updated = prev.map((item) =>
						item.id === id ? { ...item, [field]: rawValue } : item
					);
					// Recalculate weights after qty change
					return recalculateLineItemWeights(updated, headerChallanWeight, headerActualWeight);
				});
				return;
			}

			// Generic field update
			setLineItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, [field]: rawValue } : item))
			);
		},
		[mode, setLineItems, headerChallanWeight, headerActualWeight]
	);

	return {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
	};
}
