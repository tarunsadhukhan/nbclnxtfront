"use client";

import React from "react";
import { Paper, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton, Tooltip } from "@mui/material";

type PreviewHeader = {
	salesNo?: string;
	pcsoNo?: string;
	pcsoDate?: string;
	salesOrderDate?: string;
	branch?: string;
	customerName?: string;
	brokerName?: string;
	transporterName?: string;
	status?: string;
	companyName?: string;
	companyLogo?: string;
};

type PreviewItem = {
	index: number;
	/** Concatenated: itemGroupCode — itemCode — itemGroupName — itemName */
	itemName: string;
	/** Qty + UOM already concatenated, with rounding applied */
	qtyDisplay: string;
	/** For hessian: other qty + uom in brackets (e.g. "≈ 17.4954 MT") */
	otherQtyDisplay?: string;
	/** Rate with rate UOM concatenated */
	rateDisplay: string;
	amount: number | string;
	gst: number | string;
	total: number | string;
};

type PreviewAdditionalCharge = {
	chargeName: string;
	qty: number;
	rate: number;
	netAmount: number;
	taxAmount: number;
	total: number;
};

type SalesOrderPreviewProps = {
	header: PreviewHeader;
	items: PreviewItem[];
	remarks?: string;
	additionalCharges?: PreviewAdditionalCharge[];
	freightCharges?: number;
};

const formatCurrency = (value: number | string | undefined) => {
	if (value === undefined || value === null || value === "") return "-";
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (isNaN(num)) return "-";
	return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(num);
};

const toNum = (v: number | string | undefined): number => {
	if (v === undefined || v === null || v === "" || v === "-") return 0;
	const n = typeof v === "string" ? parseFloat(v) : v;
	return isNaN(n) ? 0 : n;
};

