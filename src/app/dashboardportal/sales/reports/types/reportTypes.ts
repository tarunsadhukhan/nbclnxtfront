/** Branch option for the selector — matches sidebar context shape. */
export interface BranchOption {
  branch_id: number;
  branch_name: string;
}

export type ReportKey = "salesOrders" | "invoices";

export type {
  SalesOrderReportRow,
  InvoiceReportRow,
  SalesReportListParams,
} from "@/utils/salesReportService";
