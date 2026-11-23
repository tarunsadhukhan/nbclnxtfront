import { z } from "zod";

/**
 * Winsome "Production" menu — one entry screen per legacy Smart-Eye WIL form.
 * The backend (src/production/winsomeProduction.py) stores into the mirrored legacy
 * tables and recomputes every amount; `previewAmounts` only mirrors those rules for display.
 */
export type ProdKind =
  | "winding"
  | "beaming"
  | "weaving"
  | "sackSewing"
  | "productionEntry"
  | "dailyProduction";

/** Line fields, named as the legacy columns (the API uses the same names). */
export type LineField =
  | "OcpCode"
  | "Mch1Code"
  | "Mch2Code"
  | "ECode"
  | "QCode"
  | "Prod1"
  | "Prod_HR"
  | "Mch_HR"
  | "QRate"
  | "CalcRate"
  | "Amount"
  | "PayableAmt";

/** pick = choose from a lookup, num = keyed number, out = computed / filled, read-only. */
export interface LineColumn {
  field: LineField;
  label: string;
  kind: "pick" | "num" | "out";
  width: number;
}

export interface FormConfig {
  title: string;
  /** Document forms pick the department in the header; machine forms have a fixed dept. */
  doc: boolean;
  calc: "plain" | "beaming" | "weaving" | "qty";
  mchType: boolean;
  /** Legacy "Fill >>": load every loom + the workers present; idle looms save without an employee. */
  fill?: boolean;
  columns: LineColumn[];
}

const MACHINE: LineColumn = { field: "Mch1Code", label: "Machine", kind: "pick", width: 130 };
const EMPLOYEE: LineColumn = { field: "ECode", label: "EB No. / Name", kind: "pick", width: 240 };
const QUALITY: LineColumn = { field: "QCode", label: "Quality", kind: "pick", width: 170 };
const OCCUPATION: LineColumn = { field: "OcpCode", label: "Occupation", kind: "pick", width: 200 };
const PROD_HR: LineColumn = { field: "Prod_HR", label: "Prod Hrs", kind: "num", width: 80 };
const RATE_OUT: LineColumn = { field: "QRate", label: "Rate", kind: "out", width: 90 };
const AMOUNT: LineColumn = { field: "Amount", label: "Amount", kind: "out", width: 90 };
const QTY: LineColumn = { field: "Prod1", label: "Qty", kind: "num", width: 80 };
const RATE_IN: LineColumn = { field: "QRate", label: "Rate", kind: "num", width: 90 };

const plainMachineForm = (title: string): FormConfig => ({
  title,
  doc: false,
  calc: "plain",
  mchType: false,
  columns: [MACHINE, EMPLOYEE, QUALITY, PROD_HR, { field: "Prod1", label: "Production", kind: "num", width: 90 }, RATE_OUT, AMOUNT],
});

export const FORMS: Record<ProdKind, FormConfig> = {
  winding: plainMachineForm("Production Winding"),
  sackSewing: plainMachineForm("Production Sack Sewing"),
  beaming: {
    title: "Production Beaming",
    doc: false,
    calc: "beaming",
    mchType: false,
    columns: [
      OCCUPATION,
      MACHINE,
      EMPLOYEE,
      QUALITY,
      { field: "Prod1", label: "Production", kind: "num", width: 90 },
      PROD_HR,
      { field: "Mch_HR", label: "Mch Hrs", kind: "num", width: 80 },
      RATE_OUT,
      { field: "CalcRate", label: "Calc Rate", kind: "out", width: 90 },
      AMOUNT,
      { field: "PayableAmt", label: "Payable", kind: "out", width: 90 },
    ],
  },
  weaving: {
    title: "Production Weaving",
    doc: false,
    calc: "weaving",
    mchType: true,
    fill: true,
    columns: [MACHINE, EMPLOYEE, QUALITY, PROD_HR, { field: "Prod1", label: "Cuts.16ths", kind: "num", width: 90 }, RATE_OUT, AMOUNT],
  },
  productionEntry: {
    title: "Production Entry",
    doc: true,
    calc: "qty",
    mchType: false,
    columns: [OCCUPATION, EMPLOYEE, QUALITY, QTY, RATE_IN, AMOUNT],
  },
  dailyProduction: {
    title: "Daily Production",
    doc: true,
    calc: "qty",
    mchType: true,
    columns: [
      OCCUPATION,
      MACHINE,
      { field: "Mch2Code", label: "Machine 2", kind: "pick", width: 130 },
      EMPLOYEE,
      QUALITY,
      QTY,
      RATE_IN,
      AMOUNT,
    ],
  },
};

