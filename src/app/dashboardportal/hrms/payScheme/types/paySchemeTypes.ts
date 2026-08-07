"use client";

// ─── Option ────────────────────────────────────────────────────────

export interface Option {
  label: string;
  value: string;
}

// ─── Pay Component ─────────────────────────────────────────────────

export interface PayComponent {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: number; // 0=Input, 1=Earning, 2=Deduction, 3=Summary
  status_id: number;
}

export const PAY_COMPONENT_TYPE = Object.freeze({
  INPUT: 0,
  EARNING: 1,
  DEDUCTION: 2,
  SUMMARY: 3,
} as const);

export type PayComponentType = (typeof PAY_COMPONENT_TYPE)[keyof typeof PAY_COMPONENT_TYPE];

export const PAY_COMPONENT_TYPE_LABELS: Record<number, string> = Object.freeze({
  [PAY_COMPONENT_TYPE.INPUT]: "Input",
  [PAY_COMPONENT_TYPE.EARNING]: "Earning",
  [PAY_COMPONENT_TYPE.DEDUCTION]: "Deduction",
  [PAY_COMPONENT_TYPE.SUMMARY]: "Summary",
});

// ─── Pay Scheme Structure ──────────────────────────────────────────

export interface PaySchemeStructureEntry {
  id?: number;
  component_id: number;
  amount: number;
  effective_from: string | null;
  ends_on: string | null;
  remarks: string | null;
}

// ─── Pay Scheme (List Row) ─────────────────────────────────────────

export interface PaySchemeListRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: number;
  status_id: number;
  co_id: number;
}

// ─── Pay Scheme Detail ─────────────────────────────────────────────

export interface PaySchemeDetail {
  scheme: PaySchemeListRow;
  components: PayComponent[];
  structure: PaySchemeStructureEntry[];
}

// ─── Pay Scheme Setup ──────────────────────────────────────────────

export interface PaySchemeSetupData {
  all_components: PayComponent[];
  earnings: PayComponent[];
  deductions: PayComponent[];
  summary: PayComponent[];
  inputs: PayComponent[];
}

// ─── Pay Period (Pay Param) ────────────────────────────────────────

export interface PayPeriodListRow {
  id: number;
  from_date: string;
  to_date: string;
  payscheme_id: number;
  branch_id: number | null;
  status_id: number;
  pay_scheme_name?: string;
  branch_name?: string;
}

export interface PayParamSetupData {
  pay_schemes: Option[];
  branches: Option[];
}

// ─── Form Mode ─────────────────────────────────────────────────────

export type FormMode = "create" | "edit" | "view";
