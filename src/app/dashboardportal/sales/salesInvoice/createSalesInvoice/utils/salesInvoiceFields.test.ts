import { describe, it, expect } from "vitest";
import { buildDefaultFormValues, createBlankLine } from "./salesInvoiceFactories";
import { mapInvoiceDetailsToFormValues } from "./salesInvoiceMappers";
import {
	calculateInvoiceTotals,
	calculateLineTax,
	calculateLineAmount,
	calculateDiscountAmount,
} from "./salesInvoiceCalculations";

// ---------------------------------------------------------------------------
// buildDefaultFormValues
// ---------------------------------------------------------------------------
describe("buildDefaultFormValues", () => {
	const defaults = buildDefaultFormValues();

	it("should include all dormant header fields", () => {
		const dormantFields = [
			"due_date",
			"type_of_sale",
			"tax_id",
			"transporter_address",
			"transporter_state_code",
			"transporter_state_name",
			"container_no",
			"contract_no",
			"contract_date",
			"consignment_no",
			"consignment_date",
		];
		for (const field of dormantFields) {
			expect(defaults).toHaveProperty(field);
			expect(defaults[field as keyof typeof defaults]).toBe("");
		}
	});

	it("should NOT include TCS fields", () => {
		expect(defaults).not.toHaveProperty("tcs_percentage");
		expect(defaults).not.toHaveProperty("tcs_amount");
	});

	it("should include standard header/footer fields", () => {
		expect(defaults).toHaveProperty("branch", "");
		expect(defaults).toHaveProperty("party", "");
		expect(defaults).toHaveProperty("freight_charges", "");
		expect(defaults).toHaveProperty("round_off", "");
		expect(defaults).toHaveProperty("footer_note", "");
		expect(defaults).toHaveProperty("terms_conditions", "");
	});

	it("should include jute fields", () => {
		expect(defaults).toHaveProperty("jute_mr_no", "");
		expect(defaults).toHaveProperty("jute_claim_amount", "");
		expect(defaults).toHaveProperty("jute_claim_description", "");
		expect(defaults).toHaveProperty("jute_mukam_id", "");
	});

	it("should set today's date as default", () => {
		const today = new Date().toISOString().slice(0, 10);
		expect(defaults.date).toBe(today);
	});
});

