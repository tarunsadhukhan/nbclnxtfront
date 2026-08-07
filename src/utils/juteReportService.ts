import axios from "axios";
import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  JuteStockReportRow,
  JuteQtyWiseReportRow,
  JuteWithValueRow,
  JuteTxnSummaryRow,
  JutePeriodWiseRow,
  JuteMrInStockRow,
  JuteMrWiseRow,
  JuteGodownWiseRow,
  JutePercentClaimsRow,
  JuteMukhamMoistureRow,
  BatchCostReportRow,
  MrListReportRow,
  PaginatedReportApiResponse,
  ReportApiResponse,
} from "@/app/dashboardportal/jutePurchase/reports/types/reportTypes";

export async function fetchJuteStockReport(
  branchId: number,
  date: string,
): Promise<JuteStockReportRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_STOCK}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteStockReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute stock report");
  }
  return result.data.data;
}

export async function fetchBatchCostReport(
  branchId: number,
  date: string,
): Promise<BatchCostReportRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_BATCH_COST}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<BatchCostReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch batch cost report");
  }
  return result.data.data;
}

export async function fetchJuteQtyWiseReport(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<JuteQtyWiseReportRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    date_from: dateFrom,
    date_to: dateTo,
  });
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_QTY_WISE}?${qs.toString()}`;
  const result =
    await fetchWithCookie<ReportApiResponse<JuteQtyWiseReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute quantity wise report");
  }
  return result.data.data;
}

function dateRangeUrl(
  route: string,
  branchId: number,
  dateFrom: string,
  dateTo: string,
): string {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    date_from: dateFrom,
    date_to: dateTo,
  });
  return `${route}?${qs.toString()}`;
}

export function fetchJutePercentClaims(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<JutePercentClaimsRow[]> {
  const url = dateRangeUrl(
    apiRoutesPortalMasters.JUTE_REPORT_PERCENT_CLAIMS,
    branchId,
    dateFrom,
    dateTo,
  );
  return fetchBranchReport<JutePercentClaimsRow>(
    url,
    "Failed to fetch percent claims report",
  );
}

export function fetchJuteMukhamMoisture(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<JuteMukhamMoistureRow[]> {
  const url = dateRangeUrl(
    apiRoutesPortalMasters.JUTE_REPORT_MUKHAM_MOISTURE,
    branchId,
    dateFrom,
    dateTo,
  );
  return fetchBranchReport<JuteMukhamMoistureRow>(
    url,
    "Failed to fetch mukham moisture report",
  );
}

export async function fetchJuteWithValue(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<JuteWithValueRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    date_from: dateFrom,
    date_to: dateTo,
  });
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_WITH_VALUE}?${qs.toString()}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteWithValueRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute with value report");
  }
  return result.data.data;
}

export async function fetchJuteTxnSummary(
  branchId: number,
  dateFrom: string,
  dateTo: string,
  type: "R" | "I" | "ALL" = "ALL",
  search?: string,
): Promise<JuteTxnSummaryRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    date_from: dateFrom,
    date_to: dateTo,
    type,
  });
  if (search) qs.append("search", search);
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_TXN_SUMMARY}?${qs.toString()}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteTxnSummaryRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch issue/receipt summary");
  }
  return result.data.data;
}

export async function fetchJutePeriodWise(
  branchId: number,
  dateFrom: string,
  dateTo: string,
  period: "month" | "day",
): Promise<JutePeriodWiseRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    date_from: dateFrom,
    date_to: dateTo,
    period,
  });
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_PERIOD_WISE}?${qs.toString()}`;
  const result = await fetchWithCookie<ReportApiResponse<JutePeriodWiseRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch period wise report");
  }
  return result.data.data;
}

/** Cluster B reports are current-position, branch-scoped only (no date). */
async function fetchBranchReport<T>(
  url: string,
  errMsg: string,
): Promise<T[]> {
  const result = await fetchWithCookie<ReportApiResponse<T>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? errMsg);
  }
  return result.data.data;
}

export function fetchJuteMrInStock(branchId: number): Promise<JuteMrInStockRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_MR_IN_STOCK}?branch_id=${branchId}`;
  return fetchBranchReport<JuteMrInStockRow>(url, "Failed to fetch MR in stock report");
}

export function fetchJuteMrWise(branchId: number): Promise<JuteMrWiseRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_MR_WISE}?branch_id=${branchId}`;
  return fetchBranchReport<JuteMrWiseRow>(url, "Failed to fetch MR wise report");
}

export function fetchJuteGodownWise(branchId: number): Promise<JuteGodownWiseRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_GODOWN_WISE}?branch_id=${branchId}`;
  return fetchBranchReport<JuteGodownWiseRow>(url, "Failed to fetch godown wise report");
}

export interface FetchMrListParams {
  coId: number;
  branchId: number | null;
  dateFrom: string;
  dateTo: string;
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchMrListReport(
  params: FetchMrListParams,
): Promise<{ data: MrListReportRow[]; total: number }> {
  const { coId, branchId, dateFrom, dateTo, page, limit, search } = params;
  const qs = new URLSearchParams();
  qs.append("co_id", String(coId));
  if (branchId != null) qs.append("branch_id", String(branchId));
  qs.append("date_from", dateFrom);
  qs.append("date_to", dateTo);
  if (page != null) qs.append("page", String(page));
  if (limit != null) qs.append("limit", String(limit));
  if (search) qs.append("search", search);

  const url = `${apiRoutesPortalMasters.JUTE_REPORT_MR_LIST}?${qs.toString()}`;
  const result = await fetchWithCookie<PaginatedReportApiResponse<MrListReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch MR list report");
  }
  return {
    data: result.data.data ?? [],
    total: result.data.total ?? 0,
  };
}

export interface FetchJuteTallyDownloadParams {
  coId: number;
  branchId: number | null;
  dateFrom: string;
  dateTo: string;
}

export async function fetchJuteTallyDownload(
  params: FetchJuteTallyDownloadParams,
): Promise<Blob> {
  const { coId, branchId, dateFrom, dateTo } = params;
  const qs = new URLSearchParams();
  qs.append("co_id", String(coId));
  if (branchId != null) qs.append("branch_id", String(branchId));
  qs.append("date_from", dateFrom);
  qs.append("date_to", dateTo);

  const url = `${apiRoutesPortalMasters.JUTE_REPORT_TALLY_DOWNLOAD}?${qs.toString()}`;
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
        throw new Error(parsed.detail ?? "Tally download failed");
      } catch {
        throw new Error("Tally download failed");
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}
