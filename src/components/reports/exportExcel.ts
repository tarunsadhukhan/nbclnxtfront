import { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import { reportTotalLevel } from "./ReportGrid";

/** Optional report header block prepended above the column headers in the sheet. */
export interface ReportExportHeader {
  companyName?: string | null;
  branchName?: string | null;
  reportName?: string | null;
  reportNo?: string | number | null;
  /** Period line, e.g. "2026-07-01 To 2026-07-14" or a single as-on date. */
  reportFor?: string | null;
}

export const HEADER_FILL = "FF5F7B14";
export const WHITE = "FFFFFFFF";
export const GRID_LINE = { style: "thin", color: { argb: "FF9E9E9E" } } as const;
export const HEADER_LINE = { style: "thin", color: { argb: WHITE } } as const;

/** Summary-row shading per level — same three shades the grid renders. */
const TOTAL_ROW_FILL = {
  grand: { bg: HEADER_FILL, text: WHITE },
  group: { bg: "FFAAC464", text: WHITE },
  sub: { bg: "FFE7EED3", text: "FF29351D" },
} as const;

/** Minimal structural view of an exceljs worksheet — lets callers that build
 * their own sheets share the helpers below without importing exceljs types. */
export type Worksheet = {
  addRow: (values: unknown[]) => {
    number: number;
    getCell: (i: number) => Record<string, unknown>;
    eachCell: (
      optsOrCb: unknown,
      cb?: (cell: Record<string, unknown>) => void,
    ) => void;
  };
  mergeCells: (r1: number, c1: number, r2: number, c2: number) => void;
  getColumn: (i: number) => Record<string, unknown>;
  views: unknown[];
};

/** Writes the centered Company / Branch / Report title block and returns
 * whether anything was written (callers add a spacer row after). */
export function writeReportHeaderBlock(
  ws: Worksheet,
  header: ReportExportHeader,
  width: number,
): boolean {
  const addCenteredRow = (value: string, size: number) => {
    const r = ws.addRow([value]);
    ws.mergeCells(r.number, 1, r.number, width);
    const cell = r.getCell(1);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { bold: true, size };
  };
  let wrote = false;
  if (header.companyName) {
    addCenteredRow(header.companyName, 14);
    wrote = true;
  }
  if (header.branchName) {
    addCenteredRow(`${header.branchName} (Branch)`, 12);
    wrote = true;
  }
  if (header.reportName) {
    let line = header.reportName;
    if (header.reportFor) line += ` For the Period ${header.reportFor}`;
    if (header.reportNo != null && header.reportNo !== "") {
      line += ` (Report No: ${header.reportNo})`;
    }
    addCenteredRow(line, 12);
    wrote = true;
  }
  return wrote;
}

/** Applies the green header-band styling to an already-added row. */
export function styleHeaderRow(row: {
  eachCell: (cb: (cell: Record<string, unknown>) => void) => void;
}): void {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = {
      top: GRID_LINE,
      bottom: GRID_LINE,
      left: HEADER_LINE,
      right: HEADER_LINE,
    };
  });
}

/**
 * Export grid rows to a styled .xlsx file using the grid's own column defs,
 * matching the on-screen report look: blue header band with white bold text,
 * borders on every cell, Total / Grand Total rows styled like the header, the
 * Item Description column 70 chars wide with wrapping, and other columns
 * auto-sized to content. Numbers stay numeric (2-decimal format for numeric
 * columns). When `header` is given, a report header block (Company / Branch /
 * Report / Report No / Report For) is written above the column headers.
 *
 * exceljs + file-saver are imported dynamically so the heavy spreadsheet lib is
 * loaded only when the user actually exports — it stays out of the page bundle.
 */
export async function exportRowsToExcel<T extends GridValidRowModel>(
  columns: GridColDef<T>[],
  rows: T[],
  fileNamePrefix = "jute-report",
  header?: ReportExportHeader,
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Report");
  buildReportSheet(ws as unknown as Worksheet, columns, rows, header);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileNamePrefix}-${Date.now()}.xlsx`,
  );
}

/**
 * Writes a complete styled report sheet: header block, blue column-header band,
 * bordered data rows, content-sized columns and a frozen header. Shared by
 * {@link exportRowsToExcel} and by pages that assemble multi-sheet workbooks.
 */
export function buildReportSheet<T extends GridValidRowModel>(
  ws: Worksheet,
  columns: GridColDef<T>[],
  rows: T[],
  header?: ReportExportHeader,
): void {
  // Report header block: each line merged across all report columns, centered.
  //   COMPANY NAME
  //   BranchName (Branch)
  //   ReportName For the Period <from> To <to> (Report No: N)
  if (header && writeReportHeaderBlock(ws, header, columns.length)) {
    ws.addRow([]); // blank spacer row before the column headers
  }

  const headerRow = ws.addRow(
    columns.map((c) => c.headerName ?? String(c.field)),
  );
  styleHeaderRow(headerRow);

  const leadField = String(columns[0]?.field ?? "");
  for (const row of rows) {
    const r = ws.addRow(
      columns.map(
        (c) => (row as Record<string, unknown>)[c.field as string] ?? "",
      ),
    );
    const level = reportTotalLevel(row, leadField);
    const style = level ? TOTAL_ROW_FILL[level] : null;
    r.eachCell({ includeEmpty: true }, (cell) => {
      const edge = style && level !== "sub" ? HEADER_LINE : GRID_LINE;
      cell.border = {
        top: GRID_LINE,
        bottom: GRID_LINE,
        left: edge,
        right: edge,
      };
      cell.alignment = { vertical: "top", wrapText: true };
      if (style) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: style.bg },
        };
        cell.font = { bold: true, color: { argb: style.text } };
      }
    });
  }

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    const name = c.headerName ?? String(c.field);
    if (/item description/i.test(name)) {
      col.width = 70;
    } else {
      const maxLen = Math.max(
        name.length,
        ...rows.map(
          (r) =>
            String((r as Record<string, unknown>)[c.field as string] ?? "")
              .length,
        ),
      );
      col.width = Math.min(Math.max(maxLen + 2, 10), 40);
    }
    if (c.type === "number") col.numFmt = "0.00";
  });

  // Freeze everything above the first data row so headers stay visible.
  ws.views = [{ state: "frozen", ySplit: headerRow.number }];
}
