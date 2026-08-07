/**
 * @module accountingService
 * @description Service layer for Accounting module API calls.
 */
import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  Ledger,
  LedgerGroup,
  VoucherType,
  VoucherCategory,
  CompanySettings,
  PostingQueueRow,
  PostingQueueStatus,
  DayBookRow,
  CashBookRow,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// Shared module types (single source of truth in accountingTypes.ts).
// Re-exported so existing consumers importing from this service keep working.
export type {
  Ledger,
  LedgerGroup,
  VoucherType,
  VoucherCategory,
  CompanySettings,
  PostingQueueRow,
  PostingQueueStatus,
};

// ─── Response Types ──────────────────────────────────────────────────────────

export type Party = {
  party_id: number;
  supp_name: string;
  supp_code: string | null;
};

export type FinancialYear = {
  acc_financial_year_id: number;
  co_id: number;
  fy_start: string;
  fy_end: string;
  fy_label: string;
  is_active: number;
  is_locked: number;
  locked_by?: number | null;
  locked_date_time?: string | null;
};

export type AccountDetermination = {
  acc_account_determination_id: number;
  co_id: number;
  doc_type: string;
  line_type: string;
  acc_ledger_id: number | null;
  ledger_name: string | null;
  ledger_code?: string | null;
  item_grp_id?: number | null;
  item_grp_name?: string | null;
  is_default?: number;
};

export type VoucherLine = {
  acc_voucher_dtl_id?: number;
  acc_ledger_id: number;
  ledger_name?: string;
  debit_amount?: number;
  credit_amount?: number;
  dr_cr?: "D" | "C";
  amount?: number;
  branch_id?: number | null;
  party_id?: number | null;
  narration?: string | null;
};

export type BillRef = {
  acc_bill_ref_id: number;
  ref_type: string;
  ref_no: string;
  ref_date: string;
  amount: number;
  outstanding: number;
};

export type Voucher = {
  acc_voucher_id: number;
  voucher_no: string;
  voucher_date: string;
  acc_voucher_type_id: number;
  voucher_type_name?: string;
  type_category?: VoucherCategory;
  party_id?: number | null;
  party_ledger_id?: number | null;
  party_name?: string;
  ref_no?: string | null;
  ref_date?: string | null;
  narration?: string;
  total_debit: number;
  total_credit: number;
  total_amount?: number;
  status_id: number;
  status_name?: string;
  is_auto_posted?: number;
  source_doc_type?: string | null;
  source_doc_id?: number | null;
  lines?: VoucherLine[];
  bill_refs?: BillRef[];
};

export type VoucherListResponse = {
  vouchers: Voucher[];
  total: number;
  page: number;
  limit: number;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  message: string;
};

export type TrialBalanceRow = {
  acc_ledger_id: number;
  ledger_name: string;
  group_name: string;
  debit: number;
  credit: number;
  closing_debit: number;
  closing_credit: number;
};

export type ProfitLossSection = {
  section: string;
  items: Array<{
    ledger_name: string;
    amount: number;
  }>;
  total: number;
};

export type BalanceSheetSection = {
  section: string;
  items: Array<{
    ledger_name: string;
    amount: number;
  }>;
  total: number;
};

