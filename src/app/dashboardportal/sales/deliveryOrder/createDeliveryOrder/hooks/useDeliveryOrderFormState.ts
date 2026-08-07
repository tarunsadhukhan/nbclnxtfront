import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";

type Params = {
	mode: MuiFormMode;
	buildDefaultFormValues: () => Record<string, unknown>;
	branchIdFromUrl?: string;
};

export function useDeliveryOrderFormState({ mode, buildDefaultFormValues, branchIdFromUrl }: Params) {
	const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues();
		if (mode !== "create" && branchIdFromUrl) base.branch = branchIdFromUrl;
		return base;
	});
	const [formValues, setFormValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues();
		if (mode !== "create" && branchIdFromUrl) base.branch = branchIdFromUrl;
		return base;
	});
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const createDefaultsSeededRef = React.useRef(false);

	const bumpFormKey = React.useCallback(() => setFormKey((prev) => prev + 1), []);

	const branchSyncedRef = React.useRef(false);
	React.useEffect(() => {
		if (mode === "create" || !branchIdFromUrl || branchSyncedRef.current) return;
		branchSyncedRef.current = true;
		setFormValues((prev) => (prev.branch === branchIdFromUrl ? prev : { ...prev, branch: branchIdFromUrl }));
		setInitialValues((prev) => (prev.branch === branchIdFromUrl ? prev : { ...prev, branch: branchIdFromUrl }));
		bumpFormKey();
	}, [mode, branchIdFromUrl, bumpFormKey]);

	React.useEffect(() => {
		if (mode !== "create") {
			createDefaultsSeededRef.current = false;
			return;
		}
		if (!createDefaultsSeededRef.current) {
			const base = buildDefaultFormValues();
			setInitialValues(base);
			setFormValues(base);
			bumpFormKey();
			createDefaultsSeededRef.current = true;
		}
	}, [mode, buildDefaultFormValues, bumpFormKey]);

	const handleFooterFormValuesChange = React.useCallback((values: Record<string, unknown>) => {
		setFormValues((prev) => {
			let hasChanges = false;
			for (const key in values) { if (prev[key] !== values[key]) { hasChanges = true; break; } }
			return hasChanges ? { ...prev, ...values } : prev;
		});
	}, []);

	const handleMainFormValuesChange = React.useCallback((values: Record<string, unknown>) => {
		setFormValues((prev) => {
			let hasChanges = false;
			for (const key in values) { if (prev[key] !== values[key]) { hasChanges = true; break; } }
			return hasChanges ? { ...prev, ...values } : prev;
		});
	}, []);

	return {
		initialValues, setInitialValues,
		formValues, setFormValues,
		formKey, bumpFormKey, formRef,
		handleMainFormValuesChange, handleFooterFormValuesChange,
	};
}
