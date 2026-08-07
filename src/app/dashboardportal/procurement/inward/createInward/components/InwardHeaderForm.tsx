"use client";

import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type InwardHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: React.RefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
	onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
	showPOButton?: boolean;
	onPOSelect?: () => void;
	poButtonDisabled?: boolean;
	poRequired?: boolean;
};

export const InwardHeaderForm: React.FC<InwardHeaderFormProps> = ({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
	showPOButton = false,
	onPOSelect,
	poButtonDisabled = false,
	poRequired = false,
}) => {
	return (
		<div className="space-y-4">
			<MuiForm
				key={formKey}
				schema={schema}
				initialValues={initialValues}
				mode={mode}
				ref={formRef}
				onSubmit={onSubmit}
				onValuesChange={onValuesChange}
				hideModeToggle
				hideSubmit
			/>
			{showPOButton && onPOSelect && (
				<div className="flex items-center justify-end gap-3">
					{poRequired ? (
						<span className="text-xs text-muted-foreground">
							PO-required mode: items can only be added from an existing PO.
						</span>
					) : null}
					<Button
						type="button"
						variant="outline"
						onClick={onPOSelect}
						disabled={poButtonDisabled}
						title={
							poButtonDisabled
								? "Select supplier first to add items from PO"
								: undefined
						}
					>
						<FileText className="mr-2 h-4 w-4" />
						Select from PO
					</Button>
				</div>
			)}
		</div>
	);
};
