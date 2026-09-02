/**
 * Types for Winding Production entries (winding_production).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * One row per worker + date + shift + quality (WINDING PRODUCTION sheet).
 * The rate is resolved server-side from the winding incentive master
 * (flat rate for warp qualities, production slab for weft qualities);
 * amount is a database generated column (rate * prod hrs).
 */

/** A row of GET /production/get_winding_prod_table (joined for display). */
export interface WindingProdRow {
  id?: number;
  winding_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  emp_code: string | null;
  emp_name: string | null;
  winding_incentive_id: number;
  wdg_q_id: number | null;
  quality_code: string | null;
  quality_name: string | null;
  grist: number | null;
  prod_hrs: number;
  prod_kg: number | null;
  unit: string | null;
  rate: number;
  amount: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /production/get_winding_prod_by_id/{id}. */
export interface WindingProdRecord {
  winding_prod_id: number;
  branch_id: number;
  prod_date: string;
  shift: string;
  eb_id: number;
  winding_incentive_id: number;
  wdg_q_id: number | null;
  grist: number | null;
  prod_hrs: number;
  prod_kg: number | null;
  unit: string | null;
  rate: number;
  amount: number | null;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** One production slab of a slab-rated (weft) quality. */
export interface QualitySlab {
  /** winding_incentive_mst row id of this slab. */
  value: string;
  prod_from: number;
  prod_to: number | null;
  rate_per_hr: number;
}

/**
 * Quality option from the setup endpoint — one per winding quality master
 * row; value is the wdg_q_id. Flat quality: rate_per_hr set, slabs [].
 * Slab-rated quality: rate_per_hr null, slabs sorted by prod_from.
 * No incentive scheme: rate_per_hr null AND slabs [] (save rejected server-side).
 */
export interface QualityOption extends Option {
  grist: number | null;
  unit: string | null;
  rate_per_hr: number | null;
  slabs: QualitySlab[];
}

/** Body of GET /production/winding_prod_setup. */
export interface WindingProdSetup {
  employees: Option[];
  shifts: Option[];
  qualities: QualityOption[];
}

/** One line of the grid-entry form (numeric fields kept as strings).
 * Unit and grist are derived from the selected quality — not keyed in. */
export interface WindingProdGridRow {
  eb_id: number | "";
  /** Winding quality master row id of the selected quality. */
  wdg_q_id: number | "";
  prod: string;
  prod_hrs: string;
  /** winding_prod_id once this row has been saved; null while unsaved. */
  saved_id: number | null;
  /** Edited since last save — pending again, picked up by Save All. */
  dirty: boolean;
  /** Hidden passthrough so an existing remark survives a grid update. */
  remarks: string | null;
}
