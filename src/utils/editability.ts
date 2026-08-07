/**
 * Utility functions for determining row-level editability in index pages.
 * Used with IndexWrapper's `isRowEditable` prop to show Edit vs View icons per row.
 *
 * @example
 * // Status-based check (most common)
 * const isEditable = createStatusBasedEditCheck({
 *   statusField: "status_id",
 *   editableStatuses: [21, 1],  // Draft, Open
 * });
 * <IndexWrapper isRowEditable={isEditable} ... />
 *
 * @example
 * // Boolean field check
 * const isEditable = createBooleanFieldEditCheck("inspection_check", false);
 * <IndexWrapper isRowEditable={isEditable} ... />
 *
 * @example
 * // String status check
 * const isEditable = createStatusBasedEditCheck({
 *   statusField: "status",
 *   editableStatuses: ["Draft", "Open"],
 *   caseInsensitive: true,
 * });
 */

import type { GridValidRowModel } from "@mui/x-data-grid";

/**
 * Standard editable status IDs used across the ERP.
 * Draft (21) and Open (1) are typically the only editable states.
 */
export const EDITABLE_STATUS_IDS = Object.freeze([21, 1] as const);

/**
 * All non-editable status IDs.
 * Pending Approval (20), Approved (3), Rejected (4), Closed (5), Cancelled (6).
 */
export const NON_EDITABLE_STATUS_IDS = Object.freeze([20, 3, 4, 5, 6] as const);

type StatusBasedEditCheckOptions<T extends GridValidRowModel> = {
  /** The field name on the row that contains the status value */
  statusField: keyof T & string;
  /** Status values that allow editing (row shows Edit icon) */
  editableStatuses: ReadonlyArray<string | number>;
  /** For string comparisons, ignore case. Default: false */
  caseInsensitive?: boolean;
};

/**
 * Creates a row editability checker based on a status field.
 * Returns a function compatible with IndexWrapper's `isRowEditable` prop.
 *
 * @example
 * const isEditable = createStatusBasedEditCheck<MyRow>({
 *   statusField: "status_id",
 *   editableStatuses: EDITABLE_STATUS_IDS,
 * });
 */
export function createStatusBasedEditCheck<T extends GridValidRowModel>(
  options: StatusBasedEditCheckOptions<T>
): (row: T) => boolean {
  const { statusField, editableStatuses, caseInsensitive = false } = options;

  // Pre-build a set for O(1) lookup
  const statusSet = new Set(
    caseInsensitive
      ? editableStatuses.map((s) => String(s).toLowerCase())
      : editableStatuses.map(String)
  );

  return (row: T): boolean => {
    const value = row[statusField];
    if (value == null) return false;
    const normalizedValue = caseInsensitive ? String(value).toLowerCase() : String(value);
    return statusSet.has(normalizedValue);
  };
}

/**
 * Creates a row editability checker based on a boolean field.
 * The row is editable when the field equals the `editableWhen` value.
 *
 * @param field - The boolean field name on the row
 * @param editableWhen - The value that means "editable" (typically false)
 *
 * @example
 * // Row is editable when inspection_check is false (not yet inspected)
 * const isEditable = createBooleanFieldEditCheck<InwardRow>("inspection_check", false);
 */
export function createBooleanFieldEditCheck<T extends GridValidRowModel>(
  field: keyof T & string,
  editableWhen: boolean
): (row: T) => boolean {
  return (row: T): boolean => {
    return Boolean(row[field]) === editableWhen;
  };
}

/**
 * Creates a row editability checker based on a numeric field equality.
 * The row is editable when the field does NOT equal the given value.
 *
 * @param field - The numeric field name
 * @param completedValue - The value that means "completed / no longer editable"
 *
 * @example
 * // Row is editable when bill_pass_complete !== 1
 * const isEditable = createNotEqualEditCheck<BillPassRow>("bill_pass_complete", 1);
 */
export function createNotEqualEditCheck<T extends GridValidRowModel>(
  field: keyof T & string,
  completedValue: number | string
): (row: T) => boolean {
  return (row: T): boolean => {
    return row[field] !== completedValue;
  };
}
