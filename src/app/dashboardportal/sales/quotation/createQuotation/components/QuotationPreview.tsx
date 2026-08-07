"use client";

import React, { useRef } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { openStyledPrintWindow } from "@/utils/printUtils";

export type QuotationPreviewHeader = {
	quotationNo?: string;
	quotationDate?: string;
	expiryDate?: string;
	branch?: string;
	customer?: string;
	broker?: string;
	billingAddress?: string;
	shippingAddress?: string;
	status?: string;
	updatedBy?: string;
	updatedAt?: string;
	companyName?: string;
	companyLogo?: string;
	taxType?: string;
	paymentTerms?: string;
	deliveryTerms?: string;
	deliveryDays?: string | number;
	brokeragePercentage?: string | number;
};

export type QuotationPreviewItem = {
	srNo: number;
	itemGroup?: string;
	item?: string;
	make?: string;
	hsnCode?: string;
	quantity?: string | number;
	uom?: string;
	rate?: string | number;
	discountType?: string;
	discountValue?: string | number;
	amount?: string | number;
	remarks?: string;
};

export type QuotationPreviewTotals = {
	netAmount?: number;
	totalIGST?: number;
	totalCGST?: number;
	totalSGST?: number;
	totalAmount?: number;
	roundOffValue?: number;
};

type QuotationPreviewProps = {
	header: QuotationPreviewHeader;
	items: QuotationPreviewItem[];
	totals?: QuotationPreviewTotals;
	remarks?: string;
	termsCondition?: string;
};

const FieldRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
	<Stack direction="column" spacing={0.25} sx={{ minWidth: 0 }}>
		<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
			{label}:
		</Typography>
		<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
			{value ?? "-"}
		</Typography>
	</Stack>
);

const TotalsRow = ({ label, value, isBold = false }: { label: string; value?: React.ReactNode; isBold?: boolean }) => (
	<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ minWidth: 280 }}>
		<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem", fontWeight: isBold ? 600 : 400 }}>
			{label}:
		</Typography>
		<Typography variant="body2" sx={{ fontWeight: isBold ? 600 : 400, fontSize: "0.875rem", textAlign: "right", minWidth: 120, fontVariantNumeric: "tabular-nums" }}>
			{value ?? "-"}
		</Typography>
	</Stack>
);

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

const formatDateTime = (dateStr?: string) => {
	if (!dateStr) return "-";
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;
		return date.toLocaleString("en-GB", {
			year: "numeric", month: "2-digit", day: "2-digit",
			hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
		});
	} catch {
		return dateStr;
	}
};

