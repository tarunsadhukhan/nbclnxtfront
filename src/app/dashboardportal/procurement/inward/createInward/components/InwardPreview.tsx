"use client";

import React, { useRef } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { openStyledPrintWindow } from "@/utils/printUtils";
import CompanyHeaderBlock from "@/app/dashboardportal/procurement/_shared/PrintHeader";

export type InwardPreviewHeader = {
	inwardNo?: string;
	inwardDate?: string;
	branch?: string;
	supplier?: string;
	challanNo?: string;
	challanDate?: string;
	invoiceNo?: string;
	invoiceDate?: string;
	vehicleNo?: string;
	transporterName?: string;
	status?: string;
	updatedBy?: string;
	updatedAt?: string;
	companyName?: string;
	companyLogo?: string;
	coId?: string | number | null;
	branchId?: string | number | null;
};

export type InwardPreviewItem = {
	srNo: number;
	poNo?: string;
	itemCode?: string;
	item?: string;
	quantity?: string | number;
	uom?: string;
	remarks?: string;
};

type InwardPreviewProps = {
	header: InwardPreviewHeader;
	items: InwardPreviewItem[];
	remarks?: string;
	onPrint?: () => void;
	onDownload?: () => void;
};

const FieldRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
	<Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
		<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", flexShrink: 0 }}>
			{label}:
		</Typography>
		<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem", wordBreak: "break-word" }}>
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
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	} catch {
		return dateStr;
	}
};

const InwardPreview: React.FC<InwardPreviewProps> = ({ header, items, remarks, onPrint, onDownload }) => {
	const previewRef = useRef<HTMLDivElement>(null);

	const buildPrintableWindow = (titleSuffix: string) => {
		const printContent = previewRef.current?.innerHTML || "";
		return openStyledPrintWindow(printContent, `Inward - ${titleSuffix}`);
	};

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
			return;
		}
		const printWindow = buildPrintableWindow(header.inwardNo || "Print");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 300);
	};

	const handleDownload = () => {
		if (onDownload) {
			onDownload();
			return;
		}
		const printWindow = buildPrintableWindow(header.inwardNo || "Download");
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box ref={previewRef} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 3, backgroundColor: "#fff" }}>
				{/* Header Section */}
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
					<CompanyHeaderBlock
						coId={header.coId}
						branchId={header.branchId}
						branchLabel={header.branch}
						maxWidth="30%"
					/>

					<Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
						<Stack spacing={0.25} alignItems="center">
							<Typography variant="h5" sx={{ fontWeight: 600 }}>
								Goods Inward
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
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
								Inward Date:
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
								{formatDate(header.inwardDate)}
							</Typography>
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
								Inward No:
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
								{header.inwardNo || "Pending"}
							</Typography>
						</Stack>
					</Stack>
				</Stack>

				<Divider sx={{ mb: 2 }} />

				{/* Details Grid */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
						gap: 2,
						mb: 3,
					}}
				>
					<FieldRow label="Supplier" value={header.supplier || "-"} />
					<FieldRow label="Challan No." value={header.challanNo || "-"} />
					<FieldRow label="Challan Date" value={header.challanDate ? formatDate(header.challanDate) : "-"} />
					<FieldRow label="Invoice No." value={header.invoiceNo || "-"} />
					<FieldRow label="Invoice Date" value={header.invoiceDate ? formatDate(header.invoiceDate) : "-"} />
					<FieldRow label="Vehicle No." value={header.vehicleNo || "-"} />
					<FieldRow label="Transporter" value={header.transporterName || "-"} />
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Line Items Table */}
				<Box sx={{ overflowX: "auto" }}>
					<Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
						<Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.08)" }}>
							<Box component="tr">
								{["Sr No", "PO No.", "Item Code", "Item", "Qty", "UOM", "Remarks"].map((col) => (
									<Box
										key={col}
										component="th"
										sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: col === "Remarks" || col === "Item" ? "left" : "center" }}
									>
										{col}
									</Box>
								))}
							</Box>
						</Box>
						<Box component="tbody">
							{items.length ? (
								items.map((item) => (
									<Box component="tr" key={`inward-preview-row-${item.srNo}`}>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
											{item.srNo}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
											{item.poNo || "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, fontFamily: "monospace" }}>
											{item.itemCode || "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>
											{item.item || "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>
											{item.quantity ?? "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
											{item.uom || "-"}
										</Box>
										<Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>
											{item.remarks || "-"}
										</Box>
									</Box>
								))
							) : (
								<Box component="tr">
									<Box component="td" colSpan={7} sx={{ border: "1px solid", borderColor: "divider", p: 2, fontSize: 12, textAlign: "center" }}>
										No line items captured yet.
									</Box>
								</Box>
							)}
						</Box>
					</Box>
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Remarks */}
				<Stack spacing={1}>
					<Typography variant="subtitle2">Remarks</Typography>
					<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 60 }}>
						<Typography variant="body2" color="text.secondary">
							{remarks || "No remarks provided."}
						</Typography>
					</Box>
				</Stack>

				<Divider sx={{ my: 2 }} />

				{/* Footer */}
				<Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-start" spacing={4}>
					<Stack spacing={0.5}>
						<Typography variant="caption" color="text.secondary">
							Updated By
						</Typography>
						<Box sx={{ borderBottom: "1px solid", borderColor: "divider", width: 200, height: 24 }} />
						<Typography variant="caption" color="text.secondary">
							Last Updated: {header.updatedAt ? formatDateTime(header.updatedAt) : "-"}
						</Typography>
					</Stack>
				</Stack>
			</Box>

			{/* Print and Download buttons */}
			<Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
				<Button variant="outline" size="sm" onClick={handlePrint}>
					Print
				</Button>
				<Button variant="outline" size="sm" onClick={handleDownload}>
					Download
				</Button>
			</Stack>
		</Box>
	);
};

export default InwardPreview;
