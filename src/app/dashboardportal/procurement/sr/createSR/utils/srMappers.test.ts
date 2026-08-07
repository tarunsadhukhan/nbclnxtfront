/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mapSRLineItems } from "./srMappers";
import type { SRHeader, SRLineItemRaw } from "../types/srTypes";

/**
 * Minimal mock header for mapper tests.
 */
const mockHeader: SRHeader = {
	inward_id: 10,
	inward_no: "INW-001",
	inward_date: "2026-01-15",
	branch_id: 1,
	branch_name: "Main",
	supplier_id: 5,
	supplier_name: "Supplier A",
	supplier_branch_id: null,
	supplier_branch_options: [],
	supplier_state_id: 1,
	supplier_state_name: "Maharashtra",
	bill_branch_id: 1,
	billing_branch_name: "Main",
	billing_state_id: 1,
	billing_state_name: "Maharashtra",
	ship_branch_id: 1,
	shipping_branch_name: "Main",
	shipping_state_id: 1,
	shipping_state_name: "Maharashtra",
	india_gst: true,
	sr_no: "",
	sr_date: "",
	sr_status: 21,
	sr_status_name: "Draft",
	inspection_date: "",
	challan_no: "",
	challan_date: "",
	invoice_no: "",
	invoice_date: "",
	invoice_amount: 0,
	invoice_recvd_date: "",
	vehicle_number: "",
	driver_name: "",
	driver_contact_no: "",
	consignment_no: "",
	consignment_date: "",
	ewaybillno: "",
	ewaybill_date: "",
	despatch_remarks: "",
	receipts_remarks: "",
	sr_remarks: "",
	gross_amount: 0,
	net_amount: 0,
};

describe("mapSRLineItems — warehouse_path mapping", () => {
	it("should map warehouse_path from raw data", () => {
		const raw: SRLineItemRaw[] = [
			{
				inward_dtl_id: 100,
				item_id: 1,
				item_code: "ITM001",
				item_name: "Test Item",
				uom_id: 1,
				uom_name: "KG",
				approved_qty: 10,
				rate: 100,
				accepted_rate: 100,
				warehouse_id: 3,
				warehouse_name: "Shelf 1",
				warehouse_path: "Main Store-Section A-Shelf 1",
				tax_percentage: 0,
			},
		];

		const result = mapSRLineItems(raw, mockHeader);

		expect(result).toHaveLength(1);
		expect(result[0].warehouse_path).toBe("Main Store-Section A-Shelf 1");
		expect(result[0].warehouse_name).toBe("Shelf 1");
	});

	it("should fallback to warehouse_name when warehouse_path is missing", () => {
		const raw: SRLineItemRaw[] = [
			{
				inward_dtl_id: 101,
				item_id: 2,
				item_code: "ITM002",
				item_name: "Other Item",
				uom_id: 1,
				uom_name: "KG",
				approved_qty: 5,
				rate: 50,
				accepted_rate: 50,
				warehouse_id: 1,
				warehouse_name: "Storage Room",
				// warehouse_path is NOT present
				tax_percentage: 0,
			},
		];

		const result = mapSRLineItems(raw, mockHeader);

		expect(result).toHaveLength(1);
		expect(result[0].warehouse_path).toBe("Storage Room");
		expect(result[0].warehouse_name).toBe("Storage Room");
	});

	it("should set empty string for warehouse_path when both path and name are missing", () => {
		const raw: SRLineItemRaw[] = [
			{
				inward_dtl_id: 102,
				item_id: 3,
				item_code: "ITM003",
				item_name: "Another Item",
				uom_id: 1,
				uom_name: "KG",
				approved_qty: 1,
				rate: 10,
				accepted_rate: 10,
				warehouse_id: null,
				// No warehouse_name or warehouse_path
				tax_percentage: 0,
			},
		];

		const result = mapSRLineItems(raw, mockHeader);

		expect(result).toHaveLength(1);
		expect(result[0].warehouse_path).toBe("");
		expect(result[0].warehouse_name).toBe("");
		expect(result[0].warehouse_id).toBeNull();
	});

	it("should return empty array for null/undefined input", () => {
		expect(mapSRLineItems(null, mockHeader)).toEqual([]);
		expect(mapSRLineItems(undefined, mockHeader)).toEqual([]);
		expect(mapSRLineItems([], mockHeader)).toEqual([]);
	});
});
