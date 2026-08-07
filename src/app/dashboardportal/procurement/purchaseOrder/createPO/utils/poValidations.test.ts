/**
 * @vitest-environment node
 * Tests for pure PO validation helpers in poValidations.ts
 */
import { describe, it, expect } from "vitest";
import { determineValidationLogic, computeMaxPoQty } from "./poValidations";

// ---------------------------------------------------------------------------
// determineValidationLogic
// ---------------------------------------------------------------------------

describe("determineValidationLogic", () => {
	describe("Logic 1 — Regular + stock-checked expense types", () => {
		it.each([
			["Regular", "General"],
			["Regular", "Maintenance"],
			["Regular", "Production"],
			["Regular", "Overhaul"],
		])("returns 1 for PO type %s and expense type %s", (poType, expenseType) => {
			expect(determineValidationLogic(poType, expenseType)).toBe(1);
		});
	});

	describe("Logic 2 — Open + allowed expense types", () => {
		it.each([
			["Open", "General"],
			["Open", "Maintenance"],
			["Open", "Production"],
		])("returns 2 for PO type %s and expense type %s", (poType, expenseType) => {
			expect(determineValidationLogic(poType, expenseType)).toBe(2);
		});
	});

	describe("Logic 3 — free entry", () => {
		it("returns 3 for Regular + Capital", () => {
			expect(determineValidationLogic("Regular", "Capital")).toBe(3);
		});

		it("returns 3 for unknown PO type", () => {
			expect(determineValidationLogic("Unknown", "General")).toBe(3);
		});

		it("returns 3 for unknown expense type", () => {
			expect(determineValidationLogic("Regular", "UnknownExpense")).toBe(3);
		});

		it("returns 3 for empty strings", () => {
			expect(determineValidationLogic("", "")).toBe(3);
		});

		// Open + Capital and Open + Overhaul are blocked at the UI before reaching this (invalid combos)
		// but they still map to logic 3 if somehow passed through
		it("returns 3 for Open + Capital", () => {
			expect(determineValidationLogic("Open", "Capital")).toBe(3);
		});

		it("returns 3 for Open + Overhaul", () => {
			expect(determineValidationLogic("Open", "Overhaul")).toBe(3);
		});
	});
});

// ---------------------------------------------------------------------------
// computeMaxPoQty
// ---------------------------------------------------------------------------

describe("computeMaxPoQty", () => {
	it("returns null when maxQty is null (no item master min/max configured)", () => {
		expect(computeMaxPoQty(null, 10, 5, 2, 10)).toBeNull();
	});

	it("returns null when reorderQty is 0 or null", () => {
		expect(computeMaxPoQty(100, 10, 5, 2, 0)).toBeNull();
		expect(computeMaxPoQty(100, 10, 5, 2, null)).toBeNull();
	});

	it("calculates basic max qty and rounds up to next reorder multiple", () => {
		// available = 100 - 10 - 5 - 2 = 83
		// 83 / 10 = 8.3 → ROUNDUP → 9 * 10 = 90
		expect(computeMaxPoQty(100, 10, 5, 2, 10)).toBe(90);
	});

	it("returns reorderQty when available is less than reorderQty", () => {
		// available = 100 - 95 - 3 - 1 = 1
		// 1 < 10 (reorderQty) → return 10
		expect(computeMaxPoQty(100, 95, 3, 1, 10)).toBe(10);
	});

	it("returns null when available equals zero (stock already at max)", () => {
		// available = 50 - 25 - 15 - 10 = 0 → null (blocked by backend stock check)
		expect(computeMaxPoQty(50, 25, 15, 10, 5)).toBeNull();
	});

	it("works when some optional quantities are zero", () => {
		// available = 200 - 0 - 0 - 0 = 200
		// 200 / 50 = 4 → 4 * 50 = 200
		expect(computeMaxPoQty(200, 0, 0, 0, 50)).toBe(200);
	});

	it("available exactly divisible by reorderQty — no rounding needed", () => {
		// available = 100 - 40 - 10 - 0 = 50
		// 50 / 10 = 5 exactly → 5 * 10 = 50
		expect(computeMaxPoQty(100, 40, 10, 0, 10)).toBe(50);
	});

	it("returns null when available is negative (stock already exceeds max — backend blocks this)", () => {
		// available = 50 - 60 - 5 - 0 = -15 → null (back-end stock_exceeds_max would already have errored)
		expect(computeMaxPoQty(50, 60, 5, 0, 10)).toBeNull();
	});
});
