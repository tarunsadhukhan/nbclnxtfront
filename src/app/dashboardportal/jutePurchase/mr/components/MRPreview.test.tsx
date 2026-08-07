/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MRPreview } from "./MRPreview";
import type { JuteMRHeader, MRLineItem } from "../types/mrTypes";

afterEach(cleanup);

// ── Mock data ──

const mockHeader: JuteMRHeader = {
	jute_mr_id: 42,
	mr_num: "MR-2426",
	branch_mr_no: 2426,
	jute_mr_date: "2025-05-23T00:00:00Z",
	branch_id: 1,
	branch_name: "HQ Branch",
	jute_supplier_id: 10,
	supplier_name: "SHIVAM ENTERPRISES",
	party_id: "5",
	party_name: "XYZ Traders",
	party_branch_id: 1,
	party_branch_name: "North Unit",
	party_address: null,
	party_gst_no: null,
	po_id: 37,
	po_no: 37,
	po_num: null,
	po_date: "2025-05-20T00:00:00Z",
	challan_no: "24/25-26",
	challan_date: "2025-05-22T00:00:00Z",
	mukam_id: 1,
	mukam: "JALANGI",
	vehicle_no: "WB/57B/0592",
	unit_conversion: null,
	actual_weight: 5000,
	mr_weight: 4800,
	remarks: "Handle with care",
	status_id: 1,
	status: "Open",
	src_com_id: null,
	jute_gate_entry_date: null,
	updated_by: null,
	updated_date_time: null,
	co_name: null,
	co_logo: null,
	co_address1: null,
	co_address2: null,
	co_zipcode: null,
};

const mockLineItems: MRLineItem[] = [
	{
		id: "li-1",
		juteMrLiId: 1,
		actualItemId: 10,
		actualItemName: "DESI D",
		actualQualityId: 100,
		actualQualityName: "TD-5",
		actualQty: 80,
		challanWeight: 12000,
		actualWeight: 11850,
		allowableMoisture: 18,
		actualMoisture: 19.5,
		claimDust: 2.0,
		shortageKgs: 0,
		acceptedWeight: 11850,
		rate: 7350,
		claimRate: 50,
		claimQuality: "35% LOW OF RS 40/- PER QTL.",
		waterDamageAmount: 0,
		premiumAmount: 0,
		remarks: null,
		warehouseId: null,
		warehousePath: null,
		unitConversion: null,
	},
	{
		id: "li-2",
		juteMrLiId: 2,
		actualItemId: 20,
		actualItemName: "Mesta",
		actualQualityId: 200,
		actualQualityName: "",
		actualQty: 50,
		challanWeight: 5000,
		actualWeight: 4800,
		allowableMoisture: 0,
		actualMoisture: 0,
		claimDust: 0,
		shortageKgs: 100,
		acceptedWeight: 4700,
		rate: 3500,
		claimRate: 0,
		claimQuality: null,
		waterDamageAmount: 0,
		premiumAmount: 0,
		remarks: null,
		warehouseId: null,
		warehousePath: null,
		unitConversion: null,
	},
];

