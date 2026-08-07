import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type FormRef = React.MutableRefObject<{
	submit: () => Promise<void>;
	isDirty: () => boolean;
	setValue: (name: string, value: unknown) => void;
} | null>;

type EnquiryHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: FormRef;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Renders the header-level form controls for the Price Enquiry transaction.
 * Fields: Branch, Enquiry Date, Expense Type, Project, Remarks.
 */
export function EnquiryHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
}: EnquiryHeaderFormProps) {
	return (
		<div className="space-y-6">
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

			{mode !== "view" && (
				<p className="text-xs text-slate-500">
					Select a branch and fill in the header fields before adding indent items and suppliers.
				</p>
			)}
		</div>
	);
}

export default EnquiryHeaderForm;
