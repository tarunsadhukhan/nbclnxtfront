/**
 * @file useGateEntryFormState.ts
 * @description Hook for managing gate entry form state.
 */

import * as React from "react";
import type { MuiFormMode, GateEntryFormValues } from "../types/MaterialInspectionTypes";
import { buildDefaultFormValues } from "../utils/MaterialInspectionFactories";

type UseGateEntryFormStateParams = {
	mode: MuiFormMode;
};

export function useGateEntryFormState({ mode }: UseGateEntryFormStateParams) {
	const [initialValues, setInitialValues] = React.useState<GateEntryFormValues>(buildDefaultFormValues);
	const [formValues, setFormValues] = React.useState<GateEntryFormValues>(buildDefaultFormValues);
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const createDefaultsSeededRef = React.useRef(false);

	const bumpFormKey = React.useCallback(() => setFormKey((prev) => prev + 1), []);

	// Seed defaults in create mode
	React.useEffect(() => {
		if (mode !== "create") {
			createDefaultsSeededRef.current = false;
			return;
		}
		if (!createDefaultsSeededRef.current) {
			const base = buildDefaultFormValues();
			setInitialValues(base);
			setFormValues(base);
			setFormKey((prev) => prev + 1);
			createDefaultsSeededRef.current = true;
		}
	}, [mode]);

	return {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
	};
}
