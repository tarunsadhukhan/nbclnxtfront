import * as XLSX from "xlsx";

/**
 * Build a single-sheet `.xlsx` workbook from an array of plain objects and
 * trigger a browser download. Column order follows each row object's key order.
 *
 * Client-side counterpart to {@link exportToCSV} for cases that need a genuine
 * Excel file rather than CSV.
 */
export function exportToXlsx<T extends object>(
  rows: T[],
  opts: { fileName?: string; sheetName?: string } = {},
): void {
  const { fileName = "export.xlsx", sheetName = "Sheet1" } = opts;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
