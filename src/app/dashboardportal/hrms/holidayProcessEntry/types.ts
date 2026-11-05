/**
 * Types for Holiday Process / Entry (hrms_holiday_transactions; legacy
 * FrmHolidayProcess). Single type file for the page — do not split.
 */

export interface Option {
  label: string;
  value: string;
}

/** Body of GET /hrms/holiday_process_setup. */
export interface HolidaySetup {
  /** Wages (P) pay periods, newest first. */
  periods: Option[];
  employees: Option[];
}

/** A row of GET /hrms/holiday_process_holidays. */
export interface PeriodHoliday {
  holiday_id: number;
  holiday_date: string;
  holiday: string;
  /** Employees made by the process (manual = 0). */
  processed: number;
  /** Employees keyed by hand (manual = 1). */
  manual: number;
  /** Suggested "consider attendance of" date; null when no attendance is processed yet. */
  attendance_date: string | null;
}

/** A row of GET /hrms/holiday_tran_by_holiday. */
export interface HolidayTran {
  holiday_tran_id: number;
  eb_id: number;
  emp_label: string;
  holiday_hours: number;
  manual: number;
}
