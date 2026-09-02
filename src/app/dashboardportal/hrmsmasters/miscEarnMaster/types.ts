/**
 * Types for the Misc Earn / Extra Allowance master (misc_earn_mst).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * A rule = amount paid per a block of hours for a department (+ optional
 * occupation/designation), optionally scaled by a percentage — e.g.
 * "MISC EARN Rs. 75 per 96 hrs" or "BEAM CHANGES 450 / 880 hrs * 60%".
 * rate_per_hr is computed by the database (generated column).
 */

/** A row of GET /hrmsMasters/get_misc_earn_table (joined for display). */
export interface MiscEarnRow {
  id?: number;
  misc_earn_id: number;
  branch_id: number;
  dept_id: number;
  dept_code: string | null;
  dept_desc: string | null;
  designation_id: number | null;
  desig: string | null;
  cata_id: number | null;
  cata_code: string | null;
  cata_desc: string | null;
  earn_type: string;
  amount: number;
  per_hrs: number;
  rate_pct: number;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrmsMasters/get_misc_earn_by_id/{id}. */
export interface MiscEarnRecord {
  misc_earn_id: number;
  branch_id: number;
  dept_id: number;
  designation_id: number | null;
  cata_id: number | null;
  earn_type: string;
  amount: number;
  per_hrs: number;
  rate_pct: number;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Designation option carries its dept for the cascading dropdown. */
export interface DesignationOption extends Option {
  dept_id: number | null;
}

/** Body of GET /hrmsMasters/misc_earn_setup. */
export interface MiscEarnSetup {
  depts: Option[];
  designations: DesignationOption[];
  categories: Option[];
  earn_types: Option[];
}
