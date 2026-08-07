import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

type QuotationHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: FormRef;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Renders the header-level form controls (branch/customer/broker details).
 */
export function QuotationHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
}: QuotationHeaderFormProps) {
	return (
		<MuiForm
			key={formKey}
			ref={formRef}
			schema={schema}
			initialValues={initialValues}
			mode={mode}
			hideModeToggle
			hideSubmit
			onSubmit={onSubmit}
			onValuesChange={onValuesChange}
		/>
	);
}

export default QuotationHeaderForm;
