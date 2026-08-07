import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  IndentItemwiseRow,
  PoItemwiseRow,
  SrItemwiseRow,
} from "@/app/dashboardportal/procurement/reports_1/types/reportTypes";

/**
 * Service for the procurement reports_1 hub. Calls the existing
 * /api/procurementReports/{indent,po,sr}-itemwise endpoints with a high `limit`
 * so the whole result set comes back in one page (the ReportPanel grid paginates
 * client-side). The endpoints return { data, total }; we hand back the array.
 */

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

/** Single-page cap — the endpoints accept up to 10000. */
const REPORT_LIMIT = 10000;
type OutstandingFilter = "outstanding" | "non_outstanding";

export interface ProcReportParams {
  coId: number;
  branchId: number | null;
  dateFrom: string;
  dateTo: string;
  search?: string;
}

function baseQs(p: ProcReportParams): URLSearchParams {
  const qs = new URLSearchParams();
  qs.append("co_id", String(p.coId));
  if (p.branchId != null) qs.append("branch_id", String(p.branchId));
  if (p.dateFrom) qs.append("date_from", p.dateFrom);
  if (p.dateTo) qs.append("date_to", p.dateTo);
  if (p.search) qs.append("search", p.search);
  qs.append("limit", String(REPORT_LIMIT));
  return qs;
}

export async function fetchProcIndentItemwise(
  p: ProcReportParams & {
    indentType?: string;
    outstandingFilter?: OutstandingFilter;
  },
): Promise<IndentItemwiseRow[]> {
  const qs = baseQs(p);
  if (p.indentType) qs.append("indent_type", p.indentType);
  if (p.outstandingFilter) qs.append("outstanding_filter", p.outstandingFilter);
  const url = `${apiRoutesPortalMasters.INDENT_ITEMWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<PaginatedResponse<IndentItemwiseRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch indent report");
  }
  return result.data.data ?? [];
}

export async function fetchProcPoItemwise(
  p: ProcReportParams & {
    poType?: string;
    outstandingFilter?: OutstandingFilter;
  },
): Promise<PoItemwiseRow[]> {
  const qs = baseQs(p);
  if (p.poType) qs.append("po_type", p.poType);
  if (p.outstandingFilter) qs.append("outstanding_filter", p.outstandingFilter);
  const url = `${apiRoutesPortalMasters.PO_ITEMWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<PaginatedResponse<PoItemwiseRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch PO report");
  }
  return result.data.data ?? [];
}

export async function fetchProcSrItemwise(
  p: ProcReportParams,
): Promise<SrItemwiseRow[]> {
  const qs = baseQs(p);
  const url = `${apiRoutesPortalMasters.SR_ITEMWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<PaginatedResponse<SrItemwiseRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch SR report");
  }
  return result.data.data ?? [];
}
