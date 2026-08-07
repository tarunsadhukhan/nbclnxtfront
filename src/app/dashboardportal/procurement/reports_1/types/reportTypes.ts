/**
 * Row shapes for the procurement reports_1 hub. These mirror the response dicts
 * built by `vowerp3be/src/procurement/reports.py` (`_format_indent_row` /
 * `_format_po_row` / `_format_sr_row`).
 */

/** Row from GET /api/procurementReports/indent-itemwise */
export interface IndentItemwiseRow {
  indent_dtl_id: number;
  indent_id: number;
  indent_no: string;
  indent_date: string | null;
  branch_name: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  indent_qty: number | null;
  po_consumed_qty: number | null;
  outstanding_qty: number | null;
  indent_type_id: string | number | null;
  expense_type_name: string | null;
  status_name: string | null;
}

/** Row from GET /api/procurementReports/po-itemwise */
export interface PoItemwiseRow {
  po_dtl_id: number;
  po_id: number;
  po_no: string;
  po_date: string | null;
  branch_name: string | null;
  supplier_name: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  po_qty: number | null;
  rate: number | null;
  inward_consumed_qty: number | null;
  outstanding_qty: number | null;
  po_type: string | null;
  expense_type_name: string | null;
  status_name: string | null;
}

/** Row from GET /api/procurementReports/sr-itemwise */
export interface SrItemwiseRow {
  inward_dtl_id: number;
  inward_id: number;
  inward_no: string;
  inward_date: string | null;
  branch_name: string | null;
  supplier_name: string | null;
  item_name: string | null;
  item_grp_name: string | null;
  uom_name: string | null;
  approved_qty: number | null;
  rejected_qty: number | null;
  rate: number | null;
  amount: number | null;
  status_name: string | null;
}