export type LedgerReportRow = {
  date: string;
  voucher_no: string;
  voucher_type: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PartyOutstandingRow = {
  acc_ledger_id: number;
  party_name: string;
  total_outstanding: number;
  bills: BillRef[];
};

export type AgeingBucket = {
  acc_ledger_id: number;
  party_name: string;
  current: number;
  period_1_30: number;
  period_31_60: number;
  period_61_90: number;
  period_above_90: number;
  total: number;
};

export type GstSummaryRow = {
  gstin: string;
  party_name: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
};

// ─── Request Types ───────────────────────────────────────────────────────────

export type CreateLedgerGroupRequest = {
  co_id: number;
  group_name: string;
  parent_group_id: number | null;
  nature: string;
};

export type CreateLedgerRequest = {
  co_id: number;
  ledger_name: string;
  acc_ledger_group_id: number;
  ledger_type: string;
  ledger_code?: string;
  party_id?: number | null;
  credit_days?: number | null;
  credit_limit?: number | null;
  opening_balance?: number;
  opening_balance_type?: "D" | "C";
  gstin?: string;
  pan?: string;
  address?: string;
};

export type UpdateLedgerRequest = {
  co_id: number;
  ledger_name?: string;
  acc_ledger_group_id?: number;
  ledger_type?: string;
  ledger_code?: string;
  party_id?: number | null;
  credit_days?: number | null;
  credit_limit?: number | null;
  opening_balance?: number;
  opening_balance_type?: "D" | "C";
  gstin?: string;
  pan?: string;
  address?: string;
};

export type CreateFinancialYearRequest = {
  co_id: number;
  fy_label: string;
  fy_start: string;
  fy_end: string;
};

export type UpdateAccountDeterminationsRequest = {
  co_id: number;
  rules: Array<{
    acc_account_determination_id: number;
    acc_ledger_id: number | null;
  }>;
};

export type CreateVoucherLineRequest = {
  acc_ledger_id: number;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  party_id?: number | null;
};

export type CreateVoucherBillRefRequest = {
  ref_type: string;
  bill_no: string;
  bill_date?: string;
  due_date?: string;
  amount: number;
};

export type CreateVoucherRequest = {
  co_id: number;
  branch_id?: number;
  voucher_date: string;
  /** Either acc_voucher_type_id or type_category must be provided. */
  acc_voucher_type_id?: number;
  type_category?: VoucherCategory;
  party_id?: number | null;
  ref_no?: string;
  ref_date?: string;
  narration?: string;
  lines: CreateVoucherLineRequest[];
  gst_lines?: Array<Record<string, unknown>>;
  bill_refs?: CreateVoucherBillRefRequest[];
};

export type UpdateVoucherRequest = Partial<CreateVoucherRequest>;

export type UpdateCompanySettingsRequest = {
  co_id: number;
  posting_mode_purchase: CompanySettings["posting_mode_purchase"];
  posting_mode_jute_purchase: CompanySettings["posting_mode_jute_purchase"];
  posting_mode_sales: CompanySettings["posting_mode_sales"];
  posting_mode_drcr: CompanySettings["posting_mode_drcr"];
  due_date_rule: CompanySettings["due_date_rule"];
  default_credit_days?: number | null;
  enable_tds: number;
};

export type BillSettlement = {
  accBillRefId: number;
  amount: number;
};

export type OpeningBill = {
  acc_ledger_id: number;
  ref_no: string;
  ref_date: string;
  amount: number;
  bill_type: string;
};

export type ImportOpeningBillsRequest = {
  co_id: number;
  fy_id: number;
  bills: OpeningBill[];
};

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Build a query string from an object, omitting undefined/null values. */
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}

// ─── Setup & Masters ─────────────────────────────────────────────────────────

/** Activate accounting module for a company. */
export async function activateCompany(coId: number): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    apiRoutesPortalMasters.ACC_ACTIVATE_COMPANY,
    "POST",
    { co_id: coId },
  );

  if (error) throw new Error(error);
  return data ?? { message: "Company activated." };
}

