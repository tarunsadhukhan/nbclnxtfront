import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

type IndentHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: FormRef;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Renders the header-level form controls for the Indent transaction.
 */
export function IndentHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
}: IndentHeaderFormProps) {
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
					Tip: Keep quantities greater than zero and fill in the UOM so downstream approval can proceed without delays.
				</p>
			)}
		</div>
	);
}

export default IndentHeaderForm;
