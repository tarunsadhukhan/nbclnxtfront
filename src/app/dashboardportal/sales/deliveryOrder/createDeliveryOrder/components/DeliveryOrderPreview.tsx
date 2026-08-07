"use client";

import React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";

export type DOPreviewHeader = {
	doNo?: string;
	doDate?: string;
	branch?: string;
	branchAddress?: string;
	customer?: string;
	billingToAddress?: string;
	shippingToAddress?: string;
	salesOrder?: string;
	salesOrderNo?: string;
	salesOrderDate?: string;
	pcsoNo?: string;
	pcsoDate?: string;
	transporter?: string;
	vehicleNo?: string;
	driverName?: string;
	status?: string;
	companyName?: string;
	companyLogo?: string;
};

export type DOPreviewItem = {
	srNo: number;
	itemCode?: string;
	item?: string;
	quantity?: string | number;
	uom?: string;
	qtyInBales?: string;
};

export type DOPreviewTotals = {
	grossAmount?: number;
	totalIGST?: number;
	totalCGST?: number;
	totalSGST?: number;
	freightCharges?: number;
	roundOffValue?: number;
	netAmount?: number;
};

type DOPreviewProps = {
	header: DOPreviewHeader;
	items: DOPreviewItem[];
	totals?: DOPreviewTotals;
	remarks?: string;
	onPrint?: () => void;
	onDownload?: () => void;
};

const formatDate = (dateStr?: string) => {
	if (!dateStr) return "-";
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;
		return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
	} catch {
		return dateStr;
	}
};

/* ── Shared inline styles for the on-screen preview ── */
const labelSx = { fontSize: 13, fontWeight: 600 } as const;
const valueSx = { fontSize: 13 } as const;
const kvRowSx = { display: "flex", gap: 0.5 } as const;

const DeliveryOrderPreview: React.FC<DOPreviewProps> = ({ header, items, remarks, onPrint, onDownload }) => {

	/* Total quantity summary (e.g. "52 Bales") */
	const totalQtySummary = React.useMemo(() => {
		if (!items.length) return "";
		const uomCounts: Record<string, number> = {};
		let balesTotal = 0;
		for (const item of items) {
			const qty = Number(item.quantity) || 0;
			const uom = item.uom || "Units";
			uomCounts[uom] = (uomCounts[uom] || 0) + qty;
			const bales = Number(item.qtyInBales);
			if (Number.isFinite(bales)) balesTotal += bales;
		}
		const parts = Object.entries(uomCounts).map(([uom, qty]) => `${qty} ${uom}`);
		if (balesTotal > 0) {
			const balesStr = Number.isInteger(balesTotal) ? String(balesTotal) : balesTotal.toFixed(2);
			parts.push(`${balesStr} Bales`);
		}
		return parts.join(", ");
	}, [items]);

	/* Description lines — "ITEM_CODE — ITEM_NAME"; total qty is rendered separately above. */
	const descriptionLines = React.useMemo(() => {
		return items.map((item) => {
			const parts = [item.itemCode, item.item].filter(Boolean);
			return parts.join(" — ") || "-";
		});
	}, [items]);

	/* ═══════════════ Print HTML builder ═══════════════ */
	const buildPrintableWindow = (titleSuffix: string) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			alert("Please allow popups to continue.");
			return null;
		}

		const h = header;

		const descriptionHtml = descriptionLines.length
			? descriptionLines.map((desc, i) => `<div style="font-size:13px;font-weight:700;margin-bottom:4px;">${i + 1}. ${desc}</div>`).join("")
			: `<div style="font-size:13px;">No line items captured yet.</div>`;

		const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8"/>
	<title>Delivery Order - ${titleSuffix}</title>
	<style>
		@page { size: A4; margin: 10mm; }
		* { box-sizing: border-box; }
		body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		.header-label { font-size:12px; font-weight:600; padding:2px 6px; white-space:nowrap; }
		.header-colon { font-size:12px; padding:2px 2px; }
		.header-value { font-size:12px; padding:2px 6px; font-weight:500; }
	</style>