/** Fetch all ledger groups for a company. */
export async function fetchLedgerGroups(coId: number): Promise<LedgerGroup[]> {
  const query = buildQuery({ co_id: coId });
  const { data, error } = await fetchWithCookie<{ data: LedgerGroup[] }>(
    `${apiRoutesPortalMasters.ACC_LEDGER_GROUPS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Create a new ledger group. */
export async function createLedgerGroup(payload: CreateLedgerGroupRequest): Promise<{ message: string; acc_ledger_group_id?: number }> {
  const { data, error } = await fetchWithCookie<{ message: string; acc_ledger_group_id?: number }>(
    apiRoutesPortalMasters.ACC_LEDGER_GROUP_CREATE,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Ledger group created." };
}

/** Fetch ledgers with optional filters. */
export async function fetchLedgers(params: {
  coId: number;
  groupId?: number;
  ledgerType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ ledgers: Ledger[]; total: number }> {
  const query = buildQuery({
    co_id: params.coId,
    group_id: params.groupId,
    ledger_type: params.ledgerType,
    search: params.search,
    page: params.page,
    limit: params.limit,
  });
  const { data, error } = await fetchWithCookie<{ data: Ledger[] }>(
    `${apiRoutesPortalMasters.ACC_LEDGERS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  const ledgers = data?.data ?? [];
  return { ledgers, total: ledgers.length };
}

/** Create a new ledger. */
export async function createLedger(payload: CreateLedgerRequest): Promise<{ message: string; acc_ledger_id?: number }> {
  const { data, error } = await fetchWithCookie<{ message: string; acc_ledger_id?: number }>(
    apiRoutesPortalMasters.ACC_LEDGER_CREATE,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Ledger created." };
}

/** Update an existing ledger. */
export async function updateLedger(ledgerId: number, payload: UpdateLedgerRequest): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    `${apiRoutesPortalMasters.ACC_LEDGER_EDIT}/${ledgerId}`,
    "PUT",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Ledger updated." };
}

/** Fetch parties for dropdown/autocomplete in ledger creation. */
export async function fetchPartiesDropdown(coId: number, search?: string): Promise<Party[]> {
  const query = buildQuery({ co_id: coId, search });
  const { data, error } = await fetchWithCookie<{ data: Party[] }>(
    `${apiRoutesPortalMasters.ACC_PARTIES_DROPDOWN}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch voucher types for a company. */
export async function fetchVoucherTypes(coId: number): Promise<VoucherType[]> {
  const query = buildQuery({ co_id: coId });
  const { data, error } = await fetchWithCookie<{ data: VoucherType[] }>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_TYPES}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

export type CreateVoucherTypeRequest = {
  co_id: number;
  voucher_type_name: string;
  type_category: VoucherCategory;
  prefix?: string;
};

/** Create a voucher type (manual setup path — no company activation needed). */
export async function createVoucherType(payload: CreateVoucherTypeRequest): Promise<VoucherType> {
  const { data, error } = await fetchWithCookie<{ data: VoucherType }>(
    apiRoutesPortalMasters.ACC_VOUCHER_TYPES,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return data?.data as VoucherType;
}

/** Fetch financial years for a company. */
export async function fetchFinancialYears(coId: number): Promise<FinancialYear[]> {
  const query = buildQuery({ co_id: coId });
  const { data, error } = await fetchWithCookie<{ data: FinancialYear[] }>(
    `${apiRoutesPortalMasters.ACC_FINANCIAL_YEARS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Create a new financial year. */
export async function createFinancialYear(payload: CreateFinancialYearRequest): Promise<{ message: string; acc_fy_id?: number }> {
  const { data, error } = await fetchWithCookie<{ message: string; acc_fy_id?: number }>(
    apiRoutesPortalMasters.ACC_FINANCIAL_YEAR_CREATE,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Financial year created." };
}

/** Fetch account determinations for a company, optionally filtered by doc type. */
export async function fetchAccountDeterminations(coId: number, docType?: string): Promise<AccountDetermination[]> {
  const query = buildQuery({ co_id: coId, doc_type: docType });
  const { data, error } = await fetchWithCookie<{ data: AccountDetermination[] }>(
    `${apiRoutesPortalMasters.ACC_ACCOUNT_DETERMINATIONS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Update account determinations (bulk). */
export async function updateAccountDeterminations(payload: UpdateAccountDeterminationsRequest): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ data: { updated: number } }>(
    apiRoutesPortalMasters.ACC_ACCOUNT_DETERMINATIONS_UPDATE,
    "PUT",
    payload,
  );

  if (error) throw new Error(error);
  return data?.data ? { message: `${data.data.updated} account determinations updated.` } : { message: "Account determinations updated." };
}

// ─── Voucher Operations ─────────────────────────────────────────────────────

/** Fetch voucher list with filters. */
export async function fetchVouchers(params: {
  coId: number;
  branchId?: number;
  voucherTypeId?: number;
  fromDate?: string;
  toDate?: string;
  partyId?: number;
  sourceDocType?: string;
  statusId?: number;
  /** Free-text match on voucher_no / party name / voucher type name. */
  search?: string;
  page?: number;
  limit?: number;
}): Promise<VoucherListResponse> {
  const trimmedSearch = params.search?.trim();
  const query = buildQuery({
    co_id: params.coId,
    branch_id: params.branchId,
    voucher_type_id: params.voucherTypeId,
    from_date: params.fromDate,
    to_date: params.toDate,
    party_id: params.partyId,
    source_doc_type: params.sourceDocType,
    status_id: params.statusId,
    search: trimmedSearch || undefined,
    page: params.page,
    limit: params.limit,
  });
  const { data, error } = await fetchWithCookie<{ data: Voucher[]; total?: number; page?: number; limit?: number }>(
    `${apiRoutesPortalMasters.ACC_VOUCHERS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  const vouchers = data?.data ?? [];
  return {
    vouchers,
    total: data?.total ?? vouchers.length,
    page: data?.page ?? params.page ?? 1,
    limit: data?.limit ?? params.limit ?? 20,
  };
}

/** Fetch a single voucher by ID. */
export async function fetchVoucherDetail(voucherId: number): Promise<Voucher> {
  const { data, error } = await fetchWithCookie<{ data: Voucher }>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_DETAIL}/${voucherId}`,
    "GET",
  );

  if (error) throw new Error(error);
  if (!data?.data) throw new Error("Empty voucher detail response.");
  return data.data;
}

/** Create a new voucher. */
export async function createVoucher(payload: CreateVoucherRequest): Promise<{ message: string; acc_voucher_id?: number; voucher_no?: string }> {
  // Backend wraps the service result: {"data": {voucher_id, voucher_no, status_id, ...}}
  const { data, error } = await fetchWithCookie<{ data?: { voucher_id?: number; voucher_no?: string } }>(
    apiRoutesPortalMasters.ACC_VOUCHER_CREATE,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return {
    message: "Voucher created.",
    acc_voucher_id: data?.data?.voucher_id,
    voucher_no: data?.data?.voucher_no,
  };
}

/** Update an existing voucher. */
export async function updateVoucher(voucherId: number, payload: UpdateVoucherRequest): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    `${apiRoutesPortalMasters.ACC_VOUCHERS}/${voucherId}`,
    "PUT",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Voucher updated." };
}

/** Open a voucher (transition from Draft to Open). */
export async function openVoucher(voucherId: number): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_OPEN}/${voucherId}/open`,
    "POST",
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from open voucher API.");
  return data;
}

/** Cancel a voucher. */
export async function cancelVoucher(voucherId: number): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_CANCEL}/${voucherId}/cancel`,
    "POST",
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from cancel voucher API.");
  return data;
}

/** Send a voucher for approval. */
export async function sendForApproval(voucherId: number): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_SEND_APPROVAL}/${voucherId}/send_for_approval`,
    "POST",
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from send for approval API.");
  return data;
}

/** Approve a voucher. */
export async function approveVoucher(voucherId: number): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_APPROVE}/${voucherId}/approve`,
    "POST",
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from approve voucher API.");
  return data;
}

/** Reject a voucher with a reason. */
export async function rejectVoucher(voucherId: number, reason: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_REJECT}/${voucherId}/reject`,
    "POST",
    { reason },
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reject voucher API.");
  return data;
}

/** Reopen a voucher. */
export async function reopenVoucher(voucherId: number): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_REOPEN}/${voucherId}/reopen`,
    "POST",
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reopen voucher API.");
  return data;
}

/** Reverse a voucher with a narration. */
export async function reverseVoucher(voucherId: number, narration: string): Promise<{ message: string; reverse_voucher_id?: number }> {
  const { data, error } = await fetchWithCookie<{ message: string; reverse_voucher_id?: number }>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_REVERSE}/${voucherId}/reverse`,
    "POST",
    { narration },
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reverse voucher API.");
  return data;
}

/** Settle outstanding bills against a voucher. */
export async function settleBills(
  voucherId: number,
  settlements: Array<BillSettlement>,
): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    `${apiRoutesPortalMasters.ACC_VOUCHER_SETTLE_BILLS}/${voucherId}/settle_bills`,
    "POST",
    { settlements },
  );

  if (error) throw new Error(error);
  return data ?? { message: "Bills settled." };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

