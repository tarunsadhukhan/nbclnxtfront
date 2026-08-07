"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Box,
	Paper,
	Typography,
	Button,
	Alert,
	CircularProgress,
	Divider,
	Chip,
	Stack,
} from "@mui/material";
import { ArrowLeft, CheckCircle, Send, XCircle } from "lucide-react";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { openStyledPrintWindow } from "@/utils/printUtils";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";

/**
 * Types for DRCR Note data
 */
type DrcrNoteLineItem = {
	id: string;
	po_no_formatted: string;
	drcr_note_dtl_id: number;
	inward_dtl_id: number;
	item_code: string;
	full_item_code: string;
	item_desc: string;
	uom_name: string;
	debitnote_type: number;
	debitnote_type_label: string;
	quantity: number;
	rate: number;
	amount: number;
	rejection_reason: string;
	hsn_code: string;
	tax_pct: number;
	cgst_amount: number;
	sgst_amount: number;
	igst_amount: number;
	tax_amount: number;
	taxable_amount: number;
	line_total: number;
};

type DrcrNoteHeader = {
	drcr_note_id: number;
	note_no: string;
	note_date: string;
	adjustment_type: number;
	adjustment_type_label: string;
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_id: number;
	branch_name: string;
	supplier_id: number;
	supplier_name: string;
	gross_amount: number;
	net_amount: number;
	status_id: number;
	status_name: string;
	auto_create: boolean;
	remarks: string;
	challan_no: string;
	challan_date: string;
	sr_no: string;
	sr_date: string;
	supplier_invoice_no: string;
	supplier_invoice_date: string;
	branch_gst: string;
	branch_address1: string;
	branch_address2: string;
	branch_zipcode: string;
	supplier_gst: string;
	co_name: string;
	co_address1: string;
	co_address2: string;
	co_zipcode: string;
	total_taxable: number;
	total_cgst: number;
	total_sgst: number;
	total_igst: number;
	total_tax: number;
	total_with_tax: number;
};

// Status IDs
const STATUS_DRAFT = 21;
const STATUS_OPEN = 1;
const STATUS_APPROVED = 3;
const STATUS_REJECTED = 4;

// Adjustment types
const TYPE_DEBIT = 1;
const TYPE_CREDIT = 2;

/**
 * Format date to dd-MMM-yyyy
 */
