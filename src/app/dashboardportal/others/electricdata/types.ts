/**
 * Types for Electric Data entries (electric_details) — Other Menus ->
 * Electric Data. Single type file for the page — do not split.
 *
 * One row per employee + date: the electric amount charged to the worker.
 * The employee's name displays from the master; only EB no and amount are
 * keyed in.
 */

/** A row of GET /hrms/get_electric_table (joined for display). */
export interface ElectricRow {
  id?: number;
  tran_id: number;
  branch_id: number;
  tran_date: string;
  eb_id: number;
  emp_code: string | null;
  emp_name: string | null;
  period_id: number | null;
  period_desc: string | null;
  no_of_units: number | null;
  unit_rate: number | null;
  amount: number;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrms/get_electric_by_id/{id}. */
export interface ElectricRecord {
  tran_id: number;
  branch_id: number;
  tran_date: string;
  eb_id: number;
  period_id: number | null;
  no_of_units: number | null;
  unit_rate: number | null;
  amount: number;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Body of GET /hrms/electric_setup. */
export interface ElectricSetup {
  employees: Option[];
  /** pay_period rows: value = pay_period.ID. */
  periods: PeriodOption[];
}

export interface PeriodOption extends Option {
  /** pay_period.TO_DATE, YYYY-MM-DD. */
  to_date: string | null;
}

/** One line of the grid-entry form. Unit rate is the header value; amount is
 * derived (units x rate), so neither is stored per row. */
export interface ElectricGridRow {
  eb_id: number | "";
  no_of_units: string;
  /** tran_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
