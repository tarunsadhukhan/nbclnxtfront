/**
 * Excel and PDF exports of a processed wages period (legacy "WAGES REGISTER").
 * Rows come from GET wages_process_export (every paywages row of the period).
 * exceljs / jspdf are imported lazily so they stay out of the page bundle.
 */

export type RegisterRow = Record<string, string | number | null>;

export interface RegisterHeader {
  companyName: string;
  /** Period end date (YYYY-MM-DD) — printed as "FNE Date". */
  fneDate: string;
  periodName: string;
}

const num = (r: RegisterRow, k: string): number => Number(r[k] ?? 0) || 0;
const txt = (r: RegisterRow, k: string): string => String(r[k] ?? "").trim();
const f2 = (r: RegisterRow, k: string): string => num(r, k).toFixed(2);
const dmy = (iso: string) => iso.split("-").reverse().join("/");

/** Excel columns: [header, field, isNumber]. */
const EXCEL_COLUMNS: [string, string, boolean][] = [
  ["Rec No", "RecNo", false], ["EB No", "ECode", false], ["Name", "EName", false], ["Group", "EGroup", false],
  ["Dept", "DeptCode", false], ["TP", "TP", false], ["Work Day", "Work_Day", true], ["Work HR", "Work_HR", true],
  ["NS HR", "NS_HR", true], ["Holiday HR", "Holiday_HR", true], ["STL HR", "STL_HR", true],
  ["Fx Rate", "FBasic_Rate", true], ["DA Rate", "DA_Rate", true], ["Fx Basic", "FBasic_Amt", true],
  ["VBasic", "VBasic_Amt", true], ["DA", "DA_Amt", true], ["NS Amt", "NS_Amt", true],
  ["Holiday Amt", "Holiday_Amt", true], ["STL Amt", "STL_Amt", true], ["PF Adj", "PFEarnAdj", true],
  ["NPF Adj", "NPFEarnAdj", true], ["Misc Earn", "MiscEarn", true], ["Incentive", "Incentive_Amt", true],
  ["Atten Inc", "Atten_Amt", true], ["PF Gross", "PF_Gross", true], ["HRA", "HRA_Amt", true],
  ["Wages Gross", "Wages_Gross", true], ["PF", "PFEmployee", true], ["CoC", "CoC", true],
  ["Pension", "Pension", true], ["ESI", "ESI_Amt", true], ["PTax", "PTax_Amt", true], ["LWF", "LWF_Amt", true],
  ["HRD", "HRDeduction", true], ["STL Adv", "STLAdv", true], ["Advance", "Advance", true],
  ["Spl Advance", "SplAdvance", true], ["PF Loan Cap", "PFLoanCap", true], ["PF Loan Int", "PFLoanInt", true],
  ["Electricity", "Electricity", true], ["Total Deduction", "TotalDeduction", true], ["Net Pay", "NetPay", true],
  ["R.Off", "ROff", true], ["Net Payable", "NetPayable", true], ["YTD Days", "YTD_Days", true],
  ["YTD PF Gross", "YTD_PFGross", true], ["YTD PF", "YTD_PFEmployee", true], ["YTD Pension", "YTD_Pension", true],
];

export async function exportWagesExcel(rows: RegisterRow[], header: RegisterHeader): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import("exceljs"), import("file-saver")]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Wages Register");
  const width = EXCEL_COLUMNS.length;
  const centered = (value: string, size: number) => {
    const r = ws.addRow([value]);
    ws.mergeCells(r.number, 1, r.number, width);
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(1).font = { bold: true, size };
  };
  centered(header.companyName, 14);
  centered(`WAGES REGISTER - ${header.periodName}`, 11);
  centered(`FNE Date : ${dmy(header.fneDate)}`, 10);
  ws.addRow([]);

  const head = ws.addRow(EXCEL_COLUMNS.map(([h]) => h));
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A4E" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  for (const r of rows) {
    ws.addRow(EXCEL_COLUMNS.map(([, k, isNum]) => (isNum ? num(r, k) : txt(r, k))));
  }
  const first = head.number + 1;
  const last = ws.rowCount;
  const totals = ws.addRow(
    EXCEL_COLUMNS.map(([, k, isNum], i) => {
      if (i === 0) return "TOTAL";
      if (!isNum || ["FBasic_Rate", "DA_Rate"].includes(k)) return "";
      const col = ws.getColumn(i + 1).letter;
      return { formula: `SUM(${col}${first}:${col}${last})` };
    }),
  );
  totals.font = { bold: true };
  EXCEL_COLUMNS.forEach(([, , isNum], i) => {
    const col = ws.getColumn(i + 1);
    col.width = i === 2 ? 28 : i === 3 ? 22 : 12;
    if (isNum) col.numFmt = "#,##0.00";
  });
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: head.number }];

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `wages-register-${header.fneDate}.xlsx`,
  );
}

/**
 * The printed register: four text lines per worker over 15 columns. Each line is a list of
 * [label, value] cells, aligned so the label row above the block applies to the values below.
 */
