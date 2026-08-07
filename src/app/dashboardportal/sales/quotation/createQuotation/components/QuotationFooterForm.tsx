import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type QuotationFooterFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Footer form housing notes and terms fields rendered after line items.
 */
export function QuotationFooterForm({ schema, formKey, initialValues, mode, onSubmit, onValuesChange }: QuotationFooterFormProps) {
	return (
		<MuiForm
			key={`${formKey}-footer`}
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

export default QuotationFooterForm;
