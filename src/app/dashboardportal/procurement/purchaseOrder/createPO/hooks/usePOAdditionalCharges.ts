"use client";

import * as React from "react";
import type {
	POAdditionalCharge,
	POAdditionalChargeRaw,
	AdditionalChargesTotals,
} from "../types/poTypes";
import { MuiFormMode } from "@/components/ui/muiform";

type UsePOAdditionalChargesParams = {
	mode: MuiFormMode;
	/** Supplier state for tax type determination */
	supplierBranchState?: string;
	/** Shipping state for tax type determination */
	shippingState?: string;
	/** Whether India GST is enabled */
	indiaGst?: boolean;
};

type UsePOAdditionalChargesReturn = {
	charges: POAdditionalCharge[];
	setCharges: React.Dispatch<React.SetStateAction<POAdditionalCharge[]>>;
	addCharge: () => void;
	removeCharge: (id: string) => void;
	updateCharge: (id: string, field: keyof POAdditionalCharge, value: unknown) => void;
	replaceCharges: (charges: POAdditionalCharge[]) => void;
	getChargesToSave: () => POAdditionalCharge[];
	mapRawToCharges: (raw: POAdditionalChargeRaw[]) => POAdditionalCharge[];
	hasValidCharges: boolean;
	totalChargesAmount: number;
	/** Detailed totals breakdown for additional charges */
	chargesTotals: AdditionalChargesTotals;
};

/**
 * Generate unique ID for new charges.
 */
let chargeIdSeed = 0;
export const generateChargeId = (): string => {
	chargeIdSeed += 1;
	return `po-addl-charge-${chargeIdSeed}`;
};

/**
 * Create a blank additional charge.
 */
export const createBlankCharge = (): POAdditionalCharge => ({
	id: generateChargeId(),
	po_additional_id: null,
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
 * Hook for managing additional charges state in PO.
 */
export const usePOAdditionalCharges = ({
	mode,
	supplierBranchState,
	shippingState,
	indiaGst = false,
}: UsePOAdditionalChargesParams): UsePOAdditionalChargesReturn => {
	const [charges, setCharges] = React.useState<POAdditionalCharge[]>([]);

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
		(id: string, field: keyof POAdditionalCharge, value: unknown) => {
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
							supplierBranchState,
							shippingState,
							indiaGst,
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
		[mode, supplierBranchState, shippingState, indiaGst]
	);

	/**
	 * Replace all charges (used when loading from API).
	 */
	const replaceCharges = React.useCallback((newCharges: POAdditionalCharge[]) => {
		setCharges(newCharges);
	}, []);

	/**
	 * Map raw API response to POAdditionalCharge objects.
	 */
	const mapRawToCharges = React.useCallback((raw: POAdditionalChargeRaw[]): POAdditionalCharge[] => {
		return raw.map((r) => ({
			id: generateChargeId(),
			po_additional_id: r.po_additional_id ?? (r.id ? Number(r.id) : null),
			additional_charges_id: r.additional_charges_id ?? (r.additionalChargesId ? Number(r.additionalChargesId) : 0),
			additional_charges_name: r.additional_charges_name || r.additionalChargesName || "",
			qty: r.qty || 1,
			rate: r.rate || 0,
			net_amount: r.net_amount ?? r.netAmount ?? 0,
			remarks: r.remarks || "",
			apply_tax: r.apply_tax ?? false,
			tax_pct: r.tax_pct || 0,
			igst_amount: r.igst_amount ?? r.igst ?? 0,
			sgst_amount: r.sgst_amount ?? r.sgst ?? 0,
			cgst_amount: r.cgst_amount ?? r.cgst ?? 0,
			tax_amount: r.tax_amount || 0,
		}));
	}, []);

	/**
	 * Get charges in the format needed for saving.
	 * Filters out incomplete charges.
	 */
	const getChargesToSave = React.useCallback((): POAdditionalCharge[] => {
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

	// Recalculate taxes when state info changes
	React.useEffect(() => {
		if (mode === "view") return;
		setCharges((prev) =>
			prev.map((charge) => {
				if (charge.tax_pct <= 0) return charge;
				const tax = calculateChargeTax(
					charge.net_amount,
					charge.tax_pct,
					supplierBranchState,
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
	}, [supplierBranchState, shippingState, indiaGst, mode]);

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
