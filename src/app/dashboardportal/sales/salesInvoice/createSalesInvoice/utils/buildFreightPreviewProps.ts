import type { InvoiceDetails, InvoiceLine } from "@/utils/salesInvoiceService";
import type {
	InvoicePreviewAdditionalCharge,
	InvoicePreviewHeader,
	InvoicePreviewItem,
	InvoicePreviewTotals,
} from "../components/SalesInvoicePreview";
import { computeFreightTax, FREIGHT_HSN } from "./freightTax";
import { GOVT_SKG_FREIGHT_INVOICE_TYPE_ID, INVOICE_STATUS_LABELS } from "./salesInvoiceConstants";

const isRailModeOfTransport = (modeStr?: string | null): boolean =>
	!!modeStr && String(modeStr).toUpperCase().trim() === "RAIL";

export type FreightPreviewProps = {
	header: InvoicePreviewHeader;
	items: InvoicePreviewItem[];
	additionalCharges: InvoicePreviewAdditionalCharge[];
	totals: InvoicePreviewTotals;
	remarks?: string;
	termsConditions?: string;
};

const joinAddress = (...parts: Array<string | number | null | undefined>): string | undefined => {
	const pieces = parts
		.map((p) => (p == null ? "" : String(p).trim()))
		.filter(Boolean);
	return pieces.length ? pieces.join(", ") : undefined;
};

const lineToItem = (line: InvoiceLine, srNo: number): InvoicePreviewItem => ({
	srNo,
	hsnCode: line.hsnCode || FREIGHT_HSN,
	itemCode: line.fullItemCode || line.itemCode || undefined,
	item: line.itemName || line.item || "Freight Charges",
	netWeight: line.govtskgDtl?.netWeight != null ? line.govtskgDtl.netWeight : undefined,
	quantity: line.quantity ?? "-",
	uom: line.uomName || line.uom || "BALES",
	rate: line.rate,
	netAmount: typeof line.netAmount === "number" ? line.netAmount : (typeof line.totalAmount === "number" ? line.totalAmount : undefined),
	remarks: line.remarks || "-",
});

/**
 * Build props for `SalesInvoicePreview` from a freight (type 7) invoice.
 *
 * Reuses the shared SalesInvoicePreview tally template (same component that renders
 * types 1/2/3/5/6). Type 7 is already recognized as `isGovtSkgLayoutType`, so the HSN
 * summary and Govt Sacking-specific rows all render automatically.
 *
 * The single line item is pulled directly from `invoice.lines[0]` (the backend-built
 * Freight Charges row) — NOT fabricated as an additional charge.
 */
