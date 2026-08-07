import { z } from "zod";
import { fetchWithCookie } from "./apiClient2";
import { apiRoutes } from "./api";

/**
 * Service for the dynamic report-menu tree used by report-type pages.
 *
 * Reports are stored in `menu_mst` (tenant DB) flagged `report = 1` and nested
 * via `menu_parent_id`. This fetches the report subtree that descends from a
 * given page (identified by its own `menu_path`) so a page can render a
 * menu -> submenu -> sub-submenu selector. Independent of the left sidebar.
 */

/** A single report-menu node returned by the backend (flat; nest via menu_parent_id). */
export const reportMenuNodeSchema = z.object({
  menu_id: z.number(),
  menu_name: z.string(),
  menu_path: z.string().nullable(),
  menu_parent_id: z.number().nullable(),
  order_by: z.number().nullable(),
});

export const reportMenuTreeResponseSchema = z.object({
  root_menu_id: z.number().nullable(),
  data: z.array(reportMenuNodeSchema),
});

export type ReportMenuNode = z.infer<typeof reportMenuNodeSchema>;
export type ReportMenuTreeResponse = z.infer<typeof reportMenuTreeResponseSchema>;

/**
 * Fetch the report-menu subtree for a page.
 *
 * @param rootPath The page's own menu_path (e.g. `"jutePurchase/reports"`).
 *                 May include or omit a leading `/dashboardportal` prefix; the
 *                 backend normalises it.
 * @returns The resolved root menu id (or null if the path matched no menu) and
 *          the flat list of `report = 1` descendant nodes.
 */
export async function fetchReportMenuTree(
  rootPath: string,
): Promise<ReportMenuTreeResponse> {
  const url = `${apiRoutes.REPORT_MENU_TREE}?root_path=${encodeURIComponent(rootPath)}`;
  const result = await fetchWithCookie<unknown>(url);
  if (result.error || result.data == null) {
    throw new Error(result.error ?? "Failed to fetch report menu");
  }
  return reportMenuTreeResponseSchema.parse(result.data);
}

// menu_path -> menu_id, resolved once per report page (used as the "Report No"
// in Excel export headers).
const menuIdCache = new Map<string, number | null>();

/** Resolve a report page's own menu_id from its route path. Cached; null when
 * the path matches no menu or the lookup fails (export proceeds without it). */
export async function resolveReportMenuId(
  path: string | null,
): Promise<number | null> {
  if (!path) return null;
  const cached = menuIdCache.get(path);
  if (cached !== undefined) return cached;
  try {
    const res = await fetchReportMenuTree(path);
    menuIdCache.set(path, res.root_menu_id);
    return res.root_menu_id;
  } catch {
    return null;
  }
}
