import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";

type UsePOFormStateParams = {
	mode: MuiFormMode;
	buildDefaultFormValues: () => Record<string, unknown>;
	/** Branch ID from URL, used to prefill in edit/view mode */
	branchIdFromUrl?: string;
};

type UsePOFormStateReturn = {
	initialValues: Record<string, unknown>;
	setInitialValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	formValues: Record<string, unknown>;
	setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	formKey: number;
	bumpFormKey: () => void;
	formRef: React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
	handleMainFormValuesChange: (values: Record<string, unknown>) => void;
	handleFooterFormValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Encapsulates all form state management logic for the PO page:
 * - Maintains initial and current form values
 * - Provides memoized change handlers for both forms
 * - Seeds default values in create mode and ensures at least one line item exists
 * - Exposes a `formKey` used to force remounting of the MuiForm instances
 */
export function usePOFormState({
	mode,
	buildDefaultFormValues,
	branchIdFromUrl,
}: UsePOFormStateParams): UsePOFormStateReturn {
	const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues();
		if (mode !== "create" && branchIdFromUrl) {
			base.branch = branchIdFromUrl;
		}
		return base;
	});
	const [formValues, setFormValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues();
		if (mode !== "create" && branchIdFromUrl) {
			base.branch = branchIdFromUrl;
		}
		return base;
	});
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const createDefaultsSeededRef = React.useRef(false);

	const bumpFormKey = React.useCallback(() => {
		setFormKey((prev) => prev + 1);
	}, []);

	// Sync branch from URL when it becomes available (handles SSR -> hydration transition)
	const branchSyncedRef = React.useRef(false);
	React.useEffect(() => {
		console.log('[usePOFormState] sync effect running', {
			mode,
			branchIdFromUrl,
			branchSynced: branchSyncedRef.current,
		});

		if (mode === "create") {
			console.log('[usePOFormState] skipping - create mode');
			return;
		}
		if (!branchIdFromUrl) {
			console.log('[usePOFormState] skipping - no branchIdFromUrl');
			return;
		}
		if (branchSyncedRef.current) {
			console.log('[usePOFormState] skipping - already synced');
			return;
		}

		// Mark as synced BEFORE updating to prevent re-runs
		branchSyncedRef.current = true;
		console.log('[usePOFormState] syncing branch to:', branchIdFromUrl);
		
		// Update form values
		setFormValues((prev) => {
			if (prev.branch === branchIdFromUrl) {
				console.log('[usePOFormState] formValues.branch already matches:', prev.branch);
				return prev;
			}
			console.log('[usePOFormState] updating formValues.branch:', prev.branch, '->', branchIdFromUrl);
			return { ...prev, branch: branchIdFromUrl };
		});
		
		// Update initial values
		setInitialValues((prev) => {
			if (prev.branch === branchIdFromUrl) {
				console.log('[usePOFormState] initialValues.branch already matches');
				return prev;
			}
			console.log('[usePOFormState] updating initialValues.branch');
			return { ...prev, branch: branchIdFromUrl };
		});
		
		// Always bump form key when syncing to force MuiForm to reinitialize
		// This is critical for the Autocomplete to pick up the new value
		console.log('[usePOFormState] bumping formKey to force remount');
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
			for (const key in values) {
				if (prev[key] !== values[key]) {
					hasChanges = true;
					break;
				}
			}
			if (!hasChanges) {
				return prev;
			}
			return { ...prev, ...values };
		});
	}, []);

	const handleMainFormValuesChange = React.useCallback((values: Record<string, unknown>) => {
		setFormValues((prev) => {
			let hasChanges = false;
			for (const key in values) {
				if (prev[key] !== values[key]) {
					hasChanges = true;
					break;
				}
			}
			if (!hasChanges) {
				return prev;
			}
			return { ...prev, ...values };
		});
	}, []);

	return {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
		handleMainFormValuesChange,
		handleFooterFormValuesChange,
	};
}
