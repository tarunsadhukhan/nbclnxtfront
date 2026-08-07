import React from "react";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { TransporterBranchRecord } from "../types/salesInvoiceTypes";

type Params = {
	mode: MuiFormMode;
	buildDefaultFormValues: (skipDate?: boolean) => Record<string, unknown>;
	branchIdFromUrl?: string;
};

export function useSalesInvoiceFormState({ mode, buildDefaultFormValues, branchIdFromUrl }: Params) {
	// Use skipDate=true for SSR-safe initial state; the useEffect below seeds the real date on mount
	const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues(true);
		if (mode !== "create" && branchIdFromUrl) base.branch = branchIdFromUrl;
		return base;
	});
	const [formValues, setFormValues] = React.useState<Record<string, unknown>>(() => {
		const base = buildDefaultFormValues(true);
		if (mode !== "create" && branchIdFromUrl) base.branch = branchIdFromUrl;
		return base;
	});
	const [formKey, setFormKey] = React.useState(0);
	const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const selectOptionsRef = React.useRef<any>(null);
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

	const handleTransporterChange = React.useCallback(
		async (transporterId: number) => {
			setFormValues((prev) => ({
				...prev,
				transporter: transporterId,
				transporter_branch_id: undefined,
				transporter_gst_no: undefined,
			}));

			const fetchFn = selectOptionsRef?.current?.fetchTransporterBranches;
			if (!fetchFn) return;
			const branches = await fetchFn(transporterId);
			if (branches.length === 1) {
				const only = branches[0];
				setFormValues((prev) => ({
					...prev,
					transporter_branch_id: only.id,
					transporter_gst_no: only.gst_no || undefined,
				}));
			}
		},
		[],
	);

	const handleTransporterBranchChange = React.useCallback(
		(branchId: number, selectedBranch?: TransporterBranchRecord) => {
			setFormValues((prev) => ({
				...prev,
				transporter_branch_id: branchId,
				transporter_gst_no: selectedBranch?.gst_no || undefined,
			}));
		},
		[],
	);

	const handleAutoFillTransporter = React.useCallback(
		(transporterId: number) => {
			handleTransporterChange(transporterId);
		},
		[handleTransporterChange],
	);

	return {
		initialValues, setInitialValues,
		formValues, setFormValues,
		formKey, bumpFormKey, formRef,
		selectOptionsRef,
		handleMainFormValuesChange, handleFooterFormValuesChange,
		handleTransporterChange, handleTransporterBranchChange, handleAutoFillTransporter,
	};
}
