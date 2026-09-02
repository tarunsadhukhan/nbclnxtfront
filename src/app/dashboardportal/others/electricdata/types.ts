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
}

/** One line of the grid-entry form (amount kept as string). */
export interface ElectricGridRow {
  eb_id: number | "";
  amount: string;
  /** tran_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
