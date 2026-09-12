/**
 * Types for Beaming Production entries — fortnight header (beaming_prod_hdr)
 * with quality lines (beaming_production); derived values come from the view
 * vw_beaming_prod_hdr. Single type file for the page — do not split
 * (avoids circular deps).
 */

/** A row of GET /production/get_beaming_prod_table (one per header). */
export interface BeamingHdrRow {
  id?: number;
  beaming_hdr_id: number;
  branch_id: number;
  fne_date: string;
  period: string;
  shift: string;
  machine_id: number;
  machine_name: string | null;
  mach_hrs: number;
  lost_hrs: number;
  eff_hrs: number;
  div_hrs: number;
  prod_qty: number;
  line_count: number;
  prod_value: number;
  lhr_value: number;
  total_value: number;
  kav: number;
  rate1: number | null;
  rate2: number;
  rate3: number;
  [key: string]: unknown;
}

/** One quality line of a loaded entry. */
export interface BeamingLineRecord {
  beaming_prod_id: number;
  quality_id: number;
  quality_code: string | null;
  quality_desc: string | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
}

/** GET /production/get_beaming_prod_by_id/{beaming_hdr_id}. */
export interface BeamingEntryRecord extends BeamingHdrRow {
  lines: BeamingLineRecord[];
}

export interface Option {
  label: string;
  value: string;
}

export interface MachineOption extends Option {
  code: string;
  name: string;
}

/** Quality option carries the master rate so the dialog can preview amounts. */
export interface QualityOption extends Option {
  code: string;
  name: string;
  quality_rate: number | null;
}

export interface BeamingDept {
  dept_id: number;
  dept_code: string | null;
  dept_desc: string;
}

/** Body of GET /production/beaming_prod_setup (per branch). */
export interface BeamingProdSetup {
  dept: BeamingDept | null;
  machines: MachineOption[];
  shifts: Option[];
  qualities: QualityOption[];
}

/** One grid line of the entry dialog (numeric input kept as a string). */
export interface BeamingGridLine {
  quality_id: number | "";
  prod_qty: string;
}
