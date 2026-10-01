import { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import { fmtNum, reportTotalLevel } from "./ReportGrid";
import type { ReportExportHeader } from "./exportExcel";

/** Summary-row shading per level — same three shades as the grid / sheet. */
const TOTAL_FILL = {
  grand: { bg: [95, 123, 20], text: [255, 255, 255] },
  group: { bg: [170, 196, 100], text: [255, 255, 255] },
  sub: { bg: [231, 238, 211], text: [41, 53, 29] },
} as const;

/**
 * Download the loaded report rows as a landscape A4 PDF using the grid's own
 * column defs: header block, header band, 2-decimal numeric columns and the
 * Total / Grand Total rows shaded like the grid. jsPDF is imported lazily.
 */
export async function exportRowsToPdf<T extends GridValidRowModel>(
  columns: GridColDef<T>[],
  rows: T[],
  fileNamePrefix: string,
  header: ReportExportHeader,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const mid = doc.internal.pageSize.getWidth() / 2;
  let y = 12;
  const line = (text: string | null | undefined, size: number) => {
    if (!text) return;
    doc.setFontSize(size);
    doc.text(text, mid, y, { align: "center" });
    y += size / 2;
  };
  line(header.companyName, 14);
  line(header.branchName ? `${header.branchName} (Branch)` : null, 11);
  let title = header.reportName ?? "";
  if (header.reportFor) title += ` For the Period ${header.reportFor}`;
  if (header.reportNo != null && header.reportNo !== "") {
    title += ` (Report No: ${header.reportNo})`;
  }
  line(title, 11);

  const leadField = String(columns[0]?.field ?? "");
  const levels = rows.map((r) => reportTotalLevel(r, leadField));

  autoTable(doc, {
    startY: y + 2,
    head: [columns.map((c) => c.headerName ?? String(c.field))],
    body: rows.map((r) =>
      columns.map((c) => {
        const v = (r as Record<string, unknown>)[c.field as string];
        return c.type === "number" ? fmtNum(v) : String(v ?? "");
      }),
    ),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [12, 60, 96], textColor: 255, fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.type === "number" ? "right" : "left" }]),
    ),
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const level = levels[data.row.index];
      if (!level) return;
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fillColor = [...TOTAL_FILL[level].bg];
      data.cell.styles.textColor = [...TOTAL_FILL[level].text];
    },
    margin: { left: 8, right: 8 },
  });

  doc.save(`${fileNamePrefix}-${Date.now()}.pdf`);
}
