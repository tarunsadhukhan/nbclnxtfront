"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Divider,
	Grid,
	Paper,
	TextField,
	Typography,
	CircularProgress,
	Snackbar,
} from "@mui/material";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import AttachmentUploader from "@/components/AttachmentUploader";

/**
 * @component BillPassEditPage
 * @description Edit page for Jute Bill Pass - allows editing invoice details and financial information
 * for approved MRs until bill_pass_complete is set to 1.
 */

// Types
type BillPassHeader = {
	jute_mr_id: number;
	bill_pass_no: number | null;
	bill_pass_num: string | null;
	bill_pass_date: string | null;
	bill_pass_complete: number | null;
	mr_no: number | null;
	mr_num: string | null;
	mr_date: string | null;
	gate_entry_no: string | null;
	gate_entry_date: string | null;
	branch_id: number;
	branch_name: string;
	jute_supplier_id: number | null;
	supplier_name: string | null;
	party_id: string | null;
	party_name: string | null;
	party_branch_id: number | null;
	party_branch_name: string | null;
	po_id: number | null;
	po_no: number | null;
	po_date: string | null;
	challan_no: string | null;
	challan_date: string | null;
	mukam: string | null;
	vehicle_no: string | null;
	mr_weight: number | null;
	freight_charges: number | null;
	invoice_no: string | null;
	invoice_date: string | null;
	invoice_amount: number | null;
	invoice_received_date: string | null;
	total_amount: number | null;
	claim_amount: number | null;
	roundoff: number | null;
	amount: number | null;
	tds_amount: number | null;
	payment_due_date: string | null;
	invoice_upload: string | null;
	challan_upload: string | null;
	remarks: string | null;
	status: string;
};

type BillPassLineItem = {
	jute_mr_li_id: number;
	actual_group_name: string | null;
	actual_quality_name: string | null;
	actual_qty: number | null;
	claim_rate: number | null;
	actual_weight: number | null;
	uom: string | null;
	warehouse_path: string | null;
	rate: number | null;
	accepted_weight: number | null;
	premium_amount: number | null;
	water_damage_amount: number | null;
};

// Helper functions
const formatDate = (value?: string | null): string => {
	if (!value) return "-";
	const trimmed = value.trim();
	const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
	if (ymdMatch) {
		const [, year, month, day] = ymdMatch;
		const date = new Date(Number(year), Number(month) - 1, Number(day));
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}
	return trimmed;
};

const toDateInput = (value?: string | null): string => {
	if (!value) return "";
	const match = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
	if (match) return `${match[1]}-${match[2]}-${match[3]}`;
	return "";
};

