import React from "react";
import type { EnquirySetupData } from "../types/enquiryTypes";

/** Standardised option shape used by MuiForm select fields. */
type Option = {
	label: string;
	value: string;
};

type UseEnquirySelectOptionsParams = {
	setupData: EnquirySetupData | null;
};

/**
 * Normalises frequently used select options for the Enquiry form so memoised
 * arrays live outside the page component.  Also provides label resolvers for
 * use in previews and read-only displays.
 */
export const useEnquirySelectOptions = ({ setupData }: UseEnquirySelectOptionsParams) => {
	const supplierOptions = React.useMemo<Option[]>(() => {
		if (!setupData?.suppliers?.length) return [];
		return setupData.suppliers
			.map((s) => ({
				label: s.supp_name || s.supp_code || String(s.party_id),
				value: String(s.party_id),
			}))
			.filter((opt) => opt.value);
	}, [setupData?.suppliers]);

	const expenseOptions = React.useMemo<Option[]>(() => {
		if (!setupData?.expense_types?.length) return [];
		return setupData.expense_types.map((e) => ({
			label: e.expense_type_name || String(e.expense_type_id),
			value: String(e.expense_type_id),
		}));
	}, [setupData?.expense_types]);

	const projectOptions = React.useMemo<Option[]>(() => {
		if (!setupData?.projects?.length) return [];
		return setupData.projects.map((p) => ({
			label: p.prj_name || String(p.project_id),
			value: String(p.project_id),
		}));
	}, [setupData?.projects]);

	/** Generic option label getter. */
	const getOptionLabel = React.useCallback(
		(options: ReadonlyArray<{ label: string; value: string }>, value?: unknown): string | undefined => {
			if (value === null || typeof value === "undefined" || value === "") return undefined;
			const target = String(value);
			return options.find((opt) => opt.value === target)?.label;
		},
		[],
	);

	/** Resolve supplier name by ID. */
	const getSupplierLabel = React.useCallback(
		(supplierId: unknown) => getOptionLabel(supplierOptions, supplierId),
		[supplierOptions, getOptionLabel],
	);

	/** Resolve expense type name by ID. */
	const getExpenseLabel = React.useCallback(
		(expenseTypeId: unknown) => getOptionLabel(expenseOptions, expenseTypeId),
		[expenseOptions, getOptionLabel],
	);

	/** Resolve project name by ID. */
	const getProjectLabel = React.useCallback(
		(projectId: unknown) => getOptionLabel(projectOptions, projectId),
		[projectOptions, getOptionLabel],
	);

	return {
		supplierOptions,
		expenseOptions,
		projectOptions,
		getOptionLabel,
		getSupplierLabel,
		getExpenseLabel,
		getProjectLabel,
	};
};

export default useEnquirySelectOptions;