export function buildFreightPreviewProps(invoice: InvoiceDetails): FreightPreviewProps {
	const firstLine = invoice.lines?.[0];
	const grossFallback = Number(invoice.grossAmount ?? 0);
	const fallbackTax = computeFreightTax(grossFallback, invoice.intraInterState);

	const totalCGST = Number(firstLine?.gst?.cgstAmount ?? fallbackTax.cgst);
	const totalSGST = Number(firstLine?.gst?.sgstAmount ?? fallbackTax.sgst);
	const totalIGST = Number(firstLine?.gst?.igstAmount ?? fallbackTax.igst);
	const cgstPercent = Number(firstLine?.gst?.cgstPercent ?? (totalCGST > 0 ? 9 : 0));
	const sgstPercent = Number(firstLine?.gst?.sgstPercent ?? (totalSGST > 0 ? 9 : 0));
	const igstPercent = Number(firstLine?.gst?.igstPercent ?? (totalIGST > 0 ? 18 : 0));

	// Defensive: legacy type-7 rows may have stored invoice_amount post-tax (BE bug fixed
	// in salesInvoice.py — pre-fix rows still have grossAmount = freight + tax). If the
	// header grossAmount matches lineNet + totalTax within rounding, treat it as post-tax
	// and normalize to pre-tax. Idempotent against the post-fix shape.
	const totalTax = totalCGST + totalSGST + totalIGST;
	const lineNet = Number(firstLine?.netAmount ?? firstLine?.totalAmount ?? 0);
	const normalizedGross = (lineNet > 0 && totalTax > 0
			&& Math.abs(grossFallback - (lineNet + totalTax)) < 0.5)
		? lineNet
		: grossFallback;

	// Build a list of every linked source invoice. Prefer the new multi-source
	// `sources[]` array (always present after the multi-source migration);
	// fall back to the legacy single `source` for pre-migration rows.
	const sourceList = invoice.freight?.sources && invoice.freight.sources.length > 0
		? invoice.freight.sources
		: (invoice.freight?.source
			? [{
				invoice_id: invoice.freight.source.invoice_id,
				invoice_no: invoice.freight.source.invoice_no,
				invoice_no_formatted: invoice.freight.source.invoice_no_formatted,
				invoice_date: invoice.freight.source.invoice_date,
				delivery_order_no: invoice.freight.source.delivery_order_no,
				delivery_order_no_formatted: invoice.freight.source.delivery_order_no_formatted,
			}]
			: []);
	const sourceLabels = sourceList.map((s) => {
		const inv = s.invoice_no_formatted || (s.invoice_no != null ? String(s.invoice_no) : "");
		return s.invoice_date ? `${inv} dated ${s.invoice_date}` : inv;
	}).filter(Boolean);
	const referenceNote = sourceLabels.length > 0
		? `Source Invoices: ${sourceLabels.join(", ")}`
		: "";
	const primarySource = sourceList[0];
	const primaryDo = primarySource?.delivery_order_no_formatted
		|| (primarySource?.delivery_order_no != null ? String(primarySource.delivery_order_no) : "");
	const doSeg = primaryDo ? `DO ${primaryDo}` : "";
	// Reconstruct the footer/remarks from structured fields so the IW/RR relabel
	// applies even to legacy invoices whose stored `footerNote` was saved with the
	// pre-relabel wording. Fields are fully recoverable from the response payload.
	const isRail = isRailModeOfTransport(invoice.govtskg?.modeOfTransport);
	const iwLabel = isRail ? "RR No." : "IW Bill No.";
	const pcsoSeg = invoice.govtskg?.pcsoNo
		? `PCSO No.${invoice.govtskg.pcsoNo}${invoice.govtskg.pcsoDate ? ` Date:${invoice.govtskg.pcsoDate}` : ""}`
		: "";
	const iwSeg = invoice.freight?.iwBillNo
		? `${iwLabel}${invoice.freight.iwBillNo}${invoice.freight.iwBillDate ? ` Date:${invoice.freight.iwBillDate}` : ""}`
		: "";
	const containerSeg = invoice.containerNo ? `Container No.${invoice.containerNo}` : "";
	const footerText = [referenceNote, pcsoSeg, doSeg, iwSeg, containerSeg].filter(Boolean).join(" | ");

	const header: InvoicePreviewHeader = {
		invoiceNo: invoice.invoiceNo,
		invoiceDate: invoice.invoiceDate,
		// Prefer the source's FY-formatted DO so the print matches the picker.
		deliveryOrderNo: primaryDo || invoice.deliveryOrderNo,
		deliveryOrderDate: primarySource?.delivery_order_date ?? undefined,
		salesOrderNo: invoice.salesOrderNo,
		salesOrderDate: invoice.salesOrderDate,
		pcsoNo: invoice.govtskg?.pcsoNo ?? invoice.freight?.source?.pcso_no ?? undefined,
		pcsoDate: invoice.govtskg?.pcsoDate ?? undefined,
		loadingPoint: invoice.govtskg?.loadingPoint ?? undefined,
		invoiceType: GOVT_SKG_FREIGHT_INVOICE_TYPE_ID,
		transactionType: invoice.typeOfSale,
		status: (invoice.statusId != null && INVOICE_STATUS_LABELS[invoice.statusId])
			? INVOICE_STATUS_LABELS[invoice.statusId]
			: invoice.status,
		companyName: invoice.companyName,
		companyAddress: joinAddress(invoice.companyAddress1, invoice.companyAddress2, invoice.companyZipcode, invoice.companyStateName),
		companyStateCode: invoice.companyStateCode,
		companyCinNo: invoice.companyCinNo,
		companyGstin: invoice.branchGstNo,
		branchAddress: joinAddress(invoice.branchAddress1, invoice.branchAddress2, invoice.branchZipcode, invoice.branchStateName),
		branchGstNo: invoice.branchGstNo,
		branchStateCode: invoice.branchStateCode,
		billingToName: invoice.partyName,
		billingToAddress: invoice.billingAddress,
		billingToState: invoice.billingStateName,
		billingToStateCode: invoice.billingStateCode != null ? String(invoice.billingStateCode) : undefined,
		billingToGstin: invoice.billingGstNo,
		shippingToName: invoice.partyName,
		shippingToAddress: invoice.shippingAddress,
		shippingToState: invoice.shippingStateName,
		shippingToStateCode: invoice.shippingStateCode,
		shippingToGstin: invoice.shippingGstNo,
		transporter: invoice.transporterName ?? invoice.transporter,
		transporterGstNo: invoice.transporterGstNo,
		transporterDocNo: invoice.transporterDocNo,
		transporterDocDate: invoice.transporterDocDate,
		vehicleNo: invoice.vehicleNo,
		ewayBillNo: invoice.ewayBillNo,
		ewayBillDate: invoice.ewayBillDate,
		destination: invoice.govtskg?.administrativeOfficeAddress ?? undefined,
		modeOfTransport: invoice.govtskg?.modeOfTransport ?? undefined,
		bankName: invoice.bankName,
		bankAccNo: invoice.bankAccNo,
		bankIfscCode: invoice.bankIfscCode,
		irn: invoice.irn,
		ackNo: invoice.ackNo,
		ackDate: invoice.ackDate,
		qrCode: invoice.qrCode,
		updatedBy: invoice.updatedBy,
		updatedAt: invoice.updatedAt,
	};

	const items: InvoicePreviewItem[] = firstLine ? [lineToItem(firstLine, 1)] : [];

	const totals: InvoicePreviewTotals = {
		grossAmount: normalizedGross,
		totalCGST,
		totalSGST,
		totalIGST,
		cgstPercent,
		sgstPercent,
		igstPercent,
		roundOff: invoice.roundOff,
		netAmount: invoice.netAmount ?? +(normalizedGross + totalCGST + totalSGST + totalIGST).toFixed(2),
	};

	return {
		header,
		items,
		additionalCharges: [],
		totals,
		remarks: footerText || undefined,
		termsConditions: invoice.termsConditions,
	};
}