/** Beaming occupations that also receive the head share (legacy FrmProdBeaming_WIL). */
const BEAMING_HEAD_OCPS = new Set(["22104", "22119"]);
const BEAMING_HEAD_SHARE = 0.026003;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Display-only copy of the backend `_calc` rules. */
export function previewAmounts(
  calc: FormConfig["calc"],
  l: { Prod1: number; QRate: number; Prod_HR: number; Mch_HR: number; OcpCode: string },
): { CalcRate: number; Amount: number; PayableAmt: number } {
  const { Prod1: prod, QRate: rate, Prod_HR: hr } = l;
  if (calc === "qty") return { CalcRate: 0, Amount: r2(prod * rate), PayableAmt: 0 };
  if (calc === "weaving") {
    const cents = Math.round(prod * 100);
    const cuts = Math.floor(cents / 100);
    const frac = cents % 100;
    const amt = prod > 0 && hr > 0 ? cuts * rate + frac * 0.0625 * rate : 0;
    return { CalcRate: 0, Amount: r2(amt), PayableAmt: 0 };
  }
  if (calc === "beaming") {
    const gross = prod * rate;
    const head = gross * BEAMING_HEAD_SHARE;
    const calcRate = l.Mch_HR > 0 ? (gross - head) / 3 / l.Mch_HR : 0;
    const amount = calcRate * hr;
    const payable = BEAMING_HEAD_OCPS.has(l.OcpCode) ? amount + head : amount;
    return { CalcRate: Math.round(calcRate * 1e6) / 1e6, Amount: r2(amount), PayableAmt: r2(payable) };
  }
  return { CalcRate: 0, Amount: r2(prod > 0 && hr > 0 ? prod * rate : 0), PayableAmt: 0 };
}

const numText = z
  .string()
  .refine((v) => v.trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "must be a non-negative number");

/** One entered grid line (numbers kept as typed text until save). */
export const lineSchema = z.object({
  OcpCode: z.string(),
  Mch1Code: z.string(),
  Mch2Code: z.string(),
  ECode: z.string(), // required except on Fill forms' idle looms — checked in save()
  QCode: z.string(),
  Prod1: numText,
  Prod_HR: numText,
  Mch_HR: numText,
  QRate: numText,
});
export type EntryLine = z.infer<typeof lineSchema>;

export const headerSchema = z.object({
  wdate: z.string().min(1, "Production date is required"),
  shift: z.string(),
  spell: z.string(),
  dept_code: z.string(),
  mch_type: z.string(),
});
export type EntryHeader = z.infer<typeof headerSchema>;

export const blankLine = (): EntryLine => ({
  OcpCode: "",
  Mch1Code: "",
  Mch2Code: "",
  ECode: "",
  QCode: "",
  Prod1: "",
  Prod_HR: "",
  Mch_HR: "",
  QRate: "",
});

export interface Option {
  value: string;
  label: string;
}

export interface ProdSetup {
  dept_code: string;
  employees: Option[];
  shifts: string[];
  depts: Option[];
  machines: Option[];
  mch_types: string[];
  qualities: (Option & { rate: number })[];
  occupations: Option[];
}

/** One list row = one production line; doc_entry (hidden) opens its document. */
export interface ProdListRow {
  id: string;
  doc_entry: number;
  wdate: string;
  shift: string;
  dept_code: string;
  mch_code: string;
  eb_no: string;
  name: string;
  quality: string;
  rate: number;
  prod: number;
  amount: number;
}
