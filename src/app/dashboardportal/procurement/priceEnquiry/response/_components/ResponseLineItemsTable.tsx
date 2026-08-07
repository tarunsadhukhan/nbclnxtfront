"use client";

import * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	MenuItem,
	Paper,
	Typography,
} from "@mui/material";
import type { ResponseLineItem } from "../../createEnquiry/types/enquiryTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditableLineField = "rate" | "discountMode" | "discountValue";

interface ResponseLineItemsTableProps {
	items: ResponseLineItem[];
	onItemChange: (index: number, field: EditableLineField, value: number | null) => void;
	mode: "create" | "edit" | "view";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCOUNT_MODE_OPTIONS = [
	{ value: 0, label: "None" },
	{ value: 1, label: "Percentage" },
	{ value: 2, label: "Amount" },
] as const;

const HEADER_SX = {
	fontWeight: 600,
	whiteSpace: "nowrap" as const,
	fontSize: "0.8125rem",
};

const CELL_SX = {
	py: 1,
	px: 1,
};

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Table component for displaying and editing response line items.
 * Shows item details from the enquiry (read-only) alongside editable rate/discount fields.
 * Automatically computes gross amount, discount amount, and net amount.
 */
const ResponseLineItemsTable: React.FC<ResponseLineItemsTableProps> = ({
	items,
	onItemChange,
	mode,
}) => {
	const isReadOnly = mode === "view";

	const handleNumberInput = React.useCallback(
		(index: number, field: EditableLineField) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
				const raw = e.target.value.trim();
				if (raw === "") {
					onItemChange(index, field, null);
					return;
				}
				const parsed = Number(raw);
				if (!Number.isNaN(parsed)) {
					onItemChange(index, field, parsed);
				}
			},
		[onItemChange],
	);

	const handleSelectChange = React.useCallback(
		(index: number) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
				onItemChange(index, "discountMode", Number(e.target.value));
			},
		[onItemChange],
	);

	const totals = React.useMemo(() => {
		let totalGross = 0;
		let totalDiscount = 0;
		let totalNet = 0;
		for (const item of items) {
			totalGross += item.grossAmount ?? 0;
			totalDiscount += item.discountAmount ?? 0;
			totalNet += item.netAmount ?? 0;
		}
		return { totalGross, totalDiscount, totalNet };
	}, [items]);

	if (items.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
				No line items available.
			</Typography>
		);
	}

	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow sx={{ backgroundColor: "action.hover" }}>
						<TableCell sx={{ ...CELL_SX, width: 40 }}>
							<Typography sx={HEADER_SX}>#</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Item Code</Typography>
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
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Rate</Typography>
						</TableCell>
						<TableCell sx={CELL_SX}>
							<Typography sx={HEADER_SX}>Disc. Mode</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Disc. Value</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Disc. Amount</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Gross Amount</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography sx={HEADER_SX}>Net Amount</Typography>
						</TableCell>
					</TableRow>
				</TableHead>

				<TableBody>
					{items.map((item, idx) => (
						<TableRow key={item.id} hover>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{idx + 1}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{item.itemCode}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{item.itemName}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX}>
								<Typography variant="body2">{item.uomName}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX} align="right">
								<Typography variant="body2">{item.qty}</Typography>
							</TableCell>

							{/* Rate (editable) */}
							<TableCell sx={CELL_SX} align="right">
								{isReadOnly ? (
									<Typography variant="body2">{formatCurrency(item.rate)}</Typography>
								) : (
									<TextField
										type="number"
										size="small"
										value={item.rate ?? ""}
										onChange={handleNumberInput(idx, "rate")}
										slotProps={{
											htmlInput: {
												min: 0,
												step: "0.01",
												style: { textAlign: "right" },
												"aria-label": `Rate for ${item.itemName || item.itemCode}`,
											},
										}}
										sx={{ width: 110 }}
									/>
								)}
							</TableCell>

							{/* Discount Mode (editable) */}
							<TableCell sx={CELL_SX}>
								{isReadOnly ? (
									<Typography variant="body2">
										{DISCOUNT_MODE_OPTIONS.find((o) => o.value === (item.discountMode ?? 0))?.label ?? "None"}
									</Typography>
								) : (
									<TextField
										select
										size="small"
										value={item.discountMode ?? 0}
										onChange={handleSelectChange(idx)}
										slotProps={{
											htmlInput: {
												"aria-label": `Discount mode for ${item.itemName || item.itemCode}`,
											},
										}}
										sx={{ width: 120 }}
									>
										{DISCOUNT_MODE_OPTIONS.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</TextField>
								)}
							</TableCell>

							{/* Discount Value (editable) */}
							<TableCell sx={CELL_SX} align="right">
								{isReadOnly ? (
									<Typography variant="body2">{formatCurrency(item.discountValue)}</Typography>
								) : (
									<TextField
										type="number"
										size="small"
										value={item.discountValue ?? ""}
										onChange={handleNumberInput(idx, "discountValue")}
										disabled={(item.discountMode ?? 0) === 0}
										slotProps={{
											htmlInput: {
												min: 0,
												step: "0.01",
												style: { textAlign: "right" },
												"aria-label": `Discount value for ${item.itemName || item.itemCode}`,
											},
										}}
										sx={{ width: 110 }}
									/>
								)}
							</TableCell>

							{/* Computed fields (always read-only) */}
							<TableCell sx={CELL_SX} align="right">
								<Typography variant="body2">{formatCurrency(item.discountAmount)}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX} align="right">
								<Typography variant="body2">{formatCurrency(item.grossAmount)}</Typography>
							</TableCell>
							<TableCell sx={CELL_SX} align="right">
								<Typography variant="body2" fontWeight={600}>
									{formatCurrency(item.netAmount)}
								</Typography>
							</TableCell>
						</TableRow>
					))}

					{/* Totals row */}
					<TableRow sx={{ backgroundColor: "action.selected" }}>
						<TableCell colSpan={8} sx={CELL_SX} align="right">
							<Typography variant="body2" fontWeight={700}>
								Totals
							</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography variant="body2" fontWeight={700}>
								{formatCurrency(totals.totalDiscount)}
							</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography variant="body2" fontWeight={700}>
								{formatCurrency(totals.totalGross)}
							</Typography>
						</TableCell>
						<TableCell sx={CELL_SX} align="right">
							<Typography variant="body2" fontWeight={700}>
								{formatCurrency(totals.totalNet)}
							</Typography>
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
};

export default ResponseLineItemsTable;
export type { ResponseLineItemsTableProps, EditableLineField };
