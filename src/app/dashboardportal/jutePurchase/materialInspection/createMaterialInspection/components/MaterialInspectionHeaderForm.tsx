/**
 * @component GateEntryHeaderForm
 * @description Header form for Jute Gate Entry.
 */

"use client";

import * as React from "react";
import MuiForm from "@/components/ui/muiform";
import type { MuiFormMode, GateEntryFormValues } from "../types/MaterialInspectionTypes";

type GateEntryHeaderFormProps = {
	schema: { fields: unknown[] };
	formKey: number;
	initialValues: GateEntryFormValues;
	mode: MuiFormMode;
	formRef: React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: GateEntryFormValues) => void;
	customValidate?: (value: unknown, values: Record<string, unknown>, fieldName: string) => string | null;
};

export function GateEntryHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
	customValidate,
}: GateEntryHeaderFormProps) {
	const handleValuesChange = React.useCallback(
		(values: Record<string, unknown>) => {
			onValuesChange(values as unknown as GateEntryFormValues);
		},
		[onValuesChange]
	);

	// Add custom validation to schema fields
	const schemaWithValidation = React.useMemo(() => {
		if (!customValidate) return schema;

		return {
			...schema,
			fields: (schema.fields as Array<Record<string, unknown>>).map((field) => ({
				...field,
				customValidate: (value: unknown, values: Record<string, unknown>) =>
					customValidate(value, values, field.name as string),
			})),
		};
	}, [schema, customValidate]);

	return (
		<MuiForm
			key={formKey}
			schema={schemaWithValidation as Parameters<typeof MuiForm>[0]["schema"]}
			initialValues={initialValues as Record<string, unknown>}
			mode={mode}
			hideModeToggle
			hideSubmit
			ref={formRef}
			onSubmit={onSubmit}
			onValuesChange={handleValuesChange}
		/>
	);
}
