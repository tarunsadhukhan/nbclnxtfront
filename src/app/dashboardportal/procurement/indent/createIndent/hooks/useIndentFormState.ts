import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { buildDefaultFormValues } from "../utils/indentFactories";

type UseIndentFormStateParams = {
	mode: MuiFormMode;
};

type UseIndentFormStateReturn = {
	initialValues: Record<string, unknown>;
	setInitialValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	formValues: Record<string, unknown>;
	setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	formKey: number;
	bumpFormKey: () => void;
	formRef: React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
};

/**
 * Encapsulates all form state management logic for the Indent page:
 * - Maintains initial and current form values
 * - Seeds default values in create mode
 * - Exposes a `formKey` used to force remounting of the MuiForm instances
 */
export function useIndentFormState({ mode }: UseIndentFormStateParams): UseIndentFormStateReturn {
	const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(buildDefaultFormValues);
	const [formValues, setFormValues] = React.useState<Record<string, unknown>>(buildDefaultFormValues);
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const createDefaultsSeededRef = React.useRef(false);

	const bumpFormKey = React.useCallback(() => {
		setFormKey((prev) => prev + 1);
	}, []);

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
