/**
 * Winsome pay slip PDFs — the legacy Crystal reports WagesPaySlip_WIL.rpt ("wages") and
 * WagesPaySlip_OT_WIL.rpt ("ot") redrawn with jsPDF. Positions are each report's own object coordinates
 * in twips (1 mm = 56.7 twips), landscape A4. Slips are the loaded rows of Winsome Reports > Wages PaySlip /
 * Wages PaySlip [ OT ] (pyhback src/hrms/winsomereports/wages.py _slip: legacy PayWages columns +
 * PFNo/ESINo/UAN/dept), one row per slip.
 */
type Slip = Record<string, unknown>;
export type PayslipLayout = "wages" | "ot";

export interface PayslipJob {
  layout: PayslipLayout;
  filename: string;
  slips: Slip[];
  /** Report From / To (YYYY-MM-DD), printed on every slip like the legacy form's dates. */
  fromDate: string;
  toDate: string;
  company: string;
}
type Fmt = "hr" | "int" | "amt";
/** [left, width, heading 1, heading 2, field 1, field 2, format] */
type Col = [number, number, string, string, string, string, Fmt];

interface Layout {
  /** Twips added to every vertical position of the wages layout (the OT report sits 200 twips higher). */
  dy: number;
  perPage: number;
  /** Slip height incl. the dashed separators (twips). */
  slipH: number;
  ecode: [number, number]; // [heading left, value left]
  ename: [number, number]; // [left, width]
  boxRight: number;
  boxBottom: number; // wages-layout twips (dy is added)
  separators: [number, number]; // own twips (dy NOT added)
  vLines: number[];
  cols: Col[];
  /** YTD line: [label left, label, value left, field] (wages slip only). */
  ytd: [number, string, number, string][];
}

const LAYOUTS: Record<PayslipLayout, Layout> = {
  wages: {
    dy: 0,
    perPage: 3,
    slipH: 3480,
    ecode: [150, 160],
    ename: [1110, 2535],
    boxRight: 16090,
    boxBottom: 2660,
    separators: [3311, 3431],
    vLines: [1080, 3665, 4455, 5225, 5835, 6725, 7585, 8475, 9345, 10260, 11185, 12070, 13080, 13960, 14920],
    cols: [
      [3695, 730, "W.HR", "LF HR", "Work_HR", "LayOff_HR", "hr"],
      [4475, 730, "Hol HR", "NS HR", "Holiday_HR", "NS_HR", "hr"],
      [5235, 595, "PL HR", "CL HR", "PL_HR", "CL_HR", "int"],
      [5860, 840, "Basic", "PF", "FBasic_Amt", "Pension", "amt"],
      [6755, 840, "IncBasic", "FPF", "FBasicInc_Amt", "CoC", "amt"],
      [7628, 840, "PBasic", "ESI", "PBasic_Amt", "ESI_Amt", "amt"],
      [8495, 840, "DA", "HRD", "DA_Amt", "HRDeduction", "amt"],
      [9380, 850, "HolAmt", "Inc.Amt", "Holiday_Amt", "Incentive_Amt", "amt"],
      [10280, 895, "PL Amt", "CL Amt", "PL_Amt", "CL_Amt", "amt"],
      [11220, 840, "", "NSAllow", "", "NS_Amt", "amt"],
      [12116, 960, "PFAdj", "NPFAdj", "PFEarnAdj", "NPFEarnAdj", "amt"],
      [13095, 840, "Lay Off", "LoanCap", "LayOffHR_Amt", "PFLoanCap", "amt"],
      [13985, 920, "ROff", "TotalDed", "ROff", "TotalDeduction", "amt"],
      [14955, 1112, "Gross Earn", "NetPayable", "Wages_Gross", "NetPayable", "amt"],
    ],
    // YT.Pension is suppressed in the rpt
    ytd: [
      [205, "YT.Days", 1110, "YTD_Days"],
      [4665, "PF Emp.", 5516, "YTD_PFEmployee"],
      [7295, "PF Comp.", 8151, "YTD_Employer"],
      [12860, "Loan Bal.", 13721, "YTD_LoanAmt"],
    ],
  },
  ot: {
    dy: -200,
    perPage: 4,
    slipH: 2740,
    ecode: [150, 165],
    ename: [1250, 2635],
    boxRight: 16110,
    boxBottom: 2660,
    separators: [2571, 2691],
    vLines: [1200, 3885, 4775, 5645, 6685, 7705, 8755, 9790, 10645, 11710, 12840, 13800, 14800],
    cols: [
      [3935, 830, "W.HR", "LF HR", "Work_HR", "LayOff_HR", "amt"], // OT rpt prints zero hours as "-"
      [4775, 830, "OT HR", "NS HR", "OT_HR", "NS_HR", "amt"],
      [5665, 980, "Basic", "PF", "FBasic_Amt", "Pension", "amt"],
      [6700, 980, "IncBasic", "FPF", "FBasicInc_Amt", "CoC", "amt"],
      [7738, 980, "PBasic", "ESI", "PBasic_Amt", "ESI_Amt", "amt"],
      [8785, 980, "DA", "HRD", "DA_Amt", "HRDeduction", "amt"],
      [9785, 830, "HolAmt", "Inc.Amt", "Holiday_Amt", "Incentive_Amt", "amt"],
      [10690, 980, "OT Amt", "NS Allow", "OT_Amt", "NS_Amt", "amt"],
      [11770, 1040, "PFAdj", "NPFAdj", "PFEarnAdj", "NPFEarnAdj", "amt"],
      [12875, 920, "LayOff", "", "LayOffHR_Amt", "", "amt"],
      [13825, 960, "ROff", "Total Ded.", "ROff", "TotalDeduction", "amt"],
      [14835, 1232, "Gross Earn", "Net Payable", "Wages_Gross", "NetPayable", "amt"],
    ],
    ytd: [],
  },
};