/** Fetch trial balance report. */
export async function fetchTrialBalance(params: {
  coId: number;
  fromDate: string;
  toDate: string;
  branchId?: number;
}): Promise<TrialBalanceRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: TrialBalanceRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_TRIAL_BALANCE}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch profit & loss report. */
export async function fetchProfitLoss(params: {
  coId: number;
  fromDate: string;
  toDate: string;
  branchId?: number;
}): Promise<ProfitLossSection[]> {
  const query = buildQuery({
    co_id: params.coId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: ProfitLossSection[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_PROFIT_LOSS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch balance sheet report. */
export async function fetchBalanceSheet(params: {
  coId: number;
  asOnDate: string;
  branchId?: number;
}): Promise<BalanceSheetSection[]> {
  const query = buildQuery({
    co_id: params.coId,
    as_on_date: params.asOnDate,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: BalanceSheetSection[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_BALANCE_SHEET}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch ledger report for a specific ledger. */
export async function fetchLedgerReport(params: {
  coId: number;
  ledgerId: number;
  fromDate: string;
  toDate: string;
  branchId?: number;
}): Promise<LedgerReportRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    ledger_id: params.ledgerId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: LedgerReportRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_LEDGER}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch day book report. */
export async function fetchDayBook(params: {
  coId: number;
  fromDate: string;
  toDate: string;
  branchId?: number;
  voucherTypeId?: number;
}): Promise<DayBookRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_id: params.branchId,
    voucher_type_id: params.voucherTypeId,
  });
  const { data, error } = await fetchWithCookie<{ data: DayBookRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_DAY_BOOK}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch cash book report. */
export async function fetchCashBook(params: {
  coId: number;
  fromDate: string;
  toDate: string;
  branchId?: number;
}): Promise<CashBookRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: CashBookRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_CASH_BOOK}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch party outstanding report. */
export async function fetchPartyOutstanding(params: {
  coId: number;
  partyType?: string;
  branchId?: number;
}): Promise<PartyOutstandingRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    party_type: params.partyType,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: PartyOutstandingRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_PARTY_OUTSTANDING}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch ageing analysis report. */
export async function fetchAgeingAnalysis(params: {
  coId: number;
  partyType?: string;
  branchId?: number;
}): Promise<AgeingBucket[]> {
  const query = buildQuery({
    co_id: params.coId,
    party_type: params.partyType,
    branch_id: params.branchId,
  });
  const { data, error } = await fetchWithCookie<{ data: AgeingBucket[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_AGEING}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Fetch GST summary report. */
export async function fetchGstSummary(params: {
  coId: number;
  fromDate: string;
  toDate: string;
  branchGstin?: string;
}): Promise<GstSummaryRow[]> {
  const query = buildQuery({
    co_id: params.coId,
    from_date: params.fromDate,
    to_date: params.toDate,
    branch_gstin: params.branchGstin,
  });
  const { data, error } = await fetchWithCookie<{ data: GstSummaryRow[] }>(
    `${apiRoutesPortalMasters.ACC_REPORT_GST_SUMMARY}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

// ─── Opening Balance ─────────────────────────────────────────────────────────

/** Import opening bills for a financial year. */
export async function importOpeningBills(payload: ImportOpeningBillsRequest): Promise<{ message: string; imported_count?: number }> {
  const { data, error } = await fetchWithCookie<{ message: string; imported_count?: number }>(
    apiRoutesPortalMasters.ACC_OPENING_BILLS_IMPORT,
    "POST",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Opening bills imported." };
}

// ─── Company Settings & Posting Queue ────────────────────────────────────────

/** Fetch per-company accounting settings (posting modes, due-date rule, TDS). */
export async function fetchCompanySettings(coId: number): Promise<CompanySettings | null> {
  const query = buildQuery({ co_id: coId });
  const { data, error } = await fetchWithCookie<{ data: CompanySettings | null }>(
    `${apiRoutesPortalMasters.ACC_COMPANY_SETTINGS}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? null;
}

/** Update per-company accounting settings. */
export async function updateCompanySettings(payload: UpdateCompanySettingsRequest): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    apiRoutesPortalMasters.ACC_COMPANY_SETTINGS_UPDATE,
    "PUT",
    payload,
  );

  if (error) throw new Error(error);
  return data ?? { message: "Company settings updated." };
}

/** Fetch the auto-posting queue for a company, optionally filtered by status. */
export async function fetchPostingQueue(
  coId: number,
  status?: PostingQueueStatus,
): Promise<PostingQueueRow[]> {
  const query = buildQuery({ co_id: coId, status });
  const { data, error } = await fetchWithCookie<{ data: PostingQueueRow[] }>(
    `${apiRoutesPortalMasters.ACC_POSTING_QUEUE}?${query}`,
    "GET",
  );

  if (error) throw new Error(error);
  return data?.data ?? [];
}

/** Retry a failed/pending posting-queue entry. */
export async function retryPostingQueue(queueId: number): Promise<{ message: string }> {
  const { data, error } = await fetchWithCookie<{ message: string }>(
    `${apiRoutesPortalMasters.ACC_POSTING_QUEUE_RETRY}/${queueId}/retry`,
    "POST",
  );

  if (error) throw new Error(error);
  return data ?? { message: "Posting queue entry retried." };
}
