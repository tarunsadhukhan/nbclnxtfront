"use client";

import React from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	MenuItem,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { Printer as PrinterIcon } from "lucide-react";
import { openStyledPrintWindow } from "@/utils/printUtils";
import type {
	EnquiryLineItem,
	EnquirySupplierInfo,
} from "../types/enquiryTypes";

/** Header fields shown on the printable RFQ document. */
export type EnquiryPreviewHeader = {
	enquiryNo?: string;
	enquiryDate?: string;
	branchName?: string;
	companyName?: string;
	expenseType?: string;
	project?: string;
	remarks?: string;
};

type EnquiryPreviewProps = {
	open: boolean;
	onClose: () => void;
	header: EnquiryPreviewHeader;
	items: ReadonlyArray<EnquiryLineItem>;
	suppliers: ReadonlyArray<EnquirySupplierInfo>;
	/**
	 * Called after the print window opens so the caller can record the RFQ as
	 * sent for the printed supplier(s). `supplierIds` is empty for "all".
	 */
	onPrinted?: (supplierIds: number[]) => void;
};

const ALL_SUPPLIERS = "__all__";

const formatDate = (value?: string): string => {
	if (!value) return "-";
	const trimmed = value.slice(0, 10);
	const match = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (!match) return trimmed;
	const [, year, month, day] = match;
	return `${day}/${month}/${year}`;
};

/**
 * Printable Request-For-Quotation document for a price enquiry.
 *
 * Renders the enquiry as a supplier-facing RFQ (addressed to one invited
 * supplier, or generically to all) and opens the standard styled print
 * window — the user can print it or save it as PDF to email to the supplier.
 */
export function EnquiryPreview({
	open,
	onClose,
	header,
	items,
	suppliers,
	onPrinted,
}: EnquiryPreviewProps) {
	const previewRef = React.useRef<HTMLDivElement>(null);
	const [supplierSel, setSupplierSel] = React.useState<string>(ALL_SUPPLIERS);

	const selectedSupplier = React.useMemo(
		() =>
			supplierSel === ALL_SUPPLIERS
				? null
				: suppliers.find((s) => String(s.supplier_id) === supplierSel) ?? null,
		[supplierSel, suppliers],
	);

	const handlePrint = React.useCallback(() => {
		const printContent = previewRef.current?.innerHTML || "";
		const printWindow = openStyledPrintWindow(
			printContent,
			`RFQ - ${header.enquiryNo || "Price Enquiry"}`,
		);
		if (!printWindow) return;

		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);

		onPrinted?.(selectedSupplier ? [selectedSupplier.supplier_id] : []);
	}, [header.enquiryNo, onPrinted, selectedSupplier]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>Request for Quotation</DialogTitle>
			<DialogContent dividers>
				<TextField
					select
					size="small"
					label="Address to"
					value={supplierSel}
					onChange={(e) => setSupplierSel(e.target.value)}
					sx={{ mb: 2, minWidth: 280 }}
				>
					<MenuItem value={ALL_SUPPLIERS}>All invited suppliers</MenuItem>
					{suppliers.map((s) => (
						<MenuItem key={s.supplier_id} value={String(s.supplier_id)}>
							{s.supp_name}
							{s.supp_code ? ` (${s.supp_code})` : ""}
						</MenuItem>
					))}
				</TextField>

				{/* Printable document */}
				<Box
					ref={previewRef}
					sx={{ border: "1px solid", borderColor: "divider", p: 3, backgroundColor: "background.paper" }}
				>
					<Stack spacing={0.5} alignItems="center" mb={2}>
						{header.companyName && (
							<Typography variant="h6" fontWeight={700}>
								{header.companyName}
							</Typography>
						)}
						{header.branchName && (
							<Typography variant="body2">{header.branchName}</Typography>
						)}
						<Typography variant="subtitle1" fontWeight={700} sx={{ textDecoration: "underline", mt: 1 }}>
							REQUEST FOR QUOTATION
						</Typography>
					</Stack>

					<Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
						<Box>
							<Typography variant="body2">
								<strong>RFQ No.:</strong> {header.enquiryNo || "-"}
							</Typography>
							<Typography variant="body2">
								<strong>Date:</strong> {formatDate(header.enquiryDate)}
							</Typography>
						</Box>
						<Box>
							<Typography variant="body2" fontWeight={600}>
								To:
							</Typography>
							{selectedSupplier ? (
								<>
									<Typography variant="body2">{selectedSupplier.supp_name}</Typography>
									{selectedSupplier.supp_code && (
										<Typography variant="body2" color="text.secondary">
											Code: {selectedSupplier.supp_code}
										</Typography>
									)}
								</>
							) : (
								<Typography variant="body2">All invited suppliers</Typography>
							)}
						</Box>
					</Stack>

					<Typography variant="body2" mb={2}>
						Dear Sir/Madam,
						<br />
						Kindly quote your best rates, applicable taxes, delivery period, and
						payment terms for the following items:
					</Typography>

					<Table size="small" sx={{ border: "1px solid", borderColor: "divider", mb: 2 }}>
						<TableHead>
							<TableRow>
								<TableCell sx={{ fontWeight: 700 }}>#</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Item Code</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Make</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>UOM</TableCell>
								<TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{items.map((item, idx) => (
								<TableRow key={item.id}>
									<TableCell>{idx + 1}</TableCell>
									<TableCell>{item.itemCode || "-"}</TableCell>
									<TableCell>{item.itemName || "-"}</TableCell>
									<TableCell>{item.itemMakeName || "-"}</TableCell>
									<TableCell>{item.uomName || "-"}</TableCell>
									<TableCell align="right">{item.qty ?? "-"}</TableCell>
									<TableCell>{item.remarks || "-"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{header.remarks && (
						<Typography variant="body2" mb={2}>
							<strong>Notes:</strong> {header.remarks}
						</Typography>
					)}

					<Divider sx={{ my: 2 }} />
					<Stack direction="row" justifyContent="space-between">
						<Typography variant="body2" color="text.secondary">
							Please reference the RFQ number in your quotation.
						</Typography>
						<Typography variant="body2" fontWeight={600}>
							Authorised Signatory
						</Typography>
					</Stack>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
				<Button variant="contained" startIcon={<PrinterIcon size={16} />} onClick={handlePrint}>
					Print / Save PDF
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default EnquiryPreview;
