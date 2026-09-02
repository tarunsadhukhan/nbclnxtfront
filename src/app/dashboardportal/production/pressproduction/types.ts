/**
 * Types for Press Production entries (press_production).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * One row per machine + date + shift + quality (PRESS sheet).
 * The rate is resolved server-side from the wages quality master
 * (tbl_nbcl_wages_quality_mst); amount is a database generated column
 * (rate * prod qty), and divisible hrs = wk_hrs * 4.
 */

/** A row of GET /production/get_press_prod_table (joined for display). */
export interface PressProdRow {
  id?: number;
  press_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  machine_id: number;
  machine_name: string | null;
  quality_id: number;
  quality_code: string | null;
  quality_desc: string | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
  wk_hrs: number | null;
  lost_hrs: number | null;
  divisible_hrs: number | null;
  /** amount / (divisible_hrs - lost_hrs), database generated column;
   * null when hours are missing or net hours are zero. */
  rate_per_hrs: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /production/get_press_prod_by_id/{id}. */
export interface PressProdRecord {
  press_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  machine_id: number;
  quality_id: number;
  prod_qty: number;
  rate: number;
  amount: number | null;
  wk_hrs: number | null;
  lost_hrs: number | null;
  divisible_hrs: number | null;
  rate_per_hrs: number | null;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Quality option carries the master rate so the dialog can preview it. */
export interface QualityOption extends Option {
  quality_rate: number | null;
}

/** Body of GET /production/press_prod_setup. */
export interface PressProdSetup {
  machines: Option[];
  shifts: Option[];
  qualities: QualityOption[];
}

/** One line of the grid-entry form (numeric fields kept as strings).
 * divisible_hrs is not keyed in — the DB computes it as wk_hrs * 4. */
export interface PressProdGridRow {
  machine_id: number | "";
  quality_id: number | "";
  prod_qty: string;
  wk_hrs: string;
  lost_hrs: string;
  /** press_prod_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