const formatDate = (value?: string) => {
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
 * Format currency
 */
const formatCurrency = (value?: number) => {
	if (value === undefined || value === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

/**
 * Get status chip color
 */
const getStatusColor = (statusId: number): "default" | "info" | "warning" | "success" | "error" => {
	switch (statusId) {
		case STATUS_DRAFT:
			return "default";
		case STATUS_OPEN:
			return "info";
		case STATUS_APPROVED:
			return "success";
		case STATUS_REJECTED:
			return "error";
		default:
			return "default";
	}
};

/**
 * Loading fallback for Suspense
 */
function DrcrNotePageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function DrcrNoteViewPage() {
	return (
		<Suspense fallback={<DrcrNotePageLoading />}>
			<DrcrNoteViewPageContent />
		</Suspense>
	);
}

function DrcrNoteViewPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const noteId = searchParams?.get("id") || "";
	const modeParam = searchParams?.get("mode") || "view";
	const isViewMode = modeParam === "view";
	const { coId } = useSelectedCompanyCoId();

	const [header, setHeader] = React.useState<DrcrNoteHeader | null>(null);
	const [lineItems, setLineItems] = React.useState<DrcrNoteLineItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const previewRef = React.useRef<HTMLDivElement>(null);

	/**
	 * Fetch DRCR Note data
	 */
	const fetchNoteData = React.useCallback(async () => {
		if (!noteId) {
			setErrorMessage("No note ID provided");
			setLoading(false);
			return;
		}

		setLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams();
			if (coId) query.set("co_id", String(coId));

			const url = `${apiRoutesPortalMasters.DRCR_NOTE_GET_BY_ID}/${noteId}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const result = data as any;

			// Map header
			setHeader({
				drcr_note_id: result.header?.drcr_note_id ?? 0,
				note_no: result.header?.note_no ?? "",
				note_date: result.header?.note_date ?? "",
				adjustment_type: result.header?.adjustment_type ?? 0,
				adjustment_type_label: result.header?.adjustment_type_label ?? "",
				inward_id: result.header?.inward_id ?? 0,
				inward_no: result.header?.inward_no ?? "",
				inward_date: result.header?.inward_date ?? "",
				branch_id: result.header?.branch_id ?? 0,
				branch_name: result.header?.branch_name ?? "",
				supplier_id: result.header?.supplier_id ?? 0,
				supplier_name: result.header?.supplier_name ?? "",
				gross_amount: result.header?.gross_amount ?? 0,
				net_amount: result.header?.net_amount ?? 0,
				status_id: result.header?.status_id ?? 0,
				status_name: result.header?.status_name ?? "Draft",
				auto_create: result.header?.auto_create ?? false,
				remarks: result.header?.remarks ?? "",
				challan_no: result.header?.challan_no ?? "",
				challan_date: result.header?.challan_date ?? "",
				sr_no: result.header?.sr_no ?? "",
				sr_date: result.header?.sr_date ?? "",
				supplier_invoice_no: result.header?.supplier_invoice_no ?? "",
				supplier_invoice_date: result.header?.supplier_invoice_date ?? "",
				branch_gst: result.header?.branch_gst ?? "",
				branch_address1: result.header?.branch_address1 ?? "",
				branch_address2: result.header?.branch_address2 ?? "",
				branch_zipcode: result.header?.branch_zipcode ?? "",
				supplier_gst: result.header?.supplier_gst ?? "",
				co_name: result.header?.co_name ?? "",
				co_address1: result.header?.co_address1 ?? "",
				co_address2: result.header?.co_address2 ?? "",
				co_zipcode: result.header?.co_zipcode ?? "",
				total_taxable: result.header?.total_taxable ?? 0,
				total_cgst: result.header?.total_cgst ?? 0,
				total_sgst: result.header?.total_sgst ?? 0,
				total_igst: result.header?.total_igst ?? 0,
				total_tax: result.header?.total_tax ?? 0,
				total_with_tax: result.header?.total_with_tax ?? 0,
			});

			// Map line items
			const items: DrcrNoteLineItem[] = (result.line_items || []).map((item: any, index: number) => ({
				id: item.drcr_note_dtl_id ? String(item.drcr_note_dtl_id) : `line-${index}`,
				po_no_formatted: item.po_no_formatted ?? "",
				drcr_note_dtl_id: item.drcr_note_dtl_id ?? 0,
				inward_dtl_id: item.inward_dtl_id ?? 0,
				item_code: item.item_code ?? "",
				full_item_code: item.full_item_code ?? "",
				item_desc: item.item_name ?? item.item_desc ?? "",
				uom_name: item.uom_name ?? "",
				debitnote_type: item.debitnote_type ?? 0,
				debitnote_type_label: item.debitnote_type_label ?? "",
				quantity: item.quantity ?? 0,
				rate: item.rate ?? 0,
				amount: item.amount ?? (item.quantity ?? 0) * (item.rate ?? 0),
				rejection_reason: item.rejection_reason ?? "",
				hsn_code: item.hsn_code ?? "",
				tax_pct: item.tax_pct ?? 0,
				cgst_amount: item.cgst_amount ?? 0,
				sgst_amount: item.sgst_amount ?? 0,
				igst_amount: item.igst_amount ?? 0,
				tax_amount: item.tax_amount ?? 0,
				taxable_amount: item.taxable_amount ?? 0,
				line_total: item.line_total ?? 0,
			}));

			setLineItems(items);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load DRCR Note";
			setErrorMessage(message);
		} finally {
			setLoading(false);
		}
	}, [noteId, coId]);

	React.useEffect(() => {
		fetchNoteData();
	}, [fetchNoteData]);

	/**
	 * Handle open note
	 */
	const handleOpen = React.useCallback(async () => {
		if (!noteId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.DRCR_NOTE_OPEN;
			const { data, error } = await fetchWithCookie(url, "POST", {
				drcr_note_id: Number(noteId),
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "DRCR Note opened for approval",
				variant: "default",
			});

			await fetchNoteData();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to open note";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [noteId, fetchNoteData]);

	/**
	 * Handle approve note
	 */
	const handleApprove = React.useCallback(async () => {
		if (!noteId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.DRCR_NOTE_APPROVE;
			const { data, error } = await fetchWithCookie(url, "POST", {
				drcr_note_id: Number(noteId),
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "DRCR Note approved successfully",
				variant: "default",
			});

			router.push("/dashboardportal/procurement/drcrNote");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to approve note";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [noteId, router]);

	/**
	 * Handle reject note
	 */
	const handleReject = React.useCallback(async () => {
		if (!noteId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.DRCR_NOTE_REJECT;
			const { data, error } = await fetchWithCookie(url, "POST", {
				drcr_note_id: Number(noteId),
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "DRCR Note rejected",
				variant: "default",
			});

			router.push("/dashboardportal/procurement/drcrNote");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to reject note";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [noteId, router]);

	/**
	 * Handle back navigation
	 */
	const handleBack = React.useCallback(() => {
		router.push("/dashboardportal/procurement/drcrNote");
	}, [router]);

	/**
	 * Column definitions
	 */
	const columns = React.useMemo<GridColDef<DrcrNoteLineItem>[]>(() => [
		{
			field: "po_no_formatted",
			headerName: "PO No.",
			flex: 1,
			minWidth: 120,
		},
		{
			field: "full_item_code",
			headerName: "Item Code",
			flex: 1,
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<DrcrNoteLineItem, string>) => (
				<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
					{params.row.full_item_code || params.row.item_code || "-"}
				</Typography>
			),
		},
		{
			field: "item_desc",
			headerName: "Item",
			flex: 1.5,
			minWidth: 180,
		},
		{
			field: "uom_name",
			headerName: "UOM",
			minWidth: 80,
		},
		{
			field: "hsn_code",
			headerName: "HSN",
			minWidth: 90,
		},
		{
			field: "rejection_reason",
			headerName: "Reason",
			flex: 1.2,
			minWidth: 180,
			renderCell: (params: GridRenderCellParams<DrcrNoteLineItem, string>) => {
				const text = params.row.rejection_reason?.trim()
					|| params.row.debitnote_type_label
					|| "-";
				return (
					<Typography variant="body2" title={text}>
						{text}
					</Typography>
				);
			},
		},
		{
			field: "quantity",
			headerName: "Quantity",
			type: "number",
			minWidth: 100,
		},
		{
			field: "rate",
			headerName: "Rate",
			type: "number",
			minWidth: 100,
			renderCell: (params: GridRenderCellParams<DrcrNoteLineItem, number>) => (
				<Typography variant="body2">
					{formatCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "amount",
			headerName: "Amount",
			type: "number",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DrcrNoteLineItem, number>) => {
				const calculatedAmount = (params.row.quantity || 0) * (params.row.rate || 0);
				return (
					<Typography variant="body2" fontWeight={600}>
						{formatCurrency(calculatedAmount)}
					</Typography>
				);
			},
		},
	], []);

	// Show loading state
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
				<CircularProgress />
			</Box>
		);
	}

	// Show error state
	if (errorMessage) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error" sx={{ mb: 2 }}>
					{errorMessage}
				</Alert>
				<Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
					Back to List
				</Button>
			</Box>
		);
	}

	const isDebit = header?.adjustment_type === TYPE_DEBIT;
	const isDraft = header?.status_id === STATUS_DRAFT;
	const isOpen = header?.status_id === STATUS_OPEN;
	const isApproved = header?.status_id === STATUS_APPROVED;
	const canAction = !isViewMode && !isApproved && header?.status_id !== STATUS_REJECTED;

	// Derive a single common GST rate across line items for clubbed labels (CGST@9%, IGST@18%, etc.)
	const uniqueRates = Array.from(new Set(lineItems.map((l) => Number(l.tax_pct) || 0).filter((r) => r > 0)));
	const commonRate = uniqueRates.length === 1 ? uniqueRates[0] : null;
	const cgstLabel = commonRate ? `CGST@${commonRate / 2}%` : "CGST";
	const sgstLabel = commonRate ? `SGST@${commonRate / 2}%` : "SGST";
	const igstLabel = commonRate ? `IGST@${commonRate}%` : "IGST";

	return (
		<Box sx={{ p: 2 }}>
			{/* Header */}
			<Paper sx={{ p: 3, mb: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
					<Box>
						<Typography variant="h5" fontWeight={600}>
							{header?.adjustment_type_label || "DRCR Note"}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{isDebit ? "Supplier owes amount due to rate decrease or rejection" : "Amount owed to supplier due to rate increase"}
						</Typography>
					</Box>
					<Stack direction="row" spacing={1}>
						{header?.auto_create && (
							<Chip
								label="Auto-Generated"
								color="secondary"
								variant="outlined"
								size="small"
							/>
						)}
						<Chip
							label={header?.note_no || "-"}
							color={isDebit ? "warning" : "info"}
							variant="filled"
						/>
						<Chip
							label={header?.status_name || "Draft"}
							color={getStatusColor(header?.status_id || 0)}
							variant="filled"
						/>
					</Stack>
				</Stack>

				<Divider sx={{ my: 2 }} />

				{/* Note Header Info */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
						gap: 2,
					}}
				>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Note Date
						</Typography>
						<Typography variant="body1">{formatDate(header?.note_date)}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Inward No.
						</Typography>
						<Typography variant="body1" fontWeight={600} color="primary">
							{header?.inward_no || "-"}
						</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Inward Date
						</Typography>
						<Typography variant="body1">{formatDate(header?.inward_date)}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Branch
						</Typography>
						<Typography variant="body1">{header?.branch_name || "-"}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Supplier
						</Typography>
						<Typography variant="body1">{header?.supplier_name || "-"}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							SR Number
						</Typography>
						<Typography variant="body1">{header?.sr_no || "-"}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							SR Date
						</Typography>
						<Typography variant="body1">{formatDate(header?.sr_date)}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Supplier Invoice No.
						</Typography>
						<Typography variant="body1">{header?.supplier_invoice_no || "-"}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Supplier Invoice Date
						</Typography>
						<Typography variant="body1">{formatDate(header?.supplier_invoice_date)}</Typography>
					</Box>
					{header?.remarks && (
						<Box sx={{ gridColumn: { md: "span 4" } }}>
							<Typography variant="caption" color="text.secondary">
								Remarks
							</Typography>
							<Typography variant="body1">{header.remarks}</Typography>
						</Box>
					)}
				</Box>
			</Paper>

			{/* Line Items */}
			<Paper sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" fontWeight={600} mb={2}>
					Line Items
				</Typography>
				<Box sx={{ height: 300 }}>
					<DataGrid
						rows={lineItems}
						columns={columns}
						density="compact"
						disableRowSelectionOnClick
						hideFooter={lineItems.length <= 10}
						sx={{
							"& .MuiDataGrid-cell": {
								display: "flex",
								alignItems: "center",
							},
						}}
					/>
				</Box>
			</Paper>

			{/* Totals — clubbed GST summary */}
			<Paper sx={{ p: 3, mb: 3, backgroundColor: isDebit ? "warning.50" : "info.50" }}>
				<Stack direction="row" justifyContent="flex-end">
					<Stack spacing={0.75} sx={{ minWidth: 320 }}>
						<Box sx={{ display: "flex", justifyContent: "space-between" }}>
							<Typography variant="body2" color="text.secondary">Taxable Amount</Typography>
							<Typography variant="body2">{formatCurrency(header?.total_taxable)}</Typography>
						</Box>
						{(header?.total_cgst ?? 0) > 0 && (
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2" color="text.secondary">{cgstLabel}</Typography>
								<Typography variant="body2">{formatCurrency(header?.total_cgst)}</Typography>
							</Box>
						)}
						{(header?.total_sgst ?? 0) > 0 && (
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2" color="text.secondary">{sgstLabel}</Typography>
								<Typography variant="body2">{formatCurrency(header?.total_sgst)}</Typography>
							</Box>
						)}
						{(header?.total_igst ?? 0) > 0 && (
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2" color="text.secondary">{igstLabel}</Typography>
								<Typography variant="body2">{formatCurrency(header?.total_igst)}</Typography>
							</Box>
						)}
						<Box sx={{ display: "flex", justifyContent: "space-between" }}>
							<Typography variant="body2" color="text.secondary">Total Tax</Typography>
							<Typography variant="body2">{formatCurrency(header?.total_tax)}</Typography>
						</Box>
						<Divider />
						<Box sx={{ display: "flex", justifyContent: "space-between" }}>
							<Typography variant="caption" color="text.secondary">Gross Amount</Typography>
							<Typography variant="caption">{formatCurrency(header?.gross_amount)}</Typography>
						</Box>
						<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<Typography variant="subtitle1" fontWeight={700}>Net Amount</Typography>
							<Typography variant="h6" fontWeight={700} color={isDebit ? "warning.main" : "info.main"}>
								{formatCurrency(header?.total_with_tax || header?.net_amount)}
							</Typography>
						</Box>
					</Stack>
				</Stack>
			</Paper>

			{/* Actions */}
			<Paper sx={{ p: 2 }}>
				<Stack direction="row" justifyContent="space-between">
					<Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
						Back
					</Button>
					<Stack direction="row" spacing={2}>
						{canAction && isDraft && (
							<Button
								variant="contained"
								color="primary"
								startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
								onClick={handleOpen}
								disabled={saving}
							>
								Open for Approval
							</Button>
						)}
						{canAction && isOpen && (
							<>
								<Button
									variant="outlined"
									color="error"
									startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <XCircle size={18} />}
									onClick={handleReject}
									disabled={saving}
								>
									Reject
								</Button>
								<Button
									variant="contained"
									color="success"
									startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle size={18} />}
									onClick={handleApprove}
									disabled={saving}
								>
									Approve
								</Button>
							</>
						)}
					</Stack>
				</Stack>
			</Paper>

			{/* Print Preview */}
			<Paper sx={{ p: 3, mt: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
					<Typography variant="subtitle1" fontWeight={600}>
						Printable Preview
					</Typography>
					<Button
						variant="outlined"
						size="small"
						onClick={() => {
							const content = previewRef.current?.innerHTML || "";
							const extraCss = `
								body { font-family: Arial, sans-serif; }
								table { margin-top: 16px; }
								th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
								th { background-color: #f5f5f5; font-weight: 600; }
							`;
							const win = openStyledPrintWindow(
								content,
								`${header?.adjustment_type_label || "DRCR Note"} - ${header?.note_no || ""}`,
								extraCss
							);
							if (win) {
								win.focus();
								setTimeout(() => { win.print(); win.close(); }, 300);
							}
						}}
					>
						Print
					</Button>
				</Stack>
				<Divider sx={{ mb: 2 }} />
				<Box ref={previewRef}>
					<Typography variant="h6" textAlign="center" fontWeight={600} mb={2}>
						{header?.adjustment_type_label || "DRCR Note"}
					</Typography>

					{/* Top band — Company header (left) + Document meta (right) */}
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "8px" }}>
						<tbody>
							<tr>
								<td style={{ border: "1px solid #ddd", padding: "8px", verticalAlign: "top", width: "55%" }}>
									<div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
										{header?.co_name || "-"}
									</div>
									{header?.co_address1 && (
										<div>{header.co_address1}</div>
									)}
									{(header?.co_address2 || header?.co_zipcode) && (
										<div>{`${header?.co_address2 || ""} ${header?.co_zipcode || ""}`.trim()}</div>
									)}
									<div style={{ marginTop: "6px" }}>
										<strong>Branch:</strong> {header?.branch_name || "-"}
									</div>
									<div>
										<strong>Branch Address:</strong> {`${header?.branch_address1 || ""} ${header?.branch_address2 || ""} ${header?.branch_zipcode || ""}`.trim() || "-"}
									</div>
									<div>
										<strong>GSTIN:</strong> {header?.branch_gst || "-"}
									</div>
								</td>
								<td style={{ border: "1px solid #ddd", padding: "8px", verticalAlign: "top", width: "45%" }}>
									<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
										<tbody>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Note No.:</td>
												<td style={{ padding: "2px 4px" }}>{header?.note_no || "-"}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Note Date:</td>
												<td style={{ padding: "2px 4px" }}>{formatDate(header?.note_date)}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Inward No.:</td>
												<td style={{ padding: "2px 4px" }}>{header?.inward_no || "-"}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Inward Date:</td>
												<td style={{ padding: "2px 4px" }}>{formatDate(header?.inward_date)}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>SR No.:</td>
												<td style={{ padding: "2px 4px" }}>{header?.sr_no || "-"}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>SR Date:</td>
												<td style={{ padding: "2px 4px" }}>{formatDate(header?.sr_date)}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Supplier Invoice No.:</td>
												<td style={{ padding: "2px 4px" }}>{header?.supplier_invoice_no || "-"}</td>
											</tr>
											<tr>
												<td style={{ padding: "2px 4px", fontWeight: 600 }}>Supplier Invoice Date:</td>
												<td style={{ padding: "2px 4px" }}>{formatDate(header?.supplier_invoice_date)}</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>

					{/* Second band — Supplier block */}
					<div style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", marginBottom: "8px" }}>
						<div><strong>Supplier:</strong> {header?.supplier_name || "-"}</div>
						<div><strong>GSTIN:</strong> {header?.supplier_gst || "-"}</div>
					</div>

					{header?.remarks && (
						<div style={{ fontSize: "12px", marginBottom: "8px" }}>
							<strong>Remarks:</strong> {header.remarks}
						</div>
					)}

					<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
						<thead>
							<tr style={{ backgroundColor: "#f5f5f5" }}>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>PO No.</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>Item Code</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>Item</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>UOM</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>HSN</th>
								<th style={{ border: "1px solid #ddd", padding: "8px" }}>Reason</th>
								<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Qty</th>
								<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Rate</th>
								<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>Amount</th>
							</tr>
						</thead>
						<tbody>
							{lineItems.map((item, idx) => (
								<tr key={item.id}>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{idx + 1}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.po_no_formatted || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px", fontFamily: "monospace" }}>{item.full_item_code || item.item_code || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.item_desc || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.uom_name || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.hsn_code || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.rejection_reason || item.debitnote_type_label || "-"}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>{item.quantity}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>{formatCurrency(item.rate)}</td>
									<td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.quantity * item.rate)}</td>
								</tr>
							))}
						</tbody>
					</Box>

					{/* Print footer — clubbed GST summary */}
					<div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
						<table style={{ borderCollapse: "collapse", fontSize: "12px", minWidth: "320px" }}>
							<tbody>
								<tr>
									<td style={{ padding: "2px 6px" }}>Taxable Amount</td>
									<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.total_taxable)}</td>
								</tr>
								{(header?.total_cgst ?? 0) > 0 && (
									<tr>
										<td style={{ padding: "2px 6px" }}>{cgstLabel}</td>
										<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.total_cgst)}</td>
									</tr>
								)}
								{(header?.total_sgst ?? 0) > 0 && (
									<tr>
										<td style={{ padding: "2px 6px" }}>{sgstLabel}</td>
										<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.total_sgst)}</td>
									</tr>
								)}
								{(header?.total_igst ?? 0) > 0 && (
									<tr>
										<td style={{ padding: "2px 6px" }}>{igstLabel}</td>
										<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.total_igst)}</td>
									</tr>
								)}
								<tr style={{ borderBottom: "1px solid #ddd" }}>
									<td style={{ padding: "2px 6px" }}>Total Tax</td>
									<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.total_tax)}</td>
								</tr>
								<tr>
									<td style={{ padding: "2px 6px" }}>Gross Amount</td>
									<td style={{ padding: "2px 6px", textAlign: "right" }}>{formatCurrency(header?.gross_amount)}</td>
								</tr>
								<tr>
									<td style={{ padding: "2px 6px", fontWeight: 700, fontSize: "14px" }}>Net Amount</td>
									<td style={{ padding: "2px 6px", textAlign: "right", fontWeight: 700, fontSize: "14px" }}>
										{formatCurrency(header?.total_with_tax || header?.net_amount)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</Box>
			</Paper>
		</Box>
	);
}
