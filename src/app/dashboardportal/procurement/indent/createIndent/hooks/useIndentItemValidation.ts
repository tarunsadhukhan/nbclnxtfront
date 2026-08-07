import React from "react";
import type { ItemValidationResult, LineItemValidationState } from "../types/indentTypes";
import { getValidationLogic } from "../utils/indentConstants";
import { validateItemForIndent } from "@/utils/indentService";

type ValidationMap = Record<string, LineItemValidationState>;

/**
 * Outcome of a single line validation, returned to callers that need to make
 * synchronous decisions (e.g. the Add Items dialog confirm flow, which uses
 * this to auto-remove lines that fail validation).
 */
export type ValidateLineOutcome =
	| { status: "skipped" }
	| { status: "ok"; result: ItemValidationResult }
	| { status: "blocked"; result: ItemValidationResult; reason: string }
	| { status: "error"; message: string };

type UseIndentItemValidationParams = {
	branchId: string;
	indentType: string;
	expenseTypeName: string | undefined;
	expenseTypeId: string;
	indentId?: string;
};

/**
 * Manages per-line validation state for indent line items.
 *
 * - On item selection, calls the backend validation endpoint.
 * - Provides max-quantity caps, warnings, and blocking errors.
 * - Clears validation when upstream header fields change.
 */
