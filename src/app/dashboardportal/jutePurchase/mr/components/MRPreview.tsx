"use client";

import * as React from "react";
import { Box, Stack } from "@mui/material";
import { Button } from "@/components/ui/button";
import type { JuteMRHeader, MRLineItem } from "../types/mrTypes";

// ── Helpers ──

const formatDate = (value?: string | null): string => {
	if (!value) return "";
	try {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
	} catch {
		return value;
	}
};

const fmt = (v?: number | null, dec = 0): string => {
	if (v === undefined || v === null) return "";
	return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
};

/**
 * Concatenate claim details into a single string.
 * Parts present are joined with " + ": claimQuality, Rs {rate} Claim, Dust Shortage {dust}%.
 */
const formatClaimQuality = (
	quality?: string | null,
	rate?: number | null,
	dust?: number | null,
): string => {
	const parts: string[] = [];
	if (quality) parts.push(quality);
	if (rate && rate > 0) parts.push(`Rs ${fmt(rate, 2)} Claim`);
	if (dust && dust > 0) parts.push(`Dust Shortage ${dust}%`);
	return parts.join("  ");
};

/**
 * Format moisture condition column: "actualMoisture%(allowableMoisture%)"
 * e.g. "19.5%(18%)" — only when actual moisture exists.
 */
const formatMoistureCondition = (actual?: number | null, allowable?: number | null): string => {
	if (!actual || actual === 0) return "";
	const actualStr = `${fmt(actual, 1)}%`;
	if (allowable && allowable > 0) return `${actualStr}(${fmt(allowable, 0)}%)`;
	return actualStr;
};

/** Company address on one line: "addr1, addr2 – zipcode" */
const formatCompanyAddress = (header: JuteMRHeader): string => {
	const parts = [header.co_address1, header.co_address2].filter(Boolean);
	let line = parts.join(", ");
	if (header.co_zipcode) line = line ? `${line} – ${header.co_zipcode}` : String(header.co_zipcode);
	return line;
};

// ── Inline styles (everything inline so the print window needs no stylesheet) ──
const thStyle: React.CSSProperties = {
	border: "1px solid #333",
	padding: "6px 7px",
	fontWeight: 600,
	fontSize: "10.5px",
	textAlign: "center",
	verticalAlign: "bottom",
	backgroundColor: "#efefef",
};
const tdStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px 7px", fontSize: "11px" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };
const tdTotal: React.CSSProperties = { ...tdStyle, fontWeight: 700, backgroundColor: "#f7f7f7" };
const tdTotalRight: React.CSSProperties = { ...tdTotal, textAlign: "right" };
const tdTotalCenter: React.CSSProperties = { ...tdTotal, textAlign: "center" };

