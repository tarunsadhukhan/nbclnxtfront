/**
 * Types for Weaving Production entries (weaving_production).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * One row per worker + date + shift + quality (WEAVING PROD sheets). A weaver
 * runs a pair of looms (MC-1 / MC-2). The rate is resolved server-side from
 * the wages quality master (tbl_nbcl_wages_quality_mst); amount = rate * prod
 * and payable = amount * 80% are database generated columns. The HESS/SACK
 * type derives from the quality's dept (HESSIAN / SACKING WEAVING).
 */

/** A row of GET /production/get_weaving_prod_table (joined for display). */
export interface WeavingProdRow {
  id?: number;
  weaving_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  emp_code: string | null;
  emp_name: string | null;
  machine_id: number;
  machine1_name: string | null;
  machine_id2: number | null;
  machine2_name: string | null;
  line_no: string | null;
  quality_id: number;
  quality_code: string | null;
  quality_desc: string | null;
  quality_type: string;
  wk_hrs: number | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
  payable_amt: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /production/get_weaving_prod_by_id/{id}. */
export interface WeavingProdRecord {
  weaving_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  machine_id: number;
  machine_id2: number | null;
  line_no: string | null;
  quality_id: number;
  wk_hrs: number | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
  payable_amt: number | null;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Loom option from the setup endpoint — value is the machine_id. */
export interface MachineOption extends Option {
  /** HESS (hessian loom) or SACK (sacking loom), from the loom's dept. */
  machine_type: string;
}

/**
 * Quality option from the setup endpoint — one per weaving row of the wages
 * quality master; value is the quality_id. The per-unit rate previews the
 * amount; the server re-resolves it at save time.
 */
export interface QualityOption extends Option {
  quality_rate: number | null;
  /** HESS or SACK, from the quality's dept — the sheet's TYPE column. */
  quality_type: string;
}

/** Body of GET /production/weaving_prod_setup. */
export interface WeavingProdSetup {
  employees: Option[];
  shifts: Option[];
  machines: MachineOption[];
  qualities: QualityOption[];
}

/** One line of the grid-entry form (numeric fields kept as strings).
 * Type and rate are derived from the selected quality — not keyed in. */
export interface WeavingProdGridRow {
  eb_id: number | "";
  /** MC-1 loom (required). */
  machine_id: number | "";
  /** MC-2 loom (optional pair). */
  machine_id2: number | "";
  line_no: string;
  /** Wages quality master row id of the selected quality. */
  quality_id: number | "";
  wk_hrs: string;
  prod: string;
  /** weaving_prod_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
