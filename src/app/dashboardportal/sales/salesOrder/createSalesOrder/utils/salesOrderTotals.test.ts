import { describe, it, expect } from "vitest";
import { computeSalesOrderTotals } from "./salesOrderTotals";

describe("computeSalesOrderTotals", () => {
	it("sums pre-tax line amounts as grossAmount", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [
				{ amount: 1000, taxAmount: 180 },
				{ amount: 500, taxAmount: 90 },
			],
			additionalCharges: [],
			freightCharges: 0,
		});

		expect(totals.grossAmount).toBe(1500);
	});

	it("sums line item taxAmount into totalTax when no additional charges", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [
				{ amount: 1000, taxAmount: 180 },
				{ amount: 500, taxAmount: 90 },
			],
			additionalCharges: [],
			freightCharges: 0,
		});

		expect(totals.totalTax).toBe(270);
	});

	// Regression: previously the "Total GST" row only summed line-item tax and
	// ignored additional charges GST.
	it("includes additional charges GST in totalTax (regression guard)", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [{ amount: 1000, taxAmount: 180 }],
			additionalCharges: [
				{ netAmount: "100", gst: { gstTotal: 18 } },
				{ netAmount: "200", gst: { gstTotal: 36 } },
			],
			freightCharges: 0,
		});

		expect(totals.totalTax).toBe(180 + 18 + 36);
	});

	// Regression: additionalChargesTotal previously lumped net + GST together
	// and was displayed in the "Additional Charges" row, hiding the GST.
	it("reports only pre-tax net under additionalChargesTotal (regression guard)", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [],
			additionalCharges: [
				{ netAmount: "100", gst: { gstTotal: 18 } },
				{ netAmount: "50", gst: { gstTotal: 9 } },
			],
			freightCharges: 0,
		});

		expect(totals.additionalChargesTotal).toBe(150);
	});

	it("computes netAmount as gross + totalTax + freight + additional net without double-counting GST", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [{ amount: 1000, taxAmount: 180 }],
			additionalCharges: [{ netAmount: "100", gst: { gstTotal: 18 } }],
			freightCharges: 50,
		});

		// 1000 gross + (180 + 18) tax + 50 freight + 100 additional net
		expect(totals.netAmount).toBe(1348);
	});

	it("handles additional charges with no gst object", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [{ amount: 500, taxAmount: 0 }],
			additionalCharges: [{ netAmount: "100" }],
			freightCharges: 0,
		});

		expect(totals.totalTax).toBe(0);
		expect(totals.additionalChargesTotal).toBe(100);
		expect(totals.netAmount).toBe(600);
	});

	it("treats missing line amount and tax as zero", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [{}, { amount: 100 }],
			additionalCharges: [],
			freightCharges: 0,
		});

		expect(totals.grossAmount).toBe(100);
		expect(totals.totalTax).toBe(0);
		expect(totals.netAmount).toBe(100);
	});

	it("parses freightCharges coming in as a string-like number", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [{ amount: 1000, taxAmount: 0 }],
			additionalCharges: [],
			// @ts-expect-error — simulating the form value that may arrive as string
			freightCharges: "75",
		});

		expect(totals.freightCharges).toBe(75);
		expect(totals.netAmount).toBe(1075);
	});

	it("returns zeros for empty input", () => {
		const totals = computeSalesOrderTotals({
			lineItems: [],
			additionalCharges: [],
			freightCharges: 0,
		});

		expect(totals).toEqual({
			grossAmount: 0,
			totalTax: 0,
			freightCharges: 0,
			additionalChargesTotal: 0,
			netAmount: 0,
		});
	});
});
