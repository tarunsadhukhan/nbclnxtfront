"use client";

import * as React from "react";
import { Box, Stack, Typography, Divider } from "@mui/material";
import type { SRTotals } from "../types/srTypes";

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

type AdditionalChargesTotals = {
	baseAmount: number;
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	totalTax: number;
	totalAmount: number;
};

type SRTotalsDisplayProps = {
	totals: SRTotals;
	/** @deprecated Use chargesTotals instead */
	additionalChargesTotal?: number;
	/** Detailed breakdown of additional charges including tax split */
	chargesTotals?: AdditionalChargesTotals;
};

/**
 * Displays SR totals with GST breakdown.
 * Additional charges tax is combined with line items tax.
 */
export const SRTotalsDisplay: React.FC<SRTotalsDisplayProps> = ({ 
	totals, 
	additionalChargesTotal = 0,
	chargesTotals,
}) => {
	// Use detailed chargesTotals if available, otherwise fall back to simple total
	const chargesBase = chargesTotals?.baseAmount ?? additionalChargesTotal;
	const chargesIGST = chargesTotals?.totalIGST ?? 0;
	const chargesCGST = chargesTotals?.totalCGST ?? 0;
	const chargesSGST = chargesTotals?.totalSGST ?? 0;
	const chargesTax = chargesTotals?.totalTax ?? 0;

	// Combined taxes (line items + additional charges)
	const combinedIGST = totals.totalIGST + chargesIGST;
	const combinedCGST = totals.totalCGST + chargesCGST;
	const combinedSGST = totals.totalSGST + chargesSGST;

	// Grand total = line items grand total + additional charges (base + tax)
	const grandTotalWithCharges = totals.grandTotal + chargesBase + chargesTax;
	
	return (
		<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
			<Stack spacing={1} sx={{ minWidth: 280 }}>
				<Stack direction="row" justifyContent="space-between">
					<Typography variant="body2" color="text.secondary">
						Gross Amount:
					</Typography>
					<Typography variant="body2">{formatCurrency(totals.grossAmount)}</Typography>
				</Stack>

				{totals.totalDiscount > 0 && (
					<Stack direction="row" justifyContent="space-between">
						<Typography variant="body2" color="text.secondary">
							Discount:
						</Typography>
						<Typography variant="body2" color="error">
							-{formatCurrency(totals.totalDiscount)}
						</Typography>
					</Stack>
				)}

				{chargesBase > 0 && (
					<Stack direction="row" justifyContent="space-between">
						<Typography variant="body2" color="text.secondary">
							Additional Charges:
						</Typography>
						<Typography variant="body2">{formatCurrency(chargesBase)}</Typography>
					</Stack>
				)}

				<Stack direction="row" justifyContent="space-between">
					<Typography variant="body2" color="text.secondary">
						Net Amount:
					</Typography>
					<Typography variant="body2">{formatCurrency(totals.netAmount + chargesBase)}</Typography>
				</Stack>

				{combinedIGST > 0 && (
					<Stack direction="row" justifyContent="space-between">
						<Typography variant="body2" color="text.secondary">
							IGST:
						</Typography>
						<Typography variant="body2">{formatCurrency(combinedIGST)}</Typography>
					</Stack>
				)}

				{(combinedCGST > 0 || combinedSGST > 0) && (
					<>
						<Stack direction="row" justifyContent="space-between">
							<Typography variant="body2" color="text.secondary">
								CGST:
							</Typography>
							<Typography variant="body2">{formatCurrency(combinedCGST)}</Typography>
						</Stack>
						<Stack direction="row" justifyContent="space-between">
							<Typography variant="body2" color="text.secondary">
								SGST:
							</Typography>
							<Typography variant="body2">{formatCurrency(combinedSGST)}</Typography>
						</Stack>
					</>
				)}

				<Divider />

				<Stack direction="row" justifyContent="space-between">
					<Typography variant="body1" fontWeight={600}>
						Grand Total:
					</Typography>
					<Typography variant="body1" fontWeight={600} color="primary">
						{formatCurrency(grandTotalWithCharges)}
					</Typography>
				</Stack>
			</Stack>
		</Box>
	);
};
