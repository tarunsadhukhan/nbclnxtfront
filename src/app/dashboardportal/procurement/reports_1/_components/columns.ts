import { GridColDef } from "@mui/x-data-grid";
import { numCol } from "@/components/reports/ReportGrid";
import type {
  IndentItemwiseRow,
  PoItemwiseRow,
  SrItemwiseRow,
} from "../types/reportTypes";

/** Column sets shared across the procurement reports_1 pages (one per endpoint). */

export const INDENT_COLUMNS: GridColDef<IndentItemwiseRow>[] = [
  { field: "indent_no", headerName: "Indent No", width: 200 },
  { field: "indent_date", headerName: "Indent Date", width: 110 },
  { field: "branch_name", headerName: "Branch", width: 140 },
  { field: "item_name", headerName: "Item", flex: 1, minWidth: 160 },
  { field: "item_grp_name", headerName: "Item Group", width: 150 },
  { field: "uom_name", headerName: "UOM", width: 90 },
  numCol("indent_qty", "Indent Qty"),
  numCol("po_consumed_qty", "PO Consumed", 130),
  numCol("outstanding_qty", "Outstanding", 130),
  { field: "indent_type_id", headerName: "Type", width: 100 },
  { field: "expense_type_name", headerName: "Expense Type", width: 140 },
  { field: "status_name", headerName: "Status", width: 130 },
];

export const PO_COLUMNS: GridColDef<PoItemwiseRow>[] = [
  { field: "po_no", headerName: "PO No", width: 200 },
  { field: "po_date", headerName: "PO Date", width: 110 },
  { field: "branch_name", headerName: "Branch", width: 140 },
  { field: "supplier_name", headerName: "Supplier", flex: 1, minWidth: 160 },
  { field: "item_name", headerName: "Item", flex: 1, minWidth: 160 },
  { field: "item_grp_name", headerName: "Item Group", width: 150 },
  { field: "uom_name", headerName: "UOM", width: 90 },
  numCol("po_qty", "PO Qty"),
  numCol("rate", "Rate"),
  numCol("inward_consumed_qty", "Inward Consumed", 150),
  numCol("outstanding_qty", "Outstanding", 130),
  { field: "po_type", headerName: "PO Type", width: 100 },
  { field: "expense_type_name", headerName: "Expense Type", width: 140 },
  { field: "status_name", headerName: "Status", width: 130 },
];

export const SR_COLUMNS: GridColDef<SrItemwiseRow>[] = [
  { field: "inward_no", headerName: "GRN No", width: 200 },
  { field: "inward_date", headerName: "GRN Date", width: 110 },
  { field: "branch_name", headerName: "Branch", width: 140 },
  { field: "supplier_name", headerName: "Supplier", flex: 1, minWidth: 160 },
  { field: "item_name", headerName: "Item", flex: 1, minWidth: 160 },
  { field: "item_grp_name", headerName: "Item Group", width: 150 },
  { field: "uom_name", headerName: "UOM", width: 90 },
  numCol("approved_qty", "Approved Qty", 130),
  numCol("rejected_qty", "Rejected Qty", 130),
  numCol("rate", "Rate"),
  numCol("amount", "Amount", 140),
  { field: "status_name", headerName: "Status", width: 130 },
];

export const indentRowId = (r: IndentItemwiseRow) => r.indent_dtl_id;
export const poRowId = (r: PoItemwiseRow) => r.po_dtl_id;
export const srRowId = (r: SrItemwiseRow) => r.inward_dtl_id;
