"use client";

import * as React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { openStyledPrintWindow } from "@/utils/printUtils";
import CompanyHeaderBlock from "@/app/dashboardportal/procurement/_shared/PrintHeader";
import type { SRAdditionalCharge, SRHeader, SRLineItem, SRTotals } from "../types/srTypes";

/**
 * Format date for display.
 */
const formatDate = (value?: string): string => {
	if (!value) return "-";
	try {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		}).format(date);
	} catch {
		return value;
	}
};

/**
 * Format currency for display.
 */
const formatCurrency = (value?: number): string => {
	if (value === undefined || value === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

const FieldRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
	<Stack direction="row" spacing={0.5} sx={{ minWidth: 0, alignItems: "baseline" }}>
		<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
			{label}:
		</Typography>
		<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
			{value ?? "-"}
		</Typography>
	</Stack>
);

const TotalsRow = ({ label, value, isBold = false }: { label: string; value?: React.ReactNode; isBold?: boolean }) => (
	<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ minWidth: 280 }}>
		<Typography
			variant="body2"
			color="text.secondary"
			sx={{ fontSize: "0.8125rem", fontWeight: isBold ? 600 : 400 }}
		>
			{label}:
		</Typography>
		<Typography
			variant="body2"
			sx={{ fontWeight: isBold ? 600 : 400, fontSize: isBold ? "0.9375rem" : "0.8125rem" }}
		>
			{value ?? "-"}
		</Typography>
	</Stack>
);

type AdditionalChargesTotals = {
	baseAmount: number;
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	totalTax: number;
	totalAmount: number;
};

type SRPreviewProps = {
	header: SRHeader | null;
	lineItems: SRLineItem[];
	totals: SRTotals;
	chargesTotals?: AdditionalChargesTotals;
	additionalCharges?: SRAdditionalCharge[];
	srDate: string;
	srRemarks: string;
	coId?: string | number | null;
	onPrint?: () => void;
};

/**
 * Printable preview component for SR.
 */