const formatAmount = (value?: number | string) => {
	if (value === null || value === undefined || value === "") return "-";
	const num = Number(value);
	if (Number.isNaN(num)) return value;
	return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const QuotationPreview: React.FC<QuotationPreviewProps> = ({ header, items, totals, remarks, termsCondition }) => {
	const previewRef = useRef<HTMLDivElement>(null);

	const buildPrintableWindow = (titleSuffix: string) => {
		const printContent = previewRef.current?.innerHTML || "";
		return openStyledPrintWindow(
			printContent,
			`Sales Quotation - ${titleSuffix}`
		);
	};

	const handlePrint = () => {
		const printWindow = buildPrintableWindow(header.quotationNo || "Print");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 300);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box ref={previewRef} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 3, backgroundColor: "#fff" }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
					<Stack spacing={0.5} sx={{ minWidth: 200, maxWidth: { xs: "100%", md: "25%" }, flexBasis: { md: "25%" } }}>
						{header.companyLogo && (
							<img src={header.companyLogo} alt="" style={{ maxHeight: 60, maxWidth: 200, marginBottom: 4 }} />
						)}
						<Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem", wordBreak: "break-word", whiteSpace: "normal" }}>
							{header.companyName || "-"}
						</Typography>
						<Typography variant="body2" sx={{ fontSize: "0.875rem", color: "text.secondary", wordBreak: "break-word", whiteSpace: "normal" }}>
							{header.branch || "-"}
						</Typography>
					</Stack>

					<Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
						<Stack spacing={0.25} alignItems="center">
							<Typography variant="h5" sx={{ fontWeight: 600 }}>
								Sales Quotation
							</Typography>
							{header.status ? (
								<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
									{header.status}
								</Typography>
							) : null}
						</Stack>
					</Box>

					<Stack spacing={0.5} alignItems="flex-end" sx={{ minWidth: 200 }}>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>Date:</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>{formatDate(header.quotationDate)}</Typography>
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>No:</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>{header.quotationNo || "-"}</Typography>
						</Stack>
					</Stack>
				</Stack>

				<Divider sx={{ mb: 2 }} />

				<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
					<FieldRow label="Customer" value={header.customer || "-"} />
					{header.broker ? <FieldRow label="Broker" value={header.broker} /> : null}
					<FieldRow label="Billing Address" value={header.billingAddress || "-"} />
					<FieldRow label="Shipping Address" value={header.shippingAddress || "-"} />
					{header.expiryDate ? <FieldRow label="Expiry Date" value={formatDate(header.expiryDate)} /> : null}
					<FieldRow label="Tax Type" value={header.taxType || "-"} />
					{header.paymentTerms ? <FieldRow label="Payment Terms" value={header.paymentTerms} /> : null}
					{header.deliveryTerms ? <FieldRow label="Delivery Terms" value={header.deliveryTerms} /> : null}
					{header.deliveryDays ? <FieldRow label="Delivery Days" value={String(header.deliveryDays)} /> : null}
					{header.brokeragePercentage ? <FieldRow label="Brokerage %" value={`${header.brokeragePercentage}%`} /> : null}
				</Box>

				<Divider sx={{ my: 2 }} />

				<Box sx={{ overflowX: "auto" }}>
					<Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
						<Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.08)" }}>
							<Box component="tr">
								{["Sr No", "Item", "Make", "HSN", "Qty", "UOM", "Rate", "Disc.", "Amount", "Remarks"].map((col) => (
									<Box key={col} component="th" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: col === "Remarks" ? "left" : "center" }}>
										{col}
									</Box>
								))}
							</Box>
						</Box>
						<Box component="tbody">
							{items.length ? (
								items.map((item) => (
									<Box component="tr" key={`preview-row-${item.srNo}`}>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>{item.srNo}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>{item.item || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>{item.make || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>{item.hsnCode || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{item.quantity ?? "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>{item.uom || "-"}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{formatAmount(item.rate)}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
											{item.discountType && item.discountValue ? `${item.discountValue}${item.discountType === "%" ? "%" : ""}` : "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{formatAmount(item.amount)}</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>{item.remarks || "-"}</Box>
									</Box>
								))
							) : (
								<Box component="tr">
									<Box component="td" colSpan={10} sx={{ border: "1px solid", borderColor: "divider", p: 2, fontSize: 12, textAlign: "center" }}>
										No line items captured yet.
									</Box>
								</Box>
							)}
						</Box>
					</Box>
				</Box>

				{totals ? (
					<>
						<Divider sx={{ my: 2 }} />
						<Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="flex-end" sx={{ pr: 2 }}>
							<Box sx={{ minWidth: 280 }}>
								<Stack spacing={0.75}>
									<TotalsRow label="Net Amount" value={formatAmount(totals.netAmount)} />
									<TotalsRow label="IGST" value={formatAmount(totals.totalIGST)} />
									<TotalsRow label="CGST" value={formatAmount(totals.totalCGST)} />
									<TotalsRow label="SGST" value={formatAmount(totals.totalSGST)} />
									{totals.roundOffValue != null && totals.roundOffValue !== 0 ? (
										<TotalsRow label="Round Off" value={formatAmount(totals.roundOffValue)} />
									) : null}
									<Divider sx={{ my: 0.5 }} />
									<TotalsRow label="Total Amount" value={formatAmount(totals.totalAmount)} isBold />
								</Stack>
							</Box>
						</Stack>
					</>
				) : null}

				{(remarks || termsCondition) ? (
					<>
						<Divider sx={{ my: 2 }} />
						{remarks ? (
							<Stack spacing={1} sx={{ mb: 2 }}>
								<Typography variant="subtitle2">Remarks</Typography>
								<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 60 }}>
									<Typography variant="body2" color="text.secondary">{remarks}</Typography>
								</Box>
							</Stack>
						) : null}
						{termsCondition ? (
							<Stack spacing={1}>
								<Typography variant="subtitle2">Terms & Conditions</Typography>
								<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 60 }}>
									<Typography variant="body2" color="text.secondary">{termsCondition}</Typography>
								</Box>
							</Stack>
						) : null}
					</>
				) : null}

				<Divider sx={{ my: 2 }} />

				<Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-start" spacing={4}>
					<Stack spacing={0.5}>
						<Typography variant="caption" color="text.secondary">Updated By</Typography>
						<Box sx={{ borderBottom: "1px solid", borderColor: "divider", width: 200, height: 24 }} />
						<Typography variant="caption" color="text.secondary">Last Updated: {header.updatedAt ? formatDateTime(header.updatedAt) : "-"}</Typography>
					</Stack>
				</Stack>
			</Box>

			<Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
				<Button variant="outline" size="sm" onClick={handlePrint}>Print</Button>
			</Stack>
		</Box>
	);
};

export default QuotationPreview;
