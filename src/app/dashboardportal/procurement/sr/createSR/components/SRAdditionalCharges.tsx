"use client";

import * as React from "react";
import {
	TextField,
	Autocomplete,
	IconButton,
	Tooltip,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdditionalChargeOption, SRAdditionalCharge } from "../types/srTypes";

type SRAdditionalChargesProps = {
	charges: SRAdditionalCharge[];
	options: AdditionalChargeOption[];
	canEdit: boolean;
	onAddCharge: () => void;
	onRemoveCharge: (id: string) => void;
	onChargeChange: (id: string, field: keyof SRAdditionalCharge, value: unknown) => void;
};

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

/**
 * Generate unique ID for new charges.
 */
let chargeIdSeed = 0;
export const generateChargeId = (): string => {
	chargeIdSeed += 1;
	return `addl-charge-${chargeIdSeed}`;
};

/**
 * Create a blank additional charge.
 */
export const createBlankCharge = (): SRAdditionalCharge => ({
	id: generateChargeId(),
	inward_additional_id: null,
	additional_charges_id: 0,
	additional_charges_name: "",
	qty: 1,
	rate: 0,
	net_amount: 0,
	remarks: "",
	apply_tax: false,
	tax_pct: 0,
	igst_amount: 0,
	sgst_amount: 0,
	cgst_amount: 0,
	tax_amount: 0,
});

// Column definitions for additional charges grid
const GRID_COLUMNS = {
	chargeType: "1.5fr",
	qty: "80px",
	rate: "100px",
	amount: "100px",
	taxPct: "70px",
	taxAmt: "90px",
	remarks: "1fr",
	actions: "48px",
};

/**
 * Additional Charges section component for SR.
 * Uses same grid-based layout as line items for visual consistency.
 */
