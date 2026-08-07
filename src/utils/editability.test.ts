import { describe, it, expect } from "vitest";
import {
	EDITABLE_STATUS_IDS,
	NON_EDITABLE_STATUS_IDS,
	createStatusBasedEditCheck,
	createBooleanFieldEditCheck,
	createNotEqualEditCheck,
} from "./editability";

describe("editability utilities", () => {
	describe("constants", () => {
		it("EDITABLE_STATUS_IDS should contain Draft (21) and Open (1)", () => {
			expect(EDITABLE_STATUS_IDS).toContain(21);
			expect(EDITABLE_STATUS_IDS).toContain(1);
			expect(EDITABLE_STATUS_IDS).toHaveLength(2);
		});

		it("NON_EDITABLE_STATUS_IDS should contain all non-editable statuses", () => {
			expect(NON_EDITABLE_STATUS_IDS).toContain(20); // Pending Approval
			expect(NON_EDITABLE_STATUS_IDS).toContain(3);  // Approved
			expect(NON_EDITABLE_STATUS_IDS).toContain(4);  // Rejected
			expect(NON_EDITABLE_STATUS_IDS).toContain(5);  // Closed
			expect(NON_EDITABLE_STATUS_IDS).toContain(6);  // Cancelled
			expect(NON_EDITABLE_STATUS_IDS).toHaveLength(5);
		});

		it("constants should be frozen (immutable)", () => {
			expect(Object.isFrozen(EDITABLE_STATUS_IDS)).toBe(true);
			expect(Object.isFrozen(NON_EDITABLE_STATUS_IDS)).toBe(true);
		});
	});

	describe("createStatusBasedEditCheck", () => {
		it("should return true for editable status IDs", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status_id",
				editableStatuses: [21, 1],
			});
			expect(check({ status_id: 21 })).toBe(true);  // Draft
			expect(check({ status_id: 1 })).toBe(true);   // Open
		});

		it("should return false for non-editable status IDs", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status_id",
				editableStatuses: [21, 1],
			});
			expect(check({ status_id: 3 })).toBe(false);  // Approved
			expect(check({ status_id: 20 })).toBe(false); // Pending
			expect(check({ status_id: 4 })).toBe(false);  // Rejected
		});

		it("should return false for null/undefined status", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status_id",
				editableStatuses: [21, 1],
			});
			expect(check({ status_id: null })).toBe(false);
			expect(check({ status_id: undefined })).toBe(false);
		});

		it("should work with string statuses", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status",
				editableStatuses: ["Draft", "Open"],
			});
			expect(check({ status: "Draft" })).toBe(true);
			expect(check({ status: "Open" })).toBe(true);
			expect(check({ status: "Approved" })).toBe(false);
		});

		it("should support case-insensitive matching", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status",
				editableStatuses: ["Draft", "Open"],
				caseInsensitive: true,
			});
			expect(check({ status: "draft" })).toBe(true);
			expect(check({ status: "OPEN" })).toBe(true);
			expect(check({ status: "DRAFT" })).toBe(true);
			expect(check({ status: "approved" })).toBe(false);
		});

		it("should be case-sensitive by default", () => {
			const check = createStatusBasedEditCheck({
				statusField: "status",
				editableStatuses: ["Draft", "Open"],
			});
			expect(check({ status: "Draft" })).toBe(true);
			expect(check({ status: "draft" })).toBe(false); // Case mismatch
		});
	});

	describe("createBooleanFieldEditCheck", () => {
		it("should return true when field matches editableWhen=false", () => {
			const check = createBooleanFieldEditCheck("inspection_check", false);
			expect(check({ inspection_check: false })).toBe(true);
			expect(check({ inspection_check: 0 })).toBe(true);
			expect(check({ inspection_check: null })).toBe(true);
			expect(check({ inspection_check: undefined })).toBe(true);
			expect(check({ inspection_check: "" })).toBe(true);
		});

		it("should return false when field does not match editableWhen=false", () => {
			const check = createBooleanFieldEditCheck("inspection_check", false);
			expect(check({ inspection_check: true })).toBe(false);
			expect(check({ inspection_check: 1 })).toBe(false);
			expect(check({ inspection_check: "yes" })).toBe(false);
		});

		it("should work with editableWhen=true", () => {
			const check = createBooleanFieldEditCheck("is_active", true);
			expect(check({ is_active: true })).toBe(true);
			expect(check({ is_active: false })).toBe(false);
		});
	});

	describe("createNotEqualEditCheck", () => {
		it("should return true when field does not equal completed value", () => {
			const check = createNotEqualEditCheck("bill_pass_complete", 1);
			expect(check({ bill_pass_complete: 0 })).toBe(true);
			expect(check({ bill_pass_complete: null })).toBe(true);
			expect(check({ bill_pass_complete: undefined })).toBe(true);
		});

		it("should return false when field equals completed value", () => {
			const check = createNotEqualEditCheck("bill_pass_complete", 1);
			expect(check({ bill_pass_complete: 1 })).toBe(false);
		});

		it("should work with string values", () => {
			const check = createNotEqualEditCheck("status", "closed");
			expect(check({ status: "open" })).toBe(true);
			expect(check({ status: "closed" })).toBe(false);
		});
	});
});