export function useIndentItemValidation({
	branchId,
	indentType,
	expenseTypeName,
	expenseTypeId,
	indentId,
}: UseIndentItemValidationParams) {
	const [validationMap, setValidationMap] = React.useState<ValidationMap>({});

	const currentLogic = React.useMemo(
		() => getValidationLogic(indentType, expenseTypeName),
		[indentType, expenseTypeName]
	);

	// Clear all validation when header fields change
	const clearAll = React.useCallback(() => {
		setValidationMap({});
	}, []);

	React.useEffect(() => {
		clearAll();
	}, [branchId, indentType, expenseTypeId, clearAll]);

	// Clear validation for a specific line
	const clearLine = React.useCallback((lineId: string) => {
		setValidationMap((prev) => {
			if (!prev[lineId]) return prev;
			const next = { ...prev };
			delete next[lineId];
			return next;
		});
	}, []);

	/**
	 * Trigger validation for a specific line after item selection and return
	 * a synchronous outcome describing whether the item passed. Also updates
	 * `validationMap` as a side effect so existing consumers keep working.
	 *
	 * For Logic 3 (no validation) returns `{ status: "skipped" }`.
	 */
	const validateLineAndReturn = React.useCallback(
		async (lineId: string, itemId: string): Promise<ValidateLineOutcome> => {
			console.log("[indent-validate] validateLineAndReturn called", {
				lineId,
				itemId,
				currentLogic,
				branchId,
				indentType,
				expenseTypeId,
			});
			if (currentLogic === 3 || !branchId || !itemId || !expenseTypeId) {
				console.log("[indent-validate] skipping — early exit", {
					logic3: currentLogic === 3,
					noBranch: !branchId,
					noItem: !itemId,
					noExpense: !expenseTypeId,
				});
				clearLine(lineId);
				return { status: "skipped" };
			}

			// Set loading
			setValidationMap((prev) => ({
				...prev,
				[lineId]: { loading: true, result: null, error: null },
			}));

			try {
				const apiResult = await validateItemForIndent({
					branchId,
					itemId,
					indentType,
					expenseTypeId,
					indentId,
				});

				const mapped: ItemValidationResult = {
					validationLogic: apiResult.validation_logic,
					errors: apiResult.errors ?? [],
					branchStock: apiResult.branch_stock,
					minqty: apiResult.minqty,
					maxqty: apiResult.maxqty,
					minIndentQty: apiResult.min_indent_qty ?? null,
					minOrderQty: apiResult.min_order_qty,
					leadTime: apiResult.lead_time,
					outstandingIndentQty: apiResult.outstanding_indent_qty,
					hasOpenIndent: apiResult.has_open_indent,
					stockExceedsMax: apiResult.stock_exceeds_max ?? false,
					maxIndentQty: apiResult.max_indent_qty,
					hasMinMax: apiResult.has_minmax ?? false,
					fyDuplicateIndentNo: apiResult.fy_duplicate_indent_no,
					forcedQty: apiResult.forced_qty ?? null,
					regularBomOutstanding: apiResult.regular_bom_outstanding,
					warnings: apiResult.warnings ?? [],
				};

				setValidationMap((prev) => ({
					...prev,
					[lineId]: { loading: false, result: mapped, error: null },
				}));

				console.log("[indent-validate] API result", {
					lineId,
					itemId,
					apiResult,
					mappedErrors: mapped.errors,
					mappedWarnings: mapped.warnings,
				});

				// Decide pass/fail without a user-entered quantity — we're
				// validating at item-add time, not quantity-change time.
				if (mapped.errors.length > 0) {
					console.log("[indent-validate] BLOCKED", { lineId, reason: mapped.errors[0] });
					return { status: "blocked", result: mapped, reason: mapped.errors[0] };
				}
				if (mapped.validationLogic === 2 && mapped.fyDuplicateIndentNo != null) {
					return {
						status: "blocked",
						result: mapped,
						reason: `An open indent already exists for this item in the current FY (Indent #${mapped.fyDuplicateIndentNo}).`,
					};
				}
				console.log("[indent-validate] OK", { lineId });
				return { status: "ok", result: mapped };
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Validation failed";
				setValidationMap((prev) => ({
					...prev,
					[lineId]: { loading: false, result: null, error: msg },
				}));
				return { status: "error", message: msg };
			}
		},
		[currentLogic, branchId, indentType, expenseTypeId, indentId, clearLine]
	);

	/**
	 * Fire-and-forget variant used by existing call sites (edit-mode preload
	 * and in-row field change handlers) that don't need the synchronous outcome.
	 */
	const validateLine = React.useCallback(
		async (lineId: string, itemId: string): Promise<void> => {
			await validateLineAndReturn(lineId, itemId);
		},
		[validateLineAndReturn]
	);

	/**
	 * Check if a given quantity exceeds the max allowed for a line.
	 * Returns an error message string, or null if OK / not applicable.
	 */
	const getQuantityError = React.useCallback(
		(lineId: string, quantity: string): string | null => {
			const state = validationMap[lineId];
			if (!state?.result) return null;
			const { errors, validationLogic, maxIndentQty, minIndentQty, minOrderQty, fyDuplicateIndentNo } = state.result;

			// Backend errors take priority (includes has_minmax=false, stock_exceeds_max, etc.)
			if (errors.length > 0) {
				return errors[0];
			}

			if (validationLogic === 2 && fyDuplicateIndentNo != null) {
				return `An open indent already exists for this item in the current FY (Indent #${fyDuplicateIndentNo}).`;
			}

			if (validationLogic === 1) {
				const qty = parseFloat(quantity);
				if (!Number.isNaN(qty) && qty > 0) {
					// Check min indent qty (calculated, may be higher than raw minqty)
					if (minIndentQty != null && minIndentQty > 0 && qty < minIndentQty) {
						return `Quantity must be at least ${minIndentQty} (minimum indent quantity).`;
					}
					// Check max indent qty
					if (maxIndentQty != null && qty > maxIndentQty) {
						return `Quantity exceeds the maximum allowed (${maxIndentQty.toFixed(2)}).`;
					}
					// Check reorder qty multiple
					if (minOrderQty != null && minOrderQty > 0 && qty % minOrderQty !== 0) {
						return `Quantity must be a multiple of the reorder qty (${minOrderQty}).`;
					}
				}
			}

			return null;
		},
		[validationMap]
	);

	/**
	 * Get warnings (non-blocking) for a line.
	 */
	const getLineWarnings = React.useCallback(
		(lineId: string): string[] => {
			return validationMap[lineId]?.result?.warnings ?? [];
		},
		[validationMap]
	);

	/**
	 * Check if all filled lines pass validation.
	 * Lines without validation state are assumed OK (Logic 3 or not yet fetched).
	 */
	const allLinesValid = React.useCallback(
		(filledLineIds: string[], lineQuantities: Record<string, string>): boolean => {
			for (const id of filledLineIds) {
				const state = validationMap[id];
				if (state?.loading) return false;
				if (state?.result) {
					const err = getQuantityError(id, lineQuantities[id] ?? "0");
					if (err) return false;
				}
			}
			return true;
		},
		[validationMap, getQuantityError]
	);

	return {
		validationMap,
		currentLogic,
		validateLine,
		validateLineAndReturn,
		clearLine,
		clearAll,
		getQuantityError,
		getLineWarnings,
		allLinesValid,
	};
}
