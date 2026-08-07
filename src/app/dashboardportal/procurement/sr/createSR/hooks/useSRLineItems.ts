import * as React from "react";
import type { SRHeader, SRLineItem } from "../types/srTypes";
import { calculateLineTax, calculateLineAmountWithDiscount } from "../utils/srCalculations";
import { isPercentageDiscountMode, isAmountDiscountMode } from "../utils/srConstants";

type UseSRLineItemsParams = {
	header: SRHeader | null;
};

type UseSRLineItemsReturn = {
	lineItems: SRLineItem[];
	setLineItems: React.Dispatch<React.SetStateAction<SRLineItem[]>>;
	handleLineItemChange: (id: string, field: keyof SRLineItem, value: unknown) => void;
	recalculateLineItem: (item: SRLineItem) => SRLineItem;
	validateLineItems: () => { valid: boolean; missingWarehouseCount: number };
};

/**
 * Manages SR line items state and provides change handlers.
 */
export const useSRLineItems = ({ header }: UseSRLineItemsParams): UseSRLineItemsReturn => {
	const [lineItems, setLineItems] = React.useState<SRLineItem[]>([]);

	/**
	 * Recalculates a single line item's amount, discount, and taxes.
	 */
	const recalculateLineItem = React.useCallback(
		(item: SRLineItem): SRLineItem => {
			const { discountAmount, amount } = calculateLineAmountWithDiscount(
				item.approved_qty,
				item.accepted_rate,
				item.discount_mode,
				item.discount_value,
			);
			const tax = calculateLineTax(
				amount,
				item.tax_percentage,
				header?.supplier_state_name,
				header?.shipping_state_name || header?.billing_state_name,
				header?.india_gst || false,
			);

			return {
				...item,
				discount_amount: discountAmount,
				amount,
				igst_amount: tax.igst,
				cgst_amount: tax.cgst,
				sgst_amount: tax.sgst,
				tax_amount: tax.total,
				total_amount: amount + tax.total,
			};
		},
		[header],
	);

	/**
	 * Handles field change for a line item with auto-recalculation.
	 */
	const handleLineItemChange = React.useCallback(
		(id: string, field: keyof SRLineItem, value: unknown) => {
			setLineItems((prev) =>
				prev.map((item) => {
					if (item.id !== id) return item;

					// Handle discount_mode change: reset discount_value and recalculate
					if (field === "discount_mode") {
						const modeValue = value ? Number(value) : null;
						const updated = {
							...item,
							discount_mode: modeValue,
							discount_value: null, // Reset value when mode changes
						};
						return recalculateLineItem(updated);
					}

					// Handle discount_value change: validate and recalculate
					if (field === "discount_value") {
						const numValue = Number(value) || 0;
						let discountValue = numValue;

						// Validation: % must be < 100, Amount must be < rate
						if (isPercentageDiscountMode(item.discount_mode) && discountValue >= 100) {
							discountValue = 99.99;
						} else if (isAmountDiscountMode(item.discount_mode) && discountValue >= item.accepted_rate && item.accepted_rate > 0) {
							discountValue = item.accepted_rate - 0.01;
						}

						const updated = { ...item, discount_value: discountValue };
						return recalculateLineItem(updated);
					}

					// Handle accepted_rate change: recalculate everything
					if (field === "accepted_rate") {
						const updated = { ...item, accepted_rate: value as number };
						return recalculateLineItem(updated);
					}

					// Handle tax_percentage change: recalculate GST
					if (field === "tax_percentage") {
						const updated = { ...item, tax_percentage: Number(value) || 0 };
						return recalculateLineItem(updated);
					}

					return { ...item, [field]: value };
				}),
			);
		},
		[recalculateLineItem],
	);

	/**
	 * Validates all line items have required fields (warehouse_id is mandatory).
	 */
	const validateLineItems = React.useCallback((): { valid: boolean; missingWarehouseCount: number } => {
		const missingWarehouseCount = lineItems.filter((item) => item.warehouse_id === null || item.warehouse_id === undefined).length;
		return {
			valid: missingWarehouseCount === 0,
			missingWarehouseCount,
		};
	}, [lineItems]);

	// Recalculate GST for all line items when header states change.
	// This mirrors PO's usePOTaxCalculations useEffect.
	React.useEffect(() => {
		if (!header?.india_gst) return;
		const supplierState = header?.supplier_state_name;
		const shippingState = header?.shipping_state_name || header?.billing_state_name;
		if (!supplierState || !shippingState) return;

		setLineItems((prev) =>
			prev.map((item) => {
				const tax = calculateLineTax(
					item.amount || 0,
					item.tax_percentage || 0,
					supplierState,
					shippingState,
					true,
				);

				// Skip update if nothing changed to avoid unnecessary re-renders
				if (
					item.igst_amount === tax.igst &&
					item.cgst_amount === tax.cgst &&
					item.sgst_amount === tax.sgst &&
					item.tax_amount === tax.total
				) {
					return item;
				}

				return {
					...item,
					igst_amount: tax.igst,
					cgst_amount: tax.cgst,
					sgst_amount: tax.sgst,
					tax_amount: tax.total,
					total_amount: (item.amount || 0) + tax.total,
				};
			}),
		);
	}, [header?.supplier_state_name, header?.shipping_state_name, header?.billing_state_name, header?.india_gst]);

	return {
		lineItems,
		setLineItems,
		handleLineItemChange,
		recalculateLineItem,
		validateLineItems,
	};
};
