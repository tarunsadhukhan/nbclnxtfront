import React from "react";
import { Paper, Typography, Divider } from "@mui/material";

type SalesOrderTotalsDisplayProps = {
	grossAmount: number;
	totalTax: number;
	freightCharges: number;
	additionalChargesTotal?: number;
	netAmount: number;
	taxType?: string;
};

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

export function SalesOrderTotalsDisplay({
	grossAmount,
	totalTax,
	freightCharges,
	additionalChargesTotal,
	netAmount,
	taxType,
}: SalesOrderTotalsDisplayProps) {
	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>Order Totals</Typography>
			<div className="space-y-1">
				<div className="flex justify-between">
					<Typography variant="body2" color="text.secondary">Gross Amount</Typography>
					<Typography variant="body2">{formatCurrency(grossAmount)}</Typography>
				</div>
				{freightCharges > 0 && (
					<div className="flex justify-between">
						<Typography variant="body2" color="text.secondary">Freight Charges</Typography>
						<Typography variant="body2">{formatCurrency(freightCharges)}</Typography>
					</div>
				)}
				{(additionalChargesTotal ?? 0) > 0 && (
					<div className="flex justify-between">
						<Typography variant="body2" color="text.secondary">Additional Charges</Typography>
						<Typography variant="body2">{formatCurrency(additionalChargesTotal!)}</Typography>
					</div>
				)}
				<div className="flex justify-between">
					<Typography variant="body2" color="text.secondary">
						Total GST{taxType ? ` (${taxType})` : ""}
					</Typography>
					<Typography variant="body2">{formatCurrency(totalTax)}</Typography>
				</div>
				<Divider sx={{ my: 1 }} />
				<div className="flex justify-between">
					<Typography variant="body2" fontWeight={700}>Net Amount</Typography>
					<Typography variant="body2" fontWeight={700}>{formatCurrency(netAmount)}</Typography>
				</div>
			</div>
		</Paper>
	);
}

export default SalesOrderTotalsDisplay;
