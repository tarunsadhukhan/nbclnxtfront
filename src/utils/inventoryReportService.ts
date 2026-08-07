import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";

/**
 * Service for inventory reports (Portal). Mirrors juteReportService.
 * Backend: GET /api/inventoryReports/* (tenant-scoped by subdomain).
 */

/** Row from GET /inventoryReports/inventory-stock (Stores Inventory List). */
export interface InventoryStockReportRow {
  item_id: number;
  item_code: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  opening_qty: number | null;
  opening_val: number | null;
  receipt_qty: number | null;
  receipt_val: number | null;
  issue_qty: number | null;
  issue_val: number | null;
  closing_qty: number | null;
  closing_val: number | null;
  last_receipt_date: string | null;
  last_issue_date: string | null;
  no_consumption_days: number | null;
}

interface InventoryStockReportResponse {
  data: InventoryStockReportRow[];
  total: number;
}

export interface InventoryStockReportParams {
  coId: number;
  dateFrom: string;
  dateTo: string;
  branchId?: number | null;
  itemGrpId?: number | null;
  search?: string;
}

/**
 * Fetch the stores inventory stock report (item-wise opening/receipt/issue/closing
 * over a date range). Pulls the full result in one page for the report grid.
 */
export async function fetchInventoryStockReport(
  p: InventoryStockReportParams,
): Promise<InventoryStockReportRow[]> {
  const qs = new URLSearchParams();
  qs.set("co_id", String(p.coId));
  qs.set("date_from", p.dateFrom);
  qs.set("date_to", p.dateTo);
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));
  if (p.itemGrpId != null) qs.set("item_grp_id", String(p.itemGrpId));
  if (p.search) qs.set("search", p.search);
  // ponytail: fetch all rows in one page (backend caps at 10000). Add server-side
  // paging here if a tenant ever exceeds that in a single report.
  qs.set("limit", "10000");

  const url = `${apiRoutesPortalMasters.INVENTORY_STOCK_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<InventoryStockReportResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch inventory stock report");
  }
  return result.data.data;
}

/** Row from GET /inventoryReports/issue-itemwise (item-wise material issues). */
export interface IssueItemwiseReportRow {
  issue_li_id: number;
  issue_id: number | null;
  issue_no: string | null;
  issue_date: string | null;
  branch_name: string | null;
  department: string | null;
  item_code: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  req_quantity: number | null;
  issue_qty: number | null;
  issue_value: number | null;
  sr_no: string | null;
  expense_type_name: string | null;
  cost_factor_name: string | null;
  machine_name: string | null;
  status_name: string | null;
}

interface IssueItemwiseReportResponse {
  data: IssueItemwiseReportRow[];
  total: number;
}

export interface IssueItemwiseReportParams {
  coId: number;
  branchId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  itemGrpId?: number | null;
  search?: string;
  /** Drill-down filters — the ids of the consumption-report row being opened. */
  deptId?: number | null;
  costFactorId?: number | null;
  itemId?: number | null;
}

/** Fetch the item-wise material issue report over an optional date range. */
export async function fetchIssueItemwiseReport(
  p: IssueItemwiseReportParams,
): Promise<IssueItemwiseReportRow[]> {
  const qs = new URLSearchParams();
  qs.set("co_id", String(p.coId));
  if (p.dateFrom) qs.set("date_from", p.dateFrom);
  if (p.dateTo) qs.set("date_to", p.dateTo);
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));
  if (p.itemGrpId != null) qs.set("item_grp_id", String(p.itemGrpId));
  if (p.search) qs.set("search", p.search);
  if (p.deptId != null) qs.set("dept_id", String(p.deptId));
  if (p.costFactorId != null) qs.set("cost_factor_id", String(p.costFactorId));
  if (p.itemId != null) qs.set("item_id", String(p.itemId));
  // ponytail: fetch all rows in one page (backend caps at 10000).
  qs.set("limit", "10000");

  const url = `${apiRoutesPortalMasters.ISSUE_ITEMWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<IssueItemwiseReportResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch issue item-wise report");
  }
  return result.data.data;
}

/** One movement row in the item ledger, with the running balance. */
export interface ItemLedgerRow {
  txn_date: string | null;
  txn_type: string;
  ref_no: string | null;
  in_qty: number;
  in_val: number;
  out_qty: number;
  out_val: number;
  balance: number;
  balance_val: number;
}

interface ItemLedgerResponse {
  opening_qty: number;
  opening_val: number;
  data: ItemLedgerRow[];
  total: number;
}

export interface ItemLedgerResult {
  openingQty: number;
  openingVal: number;
  rows: ItemLedgerRow[];
}

/**
 * Item ledger (quantity) for a single item: opening balance + each receipt/issue
 * with a running balance over a date range.
 */
