/**
 * Attendance Check List Excel export — one workbook with TWO sheets, matching
 * the legacy Data-Portal export (Reports_hrms::attendance_checklist):
 *
 *   1. "Attendance Check List" — the detail rows shown in the grid.
 *   2. "Hands Complement"      — hands per date/department/designation split by
 *                                shift (A/B/C) and by worker category, with a
 *                                total row per department and a grand total.
 *
 * The second sheet has a two-tier merged header ("Shift" over A/B/C/Total,
 * "Category" over the seven category columns), which the generic single-header
 * writer cannot express — so it is laid out here, reusing the shared styling.
 */
import { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import {
  BLUE,
  GRID_LINE,
  HEADER_LINE,
  WHITE,
  buildReportSheet,
  styleHeaderRow,
  writeReportHeaderBlock,
  type ReportExportHeader,
  type Worksheet,
} from "@/components/reports/exportExcel";
import type { HandsComplementRow } from "@/utils/hrmsReportService";
import { buildHandsPlan } from "./handsPlan";

const SHIFT_LABELS = ["A", "B", "C", "Total"];
const CATEGORY_LABELS = [
  "Permanent",
  "Budli",
  "Retired",
  "New Budli",
  "Contract",
  "Outsider",
  "Apprentice",
  "Total Hands",
];
/** Sl No, Attendance Date, Department, Designation + 4 shift + 8 category. */
const TOTAL_COLS = 4 + SHIFT_LABELS.length + CATEGORY_LABELS.length;
const COL_WIDTHS = [6, 14, 20, 30, ...Array(12).fill(11)];

/** Bordered row; `emphasis` styles it like the header band (subtotals/grand). */
function addBodyRow(ws: Worksheet, values: unknown[], emphasis: boolean): void {
  const r = ws.addRow(values);
  r.eachCell({ includeEmpty: true }, (cell: Record<string, unknown>) => {
    cell.border = {
      top: GRID_LINE,
      bottom: GRID_LINE,
      left: emphasis ? HEADER_LINE : GRID_LINE,
      right: emphasis ? HEADER_LINE : GRID_LINE,
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    if (emphasis) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.font = { bold: true, color: { argb: WHITE } };
    }
  });
}

/** Lays out the Hands Complement sheet, grouped by department with subtotals. */
function buildHandsSheet(
  ws: Worksheet,
  rows: HandsComplementRow[],
  header: ReportExportHeader,
): void {
  if (writeReportHeaderBlock(ws, header, TOTAL_COLS)) ws.addRow([]);

  // Two-tier header: "Shift" spans the 4 shift columns, "Category" the 8
  // category columns; the first four labels span both rows.
  const top = ws.addRow([
    "Sl No",
    "Attendance Date",
    "Department",
    "Designation",
    "Shift",
    "",
    "",
    "",
    "Category",
    ...Array(CATEGORY_LABELS.length - 1).fill(""),
  ]);
  const sub = ws.addRow(["", "", "", "", ...SHIFT_LABELS, ...CATEGORY_LABELS]);
  styleHeaderRow(top);
  styleHeaderRow(sub);
  for (let c = 1; c <= 4; c++) ws.mergeCells(top.number, c, sub.number, c);
  ws.mergeCells(top.number, 5, top.number, 8);
  ws.mergeCells(top.number, 9, top.number, TOTAL_COLS);

  for (const p of buildHandsPlan(rows)) {
    addBodyRow(
      ws,
      [p.sl, p.date, p.department, p.designation, ...p.values],
      p.kind !== "data",
    );
  }

  COL_WIDTHS.forEach((w, i) => {
    const col = ws.getColumn(i + 1);
    col.width = w;
    if (i >= 4) col.numFmt = "0.00";
  });
  ws.views = [{ state: "frozen", ySplit: sub.number }];
}

/**
 * Builds and downloads the two-sheet Attendance Check List workbook. exceljs
 * and file-saver are imported dynamically so the spreadsheet library stays out
 * of the page bundle until the user actually exports.
 */
export async function exportChecklistWorkbook<T extends GridValidRowModel>(
  columns: GridColDef<T>[],
  rows: T[],
  handsRows: HandsComplementRow[],
  fileNamePrefix: string,
  header: ReportExportHeader,
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  buildReportSheet(
    wb.addWorksheet("Attendance Check List") as unknown as Worksheet,
    columns,
    rows,
    header,
  );
  buildHandsSheet(
    wb.addWorksheet("Hands Complement") as unknown as Worksheet,
    handsRows,
    { ...header, reportName: "Hands Complement" },
  );

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileNamePrefix}-${Date.now()}.xlsx`,
  );
}
