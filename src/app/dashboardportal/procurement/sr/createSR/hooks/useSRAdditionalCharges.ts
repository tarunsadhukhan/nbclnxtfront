"use client";

import * as React from "react";
import type { SRAdditionalCharge, SRAdditionalChargeRaw, SRHeader } from "../types/srTypes";
import { createBlankCharge, generateChargeId } from "../components/SRAdditionalCharges";

type UseSRAdditionalChargesParams = {
	mode: "create" | "edit" | "view";
	header: SRHeader | null;
};

type AdditionalChargesTotals = {
	baseAmount: number;  // Sum of net_amount (before tax)
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	totalTax: number;
	totalAmount: number; // baseAmount + totalTax
};

type UseSRAdditionalChargesReturn = {
	charges: SRAdditionalCharge[];
	setCharges: React.Dispatch<React.SetStateAction<SRAdditionalCharge[]>>;
	addCharge: () => void;
	removeCharge: (id: string) => void;
	updateCharge: (id: string, field: keyof SRAdditionalCharge, value: unknown) => void;
	replaceCharges: (charges: SRAdditionalCharge[]) => void;
	getChargesToSave: () => SRAdditionalCharge[];
	mapRawToCharges: (raw: SRAdditionalChargeRaw[]) => SRAdditionalCharge[];
	hasValidCharges: boolean;
	totalChargesAmount: number;
	/** Detailed totals breakdown for additional charges */
	chargesTotals: AdditionalChargesTotals;
};

/**
 * Calculate tax split based on supplier/shipping state comparison.
 * Same logic as line items: if same state → CGST+SGST split, else IGST.
 */
const calculateChargeTax = (
	netAmount: number,
	taxPct: number,
	supplierState: string | undefined,
	shippingState: string | undefined,
	indiaGst: boolean,
): { igst: number; cgst: number; sgst: number; total: number } => {
	if (!indiaGst || !taxPct || taxPct <= 0) {
		return { igst: 0, cgst: 0, sgst: 0, total: 0 };
	}

	const taxAmount = (netAmount * taxPct) / 100;

	// If same state, split into CGST + SGST; otherwise IGST
	if (supplierState && shippingState && supplierState === shippingState) {
		const halfTax = taxAmount / 2;
		return {
			igst: 0,
			cgst: Number(halfTax.toFixed(2)),
			sgst: Number(halfTax.toFixed(2)),
			total: Number(taxAmount.toFixed(2)),
		};
	}

	return {
		igst: Number(taxAmount.toFixed(2)),
		cgst: 0,
		sgst: 0,
		total: Number(taxAmount.toFixed(2)),
	};
};

/**
 * Hook for managing additional charges state in SR.
 */
