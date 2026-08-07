import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { BranchAddressRecord, SupplierBranchRecord, SupplierRecord } from "../types/poTypes";
import { EMPTY_SUPPLIER_BRANCHES } from "../utils/poConstants";

type UsePOAddressesParams = {
	mode: MuiFormMode;
	suppliers: ReadonlyArray<SupplierRecord>;
	branchAddresses: ReadonlyArray<BranchAddressRecord>;
	formValues: Record<string, unknown>;
	setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	/** Fallback states from PO API response, used when lookup can't resolve */
	fallbackBillingState?: string;
	fallbackShippingState?: string;
	fallbackSupplierBranchState?: string;
};

/**
 * Handles supplier branch lookups, default branch seeding, and derived state labels.
 */
export const usePOAddresses = ({
	mode,
	suppliers,
	branchAddresses,
	formValues,
	setFormValues,
	fallbackBillingState,
	fallbackShippingState,
	fallbackSupplierBranchState,
}: UsePOAddressesParams) => {
	const supplierBranches = React.useMemo<ReadonlyArray<SupplierBranchRecord>>(() => {
		const supplierId = String(formValues.supplier ?? "");
		if (!supplierId) return [];
		const supplier = suppliers.find((s) => s.id === supplierId);
		return supplier?.branches ?? EMPTY_SUPPLIER_BRANCHES;
	}, [formValues.supplier, suppliers]);

	const previousSupplierIdRef = React.useRef<string>("");
	const hasSetDefaultBranchRef = React.useRef<boolean>(false);

	React.useEffect(() => {
		if (mode === "view") return;

		const currentSupplierId = String(formValues.supplier ?? "");
		const supplierChanged = previousSupplierIdRef.current !== currentSupplierId;

		if (!supplierChanged) {
			return;
		}

		previousSupplierIdRef.current = currentSupplierId;
		hasSetDefaultBranchRef.current = false;

		if (!currentSupplierId) {
			setFormValues((prev) => {
				if (prev.supplier_branch) {
					return { ...prev, supplier_branch: "" };
				}
				return prev;
			});
			return;
		}

		if (supplierBranches.length > 0 && !hasSetDefaultBranchRef.current) {
			const defaultBranchId = supplierBranches[0].id;
			setFormValues((prev) => {
				const currentSupplierIdCheck = String(prev.supplier ?? "");
				if (currentSupplierIdCheck !== currentSupplierId) {
					return prev;
				}

				const currentBranchId = String(prev.supplier_branch ?? "");
				const currentBranchValid = supplierBranches.some((b) => b.id === currentBranchId);
				if (!currentBranchId || !currentBranchValid) {
					hasSetDefaultBranchRef.current = true;
					return { ...prev, supplier_branch: defaultBranchId };
				}
				hasSetDefaultBranchRef.current = true;
				return prev;
			});
		} else if (supplierBranches.length === 0) {
			setFormValues((prev) => {
				const currentSupplierIdCheck = String(prev.supplier ?? "");
				if (currentSupplierIdCheck !== currentSupplierId) {
					return prev;
				}
				if (prev.supplier_branch) {
					return { ...prev, supplier_branch: "" };
				}
				return prev;
			});
			hasSetDefaultBranchRef.current = true;
		}
	}, [formValues.supplier, mode, setFormValues, supplierBranches]);

	const billingState = React.useMemo(() => {
		const billingId = String(formValues.billing_address ?? "");
		const address = branchAddresses.find((a) => a.id === billingId);
		return address?.stateName || fallbackBillingState;
	}, [formValues.billing_address, branchAddresses, fallbackBillingState]);

	const shippingState = React.useMemo(() => {
		const shippingId = String(formValues.shipping_address ?? "");
		const address = branchAddresses.find((a) => a.id === shippingId);
		return address?.stateName || fallbackShippingState;
	}, [formValues.shipping_address, branchAddresses, fallbackShippingState]);

	const supplierBranchState = React.useMemo(() => {
		const branchId = String(formValues.supplier_branch ?? "");
		const branch = supplierBranches.find((b) => b.id === branchId);
		return branch?.stateName || fallbackSupplierBranchState;
	}, [formValues.supplier_branch, supplierBranches, fallbackSupplierBranchState]);

	return {
		supplierBranches,
		billingState,
		shippingState,
		supplierBranchState,
	};
};

