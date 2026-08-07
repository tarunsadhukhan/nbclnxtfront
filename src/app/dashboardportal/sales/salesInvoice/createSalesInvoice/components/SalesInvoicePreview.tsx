"use client";

import React, { useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { isRawJuteInvoice, isGovtSkgInvoice, isGovtSkgFreightInvoice } from "../utils/salesInvoiceConstants";
import { cell, formatAmount, formatDate, formatDateTime, numberToWordsIndian, qrImageSrc } from "../utils/invoicePrintFormatters";

const isGovtSkgLayoutType = (invoiceType?: string | number | null): boolean =>
	isGovtSkgInvoice(invoiceType) || isGovtSkgFreightInvoice(invoiceType);

export type InvoicePreviewHeader = {
	invoiceNo?: string;
	invoiceDate?: string;
	challanNo?: string;
	challanDate?: string;
	saleNo?: string;
	saleDate?: string;
	deliveryOrderNo?: string;
	deliveryOrderDate?: string;
	salesOrderNo?: string;
	salesOrderDate?: string;
	/** Govt sacking PCSO number (shown only for invoice_type = govt sacking) */
	pcsoNo?: string;
	/** Govt sacking PCSO date */
	pcsoDate?: string;
	branch?: string;
	customer?: string;
	customerBranch?: string;
	billingTo?: string;
	shippingTo?: string;
	billingToName?: string;
	billingToAddress?: string;
	billingToState?: string;
	billingToStateCode?: string;
	billingToGstin?: string;
	shippingToName?: string;
	shippingToAddress?: string;
	shippingToState?: string;
	shippingToStateCode?: string;
	shippingToGstin?: string;
	deliveryOrder?: string;
	transporter?: string;
	transporterGstNo?: string;
	transporterDocNo?: string;
	transporterDocDate?: string;
	/** Mode of Transport (CONCOR / RAIL / ROAD) — sourced from govtskg block for Govt Sacking layout types */
	modeOfTransport?: string;
	/** Govt sacking loading point (shown only for invoice_type = govt sacking) */
	loadingPoint?: string;
	vehicleNo?: string;
	ewayBillNo?: string;
	ewayBillDate?: string;
	invoiceType?: string;
	transactionType?: string;
	status?: string;
	updatedBy?: string;
	updatedAt?: string;
	companyName?: string;
	companyLogo?: string;
	companyAddress?: string;
	companyPhone?: string;
	companyGstin?: string;
	companyStateCode?: string;
	companyCinNo?: string;
	branchAddress?: string;
	branchGstNo?: string;
	branchStateCode?: string;
	bankName?: string;
	bankAccNo?: string;
	bankIfscCode?: string;
	destination?: string;
	irn?: string;
	ackNo?: string;
	ackDate?: string;
	/** Base64 image or string payload for QR / barcode rendered at the top of the invoice */
	qrCode?: string;
};

export type InvoicePreviewItem = {
	srNo: number;
	hsnCode?: string;
	itemGroup?: string;
	itemCode?: string;
	itemGroupPath?: string;
	item?: string;
	netWeight?: string | number;
	quantity?: string | number;
	/** Secondary qty line (e.g., "500 Bales") shown under primary quantity */
	otherQtyDisplay?: string;
	uom?: string;
	rate?: string | number;
	discountType?: string;
	discountAmount?: string | number;
	netAmount?: string | number;
	remarks?: string;
};

export type InvoicePreviewTotals = {
	grossAmount?: number;
	totalIGST?: number;
	totalCGST?: number;
	totalSGST?: number;
	cgstPercent?: number;
	sgstPercent?: number;
	igstPercent?: number;
	freightCharges?: number;
	roundOff?: number;
	netAmount?: number;
	claimAmount?: number;
	additionalChargesTotal?: number;
};

export type InvoicePreviewAdditionalCharge = {
	chargeName: string;
	hsnCode?: string;
	qty?: number | string;
	rate?: number | string;
	netAmount: number;
};

type InvoicePreviewProps = {
	header: InvoicePreviewHeader;
	items: InvoicePreviewItem[];
	totals?: InvoicePreviewTotals;
	additionalCharges?: InvoicePreviewAdditionalCharge[];
	remarks?: string;
	termsConditions?: string;
	onPrint?: () => void;
	onDownload?: () => void;
};

const SalesInvoicePreview: React.FC<InvoicePreviewProps> = ({ header, items, totals, additionalCharges, remarks, termsConditions, onPrint, onDownload }) => {
	const previewRef = useRef<HTMLDivElement>(null);

	const totalValue = totals
		? (totals.grossAmount ?? 0) - (totals.claimAmount ?? 0) + (totals.totalIGST ?? 0) + (totals.totalCGST ?? 0) + (totals.totalSGST ?? 0) + (totals.freightCharges ?? 0)
		: 0;

	const buildPrintableWindow = (titleSuffix: string) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			alert("Please allow popups to continue.");
			return null;
		}

		const h = header;
		const hasNetWeight = items.some((it) => it.netWeight !== undefined && it.netWeight !== "");
		const isRawJute = isRawJuteInvoice(h.invoiceType);

		const itemRowsHtml = items.length
			? items
					.map(
						(item) => {
							const itemCodeDisplay = item.itemCode ? ` (${item.itemCode})` : "";
							const itemNameDisplay = item.item || "-";
							const descriptionContent = `<strong>${itemNameDisplay}</strong>${itemCodeDisplay}${item.remarks && item.remarks !== "-" ? `<br/><em>${item.remarks}</em>` : ""}`;

							if (isRawJute) {
								// For Raw Jute: Show Qty with UOM below in a single cell
								return `
				<tr>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${item.srNo}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${item.hsnCode || "-"}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;">${descriptionContent}</td>
					${hasNetWeight ? `<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${item.netWeight !== undefined && item.netWeight !== "" ? formatAmount(item.netWeight) : "-"}</td>` : ""}
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">
						<div style="font-weight:600;">${item.quantity ?? "-"}</div>
						<div style="font-size:10px;color:#555;">${item.uom || "-"}</div>
						${item.otherQtyDisplay ? `<div style="font-size:10px;color:#666;">(${item.otherQtyDisplay})</div>` : ""}
					</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(item.rate)}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(item.netAmount)}</td>
				</tr>`;
							} else {
								// For other invoice types: Keep separate Qty and UOM columns
								return `
				<tr>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${item.srNo}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${item.hsnCode || "-"}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;">${descriptionContent}</td>
					${hasNetWeight ? `<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${item.netWeight !== undefined && item.netWeight !== "" ? formatAmount(item.netWeight) : "-"}</td>` : ""}
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">
						<div>${item.quantity ?? "-"}</div>
						${item.otherQtyDisplay ? `<div style="font-size:10px;color:#666;">(${item.otherQtyDisplay})</div>` : ""}
					</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${item.uom || "-"}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(item.rate)}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(item.netAmount)}</td>
				</tr>`;
							}
						}
					)
					.join("")
			: `<tr><td colspan="${isRawJute ? hasNetWeight ? 7 : 6 : hasNetWeight ? 8 : 7}" style="border:1px solid #000;padding:10px;text-align:center;font-size:11px;">No line items.</td></tr>`;

		const blankMiddleCells = (() => {
			const tdEmpty = '<td style="border:1px solid #000;padding:4px 6px;font-size:11px;"></td>';
			const middleCount = isRawJute
				? (hasNetWeight ? 2 : 1) + 1
				: (hasNetWeight ? 2 : 1) + 2;
			return tdEmpty.repeat(middleCount);
		})();

		const isGovtSkg = isGovtSkgLayoutType(h.invoiceType);

		const additionalChargeRowsHtml = additionalCharges && additionalCharges.length
			? additionalCharges.map((charge) => {
				if (isGovtSkg) {
					const qtyCell = charge.qty !== undefined && charge.qty !== "" ? formatAmount(charge.qty) : "";
					const rateCell = charge.rate !== undefined && charge.rate !== "" ? formatAmount(charge.rate) : "";
					const netWeightCell = hasNetWeight
						? '<td style="border:1px solid #000;padding:4px 6px;font-size:11px;"></td>'
						: "";
					return `
				<tr>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;"></td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${charge.hsnCode || ""}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;font-style:italic;">${charge.chargeName}</td>
					${netWeightCell}
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${qtyCell}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;"></td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${rateCell}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(charge.netAmount)}</td>
				</tr>`;
				}
				return `
				<tr>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;"></td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:center;">${charge.hsnCode || ""}</td>
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;font-style:italic;">${charge.chargeName}</td>
					${blankMiddleCells}
					<td style="border:1px solid #000;padding:4px 6px;font-size:11px;text-align:right;">${formatAmount(charge.netAmount)}</td>
				</tr>`;
			}).join("")
			: "";

		const cgstLabel = totals?.cgstPercent ? `CGST@${totals.cgstPercent}%` : "CGST";
		const sgstLabel = totals?.sgstPercent ? `SGST@${totals.sgstPercent}%` : "SGST";
		const igstLabel = totals?.igstPercent ? `IGST@${totals.igstPercent}%` : "IGST";

		const totalsHtml = totals
			? `
			<table style="width:100%;border-collapse:collapse;">
				<tr>
					<td style="width:50%;padding:6px 8px;vertical-align:top;font-size:11px;">
						${remarks ? `<div style="font-weight:700;margin-bottom:2px;">REMARKS:</div><div>${remarks}</div>` : ""}
					</td>
					<td style="width:50%;border-left:1px solid #000;padding:0;vertical-align:top;">
						<table style="width:100%;border-collapse:collapse;">
							<tr>${cell("Total", { borderBottom: true })}${cell(formatAmount(totals.grossAmount), { right: true, borderBottom: true, borderLeft: true })}</tr>
							${totals.claimAmount ? `<tr>${cell("Less: Claim Amount", { borderBottom: true })}${cell(`-${formatAmount(totals.claimAmount)}`, { right: true, borderBottom: true, borderLeft: true })}</tr>` : ""}
							<tr>${cell(cgstLabel, { borderBottom: true })}${cell(formatAmount(totals.totalCGST), { right: true, borderBottom: true, borderLeft: true })}</tr>
							<tr>${cell(sgstLabel, { borderBottom: true })}${cell(formatAmount(totals.totalSGST), { right: true, borderBottom: true, borderLeft: true })}</tr>
							<tr>${cell(igstLabel, { borderBottom: true })}${cell(formatAmount(totals.totalIGST), { right: true, borderBottom: true, borderLeft: true })}</tr>
							${totals.freightCharges ? `<tr>${cell("Freight Charges", { borderBottom: true })}${cell(formatAmount(totals.freightCharges), { right: true, borderBottom: true, borderLeft: true })}</tr>` : ""}
							<tr>${cell("Total Value", { bold: true, borderBottom: true })}${cell(formatAmount(totalValue), { right: true, bold: true, borderBottom: true, borderLeft: true })}</tr>
							<tr>${cell("Round off", { borderBottom: true })}${cell(totals.roundOff ? formatAmount(totals.roundOff) : "0.00", { right: true, borderBottom: true, borderLeft: true })}</tr>
							<tr>${cell("Grand Total", { bold: true })}${cell(formatAmount(totals.netAmount), { right: true, bold: true, borderLeft: true })}</tr>
						</table>
					</td>
				</tr>
			</table>`
			: "";

		const amountInWords = totals?.netAmount ? numberToWordsIndian(totals.netAmount) : "";

		/* Doc info rows — Invoice No, Sale No, Del Ord No, PCSO etc. (vehicle/transporter moved to Transaction Type cell) */
		const docInfoRows = [
			h.invoiceNo ? `<tr><td style="padding:3px 6px;font-size:11px;white-space:nowrap;font-weight:600;">Invoice No.</td><td style="padding:3px 6px;font-size:11px;">${h.invoiceNo}</td><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Date</td><td style="padding:3px 6px;font-size:11px;font-weight:600;">${formatDate(h.invoiceDate)}</td></tr>` : "",
			h.saleNo ? `<tr><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Sale No.</td><td style="padding:3px 6px;font-size:11px;">${h.saleNo}</td><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Date</td><td style="padding:3px 6px;font-size:11px;">${formatDate(h.saleDate)}</td></tr>` : "",
			h.deliveryOrderNo ? `<tr><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Del Ord No.</td><td style="padding:3px 6px;font-size:11px;">${h.deliveryOrderNo}</td><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Date</td><td style="padding:3px 6px;font-size:11px;">${formatDate(h.deliveryOrderDate)}</td></tr>` : "",
			h.salesOrderNo ? `<tr><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Sales Ord No.</td><td style="padding:3px 6px;font-size:11px;">${h.salesOrderNo}</td><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Date</td><td style="padding:3px 6px;font-size:11px;">${formatDate(h.salesOrderDate)}</td></tr>` : "",
			isGovtSkgLayoutType(h.invoiceType) && h.pcsoNo ? `<tr><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">PCSO No.</td><td style="padding:3px 6px;font-size:11px;">${h.pcsoNo}</td><td style="padding:3px 6px;font-size:11px;white-space:nowrap;">Date</td><td style="padding:3px 6px;font-size:11px;">${formatDate(h.pcsoDate)}</td></tr>` : "",
		].filter(Boolean).join("");

		/* Transport info (rendered inside the Transaction Type cell) */
		const transportInfoHtml = [
			h.vehicleNo ? `<div style="font-size:11px;">Vehicle No.: <strong>${h.vehicleNo}</strong></div>` : "",
			h.transporter ? `<div style="font-size:11px;">Transporter: <strong>${h.transporter}</strong></div>` : "",
			h.transporterGstNo ? `<div style="font-size:11px;">Transporter GSTIN: <strong>${h.transporterGstNo}</strong></div>` : "",
			h.transporterDocNo ? `<div style="font-size:11px;">Transporter Doc No.: <strong>${h.transporterDocNo}</strong>${h.transporterDocDate ? ` | Date: <strong>${formatDate(h.transporterDocDate)}</strong>` : ""}</div>` : "",
			isGovtSkgLayoutType(h.invoiceType) && h.modeOfTransport ? `<div style="font-size:11px;">Mode of Transport: <strong>${h.modeOfTransport}</strong></div>` : "",
			isGovtSkgLayoutType(h.invoiceType) && h.loadingPoint ? `<div style="font-size:11px;">Loading Point: <strong>${h.loadingPoint}</strong></div>` : "",
			h.ewayBillNo ? `<div style="font-size:11px;">E-Way Bill No.: ${h.ewayBillNo}${h.ewayBillDate ? " | Date: " + formatDate(h.ewayBillDate) : ""}</div>` : "",
			h.challanNo ? `<div style="font-size:11px;">Challan No.: ${h.challanNo}${h.challanDate ? " | Date: " + formatDate(h.challanDate) : ""}</div>` : "",
		].filter(Boolean).join("");

		const netWeightTh = hasNetWeight ? `<th style="border:1px solid #000;padding:4px 6px;font-size:10px;background:#f0f0f0;">Net wt.</th>` : "";

		const quantityHeaderHtml = isRawJute
			? `<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">Quantity<br/>(with UOM)</th>`
			: `<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">Quantity</th>
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">UOM</th>`;

		const qrSrc = qrImageSrc(h.qrCode);
		const eInvoiceLeft = [
			h.irn ? `<div style="font-size:10px;word-break:break-all;"><strong>IRN:</strong> ${h.irn}</div>` : "",
			h.ackNo ? `<div style="font-size:10px;"><strong>Ack No:</strong> ${h.ackNo}</div>` : "",
			h.ackDate ? `<div style="font-size:10px;"><strong>Ack Date:</strong> ${formatDate(h.ackDate)}</div>` : "",
		].filter(Boolean).join("");
		const eInvoiceRight = qrSrc
			? `<img src="${qrSrc}" style="max-height:70px;max-width:70px;object-fit:contain;" alt="e-Invoice QR" />`
			: (h.qrCode ? `<div style="font-size:9px;max-width:120px;word-break:break-all;">${h.qrCode}</div>` : "");

		const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8"/>
	<title>Tax Invoice - ${titleSuffix}</title>
	<style>
		@page { size: A4; margin: 8mm; }
		* { box-sizing: border-box; }
		body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	</style>
</head>
<body>
<div style="border:1.5px solid #000;">

	<!-- Title: IRN/Ack (left) + TAX INVOICE + Status (center) + QR (right) -->
	<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000;">
		<tr>
			<td style="width:33%;padding:4px 8px;vertical-align:middle;">${eInvoiceLeft}</td>
			<td style="width:34%;padding:5px 0;text-align:center;vertical-align:middle;">
				<div style="font-size:14px;font-weight:700;letter-spacing:1px;">TAX INVOICE</div>
				${h.status ? `<div style="font-size:10px;color:#555;">${h.status}</div>` : ""}
			</td>
			<td style="width:33%;padding:4px 8px;vertical-align:middle;text-align:right;">${eInvoiceRight}</td>
		</tr>
	</table>

	<!-- Row 1: Company info (left) + Document numbers (right) -->
	<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000;">
		<tr>
			<td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top;">
				${h.companyLogo ? `<img src="${h.companyLogo}" style="max-height:60px;max-width:200px;margin-bottom:4px;display:block;" />` : ""}
				<div style="font-size:13px;font-weight:700;">${h.companyName || "-"}</div>
				${h.companyAddress ? `<div style="font-size:11px;margin-top:2px;">${h.companyAddress}</div>` : ""}
				${h.companyPhone ? `<div style="font-size:11px;margin-top:1px;">Phone no. : ${h.companyPhone}</div>` : ""}
				${h.companyStateCode ? `<div style="font-size:11px;margin-top:1px;">State Code : ${h.companyStateCode}</div>` : ""}
				${h.companyCinNo ? `<div style="font-size:11px;margin-top:1px;">CIN/LLP : ${h.companyCinNo}</div>` : ""}
				${h.companyGstin ? `<div style="font-size:11px;margin-top:1px;">GSTIN No : ${h.companyGstin}</div>` : ""}
			</td>
			<td style="width:50%;padding:4px 0;vertical-align:top;">
				<table style="border-collapse:collapse;width:100%;">
					${docInfoRows}
				</table>
			</td>
		</tr>
	</table>

	<!-- Row 2: Dispatch From (left) + Transaction Type (right) -->
	<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000;">
		<tr>
			<td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top;">
				<div style="font-weight:700;font-size:11px;margin-bottom:3px;">Dispatch From,</div>
				<div style="font-size:11px;font-weight:600;">${h.companyName || "-"}</div>
				${h.branchAddress ? `<div style="font-size:11px;">${h.branchAddress}</div>` : (h.branch ? `<div style="font-size:11px;">${h.branch}</div>` : "")}
				${h.branchStateCode ? `<div style="font-size:11px;">State Code : ${h.branchStateCode}</div>` : (h.companyStateCode ? `<div style="font-size:11px;">State Code : ${h.companyStateCode}</div>` : "")}
				${h.branchGstNo ? `<div style="font-size:11px;">GSTIN No : ${h.branchGstNo}</div>` : (h.companyGstin ? `<div style="font-size:11px;">GSTIN No : ${h.companyGstin}</div>` : "")}
			</td>
			<td style="width:50%;padding:8px 10px;vertical-align:top;">
				${h.transactionType || h.invoiceType ? `<div style="font-size:11px;margin-bottom:3px;">Transaction Type: <strong>${h.transactionType || h.invoiceType}</strong></div>` : ""}
				${transportInfoHtml}
			</td>
		</tr>
	</table>

	<!-- Row 3: Billed To (left) + Shipped To duplicate removed — now empty right or additional info -->
	<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000;">
		<tr>
			<td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top;">
				<div style="font-weight:700;font-size:11px;margin-bottom:3px;">Billed To</div>
				${h.billingToName ? `<div style="font-size:11px;">Name : ${h.billingToName}</div>` : ""}
				${h.billingToAddress ? `<div style="font-size:11px;">Address : ${h.billingToAddress}</div>` : (h.billingTo ? `<div style="font-size:11px;">Address : ${h.billingTo}</div>` : "")}
				${h.billingToState ? `<div style="font-size:11px;">State : ${h.billingToState}</div>` : ""}
				${h.billingToStateCode ? `<div style="font-size:11px;">State Code : ${h.billingToStateCode}</div>` : ""}
				${h.billingToGstin ? `<div style="font-size:11px;">GSTIN No : ${h.billingToGstin}</div>` : ""}
			</td>
			<td style="width:50%;padding:8px 10px;vertical-align:top;">
				<div style="font-weight:700;font-size:11px;margin-bottom:3px;">Shipped To/Place of Supply</div>
				${h.shippingToName ? `<div style="font-size:11px;">Name : ${h.shippingToName}</div>` : ""}
				${h.shippingToAddress ? `<div style="font-size:11px;">Address : ${h.shippingToAddress}</div>` : (h.shippingTo ? `<div style="font-size:11px;">Address : ${h.shippingTo}</div>` : "")}
				${h.shippingToState ? `<div style="font-size:11px;">State : ${h.shippingToState}</div>` : ""}
				${h.shippingToStateCode ? `<div style="font-size:11px;">State Code : ${h.shippingToStateCode}</div>` : ""}
				${h.shippingToGstin ? `<div style="font-size:11px;">GSTIN No : ${h.shippingToGstin}</div>` : ""}
				${h.destination ? `<div style="font-size:11px;margin-top:3px;"><strong>Destination:</strong> ${h.destination}</div>` : ""}
			</td>
		</tr>
	</table>

	<!-- Line Items -->
	<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #000;">
		<thead>
			<tr style="background-color:#f0f0f0;">
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">S.No</th>
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">HSN CODE</th>
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;width:32%;">Description &amp; Specification of Goods</th>
				${netWeightTh}
				${quantityHeaderHtml}
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">Rate</th>
				<th style="border:1px solid #000;padding:4px 6px;font-size:10px;text-align:center;">Value (Rs.)</th>
			</tr>
		</thead>
		<tbody>${itemRowsHtml}${additionalChargeRowsHtml}</tbody>
	</table>

	<!-- Totals -->
	${totalsHtml}

	<!-- Invoice Value in Words -->
	${amountInWords ? `
	<div style="border-top:1px solid #000;padding:4px 10px;font-size:11px;font-weight:600;">Invoice Value (In Words)</div>
	<div style="padding:4px 10px;font-size:11px;border-bottom:1px solid #000;">Rupees in words: ${amountInWords}</div>` : ""}

	<!-- Wheather tax is payable on reverse charge -->
	<div style="padding:3px 10px;font-size:10px;border-bottom:1px solid #000;">Whether tax is payable on Reverse Charges Basis No.</div>

	<!-- Footer: Bank Details (left) | Terms + Signature (right) -->
	<table style="width:100%;border-collapse:collapse;">
		<tr>
			<td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top;font-size:11px;">
				${h.bankName || h.bankAccNo ? `
					<div style="font-weight:700;margin-bottom:4px;">Bank Details:</div>
					${h.bankName ? `<div>${h.bankName}</div>` : ""}
					${h.bankAccNo ? `<div>A/c No. : ${h.bankAccNo}</div>` : ""}
					${h.bankIfscCode ? `<div>IFS Code : ${h.bankIfscCode}</div>` : ""}
				` : ""}
			</td>
			<td style="width:50%;padding:8px 10px;vertical-align:top;font-size:11px;">
				${termsConditions ? `<div style="font-weight:700;margin-bottom:4px;">Term &amp; Conditions</div><div style="white-space:pre-wrap;">${termsConditions}</div>` : ""}
			</td>
		</tr>
	</table>

	<!-- Signature row -->
	<table style="width:100%;border-collapse:collapse;border-top:1px solid #000;">
		<tr>
			<td style="width:50%;padding:8px 10px;vertical-align:bottom;font-size:11px;height:60px;">
			</td>
			<td style="width:50%;padding:8px 10px;vertical-align:top;text-align:right;">
				<div style="font-size:12px;font-weight:700;">${h.companyName || ""}</div>
				<div style="margin-top:30px;font-size:11px;border-top:1px solid #888;display:inline-block;min-width:160px;padding-top:4px;">Authorised Signatory</div>
			</td>
		</tr>
	</table>

	<!-- Computer Generated footer -->
	<div style="text-align:center;padding:4px 10px;font-size:10px;border-top:1px solid #000;color:#555;">This is a Computer Generated Invoice</div>

</div>
</body>
</html>`;

		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
		return printWindow;
	};

	const handlePrint = () => {
		if (onPrint) { onPrint(); return; }
		const printWindow = buildPrintableWindow(header.invoiceNo || "Print");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
	};

	const handleDownload = () => {
		if (onDownload) { onDownload(); return; }
		const printWindow = buildPrintableWindow(header.invoiceNo || "Download");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => { printWindow.print(); }, 300);
	};

	const hasNetWeight = items.some((it) => it.netWeight !== undefined && it.netWeight !== "");
	const cgstLabel = totals?.cgstPercent ? `CGST@${totals.cgstPercent}%` : "CGST";
	const sgstLabel = totals?.sgstPercent ? `SGST@${totals.sgstPercent}%` : "SGST";
	const igstLabel = totals?.igstPercent ? `IGST@${totals.igstPercent}%` : "IGST";

	/* ──────────────────────────────────────── */
	/*  React in-page preview (mirrors print)  */
	/* ──────────────────────────────────────── */
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box ref={previewRef} sx={{ border: "2px solid", borderColor: "divider", borderRadius: 0, p: 0, backgroundColor: "#fff" }}>

				{/* Title */}
				<Box sx={{ borderBottom: "1px solid", borderColor: "divider", px: 1.5, py: 0.75, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 1 }}>
					{/* Left: e-invoice details (IRN, Ack No, Ack Date) */}
					<Box sx={{ textAlign: "left" }}>
						{header.irn && (
							<Typography variant="caption" display="block" sx={{ fontSize: "0.68rem", wordBreak: "break-all" }}>
								<strong>IRN:</strong> {header.irn}
							</Typography>
						)}
						{header.ackNo && (
							<Typography variant="caption" display="block" sx={{ fontSize: "0.68rem" }}>
								<strong>Ack No:</strong> {header.ackNo}
							</Typography>
						)}
						{header.ackDate && (
							<Typography variant="caption" display="block" sx={{ fontSize: "0.68rem" }}>
								<strong>Ack Date:</strong> {formatDate(header.ackDate)}
							</Typography>
						)}
					</Box>

					{/* Center: TAX INVOICE + Status */}
					<Box sx={{ textAlign: "center" }}>
						<Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, fontSize: "0.95rem" }}>TAX INVOICE</Typography>
						{header.status ? <Typography variant="caption" color="text.secondary">{header.status}</Typography> : null}
					</Box>

					{/* Right: QR / barcode */}
					<Box sx={{ textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
						{(() => {
							const src = qrImageSrc(header.qrCode);
							if (src) {
								return <img src={src} alt="e-Invoice QR" style={{ maxHeight: 70, maxWidth: 70, objectFit: "contain" }} />;
							}
							if (header.qrCode) {
								return (
									<Typography variant="caption" sx={{ fontSize: "0.6rem", maxWidth: 120, wordBreak: "break-all" }}>
										{header.qrCode}
									</Typography>
								);
							}
							return null;
						})()}
					</Box>
				</Box>

				{/* Row 1: Company info + Document numbers */}
				<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid", borderColor: "divider" }}>
					<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
						<Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{header.companyName || "-"}</Typography>
						{header.companyAddress && <Typography variant="caption" display="block">{header.companyAddress}</Typography>}
						{header.companyPhone && <Typography variant="caption" display="block">Phone: {header.companyPhone}</Typography>}
						{header.companyStateCode && <Typography variant="caption" display="block">State Code: {header.companyStateCode}</Typography>}
						{header.companyCinNo && <Typography variant="caption" display="block">CIN/LLP: {header.companyCinNo}</Typography>}
						{header.companyGstin && <Typography variant="caption" display="block">GSTIN: {header.companyGstin}</Typography>}
					</Box>
					<Box sx={{ p: 1 }}>
						{/* All document numbers in a compact table */}
						{header.invoiceNo && (
							<Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, minWidth: 75 }}>Invoice No.</Typography>
								<Typography variant="caption" sx={{ flex: 1 }}>{header.invoiceNo}</Typography>
								<Typography variant="caption" sx={{ minWidth: 30 }}>Date</Typography>
								<Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDate(header.invoiceDate)}</Typography>
							</Box>
						)}
						{header.saleNo && (
							<Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
								<Typography variant="caption" sx={{ minWidth: 75 }}>Sale No.</Typography>
								<Typography variant="caption" sx={{ flex: 1 }}>{header.saleNo}</Typography>
								<Typography variant="caption" sx={{ minWidth: 30 }}>Date</Typography>
								<Typography variant="caption">{formatDate(header.saleDate)}</Typography>
							</Box>
						)}
						{header.deliveryOrderNo && (
							<Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
								<Typography variant="caption" sx={{ minWidth: 75 }}>Del Ord No.</Typography>
								<Typography variant="caption" sx={{ flex: 1 }}>{header.deliveryOrderNo}</Typography>
								<Typography variant="caption" sx={{ minWidth: 30 }}>Date</Typography>
								<Typography variant="caption">{formatDate(header.deliveryOrderDate)}</Typography>
							</Box>
						)}
						{header.salesOrderNo && (
							<Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
								<Typography variant="caption" sx={{ minWidth: 75 }}>Sales Ord No.</Typography>
								<Typography variant="caption" sx={{ flex: 1 }}>{header.salesOrderNo}</Typography>
								<Typography variant="caption" sx={{ minWidth: 30 }}>Date</Typography>
								<Typography variant="caption">{formatDate(header.salesOrderDate)}</Typography>
							</Box>
						)}
						{isGovtSkgLayoutType(header.invoiceType) && header.pcsoNo && (
							<Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
								<Typography variant="caption" sx={{ minWidth: 75 }}>PCSO No.</Typography>
								<Typography variant="caption" sx={{ flex: 1 }}>{header.pcsoNo}</Typography>
								<Typography variant="caption" sx={{ minWidth: 30 }}>Date</Typography>
								<Typography variant="caption">{formatDate(header.pcsoDate)}</Typography>
							</Box>
						)}
					</Box>
				</Box>

				{/* Row 2: Dispatch From (left) + Transaction Type (right) */}
				<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid", borderColor: "divider" }}>
					<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
						<Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>Dispatch From,</Typography>
						<Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>{header.companyName || "-"}</Typography>
						{header.branchAddress ? <Typography variant="caption" display="block">{header.branchAddress}</Typography> : (header.branch ? <Typography variant="caption" display="block">{header.branch}</Typography> : null)}
						{header.branchStateCode ? <Typography variant="caption" display="block">State Code: {header.branchStateCode}</Typography> : (header.companyStateCode ? <Typography variant="caption" display="block">State Code: {header.companyStateCode}</Typography> : null)}
						{header.branchGstNo ? <Typography variant="caption" display="block">GSTIN: {header.branchGstNo}</Typography> : (header.companyGstin ? <Typography variant="caption" display="block">GSTIN: {header.companyGstin}</Typography> : null)}
					</Box>
					<Box sx={{ p: 1.5 }}>
						{(header.transactionType || header.invoiceType) && (
							<Typography variant="caption" display="block" sx={{ mb: 0.25 }}>Transaction Type: <strong>{header.transactionType || header.invoiceType}</strong></Typography>
						)}
						{header.vehicleNo && <Typography variant="caption" display="block">Vehicle No.: <strong>{header.vehicleNo}</strong></Typography>}
						{header.transporter && <Typography variant="caption" display="block">Transporter: <strong>{header.transporter}</strong></Typography>}
						{header.transporterGstNo && <Typography variant="caption" display="block">Transporter GSTIN: <strong>{header.transporterGstNo}</strong></Typography>}
						{header.transporterDocNo && (
							<Typography variant="caption" display="block">
								Transporter Doc No.: <strong>{header.transporterDocNo}</strong>
								{header.transporterDocDate ? <> | Date: <strong>{formatDate(header.transporterDocDate)}</strong></> : null}
							</Typography>
						)}
						{isGovtSkgLayoutType(header.invoiceType) && header.modeOfTransport && (
							<Typography variant="caption" display="block">Mode of Transport: <strong>{header.modeOfTransport}</strong></Typography>
						)}
						{isGovtSkgLayoutType(header.invoiceType) && header.loadingPoint && (
							<Typography variant="caption" display="block">Loading Point: <strong>{header.loadingPoint}</strong></Typography>
						)}
						{header.ewayBillNo && <Typography variant="caption" display="block">E-Way Bill No.: {header.ewayBillNo}{header.ewayBillDate ? ` | Date: ${formatDate(header.ewayBillDate)}` : ""}</Typography>}
						{header.challanNo && <Typography variant="caption" display="block">Challan No.: {header.challanNo}{header.challanDate ? ` | Date: ${formatDate(header.challanDate)}` : ""}</Typography>}
					</Box>
				</Box>

				{/* Row 3: Billed To (left) + Shipped To (right) — side by side */}
				<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid", borderColor: "divider" }}>
					<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
						<Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>Billed To</Typography>
						{header.billingToName && <Typography variant="caption" display="block">Name : {header.billingToName}</Typography>}
						{(header.billingToAddress || header.billingTo) && <Typography variant="caption" display="block">Address : {header.billingToAddress || header.billingTo}</Typography>}
						{header.billingToState && <Typography variant="caption" display="block">State : {header.billingToState}</Typography>}
						{header.billingToStateCode && <Typography variant="caption" display="block">State Code : {header.billingToStateCode}</Typography>}
						{header.billingToGstin && <Typography variant="caption" display="block">GSTIN No : {header.billingToGstin}</Typography>}
					</Box>
					<Box sx={{ p: 1.5 }}>
						<Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>Shipped To/Place of Supply</Typography>
						{header.shippingToName && <Typography variant="caption" display="block">Name : {header.shippingToName}</Typography>}
						{(header.shippingToAddress || header.shippingTo) && <Typography variant="caption" display="block">Address : {header.shippingToAddress || header.shippingTo}</Typography>}
						{header.shippingToState && <Typography variant="caption" display="block">State : {header.shippingToState}</Typography>}
						{header.shippingToStateCode && <Typography variant="caption" display="block">State Code : {header.shippingToStateCode}</Typography>}
						{header.shippingToGstin && <Typography variant="caption" display="block">GSTIN No : {header.shippingToGstin}</Typography>}
						{header.destination && (
							<Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
								<strong>Destination:</strong> {header.destination}
							</Typography>
						)}
					</Box>
				</Box>

				{/* Line Items */}
				<Box sx={{ overflowX: "auto" }}>
					<Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
						<Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.07)" }}>
							<Box component="tr">
								{["S.No", "HSN Code", "Description & Specification of Goods", ...(hasNetWeight ? ["Net wt."] : []), "Quantity", "UOM", "Rate", "Value (Rs.)"].map((col) => (
									<Box key={col} component="th" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 10, textAlign: col === "Description & Specification of Goods" ? "left" : "center", whiteSpace: "nowrap", width: col === "Description & Specification of Goods" ? "32%" : undefined }}>
										{col}
									</Box>
								))}
							</Box>
						</Box>
						<Box component="tbody">
							{items.length ? (
								items.map((item) => (
									<Box component="tr" key={`inv-row-${item.srNo}`}>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }}>{item.srNo}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }}>{item.hsnCode || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11 }}>
												<div>
													<strong>{item.item || "-"}</strong>
													{item.itemCode ? ` (${item.itemCode})` : ""}
												</div>
												{item.remarks && item.remarks !== "-" && <div style={{ fontStyle: "italic", fontSize: "0.9em" }}>{item.remarks}</div>}
											</Box>
										{hasNetWeight && <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{item.netWeight !== undefined && item.netWeight !== "" ? formatAmount(item.netWeight) : "-"}</Box>}
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>
											<div>{item.quantity ?? "-"}</div>
											{item.otherQtyDisplay && (
												<div style={{ fontSize: 10, color: "#666" }}>({item.otherQtyDisplay})</div>
											)}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }}>{item.uom || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{formatAmount(item.rate)}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{formatAmount(item.netAmount)}</Box>
									</Box>
								))
							) : (
								<Box component="tr">
									<Box component="td" colSpan={hasNetWeight ? 8 : 7} sx={{ border: "1px solid", borderColor: "divider", p: 2, fontSize: 11, textAlign: "center" }}>
										No line items captured yet.
									</Box>
								</Box>
							)}
							{additionalCharges && additionalCharges.length > 0 && additionalCharges.map((charge, idx) => {
								const isGovtSkgPreview = isGovtSkgLayoutType(header.invoiceType);
								if (isGovtSkgPreview) {
									const qtyDisplay = charge.qty !== undefined && charge.qty !== "" ? formatAmount(charge.qty) : "";
									const rateDisplay = charge.rate !== undefined && charge.rate !== "" ? formatAmount(charge.rate) : "";
									return (
										<Box component="tr" key={`addl-charge-${idx}`}>
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }} />
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }}>{charge.hsnCode || ""}</Box>
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, fontStyle: "italic" }}>{charge.chargeName}</Box>
											{hasNetWeight && <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11 }} />}
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{qtyDisplay}</Box>
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }} />
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{rateDisplay}</Box>
											<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{formatAmount(charge.netAmount)}</Box>
										</Box>
									);
								}
								const middleCount = hasNetWeight ? 4 : 3;
								return (
									<Box component="tr" key={`addl-charge-${idx}`}>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }} />
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "center" }}>{charge.hsnCode || ""}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, fontStyle: "italic" }}>{charge.chargeName}</Box>
										{Array.from({ length: middleCount }).map((_, i) => (
											<Box key={`addl-blank-${idx}-${i}`} component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11 }} />
										))}
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: "4px 6px", fontSize: 11, textAlign: "right" }}>{formatAmount(charge.netAmount)}</Box>
									</Box>
								);
							})}
						</Box>
					</Box>
				</Box>

				{/* Totals */}
				{totals && (
					<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid", borderColor: "divider" }}>
						<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
							{remarks && (
								<>
									<Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>REMARKS:</Typography>
									<Typography variant="caption" color="text.secondary">{remarks}</Typography>
								</>
							)}
						</Box>
						<Box>
							{[
								{ label: "Total", value: formatAmount(totals.grossAmount) },
								...(totals.claimAmount ? [{ label: "Less: Claim Amount", value: `-${formatAmount(totals.claimAmount)}` }] : []),
								{ label: cgstLabel, value: formatAmount(totals.totalCGST) },
								{ label: sgstLabel, value: formatAmount(totals.totalSGST) },
								{ label: igstLabel, value: formatAmount(totals.totalIGST) },
								...(totals.freightCharges ? [{ label: "Freight Charges", value: formatAmount(totals.freightCharges) }] : []),
								{ label: "Total Value", value: formatAmount(totalValue), bold: true },
								{ label: "Round off", value: totals.roundOff ? formatAmount(totals.roundOff) : "0.00" },
								{ label: "Grand Total", value: formatAmount(totals.netAmount), bold: true },
							].map(({ label, value, bold }) => (
								<Box key={label} sx={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider", px: 1.5, py: "3px" }}>
									<Typography variant="caption" sx={{ fontWeight: bold ? 700 : 400 }}>{label}</Typography>
									<Typography variant="caption" sx={{ fontWeight: bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
								</Box>
							))}
						</Box>
					</Box>
				)}

				{/* Invoice value in words */}
				{totals?.netAmount != null && (
					<>
						<Box sx={{ px: 1.5, py: 0.5, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", backgroundColor: "rgba(0,0,0,0.02)" }}>
							<Typography variant="caption" sx={{ fontWeight: 600 }}>Invoice Value (In Words)</Typography>
						</Box>
						<Box sx={{ px: 1.5, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
							<Typography variant="caption">Rupees in words: {numberToWordsIndian(totals.netAmount)}</Typography>
						</Box>
					</>
				)}

				{/* Reverse charge note */}
				<Box sx={{ px: 1.5, py: 0.25, borderBottom: "1px solid", borderColor: "divider" }}>
					<Typography variant="caption" sx={{ fontSize: "0.65rem" }}>Whether tax is payable on Reverse Charges Basis No.</Typography>
				</Box>

				{/* Footer: Bank Details (left) | Terms & Conditions (right) */}
				<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid", borderColor: "divider" }}>
					<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
						{(header.bankName || header.bankAccNo) && (
							<>
								<Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>Bank Details:</Typography>
								{header.bankName && <Typography variant="caption" display="block">{header.bankName}</Typography>}
								{header.bankAccNo && <Typography variant="caption" display="block">A/c No. : {header.bankAccNo}</Typography>}
								{header.bankIfscCode && <Typography variant="caption" display="block">IFS Code : {header.bankIfscCode}</Typography>}
							</>
						)}
					</Box>
					<Box sx={{ p: 1.5 }}>
						{termsConditions && (
							<>
								<Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>Term & Conditions</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{termsConditions}</Typography>
							</>
						)}
					</Box>
				</Box>

				{/* Signature row */}
				<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 70 }}>
					<Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: "divider" }} />
					<Box sx={{ p: 1.5, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
						<Typography variant="caption" sx={{ fontWeight: 700 }}>{header.companyName || ""}</Typography>
						<Box sx={{ textAlign: "right" }}>
							<Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.5, mt: 3, minWidth: 140 }}>
								<Typography variant="caption">Authorised Signatory</Typography>
							</Box>
							{header.updatedAt && (
								<Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.6rem" }}>
									Last Updated: {formatDateTime(header.updatedAt)}
								</Typography>
							)}
						</Box>
					</Box>
				</Box>

				{/* Computer Generated footer */}
				<Box sx={{ textAlign: "center", py: 0.5, borderTop: "1px solid", borderColor: "divider" }}>
					<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>This is a Computer Generated Invoice</Typography>
				</Box>

			</Box>

			<Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
				<Button variant="outline" size="sm" onClick={handlePrint}>Print</Button>
				<Button variant="outline" size="sm" onClick={handleDownload}>Download</Button>
			</Stack>
		</Box>
	);
};

export default SalesInvoicePreview;
