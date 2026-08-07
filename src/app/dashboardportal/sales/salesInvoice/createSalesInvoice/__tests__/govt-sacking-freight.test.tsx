import { describe, it, expect } from "vitest";
import {
	GOVT_SKG_FREIGHT_INVOICE_TYPE_ID,
	isGovtSkgFreightInvoice,
	isGovtSkgInvoice,
	hasTypeSpecificHeader,
	hasTypeSpecificLineItems,
} from "../utils/salesInvoiceConstants";
import { buildFreightCreatePreviewProps } from "../utils/buildFreightCreatePreviewProps";
import { buildFreightPreviewProps } from "../utils/buildFreightPreviewProps";
import type { GovtSackingSourceDetail } from "../types/salesInvoiceTypes";
import type { InvoiceDetails } from "@/utils/salesInvoiceService";

describe("Govt Sacking Freight - constants & predicates", () => {
	it("declares the type id as '7'", () => {
		expect(GOVT_SKG_FREIGHT_INVOICE_TYPE_ID).toBe("7");
	});

	it("isGovtSkgFreightInvoice matches type 7 only", () => {
		expect(isGovtSkgFreightInvoice("7")).toBe(true);
		expect(isGovtSkgFreightInvoice(7)).toBe(true);
		expect(isGovtSkgFreightInvoice("3")).toBe(false);
		expect(isGovtSkgFreightInvoice(undefined)).toBe(false);
		expect(isGovtSkgFreightInvoice(null)).toBe(false);
		expect(isGovtSkgFreightInvoice("")).toBe(false);
	});

	it("does not collide with the existing Govt Sacking (type 3) predicate", () => {
		expect(isGovtSkgInvoice("7")).toBe(false);
		expect(isGovtSkgFreightInvoice("3")).toBe(false);
	});

	it("type 7 is intentionally NOT in hasTypeSpecificHeader / LineItems (freight uses its own form)", () => {
		expect(hasTypeSpecificHeader("7")).toBe(false);
		expect(hasTypeSpecificLineItems("7")).toBe(false);
	});
});

