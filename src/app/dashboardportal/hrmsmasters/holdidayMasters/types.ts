/**
 * Types for the Holiday master (holiday_master).
 * Single type file for the page — do not split (avoids circular deps).
 * Dates travel as ISO strings (YYYY-MM-DD).
 */

export const HOLIDAY_TYPE_OPTIONS = Object.freeze([
  { value: "1", label: "Occasional" },
  { value: "2", label: "Weekly" },
  { value: "3", label: "Monthly" },
]);

/** A single record from GET /hrmsMasters/get_holiday_by_id/{id}. */
export interface HolidayRecord {
  holiday_id: number;
  branch_id: number;
  holiday: string | null;
  holiday_date: string | null;
  holiday_type: number | null;
  period_start_date: string | null;
  period_end_date: string | null;
  status: number;
}

/** A row of GET /hrmsMasters/get_holiday_table. */
export interface HolidayRow extends HolidayRecord {
  id?: number;
  branch_name: string | null;
  [key: string]: unknown;
}
