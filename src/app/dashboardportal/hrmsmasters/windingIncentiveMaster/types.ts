/**
 * Types for the Winding Incentive master (winding_incentive_mst).
 * Single type file for the page — do not split (avoids circular deps).
 *
 * A row = incentive scheme for one winding quality: warp qualities carry a
 * flat amount per eligibility hours (e.g. "SACKING WARP: Rs. 40 per 96 hrs");
 * weft qualities carry one row per production slab (bundles per 8 hrs) with
 * the grist range it applies to. rate_per_hr is computed by the database
 * (incentive_amt / eligibility_hrs) — the winding production rate.
 */

/** A row of GET /hrmsMasters/get_winding_incentive_table. */
export interface WindingIncentiveRow {
  id?: number;
  winding_incentive_id: number;
  quality_code: string;
  quality_name: string;
  inc_code: string | null;
  grist_from: number | null;
  grist_to: number | null;
  prod_from: number | null;
  prod_to: number | null;
  incentive_amt: number;
  eligibility_hrs: number;
  unit: string;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrmsMasters/get_winding_incentive_by_id/{id}. */
export interface WindingIncentiveRecord {
  winding_incentive_id: number;
  quality_code: string;
  quality_name: string;
  inc_code: string | null;
  grist_from: number | null;
  grist_to: number | null;
  prod_from: number | null;
  prod_to: number | null;
  incentive_amt: number;
  eligibility_hrs: number;
  unit: string;
  rate_per_hr: number | null;
  remarks: string | null;
  active: number;
}
