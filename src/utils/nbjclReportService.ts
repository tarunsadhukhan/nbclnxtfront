import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";

/**
 * Service for NBJCL Reports > Attendance Register (ports of the legacy Smart-Eye
 * Crystal reports). Backend: GET /api/hrmsReports/nbjcl/attendance-register/*
 * (src/hrms/nbjclAttendanceReports.py), tenant-scoped by subdomain.
 */

/** One report of the group, as the setup endpoint describes it. */
export interface NbjclReportMeta {
  title: string;
  /** "range" = From + To, "single" = one date. */
  dates: "range" | "single";
  /** Default period the page opens on. */
  span: "day" | "fortnight";
  /** The report's one filter (shift, department or main shift), if it has one. */
  extra: { label: string; options: { value: string; label: string }[] } | null;
}

/** Column of a report, sent with the rows because the date columns depend on the period. */
export interface NbjclReportColumn {
  field: string;
  headerName: string;
  type: "text" | "number";
  width: number;
}

/** A display row: detail, group header, "Total" or "Grand Total" — already in print order. */
export type NbjclReportRow = { id: number } & Record<string, string | number | null>;

/** Report list (keyed by the last segment of the menu path) with the branch's filter options. */
export async function fetchAttendanceRegisterSetup(
  branchId: number,
): Promise<Record<string, NbjclReportMeta>> {
  const url = `${apiRoutesPortalMasters.NBJCL_ATTENDANCE_REGISTER}/setup?branch_id=${branchId}`;
  const result = await fetchWithCookie<{ data: Record<string, NbjclReportMeta> }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to load the report list");
  }
  return result.data.data;
}

/** Rows and columns of one Attendance Register report. */
export async function fetchAttendanceRegisterReport(p: {
  report: string;
  branchId: number;
  dateFrom: string;
  dateTo: string;
  extra: string;
}): Promise<{ columns: NbjclReportColumn[]; data: NbjclReportRow[] }> {
  const qs = new URLSearchParams({ branch_id: String(p.branchId), date_to: p.dateTo });
  if (p.dateFrom) qs.set("date_from", p.dateFrom);
  if (p.extra) qs.set("extra", p.extra);
  const url = `${apiRoutesPortalMasters.NBJCL_ATTENDANCE_REGISTER}/${encodeURIComponent(p.report)}?${qs.toString()}`;
  const result = await fetchWithCookie<{ columns: NbjclReportColumn[]; data: NbjclReportRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to load the report");
  }
  return result.data;
}