describe("buildFreightCreatePreviewProps — header parity with Govt Sacking (type 3)", () => {
	const makeSource = (overrides: Partial<GovtSackingSourceDetail["header"]> = {}): GovtSackingSourceDetail => ({
		header: {
			invoice_id: 12345,
			invoice_no: 452,
			invoice_date: "2025-12-15",
			invoice_type: 3,
			party_id: 77,
			party_name: "Bihar State Cooperative Marketing Union",
			billing_to_id: 77,
			shipping_to_id: 77,
			billing_state_code: 10,
			shipping_state_code: 10,
			intra_inter_state: 0,
			branch_id: 5,
			co_id: 1,
			sales_order_id: 169,
			sales_order_no: 169,
			sales_delivery_order_id: null,
			delivery_order_no: null,
			transporter_id: 99,
			transporter_name: "XYZ Transporters",
			transporter_address: "Kolkata",
			transporter_state_code: "19",
			transporter_state_name: "West Bengal",
			transporter_branch_id: 42,
			transporter_doc_no: "TD/99/2025",
			transporter_doc_date: "2025-12-14",
			buyer_order_no: "BO/169",
			buyer_order_date: "2025-12-10",
			vehicle_no: "WB19G5455",
			container_no: null,
			pcso_no: "BRFCK/25/7890",
			pcso_date: "2025-12-15",
			administrative_office_address: "Patna",
			destination_rail_head: "Katihar",
			loading_point: "Kolkata",
			mode_of_transport: "Road",
			billing_address: "Gandhi Maidan Road",
			billing_address_additional: "Near Collectorate",
			billing_zip_code: "800001",
			billing_state_name: "Bihar",
			billing_gst_no: "10AAAPB0000A1Z5",
			shipping_address: "Warehouse 12, Industrial Area",
			shipping_address_additional: "Sector 4",
			shipping_zip_code: "800002",
			shipping_state_name: "Bihar",
			shipping_gst_no: "10AAAPB0000A1Z5",
			transporter_gst_no: "19AAACT0000B1Z9",
			eway_bill_no: "EWB1234567890",
			eway_bill_date: "2025-12-15",
			sales_order_no_formatted: "VOW/KOL/SO/25-26/169",
			sales_order_date: "2025-06-10",
			invoice_no_formatted: "VOW/KOL/SI/25-26/452",
			...overrides,
		},
		lines: [
			{
				item_id: 201,
				item_name: "PRINTED TYPE-A JUTE BAG(580GMS)",
				hsn_code: "63051040",
				quantity: 500,
				uom_id: 17,
				uom_name: "Bale",
				pack_sheet: null,
				net_weight: null,
				total_weight: null,
			},
		],
	});

	const baseArgs = {
		setupData: null,
		branchId: "5",
		invoiceDate: "2026-04-20",
		iwBillNo: "IW/2026/77",
		iwBillDate: "2026-04-19",
		containerNo: "CNTR-9999",
		vehicleNo: "",
		freightAmount: 10000,
		balesQty: 500,
		footerNote: "",
	};

	it("joins billing/shipping branch address parts into a single line", () => {
		const result = buildFreightCreatePreviewProps({ ...baseArgs, sources: [makeSource()] });
		expect(result.header.billingToAddress).toBe(
			"Gandhi Maidan Road, Near Collectorate, 800001, Bihar",
		);
		expect(result.header.shippingToAddress).toBe(
			"Warehouse 12, Industrial Area, Sector 4, 800002, Bihar",
		);
		expect(result.header.billingToGstin).toBe("10AAAPB0000A1Z5");
		expect(result.header.shippingToGstin).toBe("10AAAPB0000A1Z5");
	});

	it("uses the FY-formatted sales order number when the backend provides one", () => {
		const result = buildFreightCreatePreviewProps({ ...baseArgs, sources: [makeSource()] });
		expect(result.header.salesOrderNo).toBe("VOW/KOL/SO/25-26/169");
		expect(result.header.saleNo).toBeUndefined();
	});

	it("falls back to the raw sales_order_no when no formatted value is supplied", () => {
		const result = buildFreightCreatePreviewProps({
			...baseArgs,
			sources: [makeSource({ sales_order_no_formatted: null })],
		});
		expect(result.header.salesOrderNo).toBe("169");
	});

	it("surfaces mode of transport, transporter GST, and e-way bill on the preview header", () => {
		const result = buildFreightCreatePreviewProps({ ...baseArgs, sources: [makeSource()] });
		expect(result.header.modeOfTransport).toBe("Road");
		expect(result.header.transporterGstNo).toBe("19AAACT0000B1Z9");
		expect(result.header.transporterDocNo).toBe("TD/99/2025");
		expect(result.header.ewayBillNo).toBe("EWB1234567890");
	});

	it("auto-appends a reference to the source Govt Sacking invoice in remarks using the formatted invoice no.", () => {
		const result = buildFreightCreatePreviewProps({ ...baseArgs, sources: [makeSource()] });
		expect(result.remarks).toContain("Source Invoices: VOW/KOL/SI/25-26/452");
		expect(result.remarks).toContain("dated 2025-12-15");
	});

	it("falls back to the raw invoice_no when no formatted value is supplied", () => {
		const result = buildFreightCreatePreviewProps({
			...baseArgs,
			sources: [makeSource({ invoice_no_formatted: null })],
		});
		expect(result.remarks).toContain("Source Invoices: 452");
	});

	it("preserves user footer note alongside auto-appended reference and IW/container segments", () => {
		const result = buildFreightCreatePreviewProps({
			...baseArgs,
			footerNote: "Manual note",
			sources: [makeSource()],
		});
		expect(result.remarks).toMatch(/Manual note.*Source Invoices: VOW\/KOL\/SI\/25-26\/452/);
		expect(result.remarks).toContain("IW Bill No.IW/2026/77");
		expect(result.remarks).toContain("Container No.CNTR-9999");
	});

	it("multi-source: footer lists every selected source invoice; PCSO and DO appear once each", () => {
		const a = makeSource({
			invoice_no: 452,
			invoice_no_formatted: "VOW/KOL/SI/25-26/452",
			invoice_date: "2025-12-15",
			delivery_order_no: 77,
			delivery_order_no_formatted: "VOW/KOL/DO/25-26/77",
		});
		const b = makeSource({
			invoice_id: 12346,
			invoice_no: 453,
			invoice_no_formatted: "VOW/KOL/SI/25-26/453",
			invoice_date: "2025-12-16",
			delivery_order_no: 77,
			delivery_order_no_formatted: "VOW/KOL/DO/25-26/77",
		});
		const result = buildFreightCreatePreviewProps({ ...baseArgs, sources: [a, b] });
		expect(result.remarks).toContain("Source Invoices: VOW/KOL/SI/25-26/452 dated 2025-12-15, VOW/KOL/SI/25-26/453 dated 2025-12-16");
		// DO segment appears exactly once with the formatted DO from the primary source
		expect(result.remarks).toContain("DO VOW/KOL/DO/25-26/77");
		const doMatches = (result.remarks?.match(/DO VOW\/KOL\/DO\/25-26\/77/g) ?? []).length;
		expect(doMatches).toBe(1);
	});

	it("optional container: empty containerNo omits the 'Container No.' segment from remarks", () => {
		const result = buildFreightCreatePreviewProps({
			...baseArgs,
			containerNo: "",
			sources: [makeSource()],
		});
		expect(result.remarks).not.toContain("Container No.");
		expect(result.remarks).toContain("IW Bill No.IW/2026/77");
	});

	it("source DO is rendered in the printable header (deliveryOrderNo) using the formatted value", () => {
		const result = buildFreightCreatePreviewProps({
			...baseArgs,
			sources: [makeSource({
				delivery_order_no: 77,
				delivery_order_no_formatted: "VOW/KOL/DO/25-26/77",
			})],
		});
		expect(result.header.deliveryOrderNo).toBe("VOW/KOL/DO/25-26/77");
		expect(result.remarks).toContain("DO VOW/KOL/DO/25-26/77");
	});
});

