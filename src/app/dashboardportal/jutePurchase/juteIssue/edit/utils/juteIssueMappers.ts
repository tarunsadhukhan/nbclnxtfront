/**
 * Mapper functions for Jute Issue module.
 * Convert API responses to UI types.
 */

import type {
  JuteIssueLineItem,
  EditableLineItem,
  StockOutstandingItem,
  JuteItemRecord,
  YarnTypeRecord,
  BranchRecord,
  Option,
} from "../types/juteIssueTypes";
import { generateLineId, calculateIssueValue } from "./juteIssueFactories";

/**
 * Map API line items to editable line items.
 */
export const mapApiLineItemsToEditable = (
  items: JuteIssueLineItem[]
): EditableLineItem[] => {
  return items.map((item) => ({
    id: generateLineId(),
    jute_issue_id: item.jute_issue_id,
    jute_mr_li_id: String(item.jute_mr_li_id || ""),
    yarn_type_id: String(item.yarn_type_id || ""),
    item_grp_id: String(item.item_grp_id || ""),
    item_id: String(item.item_id || ""),
    quantity: String(item.quantity ?? ""),
    weight: String(item.weight ?? ""),
    unit_conversion: item.unit_conversion || "",
    actual_rate: item.actual_rate || 0,
    issue_value: item.issue_value || 0,
    status_id: item.status_id,
    jute_gate_entry_no: item.jute_gate_entry_no,
    branch_mr_no: item.branch_mr_no,
    mr_num: item.mr_num,
    item_name: item.item_name,
    jute_group_name: item.jute_group_name,
    balqty: undefined, // Will be populated from stock
    balweight: undefined,
  }));
};

/**
 * Map stock outstanding item to option for dropdown.
 */
export const mapStockToOption = (stock: StockOutstandingItem): Option => ({
  label: `GE ${stock.jute_gate_entry_no ?? "-"} - ${stock.item_name || "Unknown"} (Bal: ${stock.balqty?.toFixed(2) ?? 0} / ${stock.balweight?.toFixed(2) ?? 0} kg)`,
  value: String(stock.jute_mr_li_id),
});

/**
 * Map jute items to options.
 */
export const mapJuteItemsToOptions = (items: JuteItemRecord[]): Option[] =>
  items.map((item) => ({
    label: item.item_grp_desc,
    value: String(item.item_grp_id),
  }));

/**
 * Map yarn types to options.
 */
export const mapYarnTypesToOptions = (types: YarnTypeRecord[]): Option[] =>
  types.map((type) => ({
    label: type.jute_yarn_type_name,
    value: String(type.jute_yarn_type_id),
  }));

/**
 * Map branches to options.
 */
export const mapBranchesToOptions = (branches: BranchRecord[]): Option[] =>
  branches.map((branch) => ({
    label: branch.branch_name,
    value: String(branch.branch_id),
  }));

/**
 * Create editable line item from stock selection.
 */
export const createLineFromStock = (
  stock: StockOutstandingItem,
  yarnTypeId: string,
  quantity: number,
  weight: number
): EditableLineItem => {
  const issueValue = calculateIssueValue(weight, stock.actual_rate || 0);
  
  return {
    id: generateLineId(),
    jute_issue_id: undefined,
    jute_mr_li_id: String(stock.jute_mr_li_id),
    yarn_type_id: yarnTypeId,
    item_grp_id: String(stock.item_grp_id || ""),
    item_id: String(stock.item_id || ""),
    quantity: String(quantity),
    weight: String(weight),
    unit_conversion: stock.unit_conversion || "",
    actual_rate: stock.actual_rate || 0,
    issue_value: issueValue,
    branch_mr_no: stock.branch_mr_no,
    mr_num: stock.mr_num,
    jute_gate_entry_no: stock.jute_gate_entry_no,
    item_name: stock.item_name,
    jute_group_name: stock.jute_group_name,
    balqty: stock.balqty,
    balweight: stock.balweight,
  };
};

/**
 * Map editable line item to API create payload.
 */
export const mapEditableToCreatePayload = (
  line: EditableLineItem,
  branchId: number,
  issueDate: string
) => ({
  branch_id: branchId,
  issue_date: issueDate,
  jute_mr_li_id: Number(line.jute_mr_li_id),
  yarn_type_id: Number(line.yarn_type_id),
  item_id: Number(line.item_id),
  quantity: Number(line.quantity) || 0,
  weight: Number(line.weight) || 0,
  unit_conversion: line.unit_conversion || null,
});

/**
 * Build label map for lookups.
 */
export const buildLabelMap = <T>(
  items: T[],
  getId: (item: T) => string,
  getLabel: (item: T) => string
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[getId(item)] = getLabel(item);
  }
  return map;
};

/**
 * Create label resolver from a map.
 */
export const createLabelResolver =
  (map: Record<string, string>) =>
  (id: string): string =>
    map[id] || id || "";