const MM = 1 / 56.7; // twips -> mm
const X0 = 5; // left page margin (mm)

const n = (s: Slip, k: string) => Number(s[k] ?? 0) || 0;
/** Crystal formats: hours 0.00, PL/CL HR whole numbers, amounts with zero shown as "-". */
const fmt = (s: Slip, k: string, f: Fmt) => {
  if (!k) return "";
  const v = n(s, k);
  if (f === "int") return String(Math.round(v));
  if (f === "amt" && v === 0) return "-";
  return v.toFixed(2);
};
const str = (s: Slip, k: string) => String(s[k] ?? "").trim();

const dmy = (iso: string) => iso.split("-").reverse().join("/");

/** Build the PDF of every slip and save it under the job's filename. */
export async function saveWinsomePayslipPdf(job: PayslipJob): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const L = LAYOUTS[job.layout];
  const h = {
    company: job.company,
    from_date: dmy(job.fromDate),
    to_date: dmy(job.toDate),
    // legacy formula @AgreementDate (same in both rpts)
    agreement_date: job.toDate < "2026-09-15" ? "10/09/2020" : "06/06/2026",
  };
  const x = (tw: number) => X0 + tw * MM;
  const right = (txt: string, l: number, w: number, y: number) => doc.text(txt, x(l + w) - 0.8, y, { align: "right" });
  const mid = x(175 + 10740 / 2);

  job.slips.forEach((s, i) => {
    if (i > 0 && i % L.perPage === 0) doc.addPage();
    const y0 = 6 + (i % L.perPage) * L.slipH * MM;
    const raw = (tw: number) => y0 + tw * MM; // the layout's own twips
    const y = (tw: number) => raw(tw + L.dy); // wages-layout twips shifted by dy

    // report header
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(h.company, mid, y(300) + 3, { align: "center" });
    doc.text(`From Date : ${h.from_date}`, x(10995), y(300) + 3);
    doc.text(`To Date : ${h.to_date}`, x(10995), y(300) + 7);
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text("(UNIT -  RAMESHWARA JUTE MILLS,MUKTAPUR.SAMASTIPUR)", mid, y(520) + 3, { align: "center" });
    doc.text(`WAGES AS PER TRIPARTITE AGREEMENT DT.${h.agreement_date}`, mid, y(520) + 6, { align: "center" });

    // PF / ESI / UAN / Department line
    doc.setFontSize(8);
    const label = (t: string, l: number) => doc.setFont("helvetica", "bold").text(t, x(l), y(1040) + 3);
    const value = (t: string, l: number) => doc.setFont("helvetica", "normal").text(t, x(l), y(1040) + 3);
    label("PFNo :", 150); value(str(s, "PFNo"), 895);
    label("ESINo :", 3195); value(str(s, "ESINo"), 3945);
    label("UAN :", 6330); value(str(s, "UAN"), 7078);
    label("Department :", 10995); value(str(s, "dept"), 12495);

    // grid: box, column lines, heading rule
    doc.setLineWidth(0.25);
    doc.rect(x(90), y(1321), (L.boxRight - 90) * MM, (L.boxBottom - 1321) * MM);
    L.vLines.forEach((l) => doc.line(x(l), y(1321), x(l), y(L.boxBottom)));
    doc.line(x(90), y(1916), x(L.boxRight), y(1916));

    doc.setFont("helvetica", "bold").setFontSize(7.5);
    doc.text("ECode", x(L.ecode[0]) + 1, y(1360) + 3);
    doc.text("EName", x(L.ename[0]), y(1360) + 3);
    L.cols.forEach(([l, w, h1, h2]) => {
      doc.text(h1, x(l + w / 2), y(1360) + 3, { align: "center" });
      doc.text(h2, x(l + w / 2), y(1615) + 3, { align: "center" });
    });

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(str(s, "ECode"), x(L.ecode[1]), y(1985) + 3);
    doc.text(str(s, "EName"), x(L.ename[0]), y(1985) + 3, { maxWidth: L.ename[1] * MM });
    L.cols.forEach(([l, w, , , f1, f2, f]) => {
      right(fmt(s, f1, f), l, w, y(1985) + 3);
      if (f2 === "NetPayable") doc.setFont("helvetica", "bold");
      right(fmt(s, f2, f), l, w, y(2345) + 3);
      doc.setFont("helvetica", "normal");
    });

    L.ytd.forEach(([ll, lt, vl, k]) => {
      doc.text(lt, x(ll), y(2765) + 3);
      doc.text(n(s, k).toFixed(2), x(vl), y(2765) + 3);
    });

    // dashed slip separators
    doc.setLineDashPattern([1, 0.6], 0);
    L.separators.forEach((t) => doc.line(x(90), raw(t), x(16050), raw(t)));
    doc.setLineDashPattern([], 0);
  });

  doc.save(job.filename);
}