type Cell = [label: string, value: (r: RegisterRow) => string];
const LINES: Cell[][] = [
  [
    ["REC-No", (r) => txt(r, "RecNo")], ["ECode", (r) => txt(r, "ECode")], ["NS HR", (r) => f2(r, "NS_HR")],
    ["VR BAS", (r) => f2(r, "VBasic_Amt")], ["NS_Amt", (r) => f2(r, "NS_Amt")], ["PF Adj", (r) => f2(r, "PFEarnAdj")],
    ["NPF Adj", (r) => f2(r, "NPFEarnAdj")], ["PFCont", (r) => f2(r, "PFEmployee")], ["HRA_Amt", (r) => f2(r, "HRA_Amt")],
    ["SET_Adv", (r) => f2(r, "STLAdv")], ["", () => ""], ["CPNC", (r) => f2(r, "CoC")],
    ["YTD_Days", (r) => f2(r, "YTD_Days")], ["YTD_PFGR", (r) => f2(r, "YTD_PFGross")], ["PFLN Bal", (r) => f2(r, "YTD_LoanAmt")],
  ],
  [
    ["EName", (r) => txt(r, "EName")], ["", () => ""], ["W.Day", (r) => f2(r, "Work_Day")],
    ["HOL HR", (r) => f2(r, "Holiday_HR")], ["Fx BAS", (r) => f2(r, "FBasic_Amt")], ["HOL Amt", (r) => f2(r, "Holiday_Amt")],
    ["MiscEarn", (r) => f2(r, "MiscEarn")], ["PTAX_Amt", (r) => f2(r, "PTax_Amt")], ["STLAdv", (r) => f2(r, "STL_Amt")],
    ["Advance", (r) => f2(r, "Advance")], ["", () => ""], ["NetPay", (r) => f2(r, "NetPay")],
    ["STL_Day", () => "0.00"], ["YTD_PF", (r) => f2(r, "YTD_PFEmployee")], ["Int_Bal", (r) => f2(r, "YTD_IntAmt")],
  ],
  [
    ["TP CAT GR P/F Q", (r) => `${txt(r, "TP")} ${txt(r, "C_P_Q")}`], ["", () => ""], ["W.HR", (r) => f2(r, "Work_HR")],
    ["Lost HR", (r) => f2(r, "Lost_HR")], ["Fx DA", (r) => f2(r, "DA_Amt")], ["Lost Amt", (r) => f2(r, "LostHR_Amt")],
    ["PF_Gross", (r) => f2(r, "PF_Gross")], ["Incen Amt", (r) => f2(r, "Incentive_Amt")], ["ESI_Amt", (r) => f2(r, "ESI_Amt")],
    ["PFLoan", (r) => (num(r, "PFLoanCap") + num(r, "PFLoanInt")).toFixed(2)], ["HandWg", () => "0.00"],
    ["Tot.Ded.", (r) => f2(r, "TotalDeduction")], ["ROff", (r) => f2(r, "ROff")], ["STL_Yr", () => "0.00"],
    ["YTD_Pension", (r) => f2(r, "YTD_Pension")],
  ],
  [
    ["Fx Rate", (r) => f2(r, "FBasic_Rate")], ["DA Rate", (r) => f2(r, "DA_Rate")], ["ESINo", () => ""],
    ["STL_HR", (r) => f2(r, "STL_HR")], ["Att Inc", (r) => f2(r, "Atten_Amt")], ["DEF_WG", () => "0.00"],
    ["HRD", (r) => f2(r, "HRDeduction")], ["WG Gross", (r) => f2(r, "Wages_Gross")], ["LWF_Amt", (r) => f2(r, "LWF_Amt")],
    ["PFL INT", (r) => f2(r, "PFLoanInt")], ["", () => ""], ["Misc.Ded", () => "0.00"],
    ["NetPayable", (r) => f2(r, "NetPayable")], ["", () => ""], ["YTD_COC", (r) => f2(r, "YTD_FPF")],
  ],
];

/** Name / code cells are left aligned, figures right aligned. */
const isLeft = (line: number, col: number) => (col === 0 && line !== 3) || (col === 1 && line === 0);

export async function exportWagesPdf(rows: RegisterRow[], header: RegisterHeader): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const cols = LINES[0].length;
  const colW = (pageW - margin * 2) / cols;
  const lineH = 3.1;
  const blockH = lineH * 4 + 2;
  const headH = lineH * 4 + 3;
  const top = 37;
  let page = 0;

  const xLeft = (c: number) => margin + c * colW + 0.5;
  const xRight = (c: number) => margin + (c + 1) * colW - 1;
  const put = (s: string, c: number, y: number, left: boolean, size = 6.5, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    // names / codes are left aligned, figures right aligned; clip long names to the column span
    const text = left ? doc.splitTextToSize(s, colW * 2 - 1)[0] ?? "" : s;
    doc.text(text, left ? xLeft(c) : xRight(c), y, { align: left ? "left" : "right" });
  };

  const drawHeader = () => {
    page += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("WAGES REGISTER", margin, 9);
    doc.setFontSize(11);
    doc.text(header.companyName.toUpperCase(), pageW / 2, 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`FNE Date : ${dmy(header.fneDate)}`, margin, 15);
    doc.text(`Page ${page}`, pageW - margin, 9, { align: "right" });
    LINES.forEach((line, li) => {
      line.forEach(([label], c) => put(label, c, top - headH + 3 + li * lineH, isLeft(li, c)));
    });
    doc.setLineWidth(0.2);
    doc.line(margin, top - headH - 1, pageW - margin, top - headH - 1);
    doc.line(margin, top - 1, pageW - margin, top - 1);
  };

  drawHeader();
  let y = top + 2;
  for (const r of rows) {
    if (y + blockH > pageH - 8) {
      doc.addPage();
      drawHeader();
      y = top + 2;
    }
    LINES.forEach((line, li) => {
      line.forEach(([, value], c) => {
        const big = li === 3 && c === 12;
        put(value(r), c, y + li * lineH, isLeft(li, c), big ? 8.5 : 6.5, big);
      });
    });
    doc.setLineWidth(0.1);
    doc.line(margin, y + lineH * 3 + 1.9, pageW - margin, y + lineH * 3 + 1.9);
    y += blockH;
  }
  doc.save(`wages-register-${header.fneDate}.pdf`);
}
