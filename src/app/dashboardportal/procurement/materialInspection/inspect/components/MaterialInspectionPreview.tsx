"use client";

import React, { useRef } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { openStyledPrintWindow } from "@/utils/printUtils";
import CompanyHeaderBlock from "@/app/dashboardportal/procurement/_shared/PrintHeader";

/**
 * Type definitions for preview data
 */
type InspectionHeader = {
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_name: string;
	supplier_name: string;
	inspection_check: boolean;
	co_id?: string | number | null;
	branch_id?: string | number | null;
};

type InspectionLineItem = {
	id: string;
	po_no_formatted: string;
	inward_dtl_id: number;
	full_item_code: string;
	item_desc: string;
	make_desc: string;
	uom_name: string;
	inward_qty: number;
	rejected_qty: number;
	approved_qty: number;
	rejection_reason: string;
	po_rate: number;
	accepted_item_make_id: number | null;
	make_options?: Array<{ label: string; value: string }>;
};

type MaterialInspectionPreviewProps = {
	header: InspectionHeader;
	items: InspectionLineItem[];
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

const MaterialInspectionPreview: React.FC<MaterialInspectionPreviewProps> = ({ header, items }) => {
	const previewRef = useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		const printContent = previewRef.current?.innerHTML || "";
		const printWindow = openStyledPrintWindow(printContent, `Material Inspection - ${header.inward_no || "Print"}`);
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 300);
	};

	const handleDownload = () => {
		const printContent = previewRef.current?.innerHTML || "";
		const printWindow = openStyledPrintWindow(printContent, `Material Inspection - ${header.inward_no || "Download"}`);
		if (!printWindow) return;
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box
				ref={previewRef}
				sx={{
					border: "1px solid",
					borderColor: "divider",
					borderRadius: 1,
					p: 3,
					backgroundColor: "#fff",
				}}
			>
				{/* Header Section */}
				<Stack
					direction="row"
					justifyContent="space-between"
					alignItems="flex-start"
					sx={{ mb: 3 }}
				>
					<CompanyHeaderBlock
						coId={header.co_id}
						branchId={header.branch_id}
						branchLabel={header.branch_name}
						maxWidth="30%"
					/>

					<Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
						<Stack spacing={0.25} alignItems="center">
							<Typography variant="h5" sx={{ fontWeight: 600 }}>
								Material Inspection
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
								{header.inspection_check ? "Complete" : "Pending"}
							</Typography>
						</Stack>
					</Box>

					<Stack spacing={0.5} alignItems="flex-end" sx={{ minWidth: 200 }}>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
								Inward Date:
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
								{formatDate(header.inward_date)}
							</Typography>
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
								Inward No:
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
								{header.inward_no || "-"}
							</Typography>
						</Stack>
					</Stack>
				</Stack>

				<Divider sx={{ mb: 2 }} />

				{/* Details Grid */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
						gap: 2,
						mb: 3,
					}}
				>
					<FieldRow label="Branch" value={header.branch_name || "-"} />
					<FieldRow label="Supplier" value={header.supplier_name || "-"} />
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Line Items Table */}
				<Box sx={{ overflowX: "auto" }}>
					<Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
						<Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.08)" }}>
							<Box component="tr">
								{[
									"Sr No",
									"PO No.",
									"Item Code",
									"Item",
									"Make",
									"UOM",
									"Rec Qty",
									"Rej Qty",
									"App Qty",
									"Rejection Reason",
								].map((col) => (
									<Box
										key={col}
										component="th"
										sx={{
											border: "1px solid",
											borderColor: "divider",
											p: 1,
											fontSize: 12,
											fontWeight: 600,
											textAlign: ["Item", "Rejection Reason"].includes(col) ? "left" : "center",
										}}
									>
										{col}
									</Box>
								))}
							</Box>
						</Box>
						<Box component="tbody">
							{items.length ? (
								items.map((item, idx) => (
									<Box component="tr" key={`inspection-preview-row-${idx}`}>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "center",
											}}
										>
											{idx + 1}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "center",
											}}
										>
											{item.po_no_formatted || "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "left",
											}}
										>
											{item.full_item_code || "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "left",
											}}
										>
											{item.item_desc || "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "left",
											}}
										>
											{item.make_desc || "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "center",
											}}
										>
											{item.uom_name || "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "right",
											}}
										>
											{item.inward_qty ?? "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "right",
											}}
										>
											{item.rejected_qty ?? "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "right",
												fontWeight: 600,
												color: "success.main",
											}}
										>
											{item.approved_qty ?? "-"}
										</Box>
										<Box
											component="td"
											sx={{
												border: "1px solid",
												borderColor: "divider",
												p: 1,
												fontSize: 12,
												textAlign: "left",
											}}
										>
											{item.rejection_reason || "-"}
										</Box>
									</Box>
								))
							) : (
								<Box component="tr">
									<Box
										component="td"
										colSpan={10}
										sx={{
											border: "1px solid",
											borderColor: "divider",
											p: 2,
											fontSize: 12,
											textAlign: "center",
										}}
									>
										No line items
									</Box>
								</Box>
							)}
						</Box>
					</Box>
				</Box>
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

export default MaterialInspectionPreview;
