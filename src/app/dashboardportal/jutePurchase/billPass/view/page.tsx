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
	Grid,
	Paper,
	Typography,
	CircularProgress,
} from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";

/**
 * @component BillPassViewPage
 * @description Read-only view page for Jute Bill Pass — displays header, line items,
 * vendor invoice details, and financial summary without any editable fields.
 */

// Types (shared with edit page)
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
			month: "short",
			year: "numeric",
		}).format(date);
	}
	return trimmed;
};

const formatAmount = (value?: number | null): string => {
	if (value == null) return "0.00";
	return new Intl.NumberFormat("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

const formatCurrency = (value?: number | null): string => {
	if (value == null) return "-";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

/**
 * Calculate line item amount: (accepted_weight / 100) * rate
 * Weight is stored in KG, rate is per quintal (1 QNT = 100 KG)
 */
const getLineAmount = (line: BillPassLineItem): number => {
	const weightKg = line.accepted_weight ?? line.actual_weight ?? 0;
	const weightQnt = weightKg / 100;
	const rate = line.rate ?? 0;
	return weightQnt * rate;
};

/**
 * Calculate total amount from line items
 * Formula: Sum of ((accepted_weight / 100) * rate) for all line items
 */
const calculateTotalAmount = (items: BillPassLineItem[]): number => {
	return items.reduce((sum, line) => sum + getLineAmount(line), 0);
};

/**
 * Calculate claim amount from line items
 * Formula: Sum of ((accepted_weight / 100) * claim_rate)
 */
const calculateClaimAmount = (items: BillPassLineItem[]): number => {
	return items.reduce((sum, line) => {
		const weightKg = line.accepted_weight ?? line.actual_weight ?? 0;
		const weightQnt = weightKg / 100;
		const claimRate = line.claim_rate ?? 0;
		return sum + weightQnt * claimRate;
	}, 0);
};

/** Read-only field display */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body1">{value}</Typography>
		</Box>
	);
}

function BillPassViewPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const billPassIdParam = searchParams.get("id");
	const { coId } = useSelectedCompanyCoId();

	const [header, setHeader] = React.useState<BillPassHeader | null>(null);
	const [lineItems, setLineItems] = React.useState<BillPassLineItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [pageError, setPageError] = React.useState<string | null>(null);

	// Computed financial values — calculate totals from line items
	const financials = React.useMemo(() => {
		const totalAmount = lineItems.length > 0 ? calculateTotalAmount(lineItems) : (header?.total_amount ?? 0);
		const claimAmount = lineItems.length > 0 ? calculateClaimAmount(lineItems) : (header?.claim_amount ?? 0);
		const roundoff = header?.roundoff ?? 0;
		const tdsAmount = header?.tds_amount ?? 0;
		const netTotal = totalAmount - claimAmount + roundoff - tdsAmount;
		return { totalAmount, claimAmount, roundoff, tdsAmount, netTotal };
	}, [header, lineItems]);

	const loadData = React.useCallback(async () => {
		if (!coId || !billPassIdParam) return;

		setLoading(true);
		setPageError(null);

		try {
			const headerUrl = `${apiRoutesPortalMasters.JUTE_BILL_PASS_BY_ID}?co_id=${coId}&id=${billPassIdParam}`;
			const { data: headerData, error: headerError } = await fetchWithCookie(headerUrl, "GET");
			if (headerError) throw new Error(headerError);

			setHeader(headerData as BillPassHeader);

			const lineUrl = `${apiRoutesPortalMasters.JUTE_BILL_PASS_LINE_ITEMS}?co_id=${coId}&id=${billPassIdParam}`;
			const { data: lineData, error: lineError } = await fetchWithCookie(lineUrl, "GET");
			if (lineError) throw new Error(lineError);

			const lines = (lineData as { data?: BillPassLineItem[] })?.data ?? [];
			setLineItems(lines);
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to load bill pass data");
		} finally {
			setLoading(false);
		}
	}, [coId, billPassIdParam]);

	React.useEffect(() => {
		void loadData();
	}, [loadData]);

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
				<CircularProgress />
			</Box>
		);
	}

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

	const isComplete = header.bill_pass_complete === 1;

	return (
		<Box sx={{ p: 2 }}>
			{/* Page Header */}
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
			</Box>

			{/* Header Info */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Bill Pass Date" value={formatDate(header.bill_pass_date)} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField
								label="Bill Pass No"
								value={header.bill_pass_num ?? String(header.bill_pass_no ?? "-")}
							/>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField
								label="MR No"
								value={`${header.mr_num ?? header.mr_no ?? "-"} (${formatDate(header.mr_date)})`}
							/>
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Supplier" value={header.supplier_name ?? "-"} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Gate Entry No" value={header.gate_entry_no ?? "-"} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="PO No" value={String(header.po_no ?? "-")} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="PO Date" value={formatDate(header.po_date)} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Challan No" value={header.challan_no ?? "-"} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Challan Date" value={formatDate(header.challan_date)} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Vehicle No" value={header.vehicle_no ?? "-"} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Branch" value={header.branch_name ?? "-"} />
						</Grid>
						<Grid size={{ xs: 12, md: 6, lg: 3 }}>
							<ReadOnlyField label="Party" value={header.party_name ?? "-"} />
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

			{/* Vendor Invoice Details & Financial Summary */}
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 6 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} mb={2}>
								Vendor Invoice Details
							</Typography>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Invoice No" value={header.invoice_no ?? "-"} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Invoice Date" value={formatDate(header.invoice_date)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Payment Due Date" value={formatDate(header.payment_due_date)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Invoice Amount" value={formatCurrency(header.invoice_amount)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Invoice Received Date" value={formatDate(header.invoice_received_date)} />
								</Grid>
								<Grid size={{ xs: 12 }}>
									<ReadOnlyField label="Remarks" value={header.remarks ?? "-"} />
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ xs: 12, md: 6 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} mb={2}>
								Financial Summary
							</Typography>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Total Amount" value={formatCurrency(financials.totalAmount)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Claim Amount" value={formatCurrency(financials.claimAmount)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Round Off" value={formatAmount(financials.roundoff)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Freight Charges" value={formatCurrency(header.freight_charges)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="Net Total" value={formatCurrency(financials.netTotal)} />
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<ReadOnlyField label="TDS Amount" value={formatCurrency(financials.tdsAmount)} />
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Box>
	);
}

export default function BillPassViewPage() {
	return (
		<Suspense
			fallback={
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			}
		>
			<BillPassViewPageContent />
		</Suspense>
	);
}
