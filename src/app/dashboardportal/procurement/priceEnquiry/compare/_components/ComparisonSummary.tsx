"use client";

import * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ComparisonResponseDetail } from "../../createEnquiry/types/enquiryTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparisonSummaryProps {
	responses: ComparisonResponseDetail[];
	selectedResponseId: number | null;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const HEADER_SX = {
	fontWeight: 600,
	whiteSpace: "nowrap" as const,
	fontSize: "0.8125rem",
};

const CELL_SX = {
	py: 1,
	px: 1.5,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Summary table comparing commercial terms across suppliers.
 * Displays credit days, delivery days, payment terms, and T&C
 * for each supplier response side by side.
 */
const ComparisonSummary: React.FC<ComparisonSummaryProps> = ({
	responses,
	selectedResponseId,
}) => {
	const lowestDeliveryDays = React.useMemo(() => {
		let lowest = Infinity;
		for (const resp of responses) {
			if (resp.delivery_days != null && resp.delivery_days < lowest) {
				lowest = resp.delivery_days;
			}
		}
		return lowest === Infinity ? null : lowest;
	}, [responses]);

	const highestCreditDays = React.useMemo(() => {
		let highest = -Infinity;
		for (const resp of responses) {
			if (resp.credit_days != null && resp.credit_days > highest) {
				highest = resp.credit_days;
			}
		}
		return highest === -Infinity ? null : highest;
	}, [responses]);

	if (responses.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
				No responses to compare.
			</Typography>
		);
	}

	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow sx={{ backgroundColor: "action.hover" }}>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Supplier</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="center">
							<Typography sx={HEADER_SX}>Credit Days</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="center">
							<Typography sx={HEADER_SX}>Delivery Days</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Payment Terms</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Terms & Conditions</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="center">
							<Typography sx={HEADER_SX}>Status</Typography>
						</TableCell>
					</TableRow>
				</TableHead>

				<TableBody>
					{responses.map((resp) => {
						const isSelected = selectedResponseId === resp.proc_price_enquiry_response_id;
						const isBestDelivery =
							lowestDeliveryDays != null && resp.delivery_days === lowestDeliveryDays;
						const isBestCredit =
							highestCreditDays != null && resp.credit_days === highestCreditDays;

						return (
							<TableRow
								key={resp.proc_price_enquiry_response_id}
								hover
								sx={{
									backgroundColor: isSelected
										? (theme) => alpha(theme.palette.primary.main, 0.08)
										: undefined,
								}}
							>
								<TableCell sx={CELL_SX}>
									<Typography variant="body2" fontWeight={isSelected ? 700 : 400}>
										{resp.supp_name}
									</Typography>
									{resp.supp_code && (
										<Typography variant="caption" color="text.secondary">
											{resp.supp_code}
										</Typography>
									)}
								</TableCell>

								<TableCell sx={CELL_SX} align="center">
									<Typography
										variant="body2"
										fontWeight={isBestCredit ? 700 : 400}
										color={isBestCredit ? "success.main" : undefined}
									>
										{resp.credit_days ?? "-"}
									</Typography>
								</TableCell>

								<TableCell sx={CELL_SX} align="center">
									<Typography
										variant="body2"
										fontWeight={isBestDelivery ? 700 : 400}
										color={isBestDelivery ? "success.main" : undefined}
									>
										{resp.delivery_days ?? "-"}
									</Typography>
								</TableCell>

								<TableCell sx={CELL_SX}>
									<Typography variant="body2">
										{resp.payment_terms || "-"}
									</Typography>
								</TableCell>

								<TableCell sx={CELL_SX}>
									<Typography variant="body2" sx={{ maxWidth: 300, wordBreak: "break-word" }}>
										{resp.terms_conditions || "-"}
									</Typography>
								</TableCell>

								<TableCell sx={CELL_SX} align="center">
									{resp.is_selected === 1 ? (
										<Chip size="small" label="Selected" color="success" />
									) : isSelected ? (
										<Chip size="small" label="Pending Selection" color="info" variant="outlined" />
									) : (
										<Typography variant="body2" color="text.secondary">
											-
										</Typography>
									)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

export default ComparisonSummary;
export type { ComparisonSummaryProps };
