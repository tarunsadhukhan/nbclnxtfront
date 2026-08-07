import type {
	InvoicePreviewAdditionalCharge,
	InvoicePreviewHeader,
	InvoicePreviewItem,
	InvoicePreviewTotals,
} from "../components/SalesInvoicePreview";
import type { GovtSackingSourceDetail, InvoiceSetupData } from "../types/salesInvoiceTypes";
import { GOVT_SKG_FREIGHT_INVOICE_TYPE_ID } from "./salesInvoiceConstants";
import { computeFreightTax, FREIGHT_HSN } from "./freightTax";

export type FreightCreatePreviewArgs = {
	setupData: InvoiceSetupData | null;
	branchId: string;
	sources: GovtSackingSourceDetail[];
	invoiceDate: string;
	iwBillNo: string;
	iwBillDate: string;
	containerNo: string;
	vehicleNo: string;
	freightAmount: number;
	balesQty: number;
	footerNote: string;
};

export type FreightCreatePreviewProps = {
	header: InvoicePreviewHeader;
	items: InvoicePreviewItem[];
	additionalCharges: InvoicePreviewAdditionalCharge[];
	totals: InvoicePreviewTotals;
	remarks?: string;
};

const joinAddress = (...parts: Array<string | number | null | undefined>): string | undefined => {
	const pieces = parts
		.map((p) => (p == null ? "" : String(p).trim()))
		.filter(Boolean);
	return pieces.length ? pieces.join(", ") : undefined;
};

/**
 * Builds props for `SalesInvoicePreview` from the freight (type 7) create-mode inputs.
 * Mirrors the shape of `previewHeader`/`previewItems`/`previewTotals` that page.tsx
 * builds for types 1–6 so the tally layout is visually identical to Govt Sacking (type 3).
 */
