/**
 * @module accountingTypes
 * @description All type definitions for the Accounting module.
 * ALL types in ONE file to prevent circular dependencies.
 */

// ============================================================
// Status & Constants
// ============================================================

export const ACC_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const;

export type AccStatusId = (typeof ACC_STATUS_IDS)[keyof typeof ACC_STATUS_IDS];

/**
 * Statuses the backend's update_draft_voucher accepts. Rejected (4) is NOT
 * editable — the user reopens (4 -> 1) first. Keep in sync with the backend.
 */
export const isVoucherStatusEditable = (statusId: number): boolean =>
  statusId === ACC_STATUS_IDS.DRAFT || statusId === ACC_STATUS_IDS.OPEN;

export const VOUCHER_CATEGORIES = [
  "PAYMENT", "RECEIPT", "JOURNAL", "CONTRA",
  "SALES", "PURCHASE", "DEBIT_NOTE", "CREDIT_NOTE",
] as const;
export type VoucherCategory = (typeof VOUCHER_CATEGORIES)[number];

export const LEDGER_TYPES = {
  GENERAL: "G",
  PARTY: "P",
  BANK: "B",
  CASH: "C",
} as const;
export type LedgerType = (typeof LEDGER_TYPES)[keyof typeof LEDGER_TYPES];

export const ACCOUNT_NATURES = ["A", "L", "I", "E"] as const;
export type AccountNature = (typeof ACCOUNT_NATURES)[number];

// ============================================================
// Common
// ============================================================

export interface Option {
  label: string;
  value: string;
}

// ============================================================
// Ledger Group
// ============================================================

export interface LedgerGroup {
  acc_ledger_group_id: number;
  co_id: number;
  parent_group_id: number | null;
  group_name: string;
  group_code: string | null;
  nature: AccountNature;
  affects_gross_profit: number;
  is_revenue: number;
  normal_balance: "D" | "C";
  is_party_group: number;
  is_system_group: number;
  sequence_no: number;
  active: number;
  children?: LedgerGroup[];
}

// ============================================================
// Ledger
// ============================================================

export interface Ledger {
  acc_ledger_id: number;
  co_id: number;
  acc_ledger_group_id: number;
  ledger_name: string;
  ledger_code: string | null;
  ledger_type: LedgerType;
  party_id: number | null;
  credit_days: number | null;
  credit_limit: number | null;
  opening_balance: number;
  opening_balance_type: "D" | "C" | null;
  opening_fy_id: number | null;
  gst_applicable: number;
  hsn_sac_code: string | null;
  is_system_ledger: number;
  is_related_party: number;
  active: number;
  group_name?: string;
  party_name?: string;
}

export interface LedgerFormData {
  acc_ledger_group_id: number;
  ledger_name: string;
  ledger_code?: string;
  ledger_type: LedgerType;
  party_id?: number | null;
  credit_days?: number | null;
  credit_limit?: number | null;
  opening_balance?: number;
  opening_balance_type?: "D" | "C";
  gst_applicable?: number;
  hsn_sac_code?: string;
}

// ============================================================
// Financial Year
// ============================================================

export interface FinancialYear {
  acc_financial_year_id: number;
  co_id: number;
  fy_start: string;
  fy_end: string;
  fy_label: string;
  is_active: number;
  is_locked: number;
}

// ============================================================
// Voucher Type
// ============================================================

export interface VoucherType {
  acc_voucher_type_id: number;
  co_id: number;
  type_name: string;
  type_code: string;
  type_category: VoucherCategory;
  auto_numbering: number;
  prefix: string | null;
  requires_bank_cash: number;
  is_system_type: number;
  active: number;
}

// ============================================================
// Voucher
// ============================================================

export interface VoucherListRow {
  id: number;
  acc_voucher_id: number;
  voucher_no: string;
  voucher_date: string;
  voucher_type: string;
  type_category: VoucherCategory;
  party_name: string | null;
  branch_name: string | null;
  total_amount: number;
  status: string;
  status_id: number;
  is_auto_posted: number;
  source_doc_type: string | null;
  narration: string | null;
}

export interface VoucherLine {
  acc_voucher_line_id: number;
  acc_ledger_id: number;
  ledger_name: string;
  dr_cr: "D" | "C";
  amount: number;
  branch_id: number | null;
  party_id: number | null;
  party_name?: string | null;
  narration: string | null;
  source_line_type: string | null;
}

export interface VoucherLineFormData {
  acc_ledger_id: number;
  dr_cr: "D" | "C";
  amount: number;
  branch_id?: number | null;
  party_id?: number | null;
  narration?: string;
}

export interface VoucherGst {
  acc_voucher_gst_id: number;
  hsn_sac_code: string | null;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_amount: number;
  total_tax: number;
  gst_type: "INTRA" | "INTER";
  supply_type: string | null;
  is_rcm: number;
  itc_eligibility: string;
}

export interface BillRef {
  acc_bill_ref_id: number;
  party_id: number;
  party_name?: string;
  ref_type: "NEW" | "AGAINST" | "ADVANCE" | "ON_ACCOUNT";
  ref_name: string;
  ref_amount: number;
  ref_date: string | null;
  due_date: string | null;
  pending_amount: number;
  status: "OPEN" | "PARTIAL" | "CLOSED";
}

