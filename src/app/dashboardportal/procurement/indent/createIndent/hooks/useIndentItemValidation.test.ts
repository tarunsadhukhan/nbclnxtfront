/**
 * Tests for useIndentItemValidation hook logic.
 *
 * We test the getQuantityError behavior by rendering the hook with different
 * validation states to verify that backend errors (including has_minmax=false)
 * are correctly surfaced and block item entry.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIndentItemValidation } from "./useIndentItemValidation";

// Mock the service layer
vi.mock("@/utils/indentService", () => ({
	validateItemForIndent: vi.fn(),
}));

import { validateItemForIndent } from "@/utils/indentService";
const mockValidate = vi.mocked(validateItemForIndent);

const defaultParams = {
	branchId: "1",
	indentType: "Regular",
	expenseTypeName: "General",
	expenseTypeId: "1",
};

describe("useIndentItemValidation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getQuantityError — backend errors take priority", () => {
		it("should allow any quantity when has_minmax is false in Logic 1 (Regular/BOM)", async () => {
			// Logic 1: no min/max configured → user may enter any value (no error)
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 0,
				minqty: null,
				maxqty: null,
				min_order_qty: null,
				lead_time: null,
				outstanding_indent_qty: 0,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: null,
				min_indent_qty: null,
				has_minmax: false,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			// No error — free entry when min/max not configured in Logic 1
			const err = result.current.getQuantityError("line-1", "999");
			expect(err).toBeNull();

			// Should also pass allLinesValid
			const valid = result.current.allLinesValid(["line-1"], { "line-1": "999" });
			expect(valid).toBe(true);
		});

		it("should return backend error when stock exceeds max", async () => {
			const errorMsg =
				"Branch stock (90) + outstanding indent qty (20) exceeds max qty (100). Cannot create indent.";

			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [errorMsg],
				branch_stock: 90,
				minqty: 20,
				maxqty: 100,
				min_order_qty: 10,
				lead_time: null,
				outstanding_indent_qty: 20,
				has_open_indent: false,
				stock_exceeds_max: true,
				max_indent_qty: null,
				min_indent_qty: null,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			const err = result.current.getQuantityError("line-1", "5");
			expect(err).toBe(errorMsg);
		});

		it("should return null when min/max is configured and qty is within limit", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 10,
				minqty: 20,
				maxqty: 100,
				min_order_qty: 10,
				lead_time: null,
				outstanding_indent_qty: 5,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 85,
				min_indent_qty: 20,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			const err = result.current.getQuantityError("line-1", "50");
			expect(err).toBeNull();
		});

		it("should return error when qty is not a multiple of reorder qty", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 0,
				minqty: 10,
				maxqty: 100,
				min_order_qty: 8,
				lead_time: null,
				outstanding_indent_qty: 0,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 104,
				min_indent_qty: 10,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			// 15 is not a multiple of 8
			const err = result.current.getQuantityError("line-1", "15");
			expect(err).toContain("multiple of the reorder qty");
			expect(err).toContain("8");
		});

		it("should return null when qty is a valid multiple of reorder qty", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 0,
				minqty: 10,
				maxqty: 100,
				min_order_qty: 8,
				lead_time: null,
				outstanding_indent_qty: 0,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 104,
				min_indent_qty: 10,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			// 24 is a multiple of 8
			const err = result.current.getQuantityError("line-1", "24");
			expect(err).toBeNull();
		});

		it("should return error when qty is below min indent qty", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 0,
				minqty: 10,
				maxqty: 100,
				min_order_qty: 8,
				lead_time: null,
				outstanding_indent_qty: 0,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 104,
				min_indent_qty: 10,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			// 5 is below min indent qty of 10
			const err = result.current.getQuantityError("line-1", "5");
			expect(err).toContain("at least 10");
		});

		it("should return qty exceeded error when qty > maxIndentQty (no backend errors)", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 10,
				minqty: 20,
				maxqty: 100,
				min_order_qty: 10,
				lead_time: null,
				outstanding_indent_qty: 5,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 85,
				min_indent_qty: 20,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			const err = result.current.getQuantityError("line-1", "100");
			expect(err).toContain("exceeds the maximum allowed");
		});
	});

	describe("allLinesValid — blocks submission when errors exist", () => {
		it("should return true when Open/General skips validation (Logic 3)", () => {
			const openParams = {
				branchId: "1",
				indentType: "Open",
				expenseTypeName: "General",
				expenseTypeId: "3",
			};

			const { result } = renderHook(() => useIndentItemValidation(openParams));

			// Open/General is now Logic 3 — no validation, allLinesValid should be true
			const valid = result.current.allLinesValid(["line-1"], { "line-1": "5" });
			expect(valid).toBe(true);
		});

		it("should return false when a line has stock_exceeds_max error (Logic 1)", async () => {
			const errorMsg =
				"Branch stock (90) + outstanding indent qty (20) exceeds max qty (100). Cannot create indent.";

			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [errorMsg],
				branch_stock: 90,
				minqty: 20,
				maxqty: 100,
				min_order_qty: 10,
				lead_time: null,
				outstanding_indent_qty: 20,
				has_open_indent: false,
				stock_exceeds_max: true,
				max_indent_qty: null,
				min_indent_qty: null,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			const valid = result.current.allLinesValid(["line-1"], { "line-1": "5" });
			expect(valid).toBe(false);
		});

		it("should return true when all lines pass validation", async () => {
			mockValidate.mockResolvedValueOnce({
				validation_logic: 1,
				item_id: 10,
				branch_id: 1,
				indent_type: "Regular",
				expense_type_name: "General",
				errors: [],
				branch_stock: 10,
				minqty: 20,
				maxqty: 100,
				min_order_qty: 10,
				lead_time: null,
				outstanding_indent_qty: 5,
				has_open_indent: false,
				stock_exceeds_max: false,
				max_indent_qty: 85,
				min_indent_qty: 20,
				has_minmax: true,
				fy_indent_exists: false,
				fy_indent_no: null,
				fy_duplicate_indent_no: null,
				regular_bom_outstanding: 0,
				forced_qty: null,
				warnings: [],
			});

			const { result } = renderHook(() => useIndentItemValidation(defaultParams));

			await act(async () => {
				await result.current.validateLine("line-1", "10");
			});

			const valid = result.current.allLinesValid(["line-1"], { "line-1": "50" });
			expect(valid).toBe(true);
		});
	});

	describe("Logic 3 — no validation", () => {
		it("should skip validation for Logic 3 (Capital expense)", () => {
			const capitalParams = {
				branchId: "1",
				indentType: "Regular",
				expenseTypeName: "Capital",
				expenseTypeId: "5",
			};

			const { result } = renderHook(() => useIndentItemValidation(capitalParams));

			// validateLine should be a no-op for Logic 3
			// getQuantityError should return null for unknown lines
			const err = result.current.getQuantityError("line-1", "999");
			expect(err).toBeNull();
		});
	});
});
