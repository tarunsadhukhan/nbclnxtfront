import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type DeliveryOrderFooterFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

export function DeliveryOrderFooterForm({ schema, formKey, initialValues, mode, onSubmit, onValuesChange }: DeliveryOrderFooterFormProps) {
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

const formatCurrency = (value?: number): string => {
	if (value === undefined || value === null) return "\u20B90.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(value);
};

type DOTotals = {
	grossAmount: number;
	totalGST: number;
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	netAmount: number;
	freightCharges: number;
	roundOffValue: number;
};

type DeliveryOrderTotalsDisplayProps = {
	totals: DOTotals;
	showGSTBreakdown: boolean;
};

export function DeliveryOrderTotalsDisplay({ totals, showGSTBreakdown }: DeliveryOrderTotalsDisplayProps) {
	return (
		<div className="flex justify-end">
			<div className="min-w-70 space-y-1">
				<div className="flex justify-between text-sm">
					<span className="text-slate-600">Gross Amount:</span>
					<span>{formatCurrency(totals.grossAmount)}</span>
				</div>

				{showGSTBreakdown && (
					<>
						{totals.totalIGST > 0 && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">IGST:</span>
								<span>{formatCurrency(totals.totalIGST)}</span>
							</div>
						)}
						{(totals.totalCGST > 0 || totals.totalSGST > 0) && (
							<>
								<div className="flex justify-between text-sm">
									<span className="text-slate-600">CGST:</span>
									<span>{formatCurrency(totals.totalCGST)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-slate-600">SGST:</span>
									<span>{formatCurrency(totals.totalSGST)}</span>
								</div>
							</>
						)}
					</>
				)}

				{totals.freightCharges > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Freight Charges:</span>
						<span>{formatCurrency(totals.freightCharges)}</span>
					</div>
				)}

				{totals.roundOffValue !== 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Round Off:</span>
						<span>{formatCurrency(totals.roundOffValue)}</span>
					</div>
				)}

				<div className="border-t border-slate-300 my-1" />

				<div className="flex justify-between text-base font-semibold">
					<span>Net Amount:</span>
					<span className="text-primary">{formatCurrency(totals.netAmount)}</span>
				</div>
			</div>
		</div>
	);
}

export default DeliveryOrderFooterForm;