export const useSRAdditionalCharges = ({ mode, header }: UseSRAdditionalChargesParams): UseSRAdditionalChargesReturn => {
	const [charges, setCharges] = React.useState<SRAdditionalCharge[]>([]);

	/**
	 * Add a new blank charge.
	 */
	const addCharge = React.useCallback(() => {
		if (mode === "view") return;
		setCharges((prev) => [...prev, createBlankCharge()]);
	}, [mode]);

	/**
	 * Remove a charge by ID.
	 */
	const removeCharge = React.useCallback(
		(id: string) => {
			if (mode === "view") return;
			setCharges((prev) => prev.filter((c) => c.id !== id));
		},
		[mode]
	);

	/**
	 * Update a single field of a charge.
	 */
	const updateCharge = React.useCallback(
		(id: string, field: keyof SRAdditionalCharge, value: unknown) => {
			if (mode === "view") return;
			setCharges((prev) =>
				prev.map((charge) => {
					if (charge.id !== id) return charge;
					const updated = { ...charge, [field]: value };

					// Recalculate amounts when relevant fields change
					if (field === "qty" || field === "rate") {
						updated.net_amount = (updated.qty || 1) * (updated.rate || 0);
					}

					// Recalculate tax when tax_pct, qty, rate, or net_amount changes
					if (field === "tax_pct" || field === "qty" || field === "rate") {
						const tax = calculateChargeTax(
							updated.net_amount,
							updated.tax_pct,
							header?.supplier_state_name,
							header?.shipping_state_name || header?.billing_state_name,
							header?.india_gst || false,
						);
						updated.igst_amount = tax.igst;
						updated.cgst_amount = tax.cgst;
						updated.sgst_amount = tax.sgst;
						updated.tax_amount = tax.total;
						// apply_tax is derived from tax_pct > 0
						updated.apply_tax = updated.tax_pct > 0;
					}

					return updated;
				})
			);
		},
		[mode, header]
	);

	/**
	 * Replace all charges (used when loading from API).
	 */
	const replaceCharges = React.useCallback((newCharges: SRAdditionalCharge[]) => {
		setCharges(newCharges);
	}, []);

	/**
	 * Map raw API response to SRAdditionalCharge objects.
	 */
	const mapRawToCharges = React.useCallback((raw: SRAdditionalChargeRaw[]): SRAdditionalCharge[] => {
		return raw.map((r) => ({
			id: generateChargeId(),
			inward_additional_id: r.proc_inward_additional_id ?? r.inward_additional_id ?? null,
			additional_charges_id: r.additional_charges_id ?? 0,
			additional_charges_name: r.additional_charges_name || "",
			qty: r.qty || 1,
			rate: r.rate || 0,
			net_amount: r.net_amount || 0,
			remarks: r.remarks || "",
			apply_tax: r.apply_tax ?? (r.tax_pct ? r.tax_pct > 0 : false),
			tax_pct: r.tax_pct ?? r.default_tax_pct ?? 0,
			igst_amount: r.igst_amount || 0,
			sgst_amount: r.sgst_amount || 0,
			cgst_amount: r.cgst_amount || 0,
			tax_amount: r.tax_amount || 0,
		}));
	}, []);

	/**
	 * Get charges in the format needed for saving.
	 * Filters out incomplete charges.
	 */
	const getChargesToSave = React.useCallback((): SRAdditionalCharge[] => {
		return charges.filter((c) => c.additional_charges_id > 0 && c.net_amount > 0);
	}, [charges]);

	/**
	 * Check if there are any valid charges to save.
	 */
	const hasValidCharges = React.useMemo(() => {
		return charges.some((c) => c.additional_charges_id > 0 && c.net_amount > 0);
	}, [charges]);

	/**
	 * Calculate total amount of all charges (including tax).
	 */
	const totalChargesAmount = React.useMemo(() => {
		return charges.reduce((sum, c) => sum + (c.net_amount || 0) + (c.tax_amount || 0), 0);
	}, [charges]);

	/**
	 * Detailed totals breakdown for additional charges.
	 */
	const chargesTotals = React.useMemo<AdditionalChargesTotals>(() => {
		return charges.reduce(
			(acc, c) => ({
				baseAmount: acc.baseAmount + (c.net_amount || 0),
				totalIGST: acc.totalIGST + (c.igst_amount || 0),
				totalCGST: acc.totalCGST + (c.cgst_amount || 0),
				totalSGST: acc.totalSGST + (c.sgst_amount || 0),
				totalTax: acc.totalTax + (c.tax_amount || 0),
				totalAmount: acc.totalAmount + (c.net_amount || 0) + (c.tax_amount || 0),
			}),
			{ baseAmount: 0, totalIGST: 0, totalCGST: 0, totalSGST: 0, totalTax: 0, totalAmount: 0 }
		);
	}, [charges]);

	// Recalculate taxes on all charges when state info changes.
	// Mirrors PO's usePOAdditionalCharges state-change effect.
	React.useEffect(() => {
		if (mode === "view") return;
		const supplierState = header?.supplier_state_name;
		const shippingState = header?.shipping_state_name || header?.billing_state_name;
		const indiaGst = header?.india_gst || false;

		setCharges((prev) =>
			prev.map((charge) => {
				if (charge.tax_pct <= 0) return charge;
				const tax = calculateChargeTax(
					charge.net_amount,
					charge.tax_pct,
					supplierState,
					shippingState,
					indiaGst,
				);
				return {
					...charge,
					igst_amount: tax.igst,
					cgst_amount: tax.cgst,
					sgst_amount: tax.sgst,
					tax_amount: tax.total,
				};
			})
		);
	}, [header?.supplier_state_name, header?.shipping_state_name, header?.billing_state_name, header?.india_gst, mode]);

	return {
		charges,
		setCharges,
		addCharge,
		removeCharge,
		updateCharge,
		replaceCharges,
		getChargesToSave,
		mapRawToCharges,
		hasValidCharges,
		totalChargesAmount,
		chargesTotals,
	};
};