export const SRPreview: React.FC<SRPreviewProps> = ({
	header,
	lineItems,
	totals,
	chargesTotals,
	additionalCharges,
	srDate,
	srRemarks,
	coId,
	onPrint,
}) => {
	const visibleCharges = (additionalCharges ?? []).filter(
		(c) => c.additional_charges_id > 0 && (c.net_amount || 0) > 0,
	);
	const previewRef = React.useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
			return;
		}

		const printContent = previewRef.current?.innerHTML || "";
		const extraCss = `
			body { font-family: Arial, sans-serif; }
			table { margin-top: 16px; }
			th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
			th { background-color: #f5f5f5; font-weight: 600; }
			.text-right { text-align: right; }
		`;
		const printWindow = openStyledPrintWindow(
			printContent,
			`Stores Receipt - ${header?.sr_no || header?.inward_no}`,
			extraCss
		);
		if (!printWindow) return;

		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 300);
	};

	return (
		<Box>
			<Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }} className="print-hidden">
				<Button variant="outline" size="sm" onClick={handlePrint}>
					Print Preview
				</Button>
			</Stack>

			<Box ref={previewRef} sx={{ p: 2 }}>
				{/* Letterhead: company block / centered title / SR meta */}
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
					<CompanyHeaderBlock
						coId={coId}
						branchId={header?.branch_id}
						branchLabel={header?.branch_name}
						maxWidth="35%"
					/>
					<Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
						<Stack spacing={0.25} alignItems="center">
							<Typography variant="h5" sx={{ fontWeight: 600 }}>
								Stores Receipt
							</Typography>
							{header?.sr_status_name ? (
								<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
									{header.sr_status_name}
								</Typography>
							) : null}
						</Stack>
					</Box>
					<Stack spacing={0.5} alignItems="flex-end" sx={{ minWidth: 200 }}>
						<FieldRow
							label="SR No"
							value={
								<Typography component="span" fontWeight={600} color="primary">
									{header?.sr_no || header?.sr_status_name || "Draft"}
								</Typography>
							}
						/>
						<FieldRow label="SR Date" value={formatDate(srDate)} />
					</Stack>
				</Stack>

				<Divider sx={{ mb: 2 }} />

				{/* Header Info */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
						gap: 2,
						mb: 3,
					}}
				>
					<FieldRow label="Inward No" value={header?.inward_no} />
					<FieldRow label="Inward Date" value={formatDate(header?.inward_date)} />
					<FieldRow label="Supplier" value={header?.supplier_name} />
					<FieldRow label="Inspection Date" value={formatDate(header?.inspection_date)} />
					<FieldRow label="Challan No" value={header?.challan_no} />
					<FieldRow label="Challan Date" value={formatDate(header?.challan_date)} />
					<FieldRow label="Invoice No" value={header?.invoice_no} />
					<FieldRow label="Invoice Date" value={formatDate(header?.invoice_date)} />
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Line Items Table */}
				<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
					Line Items
				</Typography>
				<Box
					component="table"
					sx={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}
				>
					<thead>
						<tr style={{ backgroundColor: "#f5f5f5" }}>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>PO No.</th>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>Item Code</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>Item</th>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>HSN</th>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>UOM</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Qty</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Rate</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Disc.</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Disc. Amt</th>
							<th style={{ border: "1px solid #ddd", padding: "8px" }}>Warehouse</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Amount</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Tax %</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Tax Amt</th>
							<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Total</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.map((item, idx) => (
							<tr key={item.id}>
								<td style={{ border: "1px solid #ddd", padding: "8px" }}>{idx + 1}</td>
								<td style={{ border: "1px solid #ddd", padding: "8px" }}>
									{item.po_no_formatted || "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", fontFamily: "monospace" }}>
									{item.full_item_code || item.item_code || "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px" }}>
									{item.item_name || "-"}
									{item.accepted_item_make_name && (
										<span style={{ color: "#666", fontSize: "11px" }}>
											{" "}({item.accepted_item_make_name})
										</span>
									)}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", fontFamily: "monospace" }}>
									{item.hsn_code || "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.uom_name}</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.approved_qty}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.accepted_rate.toFixed(2)}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.discount_mode === 1
										? `${item.discount_value ?? 0}%`
										: item.discount_mode === 2
											? (item.discount_value ?? 0).toFixed(2)
											: "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.discount_amount > 0 ? item.discount_amount.toFixed(2) : "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px" }}>
									{item.warehouse_path || item.warehouse_name || "-"}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.amount.toFixed(2)}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.tax_percentage}%
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
									{item.tax_amount.toFixed(2)}
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right", fontWeight: 600 }}>
									{item.total_amount.toFixed(2)}
								</td>
							</tr>
						))}
					</tbody>
				</Box>

				{/* Additional Charges Table */}
				{visibleCharges.length > 0 && (
					<>
						<Divider sx={{ my: 2 }} />
						<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
							Additional Charges
						</Typography>
						<Box
							component="table"
							sx={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}
						>
							<thead>
								<tr style={{ backgroundColor: "#f5f5f5" }}>
									<th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
									<th style={{ border: "1px solid #ddd", padding: "8px" }}>Charge</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Qty</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Rate</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Net Amount</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Tax %</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Tax Amt</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Total</th>
									<th style={{ border: "1px solid #ddd", padding: "8px" }}>Remarks</th>
								</tr>
							</thead>
							<tbody>
								{visibleCharges.map((charge, idx) => {
									const net = charge.net_amount || 0;
									const tax = charge.tax_amount || 0;
									return (
										<tr key={charge.id}>
											<td style={{ border: "1px solid #ddd", padding: "8px" }}>{idx + 1}</td>
											<td style={{ border: "1px solid #ddd", padding: "8px" }}>
												{charge.additional_charges_name || "-"}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
												{charge.qty}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
												{(charge.rate || 0).toFixed(2)}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
												{net.toFixed(2)}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
												{(charge.tax_pct || 0)}%
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>
												{tax.toFixed(2)}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right", fontWeight: 600 }}>
												{(net + tax).toFixed(2)}
											</td>
											<td style={{ border: "1px solid #ddd", padding: "8px" }}>
												{charge.remarks || "-"}
											</td>
										</tr>
									);
								})}
							</tbody>
						</Box>
					</>
				)}

				{/* Totals */}
				<Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
					<Stack spacing={0.5}>
						<TotalsRow label="Gross Amount" value={formatCurrency(totals.grossAmount)} />
						{totals.totalDiscount > 0 && (
							<TotalsRow label="Discount" value={`-${formatCurrency(totals.totalDiscount)}`} />
						)}
						{(chargesTotals?.baseAmount ?? 0) > 0 && (
							<TotalsRow label="Additional Charges" value={formatCurrency(chargesTotals!.baseAmount)} />
						)}
						<TotalsRow label="Net Amount" value={formatCurrency(totals.netAmount + (chargesTotals?.baseAmount ?? 0))} />
						{(totals.totalIGST + (chargesTotals?.totalIGST ?? 0)) > 0 && (
							<TotalsRow label="IGST" value={formatCurrency(totals.totalIGST + (chargesTotals?.totalIGST ?? 0))} />
						)}
						{(totals.totalCGST + (chargesTotals?.totalCGST ?? 0)) > 0 && (
							<TotalsRow label="CGST" value={formatCurrency(totals.totalCGST + (chargesTotals?.totalCGST ?? 0))} />
						)}
						{(totals.totalSGST + (chargesTotals?.totalSGST ?? 0)) > 0 && (
							<TotalsRow label="SGST" value={formatCurrency(totals.totalSGST + (chargesTotals?.totalSGST ?? 0))} />
						)}
						<Divider sx={{ my: 0.5 }} />
						<TotalsRow label="Grand Total" value={formatCurrency(totals.grandTotal + (chargesTotals?.baseAmount ?? 0) + (chargesTotals?.totalTax ?? 0))} isBold />
					</Stack>
				</Box>

				{/* Remarks */}
				{srRemarks && (
					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle2" color="text.secondary">
							Remarks:
						</Typography>
						<Typography variant="body2">{srRemarks}</Typography>
					</Box>
				)}
			</Box>
		</Box>
	);
};
