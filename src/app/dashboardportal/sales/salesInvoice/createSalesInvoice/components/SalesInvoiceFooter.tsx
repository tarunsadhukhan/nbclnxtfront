import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type SalesInvoiceFooterFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
};

export function SalesInvoiceFooterForm({ schema, formKey, initialValues, mode, onSubmit, onValuesChange }: SalesInvoiceFooterFormProps) {
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

type InvoiceTotals = {
	grossAmount: number;
	totalGST: number;
	totalIGST: number;
	totalCGST: number;
	totalSGST: number;
	netAmount: number;
	freightCharges: number;
	roundOff: number;
	claimAmount: number;
};

type SalesInvoiceTotalsDisplayProps = {
	totals: InvoiceTotals;
	showGSTBreakdown: boolean;
	roundOffInput?: string;
	onRoundOffChange?: (value: string) => void;
	roundOffEditable?: boolean;
};

export function SalesInvoiceTotalsDisplay({
	totals,
	showGSTBreakdown,
	roundOffInput,
	onRoundOffChange,
	roundOffEditable = false,
}: SalesInvoiceTotalsDisplayProps) {
	return (
		<div className="flex justify-end">
			<div className="min-w-70 space-y-1">
				<div className="flex justify-between text-sm">
					<span className="text-slate-600">Gross Amount:</span>
					<span>{formatCurrency(totals.grossAmount)}</span>
				</div>

				{totals.claimAmount > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Less: Claim Amount:</span>
						<span>-{formatCurrency(totals.claimAmount)}</span>
					</div>
				)}

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

				<div className="border-t border-slate-300 my-1" />

				<div className="flex justify-between items-center text-base font-semibold">
					<span>Net Amount:</span>
					<span className="text-primary">{formatCurrency(totals.netAmount)}</span>
				</div>

				{roundOffEditable ? (
					<div className="flex justify-between items-center text-sm pt-1">
						<label htmlFor="sales-invoice-round-off" className="text-slate-600">
							Round Off:
						</label>
						<input
							id="sales-invoice-round-off"
							type="text"
							inputMode="decimal"
							value={roundOffInput ?? ""}
							onChange={(e) => onRoundOffChange?.(e.target.value)}
							placeholder="0.00"
							className="w-24 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</div>
				) : (
					totals.roundOff !== 0 && (
						<div className="flex justify-between text-sm pt-1">
							<span className="text-slate-600">Round Off:</span>
							<span>{formatCurrency(totals.roundOff)}</span>
						</div>
					)
				)}
			</div>
		</div>
	);
}

export default SalesInvoiceFooterForm;