</head>
<body>
	<!-- Copy indicator -->
	<div style="font-size:11px;font-weight:600;color:#555;margin-bottom:12px;">PARTY COPY / MILL COPY / OFFICE COPY</div>

	<!-- Company name & address -->
	<div style="font-size:15px;font-weight:700;text-transform:uppercase;margin-bottom:2px;">${h.companyName || "-"}</div>
	<div style="font-size:12px;color:#333;margin-bottom:12px;">${h.branchAddress || h.branch || ""}</div>

	<!-- Title -->
	<div style="font-size:15px;font-weight:700;text-decoration:underline;margin-bottom:16px;">DELIVERY ORDER</div>

	<!-- Info block: left = company details, right = DO number/date -->
	<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
		<tr>
			<td style="vertical-align:top;width:60%;">
				<div style="font-size:13px;font-weight:600;margin-bottom:2px;">${h.companyName || ""}</div>
				<div style="font-size:12px;color:#333;">${h.branchAddress || h.branch || ""}</div>
			</td>
			<td style="vertical-align:top;text-align:right;">
				<table style="border-collapse:collapse;margin-left:auto;">
					<tr>
						<td class="header-label">DO No.</td>
						<td class="header-colon">:</td>
						<td class="header-value">${h.doNo || "Pending"}</td>
					</tr>
					<tr>
						<td class="header-label">Date</td>
						<td class="header-colon">:</td>
						<td class="header-value">${formatDate(h.doDate)}</td>
					</tr>
					${h.salesOrderNo || h.salesOrder ? `<tr>
						<td class="header-label">Sale No.</td>
						<td class="header-colon">:</td>
						<td class="header-value">${h.salesOrderNo || h.salesOrder || "-"}</td>
					</tr>` : ""}
					${h.pcsoNo ? `<tr>
						<td class="header-label">PCSO No.</td>
						<td class="header-colon">:</td>
						<td class="header-value">${h.pcsoNo}</td>
					</tr>` : ""}
					${h.pcsoDate ? `<tr>
						<td class="header-label">PCSO Date</td>
						<td class="header-colon">:</td>
						<td class="header-value">${formatDate(h.pcsoDate)}</td>
					</tr>` : ""}
					${h.salesOrderDate ? `<tr>
						<td class="header-label">Date</td>
						<td class="header-colon">:</td>
						<td class="header-value">${formatDate(h.salesOrderDate)}</td>
					</tr>` : ""}
				</table>
			</td>
		</tr>
	</table>

	<!-- Dear Sir -->
	<div style="font-size:13px;margin-bottom:16px;">Dear Sir,</div>

	<!-- Quantity summary -->
	${totalQtySummary ? `<div style="font-size:13px;font-weight:700;margin-bottom:16px;">Quantity for ${totalQtySummary}</div>` : ""}

	<!-- Item descriptions -->
	<div style="margin-bottom:20px;">
		<div style="font-size:13px;font-weight:700;margin-bottom:6px;">Description:</div>
		${descriptionHtml}
	</div>

	<!-- Customer info -->
	<div style="margin-bottom:16px;">
		<div style="font-size:13px;margin-bottom:4px;"><strong>A/C Messrs.</strong> ${h.customer || "-"}</div>
		${h.billingToAddress ? `<div style="font-size:13px;margin-bottom:4px;"><strong>Address :</strong> ${h.billingToAddress}</div>` : ""}
		${h.shippingToAddress && h.shippingToAddress !== h.billingToAddress ? `<div style="font-size:13px;margin-bottom:4px;"><strong>Ship To :</strong> ${h.shippingToAddress}</div>` : ""}
	</div>

	<!-- Delivery instruction -->
	<div style="font-size:12px;margin-bottom:20px;line-height:1.5;">
		On presentation of this Delivery Order, please deliver to the bearer, the above Goods with
		marks as per undernoted M.S.I. and get this Delivery Order back duly receipt after delivery.
	</div>

	<!-- M.S.I. No. -->
	<div style="font-size:13px;font-weight:600;margin-bottom:24px;">M.S.I. No.</div>

	${remarks ? `<div style="font-size:12px;margin-bottom:16px;"><strong>Remarks:</strong> ${remarks}</div>` : ""}

	<!-- Signature block -->
	<table style="width:100%;border-collapse:collapse;margin-top:24px;">
		<tr>
			<td style="text-align:left;width:50%;vertical-align:bottom;padding-top:8px;">
				<div style="font-size:12px;">Copy to Jute Mills</div>
			</td>
			<td style="text-align:right;width:50%;vertical-align:bottom;padding-top:8px;">
				<div style="font-size:13px;font-weight:600;text-transform:uppercase;">${h.companyName || ""}</div>
			</td>
		</tr>
	</table>

	<!-- Footer instructions -->
	<div style="margin-top:32px;border-top:1px solid #ccc;padding-top:12px;">
		${h.transporter || h.vehicleNo || h.driverName ? `<div style="display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px;">
			${h.transporter ? `<div style="font-size:11px;"><strong>Transporter:</strong> ${h.transporter}</div>` : ""}
			${h.vehicleNo ? `<div style="font-size:11px;"><strong>Vehicle No.:</strong> ${h.vehicleNo}</div>` : ""}
			${h.driverName ? `<div style="font-size:11px;"><strong>Driver:</strong> ${h.driverName}</div>` : ""}
		</div>` : ""}
		<div style="font-size:11px;color:#555;line-height:1.6;">
			&gt; For quick delivery please contact mills before sending Lorry<br/>
			&gt; Lorry Should reach mills before 10 A.M.<br/>
			&gt; Consignments Note Should be sent to the Mill along with Lorry.<br/>
			&gt; Mill remain Closed on Sunday
		</div>
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
		const printWindow = buildPrintableWindow(header.doNo || "Print");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
	};

	const handleDownload = () => {
		if (onDownload) { onDownload(); return; }
		const printWindow = buildPrintableWindow(header.doNo || "Download");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => { printWindow.print(); }, 300);
	};

	/* ═══════════════ On-screen preview ═══════════════ */
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 3, backgroundColor: "#fff" }}>
				{/* Copy indicator */}
				<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5, display: "block" }}>
					PARTY COPY / MILL COPY / OFFICE COPY
				</Typography>

				{/* Company Header */}
				<Typography variant="body1" sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}>
					{header.companyName || "-"}
				</Typography>
				<Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 1.5 }}>
					{header.branchAddress || header.branch || ""}
				</Typography>

				{/* Title */}
				<Typography variant="h6" sx={{ fontWeight: 700, textDecoration: "underline", mb: 2 }}>
					DELIVERY ORDER
				</Typography>

				{/* Info block: company details + DO/Sale numbers */}
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
					<Box>
						<Typography sx={labelSx}>{header.companyName || ""}</Typography>
						<Typography sx={{ ...valueSx, color: "text.secondary" }}>{header.branchAddress || header.branch || ""}</Typography>
					</Box>
					<Box component="table" sx={{ borderCollapse: "collapse", width: "auto" }}>
						<Box component="tbody">
							<Box component="tr">
								<Box component="td" sx={{ pr: 0.5, ...labelSx }}>DO No.</Box>
								<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
								<Box component="td" sx={{ ...valueSx, fontWeight: 500 }}>{header.doNo || "Pending"}</Box>
							</Box>
							<Box component="tr">
								<Box component="td" sx={{ pr: 0.5, ...labelSx }}>Date</Box>
								<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
								<Box component="td" sx={valueSx}>{formatDate(header.doDate)}</Box>
							</Box>
							{header.salesOrderNo || header.salesOrder ? (
								<Box component="tr">
									<Box component="td" sx={{ pr: 0.5, ...labelSx }}>Sale No.</Box>
									<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
									<Box component="td" sx={valueSx}>{header.salesOrderNo || header.salesOrder}</Box>
								</Box>
							) : null}
							{header.pcsoNo ? (
								<Box component="tr">
									<Box component="td" sx={{ pr: 0.5, ...labelSx }}>PCSO No.</Box>
									<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
									<Box component="td" sx={valueSx}>{header.pcsoNo}</Box>
								</Box>
							) : null}
							{header.pcsoDate ? (
								<Box component="tr">
									<Box component="td" sx={{ pr: 0.5, ...labelSx }}>PCSO Date</Box>
									<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
									<Box component="td" sx={valueSx}>{formatDate(header.pcsoDate)}</Box>
								</Box>
							) : null}
							{header.salesOrderDate ? (
								<Box component="tr">
									<Box component="td" sx={{ pr: 0.5, ...labelSx }}>Date</Box>
									<Box component="td" sx={{ pr: 0.5, ...valueSx }}>:</Box>
									<Box component="td" sx={valueSx}>{formatDate(header.salesOrderDate)}</Box>
								</Box>
							) : null}
						</Box>
					</Box>
				</Stack>

				{/* Dear Sir */}
				<Typography sx={{ ...valueSx, mb: 2 }}>Dear Sir,</Typography>

				{/* Quantity summary */}
				{totalQtySummary ? (
					<Typography sx={{ ...labelSx, mb: 2 }}>Quantity for {totalQtySummary}</Typography>
				) : null}

				{/* Item descriptions */}
				<Box sx={{ mb: 2.5 }}>
					<Typography sx={{ ...labelSx, mb: 0.5 }}>Description:</Typography>
					{descriptionLines.length ? (
						descriptionLines.map((desc, i) => (
							<Typography key={`desc-${i}`} sx={{ ...labelSx, ml: 1, mb: 0.25 }}>
								{i + 1}. {desc}
							</Typography>
						))
					) : (
						<Typography sx={valueSx}>No line items captured yet.</Typography>
					)}
				</Box>

				{/* Customer info */}
				<Stack spacing={0.5} sx={{ mb: 2 }}>
					<Box sx={kvRowSx}>
						<Typography sx={labelSx}>A/C Messrs.</Typography>
						<Typography sx={valueSx}>{header.customer || "-"}</Typography>
					</Box>
					{header.billingToAddress ? (
						<Box sx={kvRowSx}>
							<Typography sx={labelSx}>Address :</Typography>
							<Typography sx={valueSx}>{header.billingToAddress}</Typography>
						</Box>
					) : null}
					{header.shippingToAddress && header.shippingToAddress !== header.billingToAddress ? (
						<Box sx={kvRowSx}>
							<Typography sx={labelSx}>Ship To :</Typography>
							<Typography sx={valueSx}>{header.shippingToAddress}</Typography>
						</Box>
					) : null}
				</Stack>

				<Divider sx={{ my: 1.5 }} />

				{/* Delivery instruction */}
				<Typography variant="body2" sx={{ fontSize: "0.75rem", lineHeight: 1.5, mb: 2 }}>
					On presentation of this Delivery Order, please deliver to the bearer, the above Goods with
					marks as per undernoted M.S.I. and get this Delivery Order back duly receipt after delivery.
				</Typography>

				{/* M.S.I. No. */}
				<Typography sx={{ ...labelSx, mb: 2 }}>M.S.I. No.</Typography>

				{/* Remarks */}
				{remarks ? (
					<Typography variant="body2" sx={{ fontSize: "0.75rem", mb: 2 }}>
						<strong>Remarks:</strong> {remarks}
					</Typography>
				) : null}

				<Divider sx={{ my: 1.5 }} />

				{/* Signature / copy block */}
				<Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 3 }}>
					<Typography sx={{ fontSize: 12 }}>Copy to Jute Mills</Typography>
					<Typography sx={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>
						{header.companyName || ""}
					</Typography>
				</Stack>

				{/* Transport details + footer notes */}
				<Box sx={{ mt: 4, borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
					{(header.transporter || header.vehicleNo || header.driverName) ? (
						<Stack direction="row" spacing={4} sx={{ mb: 1, flexWrap: "wrap" }}>
							{header.transporter ? (
								<Typography variant="caption"><strong>Transporter:</strong> {header.transporter}</Typography>
							) : null}
							{header.vehicleNo ? (
								<Typography variant="caption"><strong>Vehicle No.:</strong> {header.vehicleNo}</Typography>
							) : null}
							{header.driverName ? (
								<Typography variant="caption"><strong>Driver:</strong> {header.driverName}</Typography>
							) : null}
						</Stack>
					) : null}
					<Box sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.6 }}>
						<div>&gt; For quick delivery please contact mills before sending Lorry</div>
						<div>&gt; Lorry Should reach mills before 10 A.M.</div>
						<div>&gt; Consignments Note Should be sent to the Mill along with Lorry.</div>
						<div>&gt; Mill remain Closed on Sunday</div>
					</Box>
				</Box>
			</Box>

			<Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
				<Button variant="outline" size="sm" onClick={handlePrint}>Print</Button>
				<Button variant="outline" size="sm" onClick={handleDownload}>Download</Button>
			</Stack>
		</Box>
	);
};

export default DeliveryOrderPreview;
