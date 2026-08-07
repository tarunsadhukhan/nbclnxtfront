/**
 * Pure row-planning for the "Hands Complement" sheet of the Attendance Check
 * List export: the data rows in order, a total line per department, and a grand
 * total. Kept free of MUI/exceljs imports so it stays cheap to unit test —
 * checklistExcel.ts does the spreadsheet writing.
 */
import type { HandsComplementRow } from "@/utils/hrmsReportService";

/** The four shift columns then the eight category columns, in sheet order. */
export const SHIFT_COLS = [
  "shift_a",
  "shift_b",
  "shift_c",
  "shift_total",
] as const;
export const CATEGORY_COLS = [
  "permanent",
  "budli",
  "retired",
  "new_budli",
  "contract",
  "outsider",
  "apprentice",
  "total_hands",
] as const;

export type NumericCol =
  | (typeof SHIFT_COLS)[number]
  | (typeof CATEGORY_COLS)[number];

export const NUMERIC_COLS: NumericCol[] = [...SHIFT_COLS, ...CATEGORY_COLS];

const zeroTotals = (): Record<NumericCol, number> =>
  Object.fromEntries(NUMERIC_COLS.map((k) => [k, 0])) as Record<
    NumericCol,
    number
  >;

const addInto = (
  acc: Record<NumericCol, number>,
  row: HandsComplementRow,
): void => {
  for (const k of NUMERIC_COLS) acc[k] += Number(row[k] ?? 0);
};

/** One laid-out sheet row: a data line, a per-department total, or the grand
 * total. `values` follows NUMERIC_COLS order. */
export interface HandsPlanRow {
  kind: "data" | "subtotal" | "grand";
  sl: number | "";
  date: string;
  department: string;
  designation: string;
  values: number[];
}

/**
 * Turns the flat backend rows into the sheet's row plan.
 *
 * Rows must already be ordered by department (the endpoint orders by date,
 * department, designation); a department appearing in two separate runs would
 * produce two subtotal lines, matching the legacy report's behaviour.
 */
export function buildHandsPlan(rows: HandsComplementRow[]): HandsPlanRow[] {
  const plan: HandsPlanRow[] = [];
  const grand = zeroTotals();
  let dept: string | null = null;
  let deptTotals = zeroTotals();
  let sl = 0;

  const pushSubtotal = () => {
    if (dept === null) return;
    plan.push({
      kind: "subtotal",
      sl: "",
      date: "",
      department: `${dept} Total`,
      designation: "",
      values: NUMERIC_COLS.map((k) => deptTotals[k]),
    });
  };

  for (const row of rows) {
    const name = row.department ?? "";
    if (dept === null || name !== dept) {
      pushSubtotal();
      dept = name;
      deptTotals = zeroTotals();
    }
    sl += 1;
    plan.push({
      kind: "data",
      sl,
      date: row.attendance_date ?? "",
      department: name,
      designation: row.designation ?? "",
      values: NUMERIC_COLS.map((k) => Number(row[k] ?? 0)),
    });
    addInto(deptTotals, row);
    addInto(grand, row);
  }
  pushSubtotal();
  plan.push({
    kind: "grand",
    sl: "",
    date: "",
    department: "Grand Total",
    designation: "",
    values: NUMERIC_COLS.map((k) => grand[k]),
  });
  return plan;
}