export function SalesOrderPreview({ header, items, remarks, additionalCharges, freightCharges }: SalesOrderPreviewProps) {
	const printRef = React.useRef<HTMLDivElement>(null);

	const lineItemTotals = React.useMemo(() => {
		let amount = 0;
		let gst = 0;
		let total = 0;
		for (const item of items) {
			amount += toNum(item.amount);
			gst += toNum(item.gst);
			total += toNum(item.total);
		}
		return { amount, gst, total };
	}, [items]);

	const addlChargeTotals = React.useMemo(() => {
		if (!additionalCharges?.length) return { netAmount: 0, taxAmount: 0, total: 0 };
		let netAmount = 0;
		let taxAmount = 0;
		let total = 0;
		for (const c of additionalCharges) {
			netAmount += c.netAmount;
			taxAmount += c.taxAmount;
			total += c.total;
		}
		return { netAmount, taxAmount, total };
	}, [additionalCharges]);

	const grandTotal = lineItemTotals.total + addlChargeTotals.total + (freightCharges ?? 0);

	const handlePrint = React.useCallback(() => {
		const el = printRef.current;
		if (!el) return;
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;
		printWindow.document.write(`
			<html>
			<head>
				<title>Sales Order ${header.salesNo || ""}</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
					table { width: 100%; border-collapse: collapse; margin-top: 12px; }
					th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
					th { background: #f5f5f5; text-align: left; }
					td.right { text-align: right; }
					.header-grid { display: flex; flex-wrap: wrap; gap: 24px; margin: 12px 0; }
					.header-field label { font-size: 11px; color: #888; display: block; }
					.header-field span { font-size: 14px; }
					h2 { margin: 0; }
					.subtitle { font-size: 13px; color: #666; }
					.status { float: right; border: 1px solid #333; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
					hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
					.totals td { font-weight: 700; }
					.other-qty { font-size: 11px; color: #666; }
					.summary-table { margin-top: 16px; width: auto; margin-left: auto; }
					.summary-table td { border: none; padding: 4px 12px; font-size: 13px; }
					.summary-table td.label { text-align: right; color: #666; }
					.summary-table td.value { text-align: right; font-weight: 600; }
					.summary-table tr.grand-total td { font-size: 14px; font-weight: 700; border-top: 2px solid #333; padding-top: 8px; }
					@media print { @page { size: A4; margin: 10mm; } body { margin: 10px; } }
				</style>
			</head>
			<body>${el.innerHTML}</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
	}, [header.salesNo]);

	const hasAddlCharges = additionalCharges && additionalCharges.length > 0;
	const hasFreight = (freightCharges ?? 0) > 0;

	return (
		<Paper variant="outlined" sx={{ p: 3 }}>
			<div className="flex justify-between items-start mb-4">
				<div>
					{header.companyLogo && (
						<img src={header.companyLogo} alt="" style={{ maxHeight: 60, maxWidth: 200, marginBottom: 4 }} />
					)}
					<Typography variant="h6" fontWeight={700}>
						{header.companyName || "Company"}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Sales Order Preview
					</Typography>
				</div>
				<div className="flex items-center gap-1">
					{header.status && <Chip label={header.status} size="small" />}
					<Tooltip title="Print / Download">
						<IconButton size="small" onClick={handlePrint}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="6 9 6 2 18 2 18 9" />
								<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
								<rect x="6" y="14" width="12" height="8" />
							</svg>
						</IconButton>
					</Tooltip>
				</div>
			</div>

			{/* Printable content (hidden on screen, used for print window) */}
			<div ref={printRef} style={{ display: "none" }}>
				<h2 style={{ margin: 0 }}>{header.companyName || "Company"}</h2>
				<span className="subtitle" style={{ fontSize: 13, color: "#666" }}>Sales Order Preview</span>
				{header.status && <span className="status" style={{ float: "right", border: "1px solid #333", padding: "2px 10px", borderRadius: 12, fontSize: 12 }}>{header.status}</span>}

				<hr />

				<div className="header-grid" style={{ display: "flex", flexWrap: "wrap", gap: 24, margin: "12px 0" }}>
					{header.salesNo && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Sales Order No</label>
							<span style={{ fontSize: 14, fontWeight: 600 }}>{header.salesNo}</span>
						</div>
					)}
					{header.pcsoNo && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>PCSO No</label>
							<span style={{ fontSize: 14, fontWeight: 600 }}>{header.pcsoNo}</span>
						</div>
					)}
					{header.pcsoDate && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>PCSO Date</label>
							<span style={{ fontSize: 14 }}>{header.pcsoDate}</span>
						</div>
					)}
					{header.salesOrderDate && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Order Date</label>
							<span style={{ fontSize: 14 }}>{header.salesOrderDate}</span>
						</div>
					)}
					{header.branch && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Branch</label>
							<span style={{ fontSize: 14 }}>{header.branch}</span>
						</div>
					)}
					{header.customerName && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Customer</label>
							<span style={{ fontSize: 14 }}>{header.customerName}</span>
						</div>
					)}
					{header.brokerName && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Broker</label>
							<span style={{ fontSize: 14 }}>{header.brokerName}</span>
						</div>
					)}
					{header.transporterName && (
						<div className="header-field">
							<label style={{ fontSize: 11, color: "#888", display: "block" }}>Transporter</label>
							<span style={{ fontSize: 14 }}>{header.transporterName}</span>
						</div>
					)}
				</div>

				{items.length > 0 && (
					<>
						<hr />
						<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Line Items</div>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "left" }}>#</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "left" }}>Item</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Qty</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Rate</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Amount</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>GST</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Total</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={item.index}>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13 }}>{item.index}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13 }}>{item.itemName}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>
											{item.qtyDisplay}
											{item.otherQtyDisplay && (
												<div className="other-qty" style={{ fontSize: 11, color: "#666" }}>({item.otherQtyDisplay})</div>
											)}
										</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{item.rateDisplay}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(item.amount)}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(item.gst)}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(item.total)}</td>
									</tr>
								))}
								<tr style={{ fontWeight: 700 }}>
									<td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>Line Items Total</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(lineItemTotals.amount)}</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(lineItemTotals.gst)}</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(lineItemTotals.total)}</td>
								</tr>
							</tbody>
						</table>
					</>
				)}

				{hasAddlCharges && (
					<>
						<hr />
						<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Additional Charges</div>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "left" }}>#</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "left" }}>Charge</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Qty</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Rate</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Amount</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>GST</th>
									<th style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, background: "#f5f5f5", textAlign: "right" }}>Total</th>
								</tr>
							</thead>
							<tbody>
								{additionalCharges!.map((c, i) => (
									<tr key={i}>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13 }}>{i + 1}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13 }}>{c.chargeName}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{c.qty}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(c.rate)}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(c.netAmount)}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(c.taxAmount)}</td>
										<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(c.total)}</td>
									</tr>
								))}
								<tr style={{ fontWeight: 700 }}>
									<td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>Additional Charges Total</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(addlChargeTotals.netAmount)}</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(addlChargeTotals.taxAmount)}</td>
									<td style={{ border: "1px solid #ddd", padding: 8, fontSize: 13, textAlign: "right" }}>{formatCurrency(addlChargeTotals.total)}</td>
								</tr>
							</tbody>
						</table>
					</>
				)}

				{/* Summary */}
				<table className="summary-table" style={{ marginTop: 16, width: "auto", marginLeft: "auto", borderCollapse: "collapse" }}>
					<tbody>
						<tr>
							<td className="label" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", color: "#666" }}>Line Items Total</td>
							<td className="value" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{formatCurrency(lineItemTotals.total)}</td>
						</tr>
						{hasAddlCharges && (
							<tr>
								<td className="label" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", color: "#666" }}>Additional Charges</td>
								<td className="value" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{formatCurrency(addlChargeTotals.total)}</td>
							</tr>
						)}
						{hasFreight && (
							<tr>
								<td className="label" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", color: "#666" }}>Freight Charges</td>
								<td className="value" style={{ border: "none", padding: "4px 12px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{formatCurrency(freightCharges)}</td>
							</tr>
						)}
						<tr className="grand-total">
							<td style={{ border: "none", padding: "8px 12px", fontSize: 14, textAlign: "right", fontWeight: 700, borderTop: "2px solid #333", paddingTop: 8 }}>Grand Total</td>
							<td style={{ border: "none", padding: "8px 12px", fontSize: 14, textAlign: "right", fontWeight: 700, borderTop: "2px solid #333", paddingTop: 8 }}>{formatCurrency(grandTotal)}</td>
						</tr>
					</tbody>
				</table>

				{remarks && (
					<>
						<hr />
						<div style={{ fontSize: 11, color: "#888" }}>Remarks</div>
						<div style={{ fontSize: 13 }}>{remarks}</div>
					</>
				)}
			</div>

			<Divider sx={{ my: 2 }} />

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
				{header.salesNo && (
					<div>
						<Typography variant="caption" color="text.secondary">Sales Order No</Typography>
						<Typography variant="body2" fontWeight={600}>{header.salesNo}</Typography>
					</div>
				)}
				{header.pcsoNo && (
					<div>
						<Typography variant="caption" color="text.secondary">PCSO No</Typography>
						<Typography variant="body2" fontWeight={600}>{header.pcsoNo}</Typography>
					</div>
				)}
				{header.pcsoDate && (
					<div>
						<Typography variant="caption" color="text.secondary">PCSO Date</Typography>
						<Typography variant="body2">{header.pcsoDate}</Typography>
					</div>
				)}
				{header.salesOrderDate && (
					<div>
						<Typography variant="caption" color="text.secondary">Order Date</Typography>
						<Typography variant="body2">{header.salesOrderDate}</Typography>
					</div>
				)}
				{header.branch && (
					<div>
						<Typography variant="caption" color="text.secondary">Branch</Typography>
						<Typography variant="body2">{header.branch}</Typography>
					</div>
				)}
				{header.customerName && (
					<div>
						<Typography variant="caption" color="text.secondary">Customer</Typography>
						<Typography variant="body2">{header.customerName}</Typography>
					</div>
				)}
				{header.brokerName && (
					<div>
						<Typography variant="caption" color="text.secondary">Broker</Typography>
						<Typography variant="body2">{header.brokerName}</Typography>
					</div>
				)}
				{header.transporterName && (
					<div>
						<Typography variant="caption" color="text.secondary">Transporter</Typography>
						<Typography variant="body2">{header.transporterName}</Typography>
					</div>
				)}
			</div>

			{items.length > 0 && (
				<>
					<Divider sx={{ my: 2 }} />
					<Typography variant="subtitle2" sx={{ mb: 1 }}>Line Items</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>#</TableCell>
								<TableCell>Item</TableCell>
								<TableCell align="right">Qty</TableCell>
								<TableCell align="right">Rate</TableCell>
								<TableCell align="right">Amount</TableCell>
								<TableCell align="right">GST</TableCell>
								<TableCell align="right">Total</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{items.map((item) => (
								<TableRow key={item.index}>
									<TableCell>{item.index}</TableCell>
									<TableCell>{item.itemName}</TableCell>
									<TableCell align="right">
										{item.qtyDisplay}
										{item.otherQtyDisplay && (
											<Typography variant="caption" display="block" color="text.secondary">
												({item.otherQtyDisplay})
											</Typography>
										)}
									</TableCell>
									<TableCell align="right">{item.rateDisplay}</TableCell>
									<TableCell align="right">{formatCurrency(item.amount)}</TableCell>
									<TableCell align="right">{formatCurrency(item.gst)}</TableCell>
									<TableCell align="right">{formatCurrency(item.total)}</TableCell>
								</TableRow>
							))}
							<TableRow>
								<TableCell colSpan={4} align="right">
									<Typography variant="body2" fontWeight={700}>Line Items Total</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(lineItemTotals.amount)}</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(lineItemTotals.gst)}</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(lineItemTotals.total)}</Typography>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</>
			)}

			{hasAddlCharges && (
				<>
					<Divider sx={{ my: 2 }} />
					<Typography variant="subtitle2" sx={{ mb: 1 }}>Additional Charges</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>#</TableCell>
								<TableCell>Charge</TableCell>
								<TableCell align="right">Qty</TableCell>
								<TableCell align="right">Rate</TableCell>
								<TableCell align="right">Amount</TableCell>
								<TableCell align="right">GST</TableCell>
								<TableCell align="right">Total</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{additionalCharges!.map((c, i) => (
								<TableRow key={i}>
									<TableCell>{i + 1}</TableCell>
									<TableCell>{c.chargeName}</TableCell>
									<TableCell align="right">{c.qty}</TableCell>
									<TableCell align="right">{formatCurrency(c.rate)}</TableCell>
									<TableCell align="right">{formatCurrency(c.netAmount)}</TableCell>
									<TableCell align="right">{formatCurrency(c.taxAmount)}</TableCell>
									<TableCell align="right">{formatCurrency(c.total)}</TableCell>
								</TableRow>
							))}
							<TableRow>
								<TableCell colSpan={4} align="right">
									<Typography variant="body2" fontWeight={700}>Additional Charges Total</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(addlChargeTotals.netAmount)}</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(addlChargeTotals.taxAmount)}</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" fontWeight={700}>{formatCurrency(addlChargeTotals.total)}</Typography>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</>
			)}

			{/* Grand Total Summary */}
			{(hasAddlCharges || hasFreight) && (
				<>
					<Divider sx={{ my: 2 }} />
					<div className="flex justify-end">
						<div className="space-y-1" style={{ minWidth: 280 }}>
							<div className="flex justify-between text-sm">
								<Typography variant="body2" color="text.secondary">Line Items Total</Typography>
								<Typography variant="body2">{formatCurrency(lineItemTotals.total)}</Typography>
							</div>
							{hasAddlCharges && (
								<div className="flex justify-between text-sm">
									<Typography variant="body2" color="text.secondary">Additional Charges</Typography>
									<Typography variant="body2">{formatCurrency(addlChargeTotals.total)}</Typography>
								</div>
							)}
							{hasFreight && (
								<div className="flex justify-between text-sm">
									<Typography variant="body2" color="text.secondary">Freight Charges</Typography>
									<Typography variant="body2">{formatCurrency(freightCharges)}</Typography>
								</div>
							)}
							<Divider />
							<div className="flex justify-between">
								<Typography variant="subtitle2">Grand Total</Typography>
								<Typography variant="subtitle2">{formatCurrency(grandTotal)}</Typography>
							</div>
						</div>
					</div>
				</>
			)}

			{remarks && (
				<>
					<Divider sx={{ my: 2 }} />
					<Typography variant="caption" color="text.secondary">Remarks</Typography>
					<Typography variant="body2">{remarks}</Typography>
				</>
			)}
		</Paper>
	);
}

export default SalesOrderPreview;