export function buildFreightCreatePreviewProps(args: FreightCreatePreviewArgs): FreightCreatePreviewProps {
	const { setupData, branchId, sources, invoiceDate, iwBillNo, iwBillDate, containerNo, vehicleNo, freightAmount, balesQty, footerNote } = args;

	const source = sources[0] ?? null;
	const header = source?.header;
	const sourceBranch = setupData?.branches?.find((b) => b.branch_id === header?.branch_id);
	const sourceBranchStateCode = sourceBranch?.state_code;
	const sourceShippingStateCode = header?.shipping_state_code;
	const computedIntraInter =
		sourceBranchStateCode != null && sourceShippingStateCode != null
			? (String(sourceBranchStateCode) === String(sourceShippingStateCode) ? "0" : "1")
			: header?.intra_inter_state;
	const tax = computeFreightTax(freightAmount, computedIntraInter);

	const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchId);
	const company = setupData?.company;

	const companyAddress = company
		? joinAddress(company.co_address1, company.co_address2, company.co_zipcode, company.state_name)
		: undefined;
	const branchAddress = selectedBranch
		? joinAddress(selectedBranch.branch_address1, selectedBranch.branch_address2, selectedBranch.branch_zipcode, selectedBranch.state_name)
		: undefined;

	const rate = balesQty > 0 ? +(freightAmount / balesQty).toFixed(2) : 0;

	const formattedSalesOrderNo =
		header?.sales_order_no_formatted ??
		(header?.sales_order_no != null ? String(header.sales_order_no) : undefined);

	const billingToAddress = joinAddress(
		header?.billing_address,
		header?.billing_address_additional,
		header?.billing_zip_code,
		header?.billing_state_name,
	);
	const shippingToAddress = joinAddress(
		header?.shipping_address,
		header?.shipping_address_additional,
		header?.shipping_zip_code,
		header?.shipping_state_name,
	);

	const previewHeader: InvoicePreviewHeader = {
		invoiceNo: undefined, // not minted yet in draft
		invoiceDate,
		deliveryOrderNo: header?.delivery_order_no_formatted
			|| (header?.delivery_order_no != null ? String(header.delivery_order_no) : undefined),
		deliveryOrderDate: header?.delivery_order_date ?? undefined,
		salesOrderNo: formattedSalesOrderNo,
		salesOrderDate: header?.sales_order_date ?? undefined,
		pcsoNo: header?.pcso_no ?? undefined,
		pcsoDate: header?.pcso_date ?? undefined,
		loadingPoint: header?.loading_point ?? undefined,
		invoiceType: GOVT_SKG_FREIGHT_INVOICE_TYPE_ID,
		transactionType: "Freight Invoice",
		status: "Draft",
		companyName: company?.co_name,
		companyAddress,
		companyStateCode: selectedBranch?.state_code ?? company?.state_code,
		companyCinNo: company?.co_cin_no,
		companyGstin: selectedBranch?.gst_no,
		branchAddress,
		branchGstNo: selectedBranch?.gst_no,
		branchStateCode: selectedBranch?.state_code,
		billingToName: header?.billing_party_name ?? header?.party_name,
		billingToAddress,
		billingToState: header?.billing_state_name ?? undefined,
		billingToStateCode: header?.billing_state_code != null ? String(header.billing_state_code) : undefined,
		billingToGstin: header?.billing_gst_no ?? undefined,
		shippingToName: header?.shipping_party_name ?? header?.party_name,
		shippingToAddress,
		shippingToState: header?.shipping_state_name ?? undefined,
		shippingToStateCode: header?.shipping_state_code != null ? String(header.shipping_state_code) : undefined,
		shippingToGstin: header?.shipping_gst_no ?? undefined,
		transporter: header?.transporter_name ?? undefined,
		transporterGstNo: header?.transporter_gst_no ?? undefined,
		transporterDocNo: header?.transporter_doc_no ?? undefined,
		transporterDocDate: header?.transporter_doc_date ?? undefined,
		vehicleNo: vehicleNo || header?.vehicle_no || undefined,
		ewayBillNo: header?.eway_bill_no ?? undefined,
		ewayBillDate: header?.eway_bill_date ?? undefined,
		destination: header?.administrative_office_address ?? undefined,
		modeOfTransport: header?.mode_of_transport ?? undefined,
	};

	const sourceItemName = source?.lines?.[0]?.item_name ?? "Freight Charges";
	const remarksText = source?.lines?.[0]?.item_name && balesQty > 0
		? `${sourceItemName} — ${balesQty} bales`
		: undefined;

	const items: InvoicePreviewItem[] = freightAmount > 0 || balesQty > 0
		? [
			{
				srNo: 1,
				hsnCode: FREIGHT_HSN,
				item: "Freight Charges",
				quantity: balesQty || "-",
				uom: "BALES",
				rate: rate || "-",
				netAmount: freightAmount || "-",
				remarks: remarksText ?? "-",
			},
		]
		: [];

	const totals: InvoicePreviewTotals = {
		grossAmount: freightAmount,
		totalCGST: tax.cgst,
		totalSGST: tax.sgst,
		totalIGST: tax.igst,
		cgstPercent: tax.cgst > 0 ? 9 : 0,
		sgstPercent: tax.sgst > 0 ? 9 : 0,
		igstPercent: tax.igst > 0 ? 18 : 0,
		roundOff: 0,
		netAmount: +(freightAmount + tax.total).toFixed(2),
	};

	// Surface IW Bill + Container in remarks so they visibly appear on the print.
	// When the source invoice's mode_of_transport is "RAIL" (case-insensitive), the
	// IW Bill No is actually a Railway Receipt — relabel accordingly.
	const isRailSource = !!header?.mode_of_transport
		&& String(header.mode_of_transport).toUpperCase().trim() === "RAIL";
	const iwBillLabel = isRailSource ? "RR No." : "IW Bill No.";
	const iwBillSegment = iwBillNo ? `${iwBillLabel}${iwBillNo}${iwBillDate ? ` Date:${iwBillDate}` : ""}` : "";
	const containerSegment = containerNo ? `Container No.${containerNo}` : "";
	// Reference to every selected source Govt Sacking invoice. All sources share
	// shared "order-identity" fields (party/billing/PCSO/DO/mode), so only the
	// invoice number + date varies per row.
	const sourceLabels = sources.map((s) => {
		const inv = s.header.invoice_no_formatted || (s.header.invoice_no != null ? String(s.header.invoice_no) : "");
		return s.header.invoice_date ? `${inv} dated ${s.header.invoice_date}` : inv;
	}).filter(Boolean);
	const referenceSegment = sourceLabels.length > 0
		? `Source Invoices: ${sourceLabels.join(", ")}`
		: "";
	const doFmt = header?.delivery_order_no_formatted
		|| (header?.delivery_order_no != null ? String(header.delivery_order_no) : "");
	const doSegment = doFmt ? `DO ${doFmt}` : "";
	const autoRemarksSegments = [footerNote, referenceSegment, doSegment, iwBillSegment, containerSegment].filter(Boolean);
	// De-dup — footerNote may already include the segments above; downstream
	// rendering compresses repeats. Join is informational, not source of truth.
	const remarks = autoRemarksSegments.join(" | ");

	return {
		header: previewHeader,
		items,
		additionalCharges: [],
		totals,
		remarks: remarks || undefined,
	};
}
