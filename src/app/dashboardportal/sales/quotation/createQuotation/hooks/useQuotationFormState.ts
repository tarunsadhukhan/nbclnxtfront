import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { buildDefaultFormValues } from "../utils/quotationFactories";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

type UseQuotationFormStateParams = {
	mode: MuiFormMode;
	requestedId: string;
	branchIdFromUrl?: string;
};

/**
 * Manages form values, key, and ref for the quotation header/footer forms.
 */
export const useQuotationFormState = ({ mode, requestedId, branchIdFromUrl }: UseQuotationFormStateParams) => {
	const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(() => buildDefaultFormValues());
	const [formValues, setFormValues] = React.useState<Record<string, unknown>>(() => buildDefaultFormValues());
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null) as FormRef;

	const handleMainFormValuesChange = React.useCallback((incoming: Record<string, unknown>) => {
		setFormValues((prev) => {
			const next = { ...prev, ...incoming };
			const changed = Object.keys(incoming).some((key) => prev[key] !== incoming[key]);
			return changed ? next : prev;
		});
	}, []);

	const handleFooterFormValuesChange = React.useCallback((incoming: Record<string, unknown>) => {
		setFormValues((prev) => {
			const next = { ...prev, ...incoming };
			const changed = Object.keys(incoming).some((key) => prev[key] !== incoming[key]);
			return changed ? next : prev;
		});
	}, []);

	// Sync branch from URL for edit/view mode
	React.useEffect(() => {
		if ((mode === "edit" || mode === "view") && branchIdFromUrl && formValues.branch !== branchIdFromUrl) {
			setFormValues((prev) => ({ ...prev, branch: branchIdFromUrl }));
		}
	}, [mode, branchIdFromUrl, formValues.branch]);

	// Seed default values for create mode
	React.useEffect(() => {
		if (mode === "create" && !requestedId) {
			const defaults = buildDefaultFormValues();
			setInitialValues(defaults);
			setFormValues(defaults);
			setFormKey((k) => k + 1);
		}
	}, [mode, requestedId]);

	return {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		setFormKey,
		formRef,
		handleMainFormValuesChange,
		handleFooterFormValuesChange,
	};
};
