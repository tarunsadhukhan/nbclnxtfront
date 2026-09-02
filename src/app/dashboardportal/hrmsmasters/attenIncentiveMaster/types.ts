/**
 * Types for the Attendance Incentive master (atten_incentive_mst).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * A rule = amount paid per a block of hours for an employee category, payable
 * once the worker reaches the eligibility hours in the fortnight — e.g.
 * "CAT-1: Rs. 1 per 8 hrs, eligibility 96 hrs in F/E". rate_per_hr is
 * computed by the database (generated column).
 */

/** A row of GET /hrmsMasters/get_atten_incentive_table (joined for display). */
export interface AttenIncentiveRow {
  id?: number;
  atten_incentive_id: number;
  branch_id: number;
  cata_id: number;
  cata_code: string | null;
  cata_desc: string | null;
  amount: number;
  per_hrs: number;
  eligibility_hrs: number;
  working_includes: string | null;
  calc_on: string | null;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrmsMasters/get_atten_incentive_by_id/{id}. */
export interface AttenIncentiveRecord {
  atten_incentive_id: number;
  branch_id: number;
  cata_id: number;
  amount: number;
  per_hrs: number;
  eligibility_hrs: number;
  working_includes: string | null;
  calc_on: string | null;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Body of GET /hrmsMasters/atten_incentive_setup. */
export interface AttenIncentiveSetup {
  categories: Option[];
}