export interface VoucherDetail {
  acc_voucher_id: number;
  co_id: number;
  branch_id: number | null;
  branch_name: string | null;
  acc_voucher_type_id: number;
  voucher_type: string;
  type_category: VoucherCategory;
  acc_financial_year_id: number;
  fy_label: string;
  voucher_no: string;
  voucher_date: string;
  party_id: number | null;
  party_name: string | null;
  ref_no: string | null;
  ref_date: string | null;
  narration: string | null;
  total_amount: number;
  source_doc_type: string | null;
  source_doc_id: number | null;
  is_auto_posted: number;
  is_reversed: number;
  status_id: number;
  approval_level: number;
  lines: VoucherLine[];
  gst_details: VoucherGst[];
  bill_refs: BillRef[];
}

export interface VoucherFormData {
  co_id: number;
  branch_id?: number | null;
  type_category: VoucherCategory;
  voucher_date: string;
  party_id?: number | null;
  ref_no?: string;
  ref_date?: string;
  narration?: string;
  lines: VoucherLineFormData[];
  gst_data?: {
    hsn_sac_code?: string;
    taxable_amount: number;
    cgst_rate?: number;
    cgst_amount?: number;
    sgst_rate?: number;
    sgst_amount?: number;
    igst_rate?: number;
    igst_amount?: number;
    gst_type: "INTRA" | "INTER";
  };
}

// ============================================================
// Account Determination
// ============================================================

export interface AccountDetermination {
  acc_account_determination_id: number;
  co_id: number;
  doc_type: string;
  line_type: string;
  acc_ledger_id: number;
  ledger_name: string;
  item_grp_id: number | null;
  is_default: number;
  active: number;
}

// ============================================================
// Reports
// ============================================================

export interface TrialBalanceRow {
  acc_ledger_id: number;
  ledger_name: string;
  group_name: string;
  nature: AccountNature;
  opening_balance: number;
  opening_balance_type: "D" | "C" | null;
  period_debit: number;
  period_credit: number;
  closing_balance: number;
}

export interface ProfitLossSection {
  section: string;
  items: Array<{
    group_name: string;
    ledger_name?: string;
    amount: number;
  }>;
  total: number;
}

export interface ProfitLossData {
  trading: {
    income: ProfitLossSection;
    expense: ProfitLossSection;
    gross_profit: number;
  };
  pl: {
    income: ProfitLossSection;
    expense: ProfitLossSection;
    net_profit: number;
  };
}

export interface BalanceSheetSection {
  section: string;
  items: Array<{
    group_name: string;
    ledger_name?: string;
    amount: number;
  }>;
  total: number;
}

export interface BalanceSheetData {
  assets: BalanceSheetSection[];
  liabilities: BalanceSheetSection[];
  total_assets: number;
  total_liabilities: number;
}

export interface LedgerReportRow {
  voucher_date: string;
  voucher_no: string;
  voucher_type: string;
  dr_cr: "D" | "C";
  amount: number;
  debit: number | null;
  credit: number | null;
  narration: string | null;
  ref_no: string | null;
  contra_ledgers: string | null;
  running_balance?: number;
}

export interface DayBookRow {
  voucher_date: string;
  voucher_no: string;
  voucher_type: string;
  total_amount: number;
  narration: string | null;
  ref_no: string | null;
  party_name: string | null;
  branch_name: string | null;
  is_auto_posted: number;
  source_doc_type: string | null;
}

export interface PartyOutstandingRow {
  party_id: number;
  party_name: string;
  bill_no: string;
  bill_date: string | null;
  due_date: string | null;
  bill_amount: number;
  outstanding: number;
  overdue_days: number;
}

export interface AgeingRow {
  party_id: number;
  party_name: string;
  not_due: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  above_90: number;
  total_outstanding: number;
}

export interface CashBookRow {
  voucher_date: string;
  voucher_no: string;
  voucher_type: string;
  receipt: number | null;
  payment: number | null;
  narration: string | null;
  ref_no: string | null;
  contra_ledgers: string | null;
}

export interface GstSummaryRow {
  description: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

// ============================================================
// Company Settings & Posting Queue
// ============================================================

export const POSTING_MODES = ["OFF", "AUTO_DRAFT", "AUTO_APPROVED"] as const;
export type PostingMode = (typeof POSTING_MODES)[number];

export const DUE_DATE_RULES = ["PO_CREDIT_DAYS", "MANUAL"] as const;
export type DueDateRule = (typeof DUE_DATE_RULES)[number];

export interface CompanySettings {
  co_id: number;
  posting_mode_purchase: PostingMode;
  posting_mode_jute_purchase: PostingMode;
  posting_mode_sales: PostingMode;
  posting_mode_drcr: PostingMode;
  due_date_rule: DueDateRule;
  default_credit_days?: number | null;
  enable_tds: number;
}

export const POSTING_QUEUE_STATUSES = [
  "PENDING", "POSTED", "DRAFTED", "SKIPPED", "FAILED",
] as const;
export type PostingQueueStatus = (typeof POSTING_QUEUE_STATUSES)[number];

export interface PostingQueueRow {
  acc_posting_queue_id: number;
  co_id: number;
  source_doc_type: string;
  source_doc_id: number;
  status: PostingQueueStatus;
  acc_voucher_id: number | null;
  attempt_count: number;
  last_error: string | null;
  updated_date_time: string | null;
}

// ============================================================
// Warning
// ============================================================

export interface VoucherWarning {
  code: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

// ============================================================
// Opening Bill
// ============================================================

export interface OpeningBill {
  party_id: number;
  ref_name: string;
  ref_date?: string;
  due_date?: string;
  ref_amount: number;
  pending_amount: number;
  dr_cr: "D" | "C";
}

export interface OpeningBillImport {
  co_id: number;
  acc_financial_year_id: number;
  bills: OpeningBill[];
}
