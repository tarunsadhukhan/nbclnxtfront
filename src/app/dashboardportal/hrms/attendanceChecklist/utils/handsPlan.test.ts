import { describe, expect, it } from "vitest";
import { buildHandsPlan } from "./handsPlan";
import type { HandsComplementRow } from "@/utils/hrmsReportService";

/** values[] order: shift A,B,C,Total then Permanent..Apprentice,Total Hands. */
const TOTAL_HANDS = 11; // last index in values[]
const SHIFT_TOTAL = 3;

const row = (
  department: string,
  designation: string,
  o: Partial<HandsComplementRow> = {},
): HandsComplementRow => ({
  id: 0,
  attendance_date: "2026-08-01",
  department,
  designation,
  shift_a: 0,
  shift_b: 0,
  shift_c: 0,
  shift_total: 0,
  permanent: 0,
  budli: 0,
  retired: 0,
  new_budli: 0,
  contract: 0,
  outsider: 0,
  apprentice: 0,
  total_hands: 0,
  ...o,
});

describe("buildHandsPlan", () => {
  it("returns just a grand total for no rows", () => {
    const plan = buildHandsPlan([]);
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("grand");
    expect(plan[0].values.every((v) => v === 0)).toBe(true);
  });

  it("adds a total row per department plus a grand total", () => {
    const plan = buildHandsPlan([
      row("SPINNING", "TWISTER", { shift_a: 2, shift_total: 2, total_hands: 2 }),
      row("SPINNING", "REELER", { shift_a: 1, shift_total: 1, total_hands: 1 }),
      row("WEAVING", "WEAVER", { shift_b: 4, shift_total: 4, total_hands: 4 }),
    ]);
    expect(plan.map((p) => `${p.kind}:${p.department}`)).toEqual([
      "data:SPINNING",
      "data:SPINNING",
      "subtotal:SPINNING Total",
      "data:WEAVING",
      "subtotal:WEAVING Total",
      "grand:Grand Total",
    ]);
  });

  it("sums each department's hands and the grand total", () => {
    const plan = buildHandsPlan([
      row("SPINNING", "TWISTER", { shift_a: 2, shift_total: 2, total_hands: 2 }),
      row("SPINNING", "REELER", { shift_a: 1, shift_total: 1, total_hands: 1 }),
      row("WEAVING", "WEAVER", { shift_b: 4, shift_total: 4, total_hands: 4 }),
    ]);
    const spinning = plan.find((p) => p.department === "SPINNING Total")!;
    const weaving = plan.find((p) => p.department === "WEAVING Total")!;
    const grand = plan.at(-1)!;
    expect(spinning.values[TOTAL_HANDS]).toBe(3);
    expect(spinning.values[SHIFT_TOTAL]).toBe(3);
    expect(weaving.values[TOTAL_HANDS]).toBe(4);
    expect(grand.values[TOTAL_HANDS]).toBe(7);
    // Grand total is the sum of the department subtotals.
    expect(grand.values[TOTAL_HANDS]).toBe(
      spinning.values[TOTAL_HANDS] + weaving.values[TOTAL_HANDS],
    );
  });

  it("numbers only data rows, sequentially and unbroken across departments", () => {
    const plan = buildHandsPlan([
      row("A", "x", { total_hands: 1 }),
      row("B", "y", { total_hands: 1 }),
      row("B", "z", { total_hands: 1 }),
    ]);
    expect(plan.filter((p) => p.kind === "data").map((p) => p.sl)).toEqual([1, 2, 3]);
    expect(plan.filter((p) => p.kind !== "data").every((p) => p.sl === "")).toBe(true);
  });

  it("treats a null department as its own group without crashing", () => {
    const plan = buildHandsPlan([
      row(null as unknown as string, "x", { total_hands: 2 }),
    ]);
    expect(plan[0].department).toBe("");
    expect(plan.at(-1)!.values[TOTAL_HANDS]).toBe(2);
  });
});