const formatAmount = (value?: number | null): string => {
	if (value == null) return "0.00";
	return new Intl.NumberFormat("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

/**
 * Calculate total amount from line items
 * Formula: Sum of ((accepted_weight / 100) * rate) for all line items
 * Note: Weight is stored in KG, rate is per quintal (1 QNT = 100 KG)
 */
const calculateTotalAmount = (lineItems: BillPassLineItem[]): number => {
	return lineItems.reduce((sum, line) => {
		const weightKg = line.accepted_weight ?? line.actual_weight ?? 0;
		const weightQnt = weightKg / 100; // Convert KG to Quintals
		const rate = line.rate ?? 0;
		return sum + (weightQnt * rate);
	}, 0);
};

/**
 * Calculate claim amount from line items
 * Formula: Sum of ((accepted_weight / 100) * claim_rate)
 * Note: Weight is stored in KG, rate is per quintal (1 QNT = 100 KG)
 */
const calculateClaimAmount = (lineItems: BillPassLineItem[]): number => {
	return lineItems.reduce((sum, line) => {
		const weightKg = line.accepted_weight ?? line.actual_weight ?? 0;
		const weightQnt = weightKg / 100; // Convert KG to Quintals
		const claimRate = line.claim_rate ?? 0;
		
		// (accepted_weight / 100) * claim_rate
		const lineClaimAmount = weightQnt * claimRate;
		return sum + lineClaimAmount;
	}, 0);
};

function BillPassEditPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const billPassIdParam = searchParams.get("id");
	const { coId } = useSelectedCompanyCoId();

	// State
	const [header, setHeader] = React.useState<BillPassHeader | null>(null);
	const [lineItems, setLineItems] = React.useState<BillPassLineItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	// Form state for editable fields
	const [formData, setFormData] = React.useState({
		invoice_no: "",
		invoice_date: "",
		invoice_amount: "",
		invoice_received_date: "",
		payment_due_date: "",
		total_amount: "",
		claim_amount: "",
		roundoff: "0",
		tds_amount: "",
		net_total: "",
		freight_charges: "",
		remarks: "",
	});

	// Derived values
	const isComplete = header?.bill_pass_complete === 1;

	// Load data
	const loadData = React.useCallback(async () => {
		if (!coId || !billPassIdParam) return;

		setLoading(true);
		setPageError(null);

		try {
			// Fetch header
			const headerUrl = `${apiRoutesPortalMasters.JUTE_BILL_PASS_BY_ID}?co_id=${coId}&id=${billPassIdParam}`;
			const { data: headerData, error: headerError } = await fetchWithCookie(headerUrl, "GET");
			if (headerError) throw new Error(headerError);

			const h = headerData as BillPassHeader;
			setHeader(h);

			// Initialize form with existing data
			setFormData({
				invoice_no: h.invoice_no ?? "",
				invoice_date: toDateInput(h.invoice_date),
				invoice_amount: h.invoice_amount?.toString() ?? "",
				invoice_received_date: toDateInput(h.invoice_received_date),
				payment_due_date: toDateInput(h.payment_due_date),
				total_amount: h.total_amount?.toString() ?? "",
				claim_amount: h.claim_amount?.toString() ?? "",
				roundoff: h.roundoff?.toString() ?? "0",
				tds_amount: h.tds_amount?.toString() ?? "",
				net_total: h.amount?.toString() ?? "",
				freight_charges: h.freight_charges?.toString() ?? "",
				remarks: h.remarks ?? "",
			});

			// Fetch line items
			const lineUrl = `${apiRoutesPortalMasters.JUTE_BILL_PASS_LINE_ITEMS}?co_id=${coId}&id=${billPassIdParam}`;
			const { data: lineData, error: lineError } = await fetchWithCookie(lineUrl, "GET");
			if (lineError) throw new Error(lineError);

			const lines = (lineData as { data?: BillPassLineItem[] })?.data ?? [];
			setLineItems(lines);

			// Auto-calculate total and claim amounts from line items
			const calculatedTotal = calculateTotalAmount(lines);
			const calculatedClaim = calculateClaimAmount(lines);
			
			// Update form with calculated values (override any stored values)
			setFormData((prev) => ({
				...prev,
				total_amount: calculatedTotal.toFixed(2),
				claim_amount: calculatedClaim.toFixed(2),
			}));
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to load bill pass data");
		} finally {
			setLoading(false);
		}
	}, [coId, billPassIdParam]);

	React.useEffect(() => {
		void loadData();
	}, [loadData]);

	// Handle form field changes
	const handleFieldChange = (field: keyof typeof formData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Calculate net total when amounts change
	React.useEffect(() => {
		const total = parseFloat(formData.total_amount) || 0;
		const claim = parseFloat(formData.claim_amount) || 0;
		const roundoff = parseFloat(formData.roundoff) || 0;
		const tds = parseFloat(formData.tds_amount) || 0;

		const netTotal = total - claim + roundoff - tds;
		setFormData((prev) => ({ ...prev, net_total: netTotal.toFixed(2) }));
	}, [formData.total_amount, formData.claim_amount, formData.roundoff, formData.tds_amount]);

	// Save handler
	const handleSave = async () => {
		if (!coId || !header) return;

		setSaving(true);
		try {
			const payload = {
				invoice_no: formData.invoice_no || null,
				invoice_date: formData.invoice_date || null,
				invoice_amount: formData.invoice_amount ? parseFloat(formData.invoice_amount) : null,
				invoice_received_date: formData.invoice_received_date || null,
				payment_due_date: formData.payment_due_date || null,
				total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
				claim_amount: formData.claim_amount ? parseFloat(formData.claim_amount) : null,
				roundoff: formData.roundoff ? parseFloat(formData.roundoff) : 0,
				tds_amount: formData.tds_amount ? parseFloat(formData.tds_amount) : null,
				net_total: formData.net_total ? parseFloat(formData.net_total) : null,
				frieght_paid: formData.freight_charges ? parseFloat(formData.freight_charges) : null,
				remarks: formData.remarks || null,
			};

			const url = `${apiRoutesPortalMasters.JUTE_BILL_PASS_UPDATE}/${header.jute_mr_id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "PUT", payload);

			if (error) {
				setSnackbar({ open: true, message: error, severity: "error" });
				return;
			}

			setSnackbar({ open: true, message: "Bill pass saved successfully", severity: "success" });
			await loadData();
		} catch (err) {
			setSnackbar({
				open: true,
				message: err instanceof Error ? err.message : "Failed to save",
				severity: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	// Complete handler - marks bill pass as complete
	const handleComplete = async () => {
		if (!coId || !header) return;

		// Validate required fields
		if (!formData.invoice_no || !formData.invoice_date || !formData.invoice_amount) {
			setSnackbar({
				open: true,
				message: "Please fill in Invoice No, Invoice Date, and Invoice Amount before completing",
				severity: "error",
			});
			return;
		}

		setSaving(true);
		try {
			const payload = {
				invoice_no: formData.invoice_no,
				invoice_date: formData.invoice_date,
				invoice_amount: parseFloat(formData.invoice_amount),
				invoice_received_date: formData.invoice_received_date || null,
				payment_due_date: formData.payment_due_date || null,
				total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
				claim_amount: formData.claim_amount ? parseFloat(formData.claim_amount) : null,
				roundoff: formData.roundoff ? parseFloat(formData.roundoff) : 0,
				tds_amount: formData.tds_amount ? parseFloat(formData.tds_amount) : null,
				net_total: formData.net_total ? parseFloat(formData.net_total) : null,
				frieght_paid: formData.freight_charges ? parseFloat(formData.freight_charges) : null,
				remarks: formData.remarks || null,
				bill_pass_complete: 1,
			};

			const url = `${apiRoutesPortalMasters.JUTE_BILL_PASS_UPDATE}/${header.jute_mr_id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "PUT", payload);

			if (error) {
				setSnackbar({ open: true, message: error, severity: "error" });
				return;
			}

			setSnackbar({ open: true, message: "Bill pass completed successfully", severity: "success" });
			// Navigate back to list after completing
			setTimeout(() => {
				router.push("/dashboardportal/jutePurchase/billPass");
			}, 1000);
		} catch (err) {
			setSnackbar({
				open: true,
				message: err instanceof Error ? err.message : "Failed to complete bill pass",
				severity: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	// Calculate line item amount
	// Weight is stored in KG, rate is per quintal (1 QNT = 100 KG)
	const getLineAmount = (line: BillPassLineItem): number => {
		const weightKg = line.accepted_weight ?? line.actual_weight ?? 0;
		const weightQnt = weightKg / 100; // Convert KG to Quintals
		const rate = line.rate ?? 0;
		return weightQnt * rate;
	};

	// Render loading state
	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
				<CircularProgress />
			</Box>
		);
	}

	// Render error state
	if (pageError) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				{pageError}
			</Alert>
		);
	}

	if (!header) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				Bill pass not found
			</Alert>
		);
	}

	return (
		<Box sx={{ p: 2 }}>
			{/* Header */}
			<Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
				<Box display="flex" alignItems="center" gap={2}>
					<Button
						variant="outlined"
						size="small"
						startIcon={<ArrowLeft size={16} />}
						onClick={() => router.push("/dashboardportal/jutePurchase/billPass")}
					>
						Back
					</Button>
					<Typography variant="h5" fontWeight={600}>
						Bill Pass {header.bill_pass_num ?? (header.bill_pass_no ? `#${header.bill_pass_no}` : "")}
					</Typography>
					{isComplete && (
						<Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
							(Completed)
						</Typography>
					)}
				</Box>
				{!isComplete && (
					<Box display="flex" gap={1}>
						<Button
							variant="outlined"
							startIcon={<Save size={16} />}
							onClick={handleSave}
							disabled={saving}
						>
							Save
						</Button>
						<Button
							variant="contained"
							color="success"
							startIcon={<CheckCircle size={16} />}
							onClick={handleComplete}
							disabled={saving}
						>
							Complete Bill Pass
						</Button>
					</Box>
				)}
			</Box>

			{/* Header Info - Read Only */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Bill Pass Date
							</Typography>
							<Typography variant="body1">{formatDate(header.bill_pass_date)}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Bill Pass No
							</Typography>
							<Typography variant="body1">{header.bill_pass_num ?? header.bill_pass_no ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								MR No
							</Typography>
							<Typography variant="body1">
								{header.mr_num ?? header.mr_no ?? "-"} ({formatDate(header.mr_date)})
							</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Supplier
							</Typography>
							<Typography variant="body1">{header.supplier_name ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Gate Entry No
							</Typography>
							<Typography variant="body1">{header.gate_entry_no ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								PO No
							</Typography>
							<Typography variant="body1">{header.po_no ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								PO Date
							</Typography>
							<Typography variant="body1">{formatDate(header.po_date)}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Challan No
							</Typography>
							<Typography variant="body1">{header.challan_no ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Challan Date
							</Typography>
							<Typography variant="body1">{formatDate(header.challan_date)}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Vehicle No
							</Typography>
							<Typography variant="body1">{header.vehicle_no ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Branch
							</Typography>
							<Typography variant="body1">{header.branch_name ?? "-"}</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<Typography variant="caption" color="text.secondary">
								Party
							</Typography>
							<Typography variant="body1">{header.party_name ?? "-"}</Typography>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Line Items Table */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600} mb={2}>
						Line Items
					</Typography>
					<Box sx={{ overflowX: "auto" }}>
						<Paper variant="outlined">
							<Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
								<Box component="thead" sx={{ bgcolor: "primary.main" }}>
									<Box component="tr">
										{[
											"Item",
											"Quality",
											"Qty",
											"UOM",
											"Weight (Kg)",
											"Rate (Rs/Qntl)",
											"Claim Rate",
											"Amount",
											"Prem Amt",
											"Water Dmg",
										].map((h) => (
											<Box
												key={h}
												component="th"
												sx={{
													p: 1,
													color: "white",
													fontSize: "0.75rem",
													fontWeight: 600,
													textAlign: h === "Item" || h === "Quality" || h === "UOM" ? "left" : "right",
													borderRight: "1px solid rgba(255,255,255,0.2)",
												}}
											>
												{h}
											</Box>
										))}
									</Box>
								</Box>
								<Box component="tbody">
									{lineItems.map((line, idx) => (
										<Box
											key={line.jute_mr_li_id}
											component="tr"
											sx={{ bgcolor: idx % 2 === 0 ? "grey.50" : "white" }}
										>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", borderRight: "1px solid #eee" }}>
												{line.actual_group_name ?? "-"}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", borderRight: "1px solid #eee" }}>
												{line.actual_quality_name ?? "-"}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{line.actual_qty ?? "-"}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", borderRight: "1px solid #eee" }}>
												{line.uom ?? "-"}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{formatAmount(line.accepted_weight ?? line.actual_weight)}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{formatAmount(line.rate)}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{formatAmount(line.claim_rate)}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{formatAmount(getLineAmount(line))}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", borderRight: "1px solid #eee" }}>
												{formatAmount(line.premium_amount)}
											</Box>
											<Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
												{formatAmount(line.water_damage_amount)}
											</Box>
										</Box>
									))}
								</Box>
							</Box>
						</Paper>
					</Box>
				</CardContent>
			</Card>

			{/* Totals Section */}
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 6 }}>
					{/* Vendor Invoice Details */}
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} mb={2}>
								Vendor Invoice Details
							</Typography>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Invoice No *"
										value={formData.invoice_no}
										onChange={(e) => handleFieldChange("invoice_no", e.target.value)}
										fullWidth
										size="small"
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Invoice Date *"
										type="date"
										value={formData.invoice_date}
										onChange={(e) => handleFieldChange("invoice_date", e.target.value)}
										fullWidth
										size="small"
										InputLabelProps={{ shrink: true }}
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Payment Due Date"
										type="date"
										value={formData.payment_due_date}
										onChange={(e) => handleFieldChange("payment_due_date", e.target.value)}
										fullWidth
										size="small"
										InputLabelProps={{ shrink: true }}
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Invoice Amount *"
										type="number"
										value={formData.invoice_amount}
										onChange={(e) => handleFieldChange("invoice_amount", e.target.value)}
										fullWidth
										size="small"
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Invoice Received Date"
										type="date"
										value={formData.invoice_received_date}
										onChange={(e) => handleFieldChange("invoice_received_date", e.target.value)}
										fullWidth
										size="small"
										InputLabelProps={{ shrink: true }}
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12 }}>
									<TextField
										label="Remarks"
										value={formData.remarks}
										onChange={(e) => handleFieldChange("remarks", e.target.value)}
										fullWidth
										size="small"
										multiline
										rows={2}
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12 }}>
									<Divider sx={{ my: 1 }}>
										<Typography variant="caption" color="text.secondary">
											DOCUMENTS
										</Typography>
									</Divider>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<AttachmentUploader
										module="billpass"
										entityId={header.jute_mr_id}
										fileType="invoice"
										coId={Number(coId)}
										disabled={isComplete}
										label="Invoice"
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<AttachmentUploader
										module="billpass"
										entityId={header.jute_mr_id}
										fileType="challan"
										coId={Number(coId)}
										disabled={isComplete}
										label="Challan"
									/>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ xs: 12, md: 6 }}>
					{/* Financial Summary */}
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} mb={2}>
								Financial Summary
							</Typography>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Total Amount (Calculated)"
										type="number"
										value={formData.total_amount}
										fullWidth
										size="small"
										disabled
										helperText="Sum of (Accepted Weight × Rate)"
										sx={{ "& .MuiInputBase-input": { fontWeight: 600 } }}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Claim Amount (Calculated)"
										type="number"
										value={formData.claim_amount}
										fullWidth
										size="small"
										disabled
										helperText="Sum of (Weight × Claim Rate)"
										sx={{ "& .MuiInputBase-input": { fontWeight: 600 } }}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Round Off"
										type="number"
										value={formData.roundoff}
										fullWidth
										size="small"
										disabled
										helperText="Auto-calculated to round Net Total"
										sx={{ "& .MuiInputBase-input": { fontWeight: 600 } }}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Freight Charges"
										type="number"
										value={formData.freight_charges}
										onChange={(e) => handleFieldChange("freight_charges", e.target.value)}
										fullWidth
										size="small"
										disabled={isComplete}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Net Total"
										type="number"
										value={formData.net_total}
										fullWidth
										size="small"
										disabled
										sx={{ "& .MuiInputBase-input": { fontWeight: 600 } }}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="TDS Amount"
										type="number"
										value={formData.tds_amount}
										fullWidth
										size="small"
										disabled
										helperText="0.1% TDS on MR value exceeding Rs. 50 lacs in FY"
										sx={{ "& .MuiInputBase-input": { fontWeight: 600 } }}
									/>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Snackbar for notifications */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<Alert
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					severity={snackbar.severity}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}

export default function BillPassEditPage() {
	return (
		<Suspense
			fallback={
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			}
		>
			<BillPassEditPageContent />
		</Suspense>
	);
}
