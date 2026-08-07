"use client";

import React from "react";
import { Paper, Typography, IconButton, Tooltip } from "@mui/material";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/transaction";

export type AdditionalChargeRow = {
	id: string;
	additionalChargesId: string;
	chargeName: string;
	qty: string;
	rate: string;
	netAmount: string;
	remarks: string;
	taxPct: string;
	gst?: {
		igstAmount?: number;
		igstPercent?: number;
		cgstAmount?: number;
		cgstPercent?: number;
		sgstAmount?: number;
		sgstPercent?: number;
		gstTotal?: number;
	};
};

type ChargeOption = {
	value: string;
	label: string;
	defaultValue?: number;
};

type Props = {
	charges: AdditionalChargeRow[];
	chargeOptions: ChargeOption[];
	onChange: (charges: AdditionalChargeRow[]) => void;
	disabled?: boolean;
	/** Billing-to party state name (for IGST vs CGST/SGST determination) */
	billingToState?: string;
	/** Shipping-to party state name */
	shippingToState?: string;
	/** Whether India GST is enabled for this company */
	indiaGst?: boolean;
};

let nextId = 1;
const genId = () => `charge_${Date.now()}_${nextId++}`;

/**
 * Calculate GST split based on billing/shipping state comparison.
 * Same state → CGST + SGST (split 50/50), different state → IGST.
 */
const calculateChargeGst = (
	netAmount: number,
	taxPct: number,
	billingToState: string | undefined,
	shippingToState: string | undefined,
	indiaGst: boolean,
): AdditionalChargeRow["gst"] => {
	if (!indiaGst || !taxPct || taxPct <= 0 || !netAmount) {
		return { igstAmount: 0, igstPercent: 0, cgstAmount: 0, cgstPercent: 0, sgstAmount: 0, sgstPercent: 0, gstTotal: 0 };
	}

	const taxAmount = (netAmount * taxPct) / 100;

	if (billingToState && shippingToState && billingToState === shippingToState) {
		const halfTax = Number((taxAmount / 2).toFixed(2));
		const halfPct = Number((taxPct / 2).toFixed(2));
		return {
			igstAmount: 0,
			igstPercent: 0,
			cgstAmount: halfTax,
			cgstPercent: halfPct,
			sgstAmount: halfTax,
			sgstPercent: halfPct,
			gstTotal: Number(taxAmount.toFixed(2)),
		};
	}

	return {
		igstAmount: Number(taxAmount.toFixed(2)),
		igstPercent: taxPct,
		cgstAmount: 0,
		cgstPercent: 0,
		sgstAmount: 0,
		sgstPercent: 0,
		gstTotal: Number(taxAmount.toFixed(2)),
	};
};