const metaLbl: React.CSSProperties = { fontWeight: 700, whiteSpace: "nowrap", padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top", width: "15%" };
const metaLblRight: React.CSSProperties = { ...metaLbl, textAlign: "right" };
const metaSep: React.CSSProperties = { padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top", width: "2%" };
const metaVal: React.CSSProperties = { padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top" };

// ── Component ──

type MRPreviewProps = {
	header: JuteMRHeader | null;
	lineItems: MRLineItem[];
	totalAcceptedWeight: number;
};

/**
 * Printable preview component for Jute Material Receipt.
 * Centered-formal layout: centered company header, ruled MATERIAL RECEIPT title
 * band, MR no/date row, colon-separated detail rows, full-grid line items table.
 */
export const MRPreview: React.FC<MRPreviewProps> = ({ header, lineItems, totalAcceptedWeight }) => {
	const previewRef = React.useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		const content = previewRef.current?.innerHTML ?? "";
		const win = window.open("", "_blank");
		if (!win) {
			alert("Please allow popups to print.");
			return;
		}

		const title = `Material Receipt - MR #${header?.mr_num ?? header?.branch_mr_no ?? header?.jute_mr_id ?? ""}`;
		win.document.open();
		win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`);
		win.document.close();

		// Layout is fully inline-styled; the print window only needs page setup.
		// @page margin 0 suppresses the browser's own header/footer (date, title,
		// about:blank, page number) — body padding provides the paper margin instead.
		const s = win.document.createElement("style");
		s.textContent = `
			@media print { @page { size: A4; margin: 0; } }
			body { margin: 0; padding: 12mm 10mm; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			.print-hidden { display: none !important; }
		`;
		win.document.head.appendChild(s);

		const root = win.document.getElementById("root");
		if (root) {
			root.innerHTML = content;
			const stamp = win.document.createElement("div");
			stamp.style.cssText = "font-size:9px;color:#777;text-align:right;margin-top:6px;";
			stamp.textContent = `Printed on: ${new Intl.DateTimeFormat("en-GB", {
				day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
			}).format(new Date())}`;
			root.appendChild(stamp);
		}
		win.focus();
		setTimeout(() => { win.print(); win.close(); }, 300);
	};

	// ── Totals ──
	const totals = React.useMemo(() => {
		let qty = 0, challan = 0, mill = 0, claimKgs = 0, approved = 0;
		for (const li of lineItems) {
			qty += li.actualQty ?? 0;
			challan += li.challanWeight ?? 0;
			mill += li.actualWeight ?? 0;
			claimKgs += li.shortageKgs ?? 0;
			approved += li.acceptedWeight ?? 0;
		}
		return { qty, challan, mill, claimKgs, approved };
	}, [lineItems]);

	if (!header) return null;

	const companyAddress = formatCompanyAddress(header);
	const poDisplay = header.po_num ?? (header.po_no != null ? String(header.po_no) : null);

	return (
		<Box>
			{/* Print button */}
			<Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }} className="print-hidden">
				<Button variant="outline" size="sm" onClick={handlePrint}>
					Print Preview
				</Button>
			</Stack>

			<Box ref={previewRef} sx={{ p: 2, fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#111" }}>
				{/* ── Centered company header ── */}
				{header.co_logo && (
					<img
						src={header.co_logo}
						alt="Company Logo"
						style={{ display: "block", margin: "0 auto 6px", maxHeight: "56px", maxWidth: "180px", objectFit: "contain" }}
					/>
				)}
				{header.co_name && (
					<div style={{ textAlign: "center", fontSize: "19px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
						{header.co_name}
					</div>
				)}
				{companyAddress && (
					<div style={{ textAlign: "center", fontSize: "11px", color: "#333", marginTop: "4px" }}>
						{companyAddress}
					</div>
				)}
				{header.branch_name && (
					<div style={{ textAlign: "center", fontSize: "10.5px", color: "#555", marginTop: "2px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
						{header.branch_name}
					</div>
				)}

				{/* ── Title band ── */}
				<div
					style={{
						borderTop: "1.5px solid #111",
						borderBottom: "1.5px solid #111",
						textAlign: "center",
						fontSize: "13px",
						fontWeight: 700,
						letterSpacing: "0.28em",
						padding: "6px 0",
						marginTop: "14px",
					}}
				>
					MATERIAL RECEIPT
				</div>

				{/* ── MR No / MR Date row ── */}
				<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "8px 2px", borderBottom: "1px solid #ccc", marginBottom: "10px" }}>
					<span><b>MR No : </b><span>{header.mr_num ?? header.branch_mr_no ?? "Draft"}</span></span>
					<span><b>MR Date : </b><span>{formatDate(header.jute_mr_date)}</span></span>
				</div>

				{/* ── Detail rows (label : value) ── */}
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
					<tbody>
						<tr>
							<td style={metaLbl}>M/S</td><td style={metaSep}>:</td>
							<td style={metaVal}>{header.party_name ?? header.supplier_name ?? "-"}</td>
							<td style={metaLblRight}>Mukam</td><td style={metaSep}>:</td>
							<td style={metaVal}>{header.mukam ?? ""}</td>
						</tr>
						{header.party_address && (
							<tr>
								<td style={metaLbl}>Party Address</td><td style={metaSep}>:</td>
								<td style={metaVal} colSpan={4}>{header.party_address}</td>
							</tr>
						)}
						{header.party_gst_no && (
							<tr>
								<td style={metaLbl}>Party GST No</td><td style={metaSep}>:</td>
								<td style={metaVal} colSpan={4}>{header.party_gst_no}</td>
							</tr>
						)}
						<tr>
							<td style={metaLbl}>PO No / Date</td><td style={metaSep}>:</td>
							<td style={metaVal}>{poDisplay ?? "-"}{header.po_date ? `  /  ${formatDate(header.po_date)}` : ""}</td>
							<td style={metaLblRight}>Lorry No</td><td style={metaSep}>:</td>
							<td style={metaVal}>{header.vehicle_no ?? "-"}</td>
						</tr>
						<tr>
							<td style={metaLbl}>Challan No / Date</td><td style={metaSep}>:</td>
							<td style={metaVal}>{header.challan_no ?? "-"}{header.challan_date ? `  /  ${formatDate(header.challan_date)}` : ""}</td>
							<td style={metaLblRight} /><td style={metaSep} /><td style={metaVal} />
						</tr>
					</tbody>
				</table>

				<div style={{ fontSize: "11.5px", marginBottom: "8px" }}>
					Against the above we have received the consignment as follows:
				</div>

				{/* ── Line Items Table ── */}
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
					<thead>
						<tr>
							<th style={thStyle} rowSpan={2}>Bales/<br/>drums</th>
							<th style={thStyle} rowSpan={2}>Marks &amp;<br/>Quality</th>
							<th style={thRight} rowSpan={2}>Advised<br/>weight in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Mill<br/>weight in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Claim in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Approved<br/>Weight</th>
							<th style={thRight} rowSpan={2}>Rate per<br/>Qtls Rs</th>
							<th style={{ ...thStyle, textAlign: "center" }} colSpan={2}>CLAIM FOR</th>
						</tr>
						<tr>
							<th style={thStyle}>QUALITY</th>
							<th style={thStyle}>CONDITION</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.map((li) => (
							<tr key={li.id}>
								<td style={tdCenter}>{li.actualQty != null ? fmt(li.actualQty) : ""}</td>
								<td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
									{li.actualItemName}
									{li.actualQualityName && li.actualQualityName !== "-" && (
										<span> {li.actualQualityName}</span>
									)}
								</td>
								<td style={tdRight}>{fmt(li.challanWeight, 2)}</td>
								<td style={tdRight}>{fmt(li.actualWeight, 2)}</td>
								<td style={tdRight}>{li.shortageKgs ? fmt(li.shortageKgs) : ""}</td>
								<td style={tdRight}>{fmt(li.acceptedWeight, 2)}</td>
								<td style={tdRight}>{fmt(li.rate, 2)}</td>
								<td style={tdStyle}>{formatClaimQuality(li.claimQuality, li.claimRate, li.claimDust)}</td>
								<td style={tdStyle}>
									{formatMoistureCondition(li.actualMoisture, li.allowableMoisture)}
								</td>
							</tr>
						))}
						{/* Totals row */}
						<tr>
							<td style={tdTotalCenter}>{fmt(totals.qty, 2)}</td>
							<td style={tdTotal}>TOTAL</td>
							<td style={tdTotalRight}>{fmt(totals.challan, 2)}</td>
							<td style={tdTotalRight}>{fmt(totals.mill, 2)}</td>
							<td style={tdTotalRight}>{totals.claimKgs ? fmt(totals.claimKgs) : ""}</td>
							<td style={tdTotalRight}>{fmt(totals.approved, 2)}</td>
							<td style={tdTotal} />
							<td style={tdTotal} />
							<td style={tdTotal} />
						</tr>
					</tbody>
				</table>

				{/* ── Remarks ── */}
				{header.remarks && (
					<div style={{ marginTop: "14px", fontSize: "11.5px" }}>
						<b>Remarks : </b>{header.remarks}
					</div>
				)}

				{/* ── Status stamp ── */}
				{header.status && (
					<div style={{ marginTop: "16px" }}>
						<span style={{ display: "inline-block", border: "2px double #111", padding: "2px 10px", fontWeight: 700, letterSpacing: "0.08em", fontSize: "10px", textTransform: "uppercase" }}>
							Status : <strong>{header.status}</strong>
						</span>
					</div>
				)}

				{/* ── Footer ── */}
				<div style={{ fontSize: "10px", color: "#555", textAlign: "center", marginTop: "28px" }}>
					Note*: This is a computer generated print, Signature is not required.
				</div>
			</Box>
		</Box>
	);
};
