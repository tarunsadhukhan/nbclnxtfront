import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";
import { Button } from "@/components/ui/button";
import { isGovtSkgOrder, isJuteOrder, isJuteYarnOrder } from "../utils/salesOrderConstants";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

type SalesOrderHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: FormRef;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
	showQuotationButton?: boolean;
	onQuotationSelect?: () => void;
	quotationButtonDisabled?: boolean;
	govtskgSchema?: Schema;
	juteSchema?: Schema;
	juteYarnSchema?: Schema;
	invoiceTypeCode?: string;
};

export function SalesOrderHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
	showQuotationButton,
	onQuotationSelect,
	quotationButtonDisabled,
	govtskgSchema,
	juteSchema,
	juteYarnSchema,
	invoiceTypeCode,
}: SalesOrderHeaderFormProps) {
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

			{govtskgSchema && isGovtSkgOrder(invoiceTypeCode) && (
				<div className="space-y-3 pt-4 border-t border-dashed">
					<h3 className="text-sm font-medium text-muted-foreground">Govt Sacking Details</h3>
					<MuiForm
						key={`govtskg-${formKey}`}
						schema={govtskgSchema}
						initialValues={initialValues}
						mode={mode}
						hideModeToggle
						hideSubmit
						onValuesChange={onValuesChange}
					/>
				</div>
			)}

			{juteSchema && isJuteOrder(invoiceTypeCode) && (
				<div className="space-y-3 pt-4 border-t border-dashed">
					<h3 className="text-sm font-medium text-muted-foreground">Jute Details</h3>
					<MuiForm
						key={`jute-${formKey}`}
						schema={juteSchema}
						initialValues={initialValues}
						mode={mode}
						hideModeToggle
						hideSubmit
						onValuesChange={onValuesChange}
					/>
				</div>
			)}

			{juteYarnSchema && isJuteYarnOrder(invoiceTypeCode) && (
				<div className="space-y-3 pt-4 border-t border-dashed">
					<h3 className="text-sm font-medium text-muted-foreground">Jute Yarn Details</h3>
					<MuiForm
						key={`juteyarn-${formKey}`}
						schema={juteYarnSchema}
						initialValues={initialValues}
						mode={mode}
						hideModeToggle
						hideSubmit
						onValuesChange={onValuesChange}
					/>
				</div>
			)}

			{showQuotationButton && (
				<div className="space-y-2">
					<Button variant="outline" onClick={onQuotationSelect} disabled={quotationButtonDisabled}>
						Load from Quotation
					</Button>
					<p className="text-xs text-slate-500">Pre-fill line items from a selected quotation.</p>
				</div>
			)}
		</div>
	);
}

export default SalesOrderHeaderForm;