export const AdditionalChargesSection: React.FC<Props> = ({
	charges,
	chargeOptions,
	onChange,
	disabled = false,
	billingToState,
	shippingToState,
	indiaGst = false,
}) => {
	const handleAdd = () => {
		onChange([
			...charges,
			{
				id: genId(),
				additionalChargesId: "",
				chargeName: "",
				qty: "1",
				rate: "",
				netAmount: "",
				remarks: "",
				taxPct: "",
			},
		]);
	};

	const handleRemove = (id: string) => {
		onChange(charges.filter((c) => c.id !== id));
	};

	const recalcGst = (row: AdditionalChargeRow): AdditionalChargeRow => {
		const netAmt = parseFloat(row.netAmount) || 0;
		const pct = parseFloat(row.taxPct) || 0;
		return { ...row, gst: calculateChargeGst(netAmt, pct, billingToState, shippingToState, indiaGst) };
	};

	const handleFieldChange = (id: string, field: keyof AdditionalChargeRow, value: string) => {
		onChange(
			charges.map((c) => {
				if (c.id !== id) return c;
				let updated = { ...c, [field]: value };

				// Auto-select charge name + default tax % when charge type changes
				if (field === "additionalChargesId") {
					const opt = chargeOptions.find((o) => o.value === value);
					updated.chargeName = opt?.label ?? "";
					if (opt?.defaultValue != null) {
						updated.taxPct = String(opt.defaultValue);
					}
				}

				// Auto-calculate net amount
				if (field === "qty" || field === "rate") {
					const qty = parseFloat(field === "qty" ? value : updated.qty) || 0;
					const rate = parseFloat(field === "rate" ? value : updated.rate) || 0;
					updated.netAmount = (qty * rate).toFixed(2);
				}

				// Recalculate GST when amount or tax % changes
				if (field === "qty" || field === "rate" || field === "taxPct" || field === "additionalChargesId") {
					updated = recalcGst(updated);
				}

				return updated;
			}),
		);
	};

	// Recalculate GST for all charges when billing/shipping state changes
	const prevBillingRef = React.useRef(billingToState);
	const prevShippingRef = React.useRef(shippingToState);
	React.useEffect(() => {
		if (prevBillingRef.current === billingToState && prevShippingRef.current === shippingToState) return;
		prevBillingRef.current = billingToState;
		prevShippingRef.current = shippingToState;
		if (charges.length === 0) return;
		onChange(charges.map((c) => recalcGst(c)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [billingToState, shippingToState]);

	const total = charges.reduce((sum, c) => sum + (parseFloat(c.netAmount) || 0), 0);
	const totalTax = charges.reduce((sum, c) => sum + (c.gst?.gstTotal ?? 0), 0);

	const chargeSelectOptions = React.useMemo(
		() => chargeOptions.map((opt) => ({ value: opt.value, label: opt.label })),
		[chargeOptions],
	);

	const showTax = indiaGst;

	// Grid columns: Charge Type, Qty, Rate, Amount, Tax%, Tax Amt, Remarks, [Remove]
	const gridCols = showTax
		? disabled
			? "2fr 0.7fr 1fr 1fr 0.7fr 1fr 1.5fr"
			: "2fr 0.7fr 1fr 1fr 0.7fr 1fr 1.5fr 36px"
		: disabled
			? "2fr 0.8fr 1fr 1fr 1.5fr"
			: "2fr 0.8fr 1fr 1fr 1.5fr 36px";

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<div className="flex items-center justify-between mb-2">
				<Typography variant="subtitle2">Additional Charges</Typography>
				{!disabled && (
					<Button type="button" variant="outline" size="sm" onClick={handleAdd}>
						+ Add Charge
					</Button>
				)}
			</div>

			{charges.length > 0 && (
				<>
					{/* Header row */}
					<div
						className="grid gap-2 text-xs font-medium text-muted-foreground pb-1 border-b"
						style={{ gridTemplateColumns: gridCols }}
					>
						<span>Charge Type</span>
						<span className="text-right">Qty</span>
						<span className="text-right">Rate</span>
						<span className="text-right">Amount</span>
						{showTax && <span className="text-right">Tax %</span>}
						{showTax && <span className="text-right">Tax Amt</span>}
						<span>Remarks</span>
						{!disabled && <span />}
					</div>

					{/* Rows */}
					{charges.map((row) => (
						<div
							key={row.id}
							className="grid gap-2 items-center py-1 border-b border-border/50"
							style={{ gridTemplateColumns: gridCols }}
						>
							<div>
								{disabled ? (
									<span className="block truncate text-sm">{row.chargeName || "-"}</span>
								) : (
									<SearchableSelect<{ value: string; label: string }>
										options={chargeSelectOptions}
										value={chargeSelectOptions.find((o) => o.value === row.additionalChargesId) ?? null}
										onChange={(next) =>
											handleFieldChange(row.id, "additionalChargesId", next?.value ?? "")
										}
										getOptionLabel={(o) => o.label}
										isOptionEqualToValue={(a, b) => a.value === b.value}
										placeholder="Select charge"
									/>
								)}
							</div>
							<div>
								{disabled ? (
									<span className="block text-sm text-right">{row.qty || "1"}</span>
								) : (
									<Input
										type="text"
										value={row.qty}
										onChange={(e) => handleFieldChange(row.id, "qty", e.target.value)}
										placeholder="1"
										className="h-8 text-sm text-right"
									/>
								)}
							</div>
							<div>
								{disabled ? (
									<span className="block text-sm text-right">{row.rate || "-"}</span>
								) : (
									<Input
										type="text"
										value={row.rate}
										onChange={(e) => handleFieldChange(row.id, "rate", e.target.value)}
										placeholder="0.00"
										className="h-8 text-sm text-right"
									/>
								)}
							</div>
							<div>
								<span className="block text-sm text-right font-medium">
									{row.netAmount || "0.00"}
								</span>
							</div>
							{showTax && (
								<div>
									{disabled ? (
										<span className="block text-sm text-right">{row.taxPct || "0"}</span>
									) : (
										<Input
											type="text"
											value={row.taxPct}
											onChange={(e) => handleFieldChange(row.id, "taxPct", e.target.value)}
											placeholder="0"
											className="h-8 text-sm text-right"
										/>
									)}
								</div>
							)}
							{showTax && (
								<div>
									<span className="block text-sm text-right font-medium">
										{(row.gst?.gstTotal ?? 0).toFixed(2)}
									</span>
								</div>
							)}
							<div>
								{disabled ? (
									<span className="block truncate text-sm">{row.remarks || "-"}</span>
								) : (
									<Input
										type="text"
										value={row.remarks}
										onChange={(e) => handleFieldChange(row.id, "remarks", e.target.value)}
										placeholder="Remarks"
										className="h-8 text-sm"
									/>
								)}
							</div>
							{!disabled && (
								<div className="flex justify-center">
									<Tooltip title="Remove">
										<IconButton
											size="small"
											color="error"
											onClick={() => handleRemove(row.id)}
											sx={{ p: 0.5 }}
										>
											<span className="text-sm font-bold leading-none">&times;</span>
										</IconButton>
									</Tooltip>
								</div>
							)}
						</div>
					))}

					{/* Footer total */}
					<div
						className="grid gap-2 pt-2"
						style={{ gridTemplateColumns: gridCols }}
					>
						<div className={showTax ? "col-span-3 text-right" : "col-span-3 text-right"}>
							<Typography variant="body2" fontWeight={600}>Total Additional Charges</Typography>
						</div>
						<div className="text-right">
							<Typography variant="body2" fontWeight={600}>{total.toFixed(2)}</Typography>
						</div>
						{showTax && <div />}
						{showTax && (
							<div className="text-right">
								<Typography variant="body2" fontWeight={600}>{totalTax.toFixed(2)}</Typography>
							</div>
						)}
						<div />
						{!disabled && <div />}
					</div>
				</>
			)}

			{charges.length === 0 && (
				<Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
					No additional charges added.
				</Typography>
			)}
		</Paper>
	);
};

export default AdditionalChargesSection;
