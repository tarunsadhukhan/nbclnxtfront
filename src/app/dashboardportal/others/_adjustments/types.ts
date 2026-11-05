/**
 * Types for the pay adjustment screens (Other Menus -> Adjustment Hour /
 * Adjustment PF / Adjustment NPF; tables PayM_AdjHR / PayM_AdjPF /
 * PayM_AdjNPF). Single type file for the three pages — do not split.
 *
 * As in legacy Smart Eye, an entry is a document keyed by pay period
 * (FNEDate = period to-date) + department + shift, holding employee lines.
 */

/** Backend path suffix: /hour, /pf, /npf. */
export type AdjKind = "hour" | "pf" | "npf";

/** A document row of GET /hrms/pay_adj_list/{kind}. */
export interface AdjDocRow {
  /** "fne_date|dept_code|wshift" */
  id: string;
  fne_date: string;
  dept_code: string;
  dept_name: string | null;
  wshift: string;
  line_count: number;
  adj_hr: number;
  /** hour: basic + DA amount; pf/npf: Adj_Amt. */
  adj_amt: number;
  [key: string]: unknown;
}

/** A line of GET /hrms/pay_adj_doc/{kind}. */
export interface AdjDocLine {
  eb_id: number | null;
  ename: string;
  adj_hr: number;
  adj_amt?: number;
  adj_day?: number;
  adj_bs?: number;
  adj_da?: number;
}

export interface Option {
  label: string;
  value: string;
}

export interface PeriodOption extends Option {
  to_date: string | null;
}

/** Body of GET /hrms/pay_adj_setup. */
export interface AdjSetup {
  employees: Option[];
  periods: PeriodOption[];
  depts: Option[];
  shifts: ShiftOption[];
}

export interface ShiftOption extends Option {
  /** spell_mst.working_hours — Adj Day = Adj HR / hours. */
  hours: number;
}

/** GET /hrms/pay_adj_rates body: per-hour basic / DA keyed by eb_id. */
export type AdjRates = Record<string, { bs_hr: number; da_hr: number }>;

/** One editable grid line. adj_day / adj_bs / adj_da are server-computed (hour only). */
export interface AdjGridRow {
  eb_id: number | "";
  adj_hr: string;
  adj_amt: string;
  adj_day?: number;
  adj_bs?: number;
  adj_da?: number;
}