describe("MRPreview", () => {
	// ── Title ──
	it("renders the document title", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		expect(screen.getByText("MATERIAL RECEIPT")).toBeInTheDocument();
	});

	// ── Header fields ──
	it("renders MR number and date", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		expect(screen.getByText("MR-2426")).toBeInTheDocument();
		expect(screen.getByText("23/05/2025")).toBeInTheDocument();
	});

	it("renders supplier (M/S), PO, challan, lorry fields", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		// M/S prefers party_name over supplier_name
		expect(screen.getByText("XYZ Traders")).toBeInTheDocument();
		// PO / challan render combined with their dates
		expect(screen.getByText("37 / 20/05/2025")).toBeInTheDocument();
		expect(screen.getByText("24/25-26 / 22/05/2025")).toBeInTheDocument();
		expect(screen.getByText("WB/57B/0592")).toBeInTheDocument();
	});

	it("renders full formatted PO number when po_num is present", () => {
		render(
			<MRPreview
				header={{ ...mockHeader, po_num: "LCPL/JPO/25-26/00037" }}
				lineItems={[]}
				totalAcceptedWeight={0}
			/>
		);
		expect(screen.getByText("LCPL/JPO/25-26/00037 / 20/05/2025")).toBeInTheDocument();
	});

	it("renders mukam as EX field", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		expect(screen.getByText("JALANGI")).toBeInTheDocument();
	});

	// ── Line items table ──
	it("renders line item with item name and quality concatenated", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getByText("DESI D")).toBeInTheDocument();
		expect(screen.getByText("TD-5")).toBeInTheDocument();
	});

	it("renders Bales/drums (actualQty)", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getByText("80")).toBeInTheDocument();
		expect(screen.getByText("50")).toBeInTheDocument();
	});

	it("renders challan weight as Advised weight column", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		// challanWeight = 12000 → "12,000.00"
		expect(screen.getAllByText("12,000.00").length).toBeGreaterThanOrEqual(1);
	});

	it("renders actualWeight as Mill weight column", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getAllByText("11,850.00").length).toBeGreaterThanOrEqual(1);
	});

	it("renders shortageKgs in Claim in Kgs column", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		// li-2 has shortageKgs = 100, appears in both data row and totals
		const matches = screen.getAllByText("100");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	it("renders rate per quintal", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getAllByText("7,350.00").length).toBeGreaterThanOrEqual(1);
	});

	// ── Claim columns ──
	it("renders claim quality text inline", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		// Concatenated: quality + rate claim + dust shortage, separated by double-space
		expect(screen.getByText(/35% LOW OF RS 40\/- PER QTL\.\s+Rs 50\.00 Claim\s+Dust Shortage 2%/)).toBeInTheDocument();
	});

	it("renders moisture condition as 'actual%(allowable%)'", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		// li-1: actualMoisture=19.5, allowableMoisture=18 → "19.5%(18%)"
		expect(screen.getByText("19.5%(18%)")).toBeInTheDocument();
	});

	it("does NOT render condition for line with zero moisture", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		const { container } = render(
			<MRPreview header={mockHeader} lineItems={[mockLineItems[1]]} totalAcceptedWeight={4700} />
		);
		// li-2 has actualMoisture=0 → condition cell should be empty
		const tables = container.querySelectorAll("table");
		const mainTable = tables[tables.length - 1]; // last table is line items
		const lastRow = mainTable?.querySelectorAll("tbody tr")[0];
		const conditionCell = lastRow?.querySelectorAll("td")[8]; // 9th column (0-indexed)
		expect(conditionCell?.textContent?.trim()).toBe("");
	});

	// ── Totals row ──
	it("renders totals row with correct sums", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		// Total qty: 80+50=130 → "130.00"
		expect(screen.getAllByText("130.00").length).toBeGreaterThanOrEqual(1);
		// Total challan: 12000+5000=17000 → "17,000.00"
		expect(screen.getAllByText("17,000.00").length).toBeGreaterThanOrEqual(1);
	});

	// ── Remarks ──
	it("displays remarks when provided", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getByText("Handle with care")).toBeInTheDocument();
	});

	// ── Status ──
	it("displays status", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getByText("Open")).toBeInTheDocument();
	});

	// ── Print button ──
	it("renders a Print Preview button", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		expect(screen.getByRole("button", { name: /print preview/i })).toBeInTheDocument();
	});

	// ── Null header ──
	it("renders nothing when header is null", () => {
		const { container } = render(
			<MRPreview header={null} lineItems={[]} totalAcceptedWeight={0} />
		);
		expect(container.innerHTML).toBe("");
	});

	// ── Footer ──
	it("renders computer-generated print note", () => {
		render(<MRPreview header={mockHeader} lineItems={[]} totalAcceptedWeight={0} />);
		expect(screen.getByText(/computer generated print/i)).toBeInTheDocument();
	});

	// ── Table headers ──
	it("renders correct column headers matching legacy format", () => {
		render(<MRPreview header={mockHeader} lineItems={mockLineItems} totalAcceptedWeight={16550} />);
		expect(screen.getByText("QUALITY")).toBeInTheDocument();
		expect(screen.getByText("CONDITION")).toBeInTheDocument();
		expect(screen.getByText("CLAIM FOR")).toBeInTheDocument();
	});
});