// ---------------------------------------------------------------------------
// createBlankLine
// ---------------------------------------------------------------------------
describe("createBlankLine", () => {
	it("should have a unique id", () => {
		const a = createBlankLine();
		const b = createBlankLine();
		expect(a.id).toBeTruthy();
		expect(b.id).toBeTruthy();
		expect(a.id).not.toBe(b.id);
	});

	it("should have empty core fields", () => {
		const line = createBlankLine();
		expect(line.itemGroup).toBe("");
		expect(line.item).toBe("");
		expect(line.quantity).toBe("");
		expect(line.rate).toBe("");
		expect(line.uom).toBe("");
	});

	it("should have jute detail defaults", () => {
		const line = createBlankLine();
		expect(line.juteClaimAmountDtl).toBeUndefined();
		expect(line.juteClaimDesc).toBe("");
		expect(line.juteClaimRate).toBeUndefined();
		expect(line.juteUnitConversion).toBe("");
		expect(line.juteQtyUnitConversion).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// mapInvoiceDetailsToFormValues
// ---------------------------------------------------------------------------
describe("mapInvoiceDetailsToFormValues", () => {
	const defaults = buildDefaultFormValues();

	it("should map dormant fields from details to form values", () => {
		const details = {
			dueDate: "2025-06-15",
			typeOfSale: "domestic",
			taxId: "GSTIN123",
			transporterAddress: "123 Main St",
			transporterStateCode: "WB",
			transporterStateName: "West Bengal",
			containerNo: "CONT001",
			contractNo: "CON-2025-01",
			contractDate: "2025-01-01",
			consignmentNo: "CSG-001",
			consignmentDate: "2025-06-10",
		};

		const result = mapInvoiceDetailsToFormValues(details, defaults);
		expect(result.due_date).toBe("2025-06-15");
		expect(result.type_of_sale).toBe("domestic");
		expect(result.tax_id).toBe("GSTIN123");
		expect(result.transporter_address).toBe("123 Main St");
		expect(result.transporter_state_code).toBe("WB");
		expect(result.transporter_state_name).toBe("West Bengal");
		expect(result.container_no).toBe("CONT001");
		expect(result.contract_no).toBe("CON-2025-01");
		expect(result.contract_date).toBe("2025-01-01");
		expect(result.consignment_no).toBe("CSG-001");
		expect(result.consignment_date).toBe("2025-06-10");
	});

	it("should NOT map TCS fields", () => {
		const details = {
			tcsPercentage: 5,
			tcsAmount: 100,
		} as Record<string, unknown>;

		const result = mapInvoiceDetailsToFormValues(details, defaults);
		expect(result).not.toHaveProperty("tcs_percentage");
		expect(result).not.toHaveProperty("tcs_amount");
	});

	it("should use defaults for missing fields", () => {
		const result = mapInvoiceDetailsToFormValues({}, defaults);
		expect(result.due_date).toBe("");
		expect(result.type_of_sale).toBe("");
		expect(result.freight_charges).toBe("");
		expect(result.round_off).toBe("");
	});

	it("should map standard header fields", () => {
		const details = {
			branchId: "10",
			invoiceDate: "2025-06-15T00:00:00Z",
			party: "42",
			freightCharges: 500,
			roundOff: -3,
		};

		const result = mapInvoiceDetailsToFormValues(details, defaults);
		expect(result.branch).toBe("10");
		expect(result.date).toBe("2025-06-15");
		expect(result.party).toBe("42");
		expect(result.freight_charges).toBe("500");
		expect(result.round_off).toBe("-3");
	});

	it("should map jute fields", () => {
		const details = {
			jute: {
				mrNo: "MR-001",
				claimAmount: 250,
				claimDescription: "Quality claim",
				mukamId: 5,
			},
		};

		const result = mapInvoiceDetailsToFormValues(details, defaults);
		expect(result.jute_mr_no).toBe("MR-001");
		expect(result.jute_claim_amount).toBe("250");
		expect(result.jute_claim_description).toBe("Quality claim");
		expect(result.jute_mukam_id).toBe("5");
	});

	it("should handle null jute gracefully", () => {
		const details = { jute: null };
		const result = mapInvoiceDetailsToFormValues(details, defaults);
		expect(result.jute_mr_no).toBe("");
		expect(result.jute_claim_amount).toBe("");
	});
});

// ---------------------------------------------------------------------------
// calculateInvoiceTotals
// ---------------------------------------------------------------------------
describe("calculateInvoiceTotals", () => {
	it("should accept only 3 parameters (no TCS)", () => {
		expect(calculateInvoiceTotals.length).toBeLessThanOrEqual(3);
	});

	it("should sum line amounts correctly", () => {
		const lines = [
			{ netAmount: 1000, gstTotal: 180 },
			{ netAmount: 2000, gstTotal: 360 },
		];
		const result = calculateInvoiceTotals(lines, 0, 0);
		expect(result.grossAmount).toBe(3000);
		expect(result.totalGST).toBe(540);
		expect(result.netAmount).toBe(3540);
	});

	it("should include freight and round-off in net amount", () => {
		const lines = [{ netAmount: 1000, gstTotal: 100 }];
		const result = calculateInvoiceTotals(lines, 200, -5);
		expect(result.netAmount).toBe(1000 + 100 + 200 - 5);
		expect(result.freightCharges).toBe(200);
		expect(result.roundOff).toBe(-5);
	});

	it("should NOT include TCS in return value", () => {
		const lines = [{ netAmount: 1000, gstTotal: 100 }];
		const result = calculateInvoiceTotals(lines, 0, 0);
		expect(result).not.toHaveProperty("tcsAmount");
	});

	it("should return zeros for empty line items", () => {
		const result = calculateInvoiceTotals([], 0, 0);
		expect(result.grossAmount).toBe(0);
		expect(result.totalGST).toBe(0);
		expect(result.totalIGST).toBe(0);
		expect(result.totalCGST).toBe(0);
		expect(result.totalSGST).toBe(0);
		expect(result.netAmount).toBe(0);
	});

	it("should handle undefined amounts gracefully", () => {
		const lines = [{ netAmount: undefined, gstTotal: undefined }];
		const result = calculateInvoiceTotals(lines, 0, 0);
		expect(result.grossAmount).toBe(0);
		expect(result.totalGST).toBe(0);
	});

	it("should split GST into IGST/CGST/SGST", () => {
		const lines = [
			{ netAmount: 1000, gstTotal: 180, igstAmount: 180, cgstAmount: 0, sgstAmount: 0 },
			{ netAmount: 500, gstTotal: 90, igstAmount: 0, cgstAmount: 45, sgstAmount: 45 },
		];
		const result = calculateInvoiceTotals(lines, 0, 0);
		expect(result.totalIGST).toBe(180);
		expect(result.totalCGST).toBe(45);
		expect(result.totalSGST).toBe(45);
	});
});

// ---------------------------------------------------------------------------
// calculateLineTax
// ---------------------------------------------------------------------------
describe("calculateLineTax", () => {
	it("should return IGST when company branch and shipping branch state ids differ", () => {
		const result = calculateLineTax(1000, 18, 19, 27);
		expect(result.igstAmount).toBe(180);
		expect(result.igstPercent).toBe(18);
		expect(result.cgstAmount).toBe(0);
		expect(result.sgstAmount).toBe(0);
	});

	it("should split CGST/SGST when company branch and shipping branch state ids match", () => {
		const result = calculateLineTax(1000, 18, 19, 19);
		expect(result.igstAmount).toBe(0);
		expect(result.cgstAmount).toBe(90);
		expect(result.cgstPercent).toBe(9);
		expect(result.sgstAmount).toBe(90);
		expect(result.sgstPercent).toBe(9);
	});

	it("should return zeros when tax percentage is 0", () => {
		const result = calculateLineTax(1000, 0, 19, 19);
		expect(result.gstTotal).toBe(0);
	});

	it("should return zeros when state ids are undefined", () => {
		const result = calculateLineTax(1000, 18, undefined, undefined);
		expect(result.gstTotal).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculateDiscountAmount
// ---------------------------------------------------------------------------
describe("calculateDiscountAmount", () => {
	it("should calculate percentage discount", () => {
		const result = calculateDiscountAmount(10, 100, 1, 10);
		expect(result).toBe(100); // 10% of 100 * 10
	});

	it("should calculate amount discount per unit", () => {
		const result = calculateDiscountAmount(10, 100, 2, 5);
		expect(result).toBe(50); // 5 * 10
	});

	it("should return 0 when no discount type", () => {
		expect(calculateDiscountAmount(10, 100, undefined, 5)).toBe(0);
	});

	it("should return 0 when qty is 0", () => {
		expect(calculateDiscountAmount(0, 100, 1, 10)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculateLineAmount
// ---------------------------------------------------------------------------
describe("calculateLineAmount", () => {
	it("should compute net amount after discount", () => {
		const result = calculateLineAmount(10, 100, 2, 10);
		expect(result.netAmount).toBe(900);
		expect(result.discountAmount).toBe(100);
	});

	it("should not go below zero", () => {
		const result = calculateLineAmount(1, 10, 2, 20);
		expect(result.netAmount).toBe(0);
	});

	it("should handle no discount", () => {
		const result = calculateLineAmount(5, 200);
		expect(result.netAmount).toBe(1000);
		expect(result.discountAmount).toBe(0);
	});
});
