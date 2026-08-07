import { describe, it, expect } from "vitest";
import { computeHessianFields, type HessianComputedFields } from "./hessianCalculations";

describe("computeHessianFields", () => {
	// ── Standard calculation ────────────────────────────────────────────
	it("should compute correct values for a typical hessian line", () => {
		// 10 bales, 60000 ₹/MT, convFactor=5 (1 MT = 5 Bales), brokerage=5%
		const result = computeHessianFields(10, 60000, 5, 5);

		expect(result.qtyMt).toBe(2); // 10 / 5
		expect(result.ratePerBale).toBe(12000); // 60000 / 5
		expect(result.billingRateMt).toBe(57000); // 60000 - (60000 * 5/100)
		expect(result.billingRateBale).toBe(11400); // 57000 / 5
	});

	// ── Zero brokerage ─────────────────────────────────────────────────
	it("should return raw rate as billing rate when brokerage is 0%", () => {
		const result = computeHessianFields(20, 50000, 4, 0);

		expect(result.qtyMt).toBe(5); // 20 / 4
		expect(result.ratePerBale).toBe(12500); // 50000 / 4
		expect(result.billingRateMt).toBe(50000); // no deduction
		expect(result.billingRateBale).toBe(12500); // 50000 / 4
	});

	// ── Zero conversion factor (edge case) ──────────────────────────────
	it("should return zeros when conversionFactor is 0", () => {
		const result = computeHessianFields(10, 60000, 0, 5);

		expect(result.qtyMt).toBe(0);
		expect(result.ratePerBale).toBe(0);
		// billingRateMt still computed from rawRateMt and brokerage
		expect(result.billingRateMt).toBe(57000);
		expect(result.billingRateBale).toBe(0);
	});

	// ── Zero quantity ───────────────────────────────────────────────────
	it("should handle zero qty bales", () => {
		const result = computeHessianFields(0, 60000, 5, 5);

		expect(result.qtyMt).toBe(0);
		expect(result.ratePerBale).toBe(12000); // rate still derived
		expect(result.billingRateMt).toBe(57000);
		expect(result.billingRateBale).toBe(11400);
	});

	// ── Zero rate ───────────────────────────────────────────────────────
	it("should handle zero rate", () => {
		const result = computeHessianFields(10, 0, 5, 5);

		expect(result.qtyMt).toBe(2);
		expect(result.ratePerBale).toBe(0);
		expect(result.billingRateMt).toBe(0);
		expect(result.billingRateBale).toBe(0);
	});

	// ── All zeros ───────────────────────────────────────────────────────
	it("should return all zeros when all inputs are zero", () => {
		const result = computeHessianFields(0, 0, 0, 0);

		expect(result.qtyMt).toBe(0);
		expect(result.ratePerBale).toBe(0);
		expect(result.billingRateMt).toBe(0);
		expect(result.billingRateBale).toBe(0);
	});

	// ── Fractional conversion factor ────────────────────────────────────
	it("should handle fractional conversion factors correctly", () => {
		// 15 bales, 80000 ₹/MT, convFactor=3 (1 MT = 3 Bales), brokerage=2%
		const result = computeHessianFields(15, 80000, 3, 2);

		expect(result.qtyMt).toBe(5); // 15 / 3
		expect(result.ratePerBale).toBe(26666.67); // 80000 / 3 → rounded
		expect(result.billingRateMt).toBe(78400); // 80000 - 1600
		expect(result.billingRateBale).toBe(26133.33); // 78400 / 3 → rounded
	});

	// ── Rounding precision ──────────────────────────────────────────────
	it("should round qtyMt to 4 decimal places when SO passes qtyRounding=4, rates to 2", () => {
		// 7 bales, 10000 ₹/MT, convFactor=3, brokerage=3.5%
		// Sales Order explicitly passes qtyRounding=4 for legacy parity.
		const result = computeHessianFields(7, 10000, 3, 3.5, 4);

		// qtyMt = 7/3 = 2.333333... → 2.3333
		expect(result.qtyMt).toBe(2.3333);
		// ratePerBale = 10000/3 = 3333.333... → 3333.33
		expect(result.ratePerBale).toBe(3333.33);
		// billingRateMt = 10000 - 350 = 9650
		expect(result.billingRateMt).toBe(9650);
		// billingRateBale = 9650/3 = 3216.666... → 3216.67
		expect(result.billingRateBale).toBe(3216.67);
	});

	// ── 100% brokerage ──────────────────────────────────────────────────
	it("should return zero billing rates when brokerage is 100%", () => {
		const result = computeHessianFields(10, 60000, 5, 100);

		expect(result.qtyMt).toBe(2);
		expect(result.ratePerBale).toBe(12000);
		expect(result.billingRateMt).toBe(0);
		expect(result.billingRateBale).toBe(0);
	});

	// ── Return type check ───────────────────────────────────────────────
	it("should return an object with the correct shape", () => {
		const result: HessianComputedFields = computeHessianFields(10, 60000, 5, 5);

		expect(result).toHaveProperty("qtyMt");
		expect(result).toHaveProperty("ratePerBale");
		expect(result).toHaveProperty("billingRateMt");
		expect(result).toHaveProperty("billingRateBale");
		expect(Object.keys(result)).toHaveLength(4);
	});

	// ── Large numbers ───────────────────────────────────────────────────
	it("should handle large values without overflow", () => {
		const result = computeHessianFields(100000, 5000000, 10, 3);

		expect(result.qtyMt).toBe(10000); // 100000 / 10
		expect(result.ratePerBale).toBe(500000); // 5000000 / 10
		expect(result.billingRateMt).toBe(4850000); // 5000000 - 150000
		expect(result.billingRateBale).toBe(485000); // 4850000 / 10
	});

	// ── Negative conversion factor ──────────────────────────────────────
	it("should return zeros for negative conversion factor (safeguard)", () => {
		const result = computeHessianFields(10, 60000, -5, 5);

		// convFactor <= 0 branch
		expect(result.qtyMt).toBe(0);
		expect(result.ratePerBale).toBe(0);
		expect(result.billingRateBale).toBe(0);
	});
});
