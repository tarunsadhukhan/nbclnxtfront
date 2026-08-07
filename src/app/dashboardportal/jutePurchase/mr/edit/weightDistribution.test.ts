/**
 * @description Tests for MR weight distribution and rounding logic.
 * Ensures all weights are rounded to 0 decimal places and the
 * largest-remainder distribution sums to the exact header weight.
 */
import { describe, it, expect } from "vitest";

// ─── Inline copies of the module-private functions for testing ───────

function calculateShortageAndAcceptedWeight(
  actualWeight: number | null,
  allowableMoisture: number | null,
  actualMoisture: number | null,
  claimDust: number | null
): { shortageKgs: number | null; acceptedWeight: number | null } {
  if (actualWeight == null || actualWeight <= 0) {
    return { shortageKgs: null, acceptedWeight: null };
  }
  const roundedWeight = Math.round(actualWeight);
  const allowable = allowableMoisture ?? 0;
  const actual = actualMoisture ?? 0;
  const dust = claimDust ?? 0;
  const moistureDiff = actual > allowable ? actual - allowable : 0;
  const deductionPercentage = moistureDiff + dust;
  if (deductionPercentage <= 0) {
    return { shortageKgs: 0, acceptedWeight: roundedWeight };
  }
  const shortageKgs = Math.round(roundedWeight * deductionPercentage / 100.0);
  const acceptedWeight = Math.max(0, roundedWeight - shortageKgs);
  return { shortageKgs, acceptedWeight };
}

type TestLineItem = {
  id: string;
  actualQty: number | null;
  actualWeight: number | null;
  allowableMoisture: number | null;
  actualMoisture: number | null;
  claimDust: number | null;
  shortageKgs: number | null;
  acceptedWeight: number | null;
};

