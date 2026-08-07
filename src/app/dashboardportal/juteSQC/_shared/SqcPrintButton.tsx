"use client";

import * as React from "react";
import { Button, ButtonGroup, Tooltip } from "@mui/material";
import { Printer, FileText, FileSpreadsheet } from "lucide-react";
import { exportSqcExcel, exportSqcPdf, openSqcPrint, type SqcPrintReport } from "./printReport";

export type SqcPrintButtonProps = {
	/**
	 * Builds the day-level report to print/export. Called lazily on click so the
	 * latest loaded rows are captured. Return `null` to no-op (e.g. nothing loaded).
	 */
	getReport: () => SqcPrintReport | null;
	/** Disable the controls (e.g. while data is loading or there are no rows). */
	disabled?: boolean;
	/** Optional override for the print button label (default "Print"). */
	label?: string;
	size?: "small" | "medium" | "large";
};

/**
 * Reusable export toolbar for Jute SQC report pages: Print, Download PDF (A4),
 * and Download Excel.
 *
 * Every action prints/exports the selected day's data as one consolidated
 * report (never per-shift). Pass a `getReport` factory that maps the
 * currently-loaded day rows into the shared {@link SqcPrintReport} shape.
 */
export default function SqcPrintButton({
	getReport,
	disabled = false,
	label = "Print",
	size = "small",
}: SqcPrintButtonProps) {
	const [busy, setBusy] = React.useState(false);

	const handlePrint = React.useCallback(() => {
		const report = getReport();
		if (report) openSqcPrint(report);
	}, [getReport]);

	const handlePdf = React.useCallback(async () => {
		const report = getReport();
		if (!report) return;
		setBusy(true);
		try {
			await exportSqcPdf(report);
		} finally {
			setBusy(false);
		}
	}, [getReport]);

	const handleExcel = React.useCallback(async () => {
		const report = getReport();
		if (!report) return;
		setBusy(true);
		try {
			await exportSqcExcel(report);
		} finally {
			setBusy(false);
		}
	}, [getReport]);

	return (
		<ButtonGroup variant="outlined" size={size} disabled={disabled || busy}>
			<Tooltip title="Print this day's report (Save as PDF gives A4)">
				<Button startIcon={<Printer size={16} />} onClick={handlePrint}>
					{label}
				</Button>
			</Tooltip>
			<Tooltip title="Download this day's report as an A4 PDF">
				<Button startIcon={<FileText size={16} />} onClick={handlePdf}>
					PDF
				</Button>
			</Tooltip>
			<Tooltip title="Download this day's report as Excel">
				<Button startIcon={<FileSpreadsheet size={16} />} onClick={handleExcel}>
					Excel
				</Button>
			</Tooltip>
		</ButtonGroup>
	);
}