describe("buildFreightPreviewProps — view-mode totals normalization", () => {
	const baseInvoice = (overrides: Partial<InvoiceDetails> = {}): InvoiceDetails => ({
		id: "55555",
		invoiceNo: "EJM/F/SO/26-27/46",
		invoiceDate: "2026-05-05",
		branchId: "5",
		party: "MP State Civil Supplies",
		intraInterState: 1, // inter-state → IGST
		lines: [
			{
				invoice_line_item_id: 70001,
				item_id: 9001,
				itemName: "Freight Charges",
				hsnCode: "996519",
				quantity: 48,
				uom: "BALES",
				rate: 1437.98,
				netAmount: 69023,
				totalAmount: 81447.14,
				remarks: "PRINTED TYPE-A JUTE BAG(580GMS) — 48 bales",
				gst: {
					cgstAmount: 0,
					sgstAmount: 0,
					igstAmount: 12424.14,
					cgstPercent: 0,
					sgstPercent: 0,
					igstPercent: 18,
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any,
		],
		...overrides,
	} as unknown as InvoiceDetails);

	it("post-fix BE shape: pre-tax grossAmount renders Total = freight, Grand Total = freight + IGST", () => {
		const invoice = baseInvoice({ grossAmount: 69023 });
		const props = buildFreightPreviewProps(invoice);
		expect(props.totals.grossAmount).toBe(69023);
		expect(props.totals.totalIGST).toBe(12424.14);
		expect(props.totals.netAmount).toBe(81447.14);
	});

	it("legacy post-tax BE shape: defensive normalization strips IGST from grossAmount", () => {
		// Pre-fix BE stored invoice_amount = freight + tax (81447.14). FE must detect
		// and normalize so the printed Total still shows 69023 and Grand Total 81447.14.
		const invoice = baseInvoice({ grossAmount: 81447.14 });
		const props = buildFreightPreviewProps(invoice);
		expect(props.totals.grossAmount).toBe(69023);
		expect(props.totals.totalIGST).toBe(12424.14);
		expect(props.totals.netAmount).toBe(81447.14);
	});

	it("does NOT normalize when grossAmount and lineNet+tax disagree (real edit scenario)", () => {
		// If grossAmount (50000) does not match lineNet (69023) + tax (12424.14) within
		// rounding, leave grossAmount alone — the discrepancy means it is not a legacy
		// post-tax artifact and we should not silently rewrite it.
		const invoice = baseInvoice({ grossAmount: 50000 });
		const props = buildFreightPreviewProps(invoice);
		expect(props.totals.grossAmount).toBe(50000);
	});
});

describe("Govt Sacking Freight — RAIL relabel", () => {
	const railSource = (): GovtSackingSourceDetail => ({
		header: {
			invoice_id: 1,
			invoice_no: 1,
			invoice_date: "2026-01-01",
			invoice_type: 3,
			party_id: 1,
			party_name: "P",
			billing_to_id: 1,
			shipping_to_id: 1,
			billing_state_code: 10,
			shipping_state_code: 10,
			intra_inter_state: 0,
			branch_id: 5,
			co_id: 1,
			sales_order_id: 1,
			sales_order_no: 1,
			sales_delivery_order_id: null,
			delivery_order_no: null,
			transporter_id: 1,
			transporter_name: null,
			transporter_address: null,
			transporter_state_code: null,
			transporter_state_name: null,
			transporter_branch_id: null,
			transporter_doc_no: null,
			transporter_doc_date: null,
			buyer_order_no: null,
			buyer_order_date: null,
			vehicle_no: null,
			container_no: null,
			pcso_no: "PCSO/1",
			pcso_date: "2026-01-01",
			administrative_office_address: null,
			destination_rail_head: null,
			loading_point: null,
			mode_of_transport: "RAIL",
		},
		lines: [],
	});

	it("create-mode preview: 'IW Bill No' → 'RR No' when source mode_of_transport === RAIL", () => {
		const result = buildFreightCreatePreviewProps({
			setupData: null,
			branchId: "5",
			sources: [railSource()],
			invoiceDate: "2026-04-20",
			iwBillNo: "RR12345",
			iwBillDate: "2026-04-19",
			containerNo: "",
			vehicleNo: "",
			freightAmount: 1000,
			balesQty: 10,
			footerNote: "",
		});
		expect(result.remarks).toContain("RR No.RR12345");
		expect(result.remarks).not.toContain("IW Bill No.");
	});

	it("create-mode preview: keeps 'IW Bill No' label for non-rail modes (e.g. Road)", () => {
		const src = railSource();
		src.header.mode_of_transport = "Road";
		const result = buildFreightCreatePreviewProps({
			setupData: null,
			branchId: "5",
			sources: [src],
			invoiceDate: "2026-04-20",
			iwBillNo: "IW/2026/77",
			iwBillDate: "2026-04-19",
			containerNo: "",
			vehicleNo: "",
			freightAmount: 1000,
			balesQty: 10,
			footerNote: "",
		});
		expect(result.remarks).toContain("IW Bill No.IW/2026/77");
		expect(result.remarks).not.toContain("RR No.");
	});

	it("create-mode RAIL match is case-insensitive ('rail', ' Rail ')", () => {
		const cases = ["rail", "Rail", " RAIL ", "raIL"];
		for (const m of cases) {
			const src = railSource();
			src.header.mode_of_transport = m;
			const result = buildFreightCreatePreviewProps({
				setupData: null,
				branchId: "5",
				sources: [src],
				invoiceDate: "2026-04-20",
				iwBillNo: "X",
				iwBillDate: "",
				containerNo: "",
				vehicleNo: "",
				freightAmount: 1,
				balesQty: 1,
				footerNote: "",
			});
			expect(result.remarks).toContain("RR No.X");
		}
	});

	it("view-mode preview: rebuilds remarks with 'RR No.' for RAIL invoices and ignores stored footerNote wording", () => {
		const invoice = {
			id: "10",
			invoiceNo: "X",
			invoiceDate: "2026-05-05",
			branchId: "5",
			party: "P",
			intraInterState: 0,
			containerNo: "CNTR-1",
			footerNote: "PCSO No.PCSO/1 | IW Bill No.RR777 | Container No.CNTR-1",
			govtskg: { pcsoNo: "PCSO/1", pcsoDate: "2026-01-01", modeOfTransport: "RAIL" },
			freight: {
				sourceInvoiceId: 1,
				iwBillNo: "RR777",
				iwBillDate: "2026-05-04",
				source: { invoice_id: 1, invoice_no: 1, invoice_no_formatted: "VOW/X/1", invoice_date: "2026-01-01", pcso_no: "PCSO/1" },
			},
			lines: [{ netAmount: 1000, totalAmount: 1180, gst: { igstAmount: 180, igstPercent: 18 } }],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as InvoiceDetails;
		const props = buildFreightPreviewProps(invoice);
		expect(props.remarks).toContain("RR No.RR777");
		expect(props.remarks).not.toContain("IW Bill No.");
		expect(props.remarks).toContain("Container No.CNTR-1");
		expect(props.remarks).toContain("Source Invoices: VOW/X/1");
	});

	it("view-mode preview: preserves 'IW Bill No.' for non-rail modes", () => {
		const invoice = {
			id: "11",
			invoiceNo: "X",
			invoiceDate: "2026-05-05",
			branchId: "5",
			party: "P",
			intraInterState: 0,
			containerNo: "CNTR-2",
			govtskg: { pcsoNo: "PCSO/2", pcsoDate: "2026-01-01", modeOfTransport: "Road" },
			freight: {
				sourceInvoiceId: 1,
				iwBillNo: "IW/2026/77",
				iwBillDate: "2026-05-04",
				source: { invoice_id: 1, invoice_no: 1, invoice_no_formatted: "VOW/X/1", invoice_date: "2026-01-01", pcso_no: "PCSO/2" },
			},
			lines: [{ netAmount: 1000, totalAmount: 1180, gst: { igstAmount: 180, igstPercent: 18 } }],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as InvoiceDetails;
		const props = buildFreightPreviewProps(invoice);
		expect(props.remarks).toContain("IW Bill No.IW/2026/77");
		expect(props.remarks).not.toContain("RR No.");
	});
});

describe("Govt Sacking Freight — view-mode status label", () => {
	const baseInvoice = (overrides: Partial<InvoiceDetails> = {}): InvoiceDetails => ({
		id: "999",
		invoiceNo: "X",
		invoiceDate: "2026-05-05",
		branchId: "5",
		party: "P",
		intraInterState: 0,
		lines: [],
		...overrides,
	} as unknown as InvoiceDetails);

	it("maps statusId=3 (Approved) to label 'Approved' instead of falling back to invoice.status='Drafted'", () => {
		const invoice = baseInvoice({ statusId: 3, status: "Drafted" });
		const props = buildFreightPreviewProps(invoice);
		expect(props.header.status).toBe("Approved");
	});

	it("maps statusId=20 (Pending Approval) to 'Pending Approval'", () => {
		const invoice = baseInvoice({ statusId: 20, status: "Drafted" });
		const props = buildFreightPreviewProps(invoice);
		expect(props.header.status).toBe("Pending Approval");
	});

	it("maps statusId=21 (Draft) to 'Draft'", () => {
		const invoice = baseInvoice({ statusId: 21, status: "Drafted" });
		const props = buildFreightPreviewProps(invoice);
		expect(props.header.status).toBe("Draft");
	});

	it("falls back to raw invoice.status when statusId is missing", () => {
		const invoice = baseInvoice({ statusId: undefined, status: "Some Custom" });
		const props = buildFreightPreviewProps(invoice);
		expect(props.header.status).toBe("Some Custom");
	});
});
