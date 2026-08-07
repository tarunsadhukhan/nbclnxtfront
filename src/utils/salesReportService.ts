import axios from "axios";
import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";

export interface FetchSalesJuteTallyParams {
  coId: number;
  branchId?: number | null;
  dateFrom: string;
  dateTo: string;
}

export interface SalesJuteMrSummaryRow {
  invoice_id: number;
  invoice_no: string;
  invoice_date: string | null;
  party_name: string | null;
  branch_name: string | null;
  vehicle_no: string | null;
  challan_no: string | null;
  mr_number: string | null;
  total_qty_kg: number | null;
  invoice_amount: number | null;
  claim_amount: number | null;
}

export async function fetchSalesJuteMrSummary(
  params: FetchSalesJuteTallyParams,
): Promise<SalesJuteMrSummaryRow[]> {
  const { coId, branchId, dateFrom, dateTo } = params;
  const qs = new URLSearchParams();
  qs.append("co_id", String(coId));
  if (branchId != null) qs.append("branch_id", String(branchId));
  qs.append("date_from", dateFrom);
  qs.append("date_to", dateTo);

  const url = `${apiRoutesPortalMasters.SALES_REPORT_JUTE_MR_SUMMARY}?${qs.toString()}`;
  const result = await fetchWithCookie<{ data: SalesJuteMrSummaryRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch sales jute MR summary");
  }
  return result.data.data ?? [];
}

export async function fetchSalesJuteTallyDownload(
  params: FetchSalesJuteTallyParams,
): Promise<Blob> {
  const { coId, branchId, dateFrom, dateTo } = params;
  const qs = new URLSearchParams();
  qs.append("co_id", String(coId));
  if (branchId != null) qs.append("branch_id", String(branchId));
  qs.append("date_from", dateFrom);
  qs.append("date_to", dateTo);

  const url = `${apiRoutesPortalMasters.SALES_REPORT_JUTE_TALLY_DOWNLOAD}?${qs.toString()}`;
  try {
    const response = await axios.get<Blob>(url, {
      responseType: "blob",
      withCredentials: true,
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text) as { detail?: string };
        throw new Error(parsed.detail ?? "Sales tally download failed");
      } catch {
        throw new Error("Sales tally download failed");
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// =============================================================================
// Sales Order list / Invoice list reports
// =============================================================================

export interface SalesReportListParams {
  coId: number;
  branchId?: number | null;
  dateFrom: string;
  dateTo: string;
}

export interface SalesOrderReportRow {
  sales_order_id: number;
  sales_no: number | null;
  sales_no_formatted: string;
  sales_order_date: string | null;
  branch_name: string;
  party_name: string;
  quotation_no: string;
  invoice_type: number | null;
  status_name: string;
  status_id: number | null;
  approval_level: number;
  gross_amount: number;
  net_amount: number;
}

export interface InvoiceReportRow {
  invoice_id: number;
  invoice_no: number | null;
  invoice_no_formatted: string;
  invoice_date: string | null;
  branch_name: string;
  party_name: string;
  invoice_type: number | null;
  status_name: string;
  status_id: number | null;
  approval_level: number;
  challan_no: string;
  challan_date: string | null;
  due_date: string | null;
  invoice_amount: number;
  tax_amount: number;
  tax_payable: number;
  round_off: number;
}

function buildListQs(params: SalesReportListParams): string {
  const { coId, branchId, dateFrom, dateTo } = params;
  const qs = new URLSearchParams();
  qs.append("co_id", String(coId));
  if (branchId != null) qs.append("branch_id", String(branchId));
  qs.append("date_from", dateFrom);
  qs.append("date_to", dateTo);
  return qs.toString();
}

async function fetchListBlob(
  url: string,
  errorPrefix: string,
): Promise<Blob> {
  try {
    const response = await axios.get<Blob>(url, {
      responseType: "blob",
      withCredentials: true,
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text) as { detail?: string };
        throw new Error(parsed.detail ?? `${errorPrefix} failed`);
      } catch {
        throw new Error(`${errorPrefix} failed`);
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function fetchSalesOrderListReport(
  params: SalesReportListParams,
): Promise<SalesOrderReportRow[]> {
  const url = `${apiRoutesPortalMasters.SALES_REPORT_SALES_ORDER_LIST}?${buildListQs(params)}`;
  const result = await fetchWithCookie<{ data: SalesOrderReportRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch sales order list");
  }
  return result.data.data ?? [];
}

export async function fetchSalesOrderListDownload(
  params: SalesReportListParams,
): Promise<Blob> {
  const url = `${apiRoutesPortalMasters.SALES_REPORT_SALES_ORDER_LIST_DOWNLOAD}?${buildListQs(params)}`;
  return fetchListBlob(url, "Sales order list download");
}

export async function fetchInvoiceListReport(
  params: SalesReportListParams,
): Promise<InvoiceReportRow[]> {
  const url = `${apiRoutesPortalMasters.SALES_REPORT_INVOICE_LIST}?${buildListQs(params)}`;
  const result = await fetchWithCookie<{ data: InvoiceReportRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch invoice list");
  }
  return result.data.data ?? [];
}

export async function fetchInvoiceListDownload(
  params: SalesReportListParams,
): Promise<Blob> {
  const url = `${apiRoutesPortalMasters.SALES_REPORT_INVOICE_LIST_DOWNLOAD}?${buildListQs(params)}`;
  return fetchListBlob(url, "Invoice list download");
}
