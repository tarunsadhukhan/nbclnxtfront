/**
 * Cash Hands Report Excel export — one workbook with the detail sheet and the
 * department/shift summary, mirroring the two sections of the legacy PDF.
 * Both sheets reuse the shared report sheet writer, so they carry the same
 * header block and styling as every other report export.
 */
import { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import {
  buildReportSheet,
  type ReportExportHeader,
  type Worksheet,
} from "@/components/reports/exportExcel";

export async function exportCashHandsWorkbook<
  TDetail extends GridValidRowModel,
  TSummary extends GridValidRowModel,
>(
  detailColumns: GridColDef<TDetail>[],
  detailRows: TDetail[],
  summaryColumns: GridColDef<TSummary>[],
  summaryRows: TSummary[],
  header: ReportExportHeader,
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  buildReportSheet(
    wb.addWorksheet("Cash Hands") as unknown as Worksheet,
    detailColumns,
    detailRows,
    header,
  );
  buildReportSheet(
    wb.addWorksheet("Summary") as unknown as Worksheet,
    summaryColumns,
    summaryRows,
    { ...header, reportName: "Cash Hands Summary" },
  );

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `cash-hands-report-${Date.now()}.xlsx`,
  );
}
