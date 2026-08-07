"use client";

import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type MuiFormHandle = { submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void };

type IssueHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: React.RefObject<MuiFormHandle | null>;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * @component IssueHeaderForm
 * @description Renders the header form for Issue transactions.
 * Uses MuiForm for schema-driven rendering.
 */
export const IssueHeaderForm: React.FC<IssueHeaderFormProps> = ({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
}) => {
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
					Tip: Ensure all required fields are filled and quantities are correct before saving.
				</p>
			)}
		</div>
	);
};

export default IssueHeaderForm;