function distributeActualWeightToLineItems(
  lineItems: TestLineItem[],
  headerActualWeight: number
): TestLineItem[] {
  if (headerActualWeight <= 0 || lineItems.length === 0) return lineItems;
  const roundedHeaderWeight = Math.round(headerActualWeight);
  const totalActualQty = lineItems.reduce((sum, li) => sum + (li.actualQty ?? 0), 0);

  if (totalActualQty <= 0) {
    if (lineItems.length === 1) {
      const li = lineItems[0];
      const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
        roundedHeaderWeight, li.allowableMoisture, li.actualMoisture, li.claimDust
      );
      return [{ ...li, actualWeight: roundedHeaderWeight, shortageKgs, acceptedWeight }];
    }
    return lineItems;
  }

  const withQty = lineItems.map((li) => {
    const lineActualQty = li.actualQty ?? 0;
    const exactWeight = lineActualQty > 0 ? (roundedHeaderWeight * lineActualQty) / totalActualQty : 0;
    const flooredWeight = Math.floor(exactWeight);
    const fractionalPart = exactWeight - flooredWeight;
    return { li, lineActualQty, flooredWeight, fractionalPart };
  });

  const flooredSum = withQty.reduce((sum, e) => sum + e.flooredWeight, 0);
  let remainder = roundedHeaderWeight - flooredSum;

  const sortedIndices = withQty
    .map((_, idx) => idx)
    .filter((idx) => withQty[idx].lineActualQty > 0)
    .sort((a, b) => withQty[b].fractionalPart - withQty[a].fractionalPart);

  const finalWeights = withQty.map((e) => e.flooredWeight);
  for (const idx of sortedIndices) {
    if (remainder <= 0) break;
    finalWeights[idx] += 1;
    remainder -= 1;
  }

  return lineItems.map((li, idx) => {
    if ((li.actualQty ?? 0) <= 0) return li;
    const distributedWeight = finalWeights[idx];
    const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
      distributedWeight, li.allowableMoisture, li.actualMoisture, li.claimDust
    );
    return { ...li, actualWeight: distributedWeight, shortageKgs, acceptedWeight };
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("calculateShortageAndAcceptedWeight", () => {
  it("should return null for null/zero weight", () => {
    expect(calculateShortageAndAcceptedWeight(null, 10, 12, 0)).toEqual({ shortageKgs: null, acceptedWeight: null });
    expect(calculateShortageAndAcceptedWeight(0, 10, 12, 0)).toEqual({ shortageKgs: null, acceptedWeight: null });
  });

  it("should return integers (0 decimals)", () => {
    const result = calculateShortageAndAcceptedWeight(1000, 10, 16.67, 2);
    expect(Number.isInteger(result.shortageKgs)).toBe(true);
    expect(Number.isInteger(result.acceptedWeight)).toBe(true);
  });

  it("should return shortageKgs=0 when no deduction", () => {
    const result = calculateShortageAndAcceptedWeight(500, 15, 10, 0);
    expect(result.shortageKgs).toBe(0);
    expect(result.acceptedWeight).toBe(500);
  });

  it("should correctly compute shortage and accepted", () => {
    // 1000 kg, moisture diff = 16 - 10 = 6%, dust = 2%, total = 8%
    // shortage = round(1000 * 8 / 100) = 80
    // accepted = 1000 - 80 = 920
    const result = calculateShortageAndAcceptedWeight(1000, 10, 16, 2);
    expect(result.shortageKgs).toBe(80);
    expect(result.acceptedWeight).toBe(920);
  });

  it("shortage + accepted should equal rounded actual weight", () => {
    const result = calculateShortageAndAcceptedWeight(1000, 10, 16, 2);
    expect((result.shortageKgs ?? 0) + (result.acceptedWeight ?? 0)).toBe(1000);
  });

  it("should handle fractional actual_weight by rounding first", () => {
    // 999.6 rounds to 1000
    const result = calculateShortageAndAcceptedWeight(999.6, 10, 16, 2);
    expect(result.shortageKgs).toBe(80);
    expect(result.acceptedWeight).toBe(920);
  });

  it("should handle negative weight as null-like", () => {
    const result = calculateShortageAndAcceptedWeight(-5, 10, 16, 2);
    expect(result.shortageKgs).toBeNull();
    expect(result.acceptedWeight).toBeNull();
  });
});

describe("distributeActualWeightToLineItems", () => {
  const makeLine = (id: string, qty: number): TestLineItem => ({
    id, actualQty: qty, actualWeight: null, allowableMoisture: null,
    actualMoisture: null, claimDust: null, shortageKgs: null, acceptedWeight: null,
  });

  it("should return unchanged for 0 header weight", () => {
    const lines = [makeLine("1", 10)];
    const result = distributeActualWeightToLineItems(lines, 0);
    expect(result).toBe(lines);
  });

  it("should return unchanged for empty lines", () => {
    const lines: TestLineItem[] = [];
    const result = distributeActualWeightToLineItems(lines, 1000);
    expect(result).toBe(lines);
  });

  it("should assign all weight to a single line", () => {
    const result = distributeActualWeightToLineItems([makeLine("1", 5)], 1000);
    expect(result[0].actualWeight).toBe(1000);
  });

  it("should sum to exact header weight (3 equal lines, remainder case)", () => {
    // 1000 / 3 = 333.33... → floor = 333 each → sum = 999 → remainder = 1
    // One line gets +1 → sum = 1000
    const lines = [makeLine("1", 10), makeLine("2", 10), makeLine("3", 10)];
    const result = distributeActualWeightToLineItems(lines, 1000);
    const totalWeight = result.reduce((s, li) => s + (li.actualWeight ?? 0), 0);
    expect(totalWeight).toBe(1000);
  });

  it("should sum to exact header weight (7 lines, unequal qty)", () => {
    const lines = [
      makeLine("1", 3), makeLine("2", 7), makeLine("3", 5),
      makeLine("4", 2), makeLine("5", 8), makeLine("6", 4), makeLine("7", 1),
    ];
    const result = distributeActualWeightToLineItems(lines, 1543);
    const totalWeight = result.reduce((s, li) => s + (li.actualWeight ?? 0), 0);
    expect(totalWeight).toBe(1543);
    // Each weight should be a whole number
    result.forEach((li) => {
      if ((li.actualQty ?? 0) > 0) {
        expect(Number.isInteger(li.actualWeight)).toBe(true);
      }
    });
  });

  it("should handle fractional header weight by rounding", () => {
    const lines = [makeLine("1", 5), makeLine("2", 5)];
    const result = distributeActualWeightToLineItems(lines, 999.7);
    const totalWeight = result.reduce((s, li) => s + (li.actualWeight ?? 0), 0);
    expect(totalWeight).toBe(1000); // Math.round(999.7) = 1000
  });

  it("should skip lines with 0 qty", () => {
    const lines = [makeLine("1", 0), makeLine("2", 10)];
    const result = distributeActualWeightToLineItems(lines, 500);
    expect(result[0].actualWeight).toBeNull(); // unchanged
    expect(result[1].actualWeight).toBe(500);
  });

  it("should also calculate shortage and accepted as integers", () => {
    const line: TestLineItem = {
      id: "1", actualQty: 10, actualWeight: null,
      allowableMoisture: 10, actualMoisture: 16, claimDust: 2,
      shortageKgs: null, acceptedWeight: null,
    };
    const result = distributeActualWeightToLineItems([line], 1000);
    expect(Number.isInteger(result[0].shortageKgs)).toBe(true);
    expect(Number.isInteger(result[0].acceptedWeight)).toBe(true);
    expect(result[0].shortageKgs).toBe(80);
    expect(result[0].acceptedWeight).toBe(920);
  });

  it("should distribute 2-line split with no remainder", () => {
    // 1000 / 2 = 500 each — no remainder
    const lines = [makeLine("1", 5), makeLine("2", 5)];
    const result = distributeActualWeightToLineItems(lines, 1000);
    expect(result[0].actualWeight).toBe(500);
    expect(result[1].actualWeight).toBe(500);
  });

  it("should handle large remainder correctly", () => {
    // 4 lines with qty=1 each, weight=7
    // 7/4 = 1.75 → floor = 1 each → sum = 4 → remainder = 3
    // 3 of 4 lines get +1 → [2, 2, 2, 1]
    const lines = [makeLine("1", 1), makeLine("2", 1), makeLine("3", 1), makeLine("4", 1)];
    const result = distributeActualWeightToLineItems(lines, 7);
    const totalWeight = result.reduce((s, li) => s + (li.actualWeight ?? 0), 0);
    expect(totalWeight).toBe(7);
  });
});
