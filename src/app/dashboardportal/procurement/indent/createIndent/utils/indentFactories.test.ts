
import {
	createBlankLine,
	buildDefaultFormValues,
	lineHasAnyData,
	lineIsComplete,
} from "./indentFactories";
import type { EditableLineItem } from "../types/indentTypes";

describe("indentFactories", () => {
	describe("createBlankLine", () => {
		it("should create a line with a unique id", () => {
			const line1 = createBlankLine();
			const line2 = createBlankLine();

			expect(line1.id).toBeDefined();
			expect(line2.id).toBeDefined();
			expect(line1.id).not.toBe(line2.id);
		});

		it("should create a line with all empty string fields", () => {
			const line = createBlankLine();

			expect(line.department).toBe("");
			expect(line.itemGroup).toBe("");
			expect(line.item).toBe("");
			expect(line.itemMake).toBe("");
			expect(line.quantity).toBe("");
			expect(line.uom).toBe("");
			expect(line.remarks).toBe("");
		});

		it("should generate ids with 'line-' prefix", () => {
			const line = createBlankLine();
			expect(line.id).toMatch(/^line-\d+$/);
		});
	});

	describe("buildDefaultFormValues", () => {
		it("should return an object with all required default fields", () => {
			const defaults = buildDefaultFormValues();

			expect(defaults).toHaveProperty("branch");
			expect(defaults).toHaveProperty("indent_type");
			expect(defaults).toHaveProperty("expense_type");
			expect(defaults).toHaveProperty("date");
			expect(defaults).toHaveProperty("indent_no");
			expect(defaults).toHaveProperty("project");
			expect(defaults).toHaveProperty("requester");
			expect(defaults).toHaveProperty("remarks");
		});

		it("should have empty strings for text fields", () => {
			const defaults = buildDefaultFormValues();

			expect(defaults.branch).toBe("");
			expect(defaults.indent_type).toBe("");
			expect(defaults.expense_type).toBe("");
			expect(defaults.indent_no).toBe("");
			expect(defaults.project).toBe("");
			expect(defaults.requester).toBe("");
			expect(defaults.remarks).toBe("");
		});

		it("should have today's date in YYYY-MM-DD format", () => {
			const defaults = buildDefaultFormValues();
			const today = new Date().toISOString().slice(0, 10);

			expect(defaults.date).toBe(today);
		});
	});

	describe("lineHasAnyData", () => {
		let blankLine: EditableLineItem;

		beforeEach(() => {
			blankLine = {
				id: "line-1",
				department: "",
				itemGroup: "",
				item: "",
				itemMake: "",
				quantity: "",
				uom: "",
				remarks: "",
			};
		});

		it("should return false for a completely blank line", () => {
			expect(lineHasAnyData(blankLine)).toBe(false);
		});

		it("should return true if department has data", () => {
			const line = { ...blankLine, department: "DEPT1" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if itemGroup has data", () => {
			const line = { ...blankLine, itemGroup: "GROUP1" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if item has data", () => {
			const line = { ...blankLine, item: "ITEM1" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if itemMake has data", () => {
			const line = { ...blankLine, itemMake: "MAKE1" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if quantity has data", () => {
			const line = { ...blankLine, quantity: "10" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if uom has data", () => {
			const line = { ...blankLine, uom: "PCS" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if remarks has data", () => {
			const line = { ...blankLine, remarks: "Some notes" };
			expect(lineHasAnyData(line)).toBe(true);
		});

		it("should return true if multiple fields have data", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				quantity: "5",
			};
			expect(lineHasAnyData(line)).toBe(true);
		});
	});

	describe("lineIsComplete", () => {
		let blankLine: EditableLineItem;

		beforeEach(() => {
			blankLine = {
				id: "line-1",
				department: "",
				itemGroup: "",
				item: "",
				itemMake: "",
				quantity: "",
				uom: "",
				remarks: "",
			};
		});

		it("should return false for a blank line", () => {
			expect(lineIsComplete(blankLine)).toBe(false);
		});

		it("should return false if itemGroup is missing", () => {
			const line = {
				...blankLine,
				item: "ITEM1",
				uom: "PCS",
				quantity: "10",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if item is missing", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				uom: "PCS",
				quantity: "10",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if uom is missing", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				quantity: "10",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if quantity is missing", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if quantity is zero", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
				quantity: "0",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if quantity is negative", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
				quantity: "-5",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return false if quantity is not a valid number", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
				quantity: "abc",
			};
			expect(lineIsComplete(line)).toBe(false);
		});

		it("should return true for a complete line with all required fields", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
				quantity: "10",
			};
			expect(lineIsComplete(line)).toBe(true);
		});

		it("should return true for a complete line with decimal quantity", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "KG",
				quantity: "2.5",
			};
			expect(lineIsComplete(line)).toBe(true);
		});

		it("should return true even without optional fields (department, itemMake, remarks)", () => {
			const line = {
				...blankLine,
				itemGroup: "GROUP1",
				item: "ITEM1",
				uom: "PCS",
				quantity: "1",
				// department, itemMake, remarks are empty - still complete
			};
			expect(lineIsComplete(line)).toBe(true);
		});

		it("should return true for a fully filled line", () => {
			const line: EditableLineItem = {
				id: "line-1",
				department: "DEPT1",
				itemGroup: "GROUP1",
				item: "ITEM1",
				itemMake: "MAKE1",
				quantity: "100",
				uom: "PCS",
				remarks: "Urgent order",
			};
			expect(lineIsComplete(line)).toBe(true);
		});
	});
});
