/**
 * Bill Pass Service
 *
 * API service functions for Bill Pass (payment consolidation) module.
 * Bill Pass consolidates SR and DRCR Notes for final payment.
 * Editable until marked complete (billpass_status = 1).
 */

import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";

// =============================================================================
// TYPES
// =============================================================================

/** Bill Pass list item */
export type BillPassListItem = {
  id: number;
  inward_id: number;
  bill_pass_no: string;
  bill_pass_date: string | null;
  inward_no: string;
  inward_date: string | null;
  supplier_id: number | null;
  supplier_name: string;
  invoice_date: string | null;
  branch_name: string;
  sr_status_name: string;
  billpass_status: number; // 0 = editable, 1 = complete
  // Totals
  sr_total: number;
  sr_taxable: number;
  sr_tax: number;
  dr_total: number;
  dr_count: number;
  cr_total: number;
  cr_count: number;
  net_payable: number;
};

/** Bill Pass list response */
export type BillPassListResponse = {
  data: BillPassListItem[];
  total: number;
  page: number;
  page_size: number;
};

/** SR Line item in Bill Pass detail */
export type BillPassSRLine = {
  inward_dtl_id: number;
  po_no: string;
  item_id: number;
  item_name: string;
  item_code: string;
  full_item_code?: string;
  hsn_code?: string;
  item_group_name: string;
  accepted_make_name: string;
  uom_name: string;
  approved_qty: number;
  po_rate: number;
  accepted_rate: number;
  line_amount: number;
  discount_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  tax_amount: number;
  line_total: number;
};

/** DRCR Note line item in Bill Pass detail */
export type BillPassDRCRLine = {
  drcr_note_dtl_id: number;
  inward_dtl_id: number;
  po_no: string;
  adjustment_reason: string;
  debitnote_type: number;
  quantity: number;
  rate: number;
  discount_amount: number;
  line_amount: number;
  item_name: string;
  item_code: string;
};

/** DRCR Note in Bill Pass detail */
export type BillPassDRCRNote = {
  drcr_note_id: number;
  note_date: string | null;
  note_type: number;
  note_type_name: string;
  remarks: string;
  gross_amount: number;
  net_amount: number;
  status_name: string;
  line_count: number;
  lines: BillPassDRCRLine[];
};

/** Additional charge row inherited from SR (proc_inward_additional). Read-only on Bill Pass. */
export type BillPassAdditionalCharge = {
  proc_inward_additional_id: number;
  additional_charges_id: number;
  additional_charges_name: string;
  qty: number;
  rate: number;
  net_amount: number;
  remarks: string;
  tax_pct: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
};

/** Bill Pass summary totals */
export type BillPassSummary = {
  sr_taxable: number;
  sr_cgst: number;
  sr_sgst: number;
  sr_igst: number;
  sr_tax: number;
  sr_total: number;
  sr_line_count: number;
  dr_total: number;
  dr_count: number;
  cr_total: number;
  cr_count: number;
  additional_net: number;
  additional_cgst: number;
  additional_sgst: number;
  additional_igst: number;
  additional_tax: number;
  additional_total: number;
  additional_count: number;
  net_payable: number;
};

/** Bill Pass detail response */
export type BillPassDetail = {
  inward_id: number;
  bill_pass_no: string;
  bill_pass_date: string | null;
  inward_no: string;
  inward_date: string | null;
  supplier_id: number | null;
  supplier_name: string;
  invoice_no: string;
  invoice_date: string | null;
  invoice_amount: number;
  invoice_recvd_date: string | null;
  invoice_due_date: string | null;
  branch_id?: number | null;
  branch_name: string;
  sr_status_name: string;
  sr_remarks: string;
  challan_no: string;
  challan_date: string | null;
  round_off_value: number;
  billpass_status: number; // 0 = editable, 1 = complete
  summary: BillPassSummary;
  sr_lines: BillPassSRLine[];
  debit_notes: BillPassDRCRNote[];
  credit_notes: BillPassDRCRNote[];
  additional_charges: BillPassAdditionalCharge[];
};

/** Bill Pass update payload */
export type BillPassUpdatePayload = {
  invoice_no?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | null;
  invoice_recvd_date?: string | null;
  invoice_due_date?: string | null;
  round_off_value?: number | null;
  sr_remarks?: string | null;
  bill_pass_complete?: number; // 1 = complete
};

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch paginated list of Bill Pass entries.
 * Bill Pass shows approved SRs with computed DRCR adjustments.
 */
export async function fetchBillPassList(
  coId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<{ data: BillPassListResponse | null; error: string | null }> {
  const { page = 1, limit = 10, search } = params;

  const queryParams = new URLSearchParams();
  queryParams.append("co_id", coId);
  queryParams.append("page", String(page));
  queryParams.append("limit", String(limit));
  if (search) {
    queryParams.append("search", search);
  }

  const url = `${apiRoutesPortalMasters.BILL_PASS_LIST}?${queryParams.toString()}`;
  return fetchWithCookie(url, "GET");
}

/**
 * Fetch Bill Pass detail by inward_id.
 * Returns full detail with SR lines and DRCR notes.
 */
export async function fetchBillPassById(
  inwardId: number | string
): Promise<{ data: BillPassDetail | null; error: string | null }> {
  const url = `${apiRoutesPortalMasters.BILL_PASS_GET_BY_ID}/${inwardId}`;
  return fetchWithCookie(url, "GET");
}

/**
 * Update Bill Pass fields (invoice details, remarks).
 * Set bill_pass_complete = 1 to finalize.
 */
export async function updateBillPass(
  inwardId: number | string,
  payload: BillPassUpdatePayload
): Promise<{ data: { message: string; inward_id: number; billpass_status: number } | null; error: string | null }> {
  const url = `${apiRoutesPortalMasters.BILL_PASS_UPDATE}/${inwardId}`;
  return fetchWithCookie(url, "PUT", payload);
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format amount as Indian currency.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "\u20B9 0.00";
  return `\u20B9 ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date string to display format.
 */
export function formatBillPassDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const trimmed = dateStr.trim();
    const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    let d: Date | null = null;
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      d = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    if (!d || Number.isNaN(d.getTime())) return trimmed;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Build a map of inward_dtl_id -> DRCR adjustment lines from debit/credit notes.
 * Used to display inline DR/CR adjustments per SR line item.
 */
export function buildDrcrLinesByInwardDtl(
  debitNotes: BillPassDRCRNote[],
  creditNotes: BillPassDRCRNote[]
): Map<number, (BillPassDRCRLine & { note_type: number; note_type_name: string })[]> {
  const map = new Map<number, (BillPassDRCRLine & { note_type: number; note_type_name: string })[]>();

  for (const note of [...debitNotes, ...creditNotes]) {
    for (const line of note.lines) {
      const key = line.inward_dtl_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push({
        ...line,
        note_type: note.note_type,
        note_type_name: note.note_type_name,
      });
    }
  }

  return map;
}