export const SRAdditionalCharges: React.FC<SRAdditionalChargesProps> = ({
	charges,
	options,
	canEdit,
	onAddCharge,
	onRemoveCharge,
	onChargeChange,
}) => {
	// Calculate total
	const total = React.useMemo(() => {
		return charges.reduce((sum, charge) => sum + (charge.net_amount || 0) + (charge.tax_amount || 0), 0);
	}, [charges]);

	// Build options map for quick lookup
	const optionsMap = React.useMemo(() => {
		const map: Record<number, AdditionalChargeOption> = {};
		for (const opt of options) {
			map[opt.additional_charges_id] = opt;
		}
		return map;
	}, [options]);

	// Build grid template columns
	const gridTemplateColumns = React.useMemo(() => {
		const cols = [
			GRID_COLUMNS.chargeType,
			GRID_COLUMNS.qty,
			GRID_COLUMNS.rate,
			GRID_COLUMNS.amount,
			GRID_COLUMNS.taxPct,
			GRID_COLUMNS.taxAmt,
			GRID_COLUMNS.remarks,
		];
		if (canEdit) {
			cols.push(GRID_COLUMNS.actions);
		}
		return cols.join(" ");
	}, [canEdit]);

	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-base font-semibold text-slate-800">Additional Charges</p>
					<p className="text-xs text-slate-500">
						{charges.length > 0
							? `${charges.length} charge${charges.length !== 1 ? "s" : ""} • Total: ${formatCurrency(total)}`
							: "Add freight, handling, or other charges"}
					</p>
				</div>
				{canEdit && (
					<div className="flex gap-2 print-hidden">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onAddCharge}
						>
							<Plus size={16} className="mr-1" />
							Add Charge
						</Button>
					</div>
				)}
			</div>

			{/* Grid */}
			<div className="overflow-x-auto">
				<div className="min-w-150 transaction-grid-container">
					{/* Header Row */}
					<div
						className="transaction-grid-header"
						style={{ gridTemplateColumns }}
					>
						<span className="truncate">Charge Type</span>
						<span className="truncate text-right">Qty</span>
						<span className="truncate text-right">Rate</span>
						<span className="truncate text-right">Amount</span>
						<span className="truncate text-right">Tax %</span>
						<span className="truncate text-right">Tax Amt</span>
						<span className="truncate">Remarks</span>
						{canEdit && <span>&nbsp;</span>}
					</div>

					{/* Data Rows */}
					{charges.length > 0 ? (
						charges.map((charge, index) => {
							const selectedOption = optionsMap[charge.additional_charges_id] || null;
							const rowClass = index % 2 === 0 ? "transaction-grid-row-even" : "transaction-grid-row-odd";

							return (
								<div
									key={charge.id}
									className={`transaction-grid-row ${rowClass}`}
									style={{ gridTemplateColumns }}
								>
									{/* Charge Type */}
									<div className="transaction-grid-cell">
										{canEdit ? (
											<Autocomplete
												size="small"
												options={options}
												value={selectedOption}
												onChange={(_, newValue) => {
													if (newValue) {
														onChargeChange(charge.id, "additional_charges_id", newValue.additional_charges_id);
														onChargeChange(charge.id, "additional_charges_name", newValue.additional_charges_name);
														if (newValue.default_value) {
															onChargeChange(charge.id, "tax_pct", newValue.default_value);
														}
													}
												}}
												getOptionLabel={(opt) => opt.additional_charges_name}
												isOptionEqualToValue={(opt, val) => opt.additional_charges_id === val.additional_charges_id}
												renderInput={(params) => (
													<TextField {...params} placeholder="Select charge" size="small" variant="outlined" />
												)}
												sx={{ width: "100%" }}
											/>
										) : (
											<Tooltip title={charge.additional_charges_name || ""} arrow placement="top" enterDelay={400}>
												<span className="truncate">{charge.additional_charges_name || "-"}</span>
											</Tooltip>
										)}
									</div>

									{/* Qty */}
									<div className="transaction-grid-cell">
										{canEdit ? (
											<TextField
												type="number"
												size="small"
												variant="outlined"
												value={charge.qty}
												onChange={(e) => onChargeChange(charge.id, "qty", Number(e.target.value) || 1)}
												inputProps={{ min: 1, style: { textAlign: "right" } }}
												sx={{ width: "100%" }}
											/>
										) : (
											<span className="text-right">{charge.qty}</span>
										)}
									</div>

									{/* Rate */}
									<div className="transaction-grid-cell">
										{canEdit ? (
											<TextField
												type="number"
												size="small"
												variant="outlined"
												value={charge.rate}
												onChange={(e) => onChargeChange(charge.id, "rate", Number(e.target.value) || 0)}
												inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
												sx={{ width: "100%" }}
											/>
										) : (
											<span className="text-right">{formatCurrency(charge.rate)}</span>
										)}
									</div>

									{/* Amount */}
									<div className="transaction-grid-cell">
										<span className="text-right font-medium">{formatCurrency(charge.net_amount)}</span>
									</div>

									{/* Tax % */}
									<div className="transaction-grid-cell">
										{canEdit ? (
											<TextField
												type="number"
												size="small"
												variant="outlined"
												value={charge.tax_pct}
												onChange={(e) => onChargeChange(charge.id, "tax_pct", Number(e.target.value) || 0)}
												inputProps={{ min: 0, max: 100, step: 0.01, style: { textAlign: "right" } }}
												sx={{ width: "100%" }}
											/>
										) : (
											<span className="text-right">{charge.tax_pct}%</span>
										)}
									</div>

									{/* Tax Amt */}
									<div className="transaction-grid-cell">
										<span className="text-right">{formatCurrency(charge.tax_amount)}</span>
									</div>

									{/* Remarks */}
									<div className="transaction-grid-cell">
										{canEdit ? (
											<TextField
												size="small"
												variant="outlined"
												value={charge.remarks}
												onChange={(e) => onChargeChange(charge.id, "remarks", e.target.value)}
												placeholder="Remarks"
												sx={{ width: "100%" }}
											/>
										) : (
											<Tooltip title={charge.remarks || ""} arrow placement="top" enterDelay={400}>
												<span className="truncate">{charge.remarks || "-"}</span>
											</Tooltip>
										)}
									</div>

									{/* Delete */}
									{canEdit && (
										<div className="flex items-center justify-center">
											<IconButton
												size="small"
												color="error"
												onClick={() => onRemoveCharge(charge.id)}
												sx={{ p: 0.5 }}
											>
												<Trash2 size={16} />
											</IconButton>
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className="transaction-grid-empty">
							No additional charges. {canEdit ? "Click \"Add Charge\" to add freight, handling, or other charges." : ""}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
