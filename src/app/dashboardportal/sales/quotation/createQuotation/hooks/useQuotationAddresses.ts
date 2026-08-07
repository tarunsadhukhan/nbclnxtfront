import React from "react";
import type { BranchAddressRecord, CustomerBranchRecord } from "../types/quotationTypes";

type UseQuotationAddressesParams = {
	/**
	 * Company branch addresses – used to resolve the "shipping from" state
	 * of the selected branch for GST type determination (IGST vs CGST+SGST).
	 */
	branchAddresses: ReadonlyArray<BranchAddressRecord>;
	/**
	 * All customer branch address records – used for the billing and shipping
	 * address dropdowns and to resolve the customer-side state for GST.
	 */
	customerBranches: ReadonlyArray<CustomerBranchRecord>;
	/** Current form values, used to read `billing_address` and `shipping_address`. */
	formValues: Record<string, unknown>;
	/** The company's selected branch ID (numeric string). */
	branchId?: string;
};

/**
 * Derives the billing/shipping states needed for GST type calculation.
 *
 * For Indian GST:
 *  - `billingState`  = the company's selected branch state ("shipping from" / supply origin).
 *  - `shippingState` = the customer's billing address state ("shipping to" / destination).
 *
 * When both states are equal → CGST + SGST (intra-state).
 * When they differ           → IGST (inter-state).
 *
 * Billing and shipping addresses shown in the form are customer branch addresses
 * (party_branch_mst), not company branch addresses.
 */
export const useQuotationAddresses = ({
	branchAddresses,
	customerBranches,
	formValues,
	branchId,
}: UseQuotationAddressesParams) => {
	// Company branch state – the "from" side for GST comparison.
	const billingState = React.useMemo(() => {
		if (!branchId) return undefined;
		return branchAddresses.find((a) => a.id === branchId)?.stateName;
	}, [branchAddresses, branchId]);

	// Customer billing address state – the "to" side for GST comparison.
	const shippingState = React.useMemo(() => {
		const billingAddressId = String(formValues.billing_address ?? "");
		if (!billingAddressId) return undefined;
		return customerBranches.find((b) => b.id === billingAddressId)?.stateName;
	}, [customerBranches, formValues.billing_address]);

	return {
		billingState,
		shippingState,
	};
};
