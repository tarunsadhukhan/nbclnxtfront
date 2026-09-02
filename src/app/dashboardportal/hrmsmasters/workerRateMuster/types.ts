/**
 * Types for the Worker Rate Muster master (worker_rate_mst).
 * Single type file for the page — do not split (avoids circular deps).
 */

export type YesNo = "Y" | "N";

/** A row of GET /hrmsMasters/get_worker_rate_table (joined for display). */
export interface WorkerRateRow {
  id?: number;
  worker_rate_id: number;
  eb_id: number;
  /** YYYY-MM-DD; NULL on rows seeded from the original muster (undated). */
  effective_date: string | null;
  emp_code: string | null;
  emp_name: string | null;
  fbasic: number | null;
  fbasic_hr: number | null;
  da_all: YesNo;
  da_rate: number | null;
  hra: YesNo;
  hrd: YesNo;
  quarter: YesNo;
  pf: YesNo;
  esi: YesNo;
  ptax: YesNo;
  is_active: number;
  [key: string]: unknown;
}

/** A single record from GET /hrmsMasters/get_worker_rate_by_id/{id}. */
export interface WorkerRateRecord {
  worker_rate_id: number;
  eb_id: number;
  /** From the employee join — shown read-only when editing (the worker may be
   * inactive and so missing from the employee dropdown). */
  emp_code: string | null;
  emp_name: string | null;
  effective_date: string | null;
  fbasic: number | null;
  fbasic_hr: number | null;
  da_all: YesNo;
  da_rate: number | null;
  hra: YesNo;
  hrd: YesNo;
  quarter: YesNo;
  pf: YesNo;
  esi: YesNo;
  ptax: YesNo;
  is_active: number;
}

export interface Option {
  label: string;
  value: string;
}

/** Body of GET /hrmsMasters/worker_rate_setup. */
export interface WorkerRateSetup {
  employees: Option[];
}

/** The seven Y/N applicability flags, in muster column order. */
export const FLAG_FIELDS = Object.freeze([
  "da_all",
  "hra",
  "hrd",
  "quarter",
  "pf",
  "esi",
  "ptax",
] as const);
export type FlagField = (typeof FLAG_FIELDS)[number];

/** Numeric columns the bulk-change dialog may target. */
export const BULK_COLUMN_OPTIONS: readonly Option[] = Object.freeze([
  { value: "da_rate", label: "DA RATE" },
  { value: "fbasic", label: "FBASIC" },
  { value: "fbasic_hr", label: "FBASIC HR" },
]);

/** Dialog-level operations; increase/decrease both map to the backend 'add'
 * op (decrease negates the value), 'set' replaces the value outright. */
export const BULK_OP_OPTIONS: readonly Option[] = Object.freeze([
  { value: "increase", label: "Increase (+)" },
  { value: "decrease", label: "Decrease (-)" },
  { value: "set", label: "Set exact value (replace)" },
]);
