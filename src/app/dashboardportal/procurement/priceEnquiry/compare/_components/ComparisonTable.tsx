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
	Radio,
	Chip,
	Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type {
	EnquiryDetailItem,
	ComparisonResponseDetail,
	ComparisonItemDetail,
} from "../../createEnquiry/types/enquiryTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparisonTableProps {
	items: EnquiryDetailItem[];
	responses: ComparisonResponseDetail[];
	selectedResponseId: number | null;
	onSelectResponse: (responseId: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | null | undefined): string => {
	if (value == null) return "-";
	return value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

/**
 * Find the response item for a given enquiry detail item within a response.
 */
const findResponseItem = (
	response: ComparisonResponseDetail,
	enquiryDtlId: number,
): ComparisonItemDetail | undefined =>
	response.items.find((i) => i.enquiry_dtl_id === enquiryDtlId);

/**
 * A line counts as quoted only when the supplier actually priced it. Lines
 * with no rate (or a zero-rate placeholder with no amount) are "not quoted"
 * and must not win lowest-price highlighting at 0.00.
 */
const isQuotedItem = (item: ComparisonItemDetail | undefined): item is ComparisonItemDetail =>
	item != null && item.rate != null && item.rate !== 0 && item.net_amount != null;

/**
 * Compute totals for a single response, counting only quoted lines.
 */
const computeResponseTotals = (
	response: ComparisonResponseDetail,
	items: EnquiryDetailItem[],
) => {
	let totalGross = 0;
	let totalDiscount = 0;
	let totalNet = 0;
	let quotedCount = 0;
	for (const enquiryItem of items) {
		const rItem = findResponseItem(response, enquiryItem.enquiry_dtl_id);
		if (!isQuotedItem(rItem)) continue;
		quotedCount += 1;
		totalGross += rItem.gross_amount ?? 0;
		totalDiscount += rItem.discount_amount ?? 0;
		totalNet += rItem.net_amount ?? 0;
	}
	return { totalGross, totalDiscount, totalNet, quotedCount };
};

/**
 * Find the lowest net amount per item across responses (for highlighting).
 * Unquoted lines are excluded.
 */
const findLowestNetPerItem = (
	items: EnquiryDetailItem[],
	responses: ComparisonResponseDetail[],
): Map<number, number> => {
	const lowestMap = new Map<number, number>();
	for (const enquiryItem of items) {
		let lowest = Infinity;
		for (const response of responses) {
			const rItem = findResponseItem(response, enquiryItem.enquiry_dtl_id);
			if (isQuotedItem(rItem) && rItem.net_amount != null && rItem.net_amount < lowest) {
				lowest = rItem.net_amount;
			}
		}
		if (lowest !== Infinity) {
			lowestMap.set(enquiryItem.enquiry_dtl_id, lowest);
		}
	}
	return lowestMap;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const HEADER_SX = {
	fontWeight: 600,
	whiteSpace: "nowrap" as const,
	fontSize: "0.8125rem",
};

const CELL_SX = {
	py: 0.75,
	px: 1,
	borderRight: "1px solid",
	borderColor: "divider",
};

// Only the first column sticks; making several columns sticky at left:0
// stacks them on top of each other during horizontal scroll.
const STICKY_CELL_SX = {
	...CELL_SX,
	position: "sticky" as const,
	left: 0,
	backgroundColor: "background.paper",
	zIndex: 2,
};

const lowestBgSx = { backgroundColor: (theme: { palette: { success: { main: string } } }) => alpha(theme.palette.success.main, 0.12) };
const selectedHeaderBgSx = { backgroundColor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.08) };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Side-by-side comparison table for all supplier responses for a price enquiry.
 *
 * - Rows correspond to enquiry items.
 * - Each supplier response gets its own column group showing rate, discount, and net.
 * - The lowest net amount per quoted item is highlighted; unquoted lines show "—".
 * - Suppliers who quoted only part of the items are flagged as partial.
 * - A radio button in the header row enables selecting the winning quote.
 */
const ComparisonTable: React.FC<ComparisonTableProps> = ({
	items,
	responses,
	selectedResponseId,
	onSelectResponse,
}) => {
	const lowestNetMap = React.useMemo(
		() => findLowestNetPerItem(items, responses),
		[items, responses],
	);

	const responseTotals = React.useMemo(
		() => responses.map((r) => computeResponseTotals(r, items)),
		[responses, items],
	);

	// Only complete quotes (all items priced) compete for the lowest total —
	// a partial quote's total covers fewer lines and is not comparable.
	const lowestTotalNet = React.useMemo(() => {
		let lowest = Infinity;
		for (const t of responseTotals) {
			if (t.quotedCount === items.length && t.totalNet < lowest) lowest = t.totalNet;
		}
		return lowest === Infinity ? null : lowest;
	}, [responseTotals, items.length]);

	if (responses.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
				No supplier responses to compare.
			</Typography>
		);
	}

	return (
		<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
			<Table size="small" stickyHeader>
				{/* Header: Item info + one column group per supplier */}
				<TableHead>
					{/* Top row: supplier names with radio */}
					<TableRow>
						<TableCell sx={{ ...CELL_SX, minWidth: 200 }} colSpan={4}>
							<Typography sx={HEADER_SX}>Item Details</Typography>
						</TableCell>
						{responses.map((resp, idx) => {
							const totals = responseTotals[idx];
							const isPartial = totals.quotedCount < items.length;
							return (
								<TableCell
									key={resp.proc_price_enquiry_response_id}
									colSpan={3}
									align="center"
									sx={{
										...CELL_SX,
										...(selectedResponseId === resp.proc_price_enquiry_response_id
											? selectedHeaderBgSx
											: { backgroundColor: "action.hover" }),
									}}
								>
									<Box display="flex" alignItems="center" justifyContent="center" gap={0.5} flexWrap="wrap">
										<Radio
											size="small"
											checked={selectedResponseId === resp.proc_price_enquiry_response_id}
											onChange={() => onSelectResponse(resp.proc_price_enquiry_response_id)}
											inputProps={{
												"aria-label": `Select quote from ${resp.supp_name ?? "supplier"}`,
											}}
										/>
										<Typography sx={HEADER_SX}>{resp.supp_name}</Typography>
										{resp.is_selected === 1 && (
											<Chip size="small" label="Selected" color="success" sx={{ ml: 0.5 }} />
										)}
										{isPartial && (
											<Chip
												size="small"
												variant="outlined"
												color="warning"
												label={`Partial ${totals.quotedCount}/${items.length}`}
												sx={{ ml: 0.5 }}
											/>
										)}
									</Box>
								</TableCell>
							);
						})}
					</TableRow>

					{/* Sub-header: column labels */}
					<TableRow>
						<TableCell sx={{ ...STICKY_CELL_SX, zIndex: 3 }}>
							<Typography sx={HEADER_SX}>Code</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Item Name</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>UOM</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Qty</Typography>
						</TableCell>
						{responses.map((resp) => (
							<React.Fragment key={`sub-${resp.proc_price_enquiry_response_id}`}>
								<TableCell sx={CELL_SX} align="right">
									<Typography sx={HEADER_SX}>Rate</Typography>
								</TableCell>
								<TableCell sx={CELL_SX} align="right">
									<Typography sx={HEADER_SX}>Discount</Typography>
								</TableCell>
								<TableCell sx={CELL_SX} align="right">
									<Typography sx={HEADER_SX}>Net Amt</Typography>
								</TableCell>
							</React.Fragment>
						))}
					</TableRow>
				</TableHead>

				<TableBody>
					{/* Item rows */}
					{items.map((item) => (
						<TableRow key={item.enquiry_dtl_id} hover>
							<TableCell sx={STICKY_CELL_SX}>
								<Typography variant="body2">{item.item_code}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{item.item_name}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{item.uom_name}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX} align="right">
								<Typography variant="body2">{item.qty}</Typography>
							</TableCell>

							{responses.map((resp) => {
								const rItem = findResponseItem(resp, item.enquiry_dtl_id);
								const quoted = isQuotedItem(rItem);
								const isLowest =
									quoted &&
									rItem.net_amount != null &&
									lowestNetMap.get(item.enquiry_dtl_id) === rItem.net_amount;

								return (
									<React.Fragment key={`cell-${resp.proc_price_enquiry_response_id}-${item.enquiry_dtl_id}`}>
										<TableCell sx={CELL_SX} align="right">
											<Typography variant="body2" color={quoted ? undefined : "text.disabled"}>
												{quoted ? formatCurrency(rItem.rate) : "—"}
											</Typography>
										</TableCell>
										<TableCell sx={CELL_SX} align="right">
											<Typography variant="body2" color={quoted ? undefined : "text.disabled"}>
												{quoted ? formatCurrency(rItem.discount_amount) : "—"}
											</Typography>
										</TableCell>
										<TableCell
											sx={{
												...CELL_SX,
												...(isLowest ? lowestBgSx : {}),
											}}
											align="right"
										>
											<Typography
												variant="body2"
												fontWeight={isLowest ? 700 : 400}
												color={isLowest ? "success.main" : quoted ? undefined : "text.disabled"}
											>
												{quoted ? formatCurrency(rItem.net_amount) : "—"}
											</Typography>
										</TableCell>
									</React.Fragment>
								);
							})}
						</TableRow>
					))}

					{/* Totals row */}
					<TableRow sx={{ backgroundColor: "action.selected" }}>
						<TableCell sx={STICKY_CELL_SX} colSpan={4} align="right">
							<Typography variant="body2" fontWeight={700}>
								Totals (quoted lines)
							</Typography>
						</TableCell>
						{responses.map((resp, idx) => {
							const totals = responseTotals[idx];
							const isLowestTotal = lowestTotalNet != null && totals.totalNet === lowestTotalNet;

							return (
								<React.Fragment key={`total-${resp.proc_price_enquiry_response_id}`}>
									<TableCell sx={CELL_SX} align="right">
										<Typography variant="body2" fontWeight={700}>-</Typography>
									</TableCell>
									<TableCell sx={CELL_SX} align="right">
										<Typography variant="body2" fontWeight={700}>
											{formatCurrency(totals.totalDiscount)}
										</Typography>
									</TableCell>
									<TableCell
										sx={{
											...CELL_SX,
											...(isLowestTotal ? lowestBgSx : {}),
										}}
										align="right"
									>
										<Typography
											variant="body2"
											fontWeight={700}
											color={isLowestTotal ? "success.main" : undefined}
										>
											{formatCurrency(totals.totalNet)}
										</Typography>
									</TableCell>
								</React.Fragment>
							);
						})}
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
};

export default ComparisonTable;
export type { ComparisonTableProps };
