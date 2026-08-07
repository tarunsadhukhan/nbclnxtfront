/**
 * Types for the Canteen Details page (canteen_details).
 * Single type file for the page — do not split (avoids circular deps).
 */

/** A row of GET /hrms/get_canteen_table (joined for display). */
export interface CanteenRow {
  id?: number;
  tran_id: number;
  /** YYYY-MM-DD */
  tran_date: string | null;
  branch_id: number | null;
  branch_name: string | null;
  eb_id: number | null;
  emp_code: string | null;
  emp_name: string | null;
  no_of_meals: number | null;
  rate_of_meals: number | null;
  amount: number | null;
  status_id: number;
  [key: string]: unknown;
}

/** A single record from GET /hrms/get_canteen_by_id/{id}. */
export interface CanteenRecord {
  tran_id: number;
  tran_date: string | null;
  branch_id: number | null;
  eb_id: number | null;
  no_of_meals: number | null;
  rate_of_meals: number | null;
  status_id: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Body of GET /hrms/canteen_setup. */
export interface CanteenSetup {
  employees: Option[];
  /** Fixed meal rate — display only, the backend owns the stored value. */
  default_rate?: number;
}

/**
 * Project-wide status IDs, cut down to the two states this page uses plus
 * Cancelled. Only a Draft row may be edited, approved or deleted.
 */
export const CANTEEN_STATUS = {
  DRAFT: 21,
  APPROVED: 3,
  CANCELLED: 6,
} as const;

export const CANTEEN_STATUS_LABEL: Record<number, string> = {
  [CANTEEN_STATUS.DRAFT]: "Draft",
  [CANTEEN_STATUS.APPROVED]: "Approved",
  [CANTEEN_STATUS.CANCELLED]: "Cancelled",
};
