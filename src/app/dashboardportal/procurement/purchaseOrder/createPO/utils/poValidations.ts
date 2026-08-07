/**
 * Pure validation logic helpers for the PO module.
 * These functions are side-effect-free and fully unit-testable.
 */

import { PO_TYPE, PO_VALIDATION_LOGIC, isValidPOTypeExpenseCombo } from "./poConstants";

// ---------------------------------------------------------------------------
// Validation logic matrix
// ---------------------------------------------------------------------------

/**
 * Determines which validation logic (1/2/3) applies for a direct PO based on
 * PO type and expense type name. Mirrors the backend `VALIDATION_LOGIC_MAP`.
 *
 * Logic 1 — Regular + General/Maintenance/Production/Overhaul
 *   → Stock check + max/min formula (includes outstanding_po_qty)
 * Logic 2 — Open + General/Maintenance/Production
 *   → FY PO check + max qty forced, rate entry only
 * Logic 3 — Regular + Capital, or any unmapped combination
 *   → Free entry, no validation
 */
export const determineValidationLogic = (poType: string, expenseTypeName: string): 1 | 2 | 3 => {
	const key = `${poType}|${expenseTypeName}`;
	const map: Record<string, 1 | 2 | 3> = {
		// Regular
		"Regular|General": 1,
		"Regular|Maintenance": 1,
		"Regular|Production": 1,
		"Regular|Overhaul": 1,
		"Regular|Capital": 3,
		// Open
		"Open|General": 2,
		"Open|Maintenance": 2,
		"Open|Production": 2,
	};
	return map[key] ?? 3;
};

// ---------------------------------------------------------------------------
// Max PO qty formula (Logic 1)
// ---------------------------------------------------------------------------

/**
 * Calculate the maximum allowable PO quantity for a direct Regular PO (Logic 1).
 *
 * Formula:
 *   available = maxQty - branchStock - outstandingIndentQty - outstandingPoQty
 *   if available < reorderQty  → reorderQty
 *   else                       → ROUNDUP(available / reorderQty) * reorderQty
 *
 * Returns null when:
 *   - reorderQty is 0 / undefined (cannot round up)
 *   - available ≤ 0 (no room to order)
 */
export const computeMaxPoQty = (
	maxQty: number | null,
	branchStock: number,
	outstandingIndentQty: number,
	outstandingPoQty: number,
	reorderQty: number | null,
): number | null => {
	if (maxQty === null || maxQty === undefined) return null;
	if (!reorderQty || reorderQty <= 0) return null;
	const available = maxQty - branchStock - outstandingIndentQty - outstandingPoQty;
	if (available <= 0) return null;
	if (available < reorderQty) return reorderQty;
	return Math.ceil(available / reorderQty) * reorderQty;
};

// ---------------------------------------------------------------------------
// Combo guard (header-level)
// ---------------------------------------------------------------------------

export { isValidPOTypeExpenseCombo, PO_TYPE, PO_VALIDATION_LOGIC };
