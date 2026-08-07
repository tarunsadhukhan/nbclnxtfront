/**
 * Jute Issue specific TypeScript definitions.
 * Used across hooks, utils, and components.
 */

/**
 * Basic label/value tuple used across forms.
 */
export type Option = {
  label: string;
  value: string;
};

/**
 * Stock item from vw_jute_stock_outstanding view.
 * Represents available MR stock for issue.
 */
export type StockOutstandingItem = {
  jute_mr_li_id: number;
  jute_gate_entry_no?: number;
  warehouse_name?: string;
  branch_id: number;
  branch_mr_no: number;
  mr_num?: string;
  jute_mr_id: number;
  item_grp_id: number;
  jute_group_name: string;
  item_id: number;
  item_name: string;
  actual_qty: number;
  actual_weight: number;
  actual_rate: number;
  unit_conversion: string;
  balqty: number;
  balweight: number;
};

/**
 * Jute issue line item as returned from API.
 */
export type JuteIssueLineItem = {
  jute_issue_id: number;
  branch_id: number;
  branch_name: string;
  issue_date: string;
  status_id: number;
  status: string;
  jute_mr_li_id: number;
  jute_mr_id: number;
  jute_gate_entry_no?: number;
  branch_mr_no: number;
  mr_num?: string;
  item_grp_id?: number;
  jute_group_name?: string;
  item_id: number;
  item_name: string;
  yarn_type_id: number;
  yarn_type_name: string;
  quantity: number;
  weight: number;
  unit_conversion: string;
  actual_rate: number;
  issue_value: number;
  updated_by?: string;
  update_date_time?: string;
};

/**
 * Editable line item for UI (new or existing).
 */
export type EditableLineItem = {
  id: string; // UI-only row ID
  jute_issue_id?: number; // Backend ID (null for new)
  jute_mr_li_id: string;
  yarn_type_id: string;
  item_grp_id: string;
  item_id: string;
  quantity: string;
  weight: string;
  unit_conversion: string;
  actual_rate: number;
  issue_value: number;
  status_id?: number; // Item-level status for approval workflow
  // Display fields (from stock outstanding)
  jute_gate_entry_no?: number;
  branch_mr_no?: number;
  mr_num?: string;
  item_name?: string;
  jute_group_name?: string;
  balqty?: number;
  balweight?: number;
};

/**
 * Jute item (item_grp_id 2 or 3) option.
 */
export type JuteItemRecord = {
  item_grp_id: number;
  item_grp_desc: string;
  parent_grp_id?: number;
  parent_grp_name?: string;
};

/**
 * Yarn type option.
 */
export type YarnTypeRecord = {
  jute_yarn_type_id: number;
  jute_yarn_type_name: string;
};

/**
 * Branch option.
 */
export type BranchRecord = {
  branch_id: number;
  branch_name: string;
};

/**
 * Setup data returned from get_issue_create_setup.
 */
export type JuteIssueSetupData = {
  jute_groups: JuteItemRecord[];
  yarn_types: YarnTypeRecord[];
  branches: BranchRecord[];
};

/**
 * Summary data returned from get_issues_by_date.
 */
export type JuteIssueSummary = {
  total_entries: number;
  total_weight: number;
  total_value: number;
  total_qty: number;
  status: string;
  status_id: number;
};

/**
 * Page mode for the transaction page.
 */
export type JuteIssueMode = "create" | "edit" | "view";
