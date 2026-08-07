/**
 * Types for the Cash / Daily Rate Entry master (outsider_rate_approve).
 * Single type file for the page — do not split (avoids circular deps).
 */

/** A row of GET /hrmsMasters/get_daily_rate_table (joined for display). */
export interface DailyRateRow {
  id?: number;
  outsider_rate_app_id: number;
  eb_id: number | null;
  emp_code: string | null;
  emp_name: string | null;
  rate_approve: number | null;
  /** YYYY-MM-DD */
  app_date: string | null;
  app_shift: string | null;
  desig_id: number | null;
  designation: string | null;
  is_active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrmsMasters/get_daily_rate_by_id/{id}. */
export interface DailyRateRecord {
  outsider_rate_app_id: number;
  eb_id: number | null;
  rate_approve: number | null;
  app_date: string | null;
  app_shift: string | null;
  desig_id: number | null;
  is_active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Employee option carries its designation so picking a worker can default it. */
export interface EmployeeOption extends Option {
  designation_id: number | null;
}

/** Body of GET /hrmsMasters/daily_rate_setup. */
export interface DailyRateSetup {
  employees: EmployeeOption[];
  designations: Option[];
  shifts: Option[];
}