export async function fetchItemLedgerReport(p: {
  coId: number;
  itemId: number;
  dateFrom: string;
  dateTo: string;
  branchId?: number | null;
}): Promise<ItemLedgerResult> {
  const qs = new URLSearchParams();
  qs.set("co_id", String(p.coId));
  qs.set("item_id", String(p.itemId));
  qs.set("date_from", p.dateFrom);
  qs.set("date_to", p.dateTo);
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));

  const url = `${apiRoutesPortalMasters.ITEM_LEDGER_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<ItemLedgerResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch item ledger");
  }
  return {
    openingQty: result.data.opening_qty,
    openingVal: result.data.opening_val,
    rows: result.data.data,
  };
}

/** Row from GET /inventoryReports/inventory-minmax. */
export interface InventoryMinMaxRow {
  item_id: number;
  item_code: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  min_qty: number | null;
  max_qty: number | null;
  reorder_qty: number | null;
  lead_time: number | null;
  current_qty: number;
  pending_indent_qty: number | null;
  pending_po_qty: number | null;
  qty_to_be_ordered: number | null;
  status: string;
}

/** Stores min-max report: levels + current stock as of dateTo (branch required). */
export async function fetchInventoryMinMax(p: {
  coId: number;
  branchId: number;
  dateTo: string;
  itemGrpId?: number | null;
  search?: string;
}): Promise<InventoryMinMaxRow[]> {
  const qs = new URLSearchParams();
  qs.set("co_id", String(p.coId));
  qs.set("branch_id", String(p.branchId));
  qs.set("date_to", p.dateTo);
  if (p.itemGrpId != null) qs.set("item_grp_id", String(p.itemGrpId));
  if (p.search) qs.set("search", p.search);
  const url = `${apiRoutesPortalMasters.INVENTORY_MINMAX_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<{ data: InventoryMinMaxRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch min-max report");
  }
  return result.data.data;
}

/** A month-wise row: fixed item fields + one numeric key per YYYY-MM month. */
export type ItemMonthwiseRow = Record<string, unknown> & { item_id: number };

export interface ItemMonthwiseResult {
  /** Ordered YYYY-MM columns present in the report. */
  months: string[];
  data: ItemMonthwiseRow[];
}

/** Item month-wise consumption pivot (issue qty per month + Total/Months/Avg). */
export async function fetchItemMonthwise(p: {
  coId: number;
  dateFrom: string;
  dateTo: string;
  branchId?: number | null;
}): Promise<ItemMonthwiseResult> {
  const qs = new URLSearchParams();
  qs.set("co_id", String(p.coId));
  qs.set("date_from", p.dateFrom);
  qs.set("date_to", p.dateTo);
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));
  const url = `${apiRoutesPortalMasters.ITEM_MONTHWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<ItemMonthwiseResult>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch month-wise report");
  }
  return result.data;
}

/**
 * Issue consumption value pivoted into expense categories, grouped by dimension.
 * Leading key fields (department / cost_factor / item_group) vary by dimension.
 */
export interface ConsumptionRow {
  id: number;
  department?: string | null;
  cost_factor?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  item_group_code?: string | null;
  item_group?: string | null;
  /** Ids carried for the row drill-down; absent on the Grand Total row. */
  dept_id?: number | null;
  cost_factor_id?: number | null;
  item_id?: number | null;
  production: number;
  overhauling: number;
  maintenance: number;
  capital: number;
  general: number;
  /** Value on issue lines with no (or an unrecognised) expense type. */
  others: number;
  total: number;
}

export type ConsumptionDimension =
  | "dept"
  | "dept_cost"
  | "dept_cost_item"
  | "item_group";

export async function fetchIssueConsumption(
  dimension: ConsumptionDimension,
  p: {
    coId: number;
    branchId: number;
    dateFrom: string;
    dateTo: string;
    /** Item code prefix — "172" lists every code starting 172 (IS01 filter). */
    itemCode?: string;
  },
): Promise<ConsumptionRow[]> {
  const qs = new URLSearchParams({
    dimension,
    co_id: String(p.coId),
    date_from: p.dateFrom,
    date_to: p.dateTo,
  });
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));
  if (p.itemCode?.trim()) qs.set("item_code", p.itemCode.trim());
  const url = `${apiRoutesPortalMasters.ISSUE_CONSUMPTION_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<{ data: Omit<ConsumptionRow, "id">[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch consumption report");
  }
  return result.data.data.map((r, i) => ({ id: i, ...r }));
}

/** Machine-wise item consumption row (IS05). */
export interface IssueMachinewiseRow {
  id: number;
  machine_name: string | null;
  department: string | null;
  item_code: string | null;
  item_grp_name: string | null;
  item_name: string | null;
  uom_name: string | null;
  expense_type_name: string | null;
  issue_qty: number;
  issue_value: number;
}

export async function fetchIssueMachinewise(p: {
  coId: number;
  branchId: number;
  dateFrom: string;
  dateTo: string;
}): Promise<IssueMachinewiseRow[]> {
  const qs = new URLSearchParams({
    co_id: String(p.coId),
    date_from: p.dateFrom,
    date_to: p.dateTo,
  });
  if (p.branchId != null) qs.set("branch_id", String(p.branchId));
  const url = `${apiRoutesPortalMasters.ISSUE_MACHINEWISE_REPORT}?${qs.toString()}`;
  const result = await fetchWithCookie<{ data: IssueMachinewiseRow[] }>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch machine-wise report");
  }
  return result.data.data;
}

/** Minimal item shape for the ledger's item picker. */
export interface ItemOption {
  item_id: number;
  item_name: string;
  full_item_code: string | null;
  uom_name: string | null;
}

interface ItemSearchResponse {
  data: ItemOption[];
}

/** Searchable item list (max 30) for the item-ledger picker. */
export async function searchItems(
  coId: number,
  search: string,
): Promise<ItemOption[]> {
  const qs = new URLSearchParams({ co_id: String(coId), limit: "30" });
  if (search) qs.set("search", search);
  const url = `${apiRoutesPortalMasters.ITEM_SEARCH}?${qs.toString()}`;
  const result = await fetchWithCookie<ItemSearchResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to search items");
  }
  return result.data.data;
}
