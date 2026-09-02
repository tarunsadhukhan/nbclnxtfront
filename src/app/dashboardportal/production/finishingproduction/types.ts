/**
 * Types for Finishing (sewing) Production entries (finishing_production).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * One row per worker + date + shift + quality (SEWING sheets — the HIRAKOL /
 * HEMMING sections are just machine groups, HK% / HM% machines under dept
 * SEWING). The rate is resolved server-side from the wages quality master
 * (tbl_nbcl_wages_quality_mst); amount = rate * prod is a database generated
 * column.
 */

/** A row of GET /production/get_finishing_prod_table (joined for display). */
export interface FinishingProdRow {
  id?: number;
  finishing_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  emp_code: string | null;
  emp_name: string | null;
  machine_id: number;
  machine_name: string | null;
  quality_id: number;
  quality_code: string | null;
  quality_desc: string | null;
  wk_hrs: number | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /production/get_finishing_prod_by_id/{id}. */
export interface FinishingProdRecord {
  finishing_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  machine_id: number;
  quality_id: number;
  wk_hrs: number | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
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

/** Body of GET /production/finishing_prod_setup. */
export interface FinishingProdSetup {
  employees: Option[];
  shifts: Option[];
  machines: Option[];
  qualities: QualityOption[];
}

/** One line of the grid-entry form (numeric fields kept as strings).
 * Rate is derived from the selected quality — not keyed in. */
export interface FinishingProdGridRow {
  eb_id: number | "";
  machine_id: number | "";
  /** Wages quality master row id of the selected quality. */
  quality_id: number | "";
  wk_hrs: string;
  prod: string;
  /** finishing_prod_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
