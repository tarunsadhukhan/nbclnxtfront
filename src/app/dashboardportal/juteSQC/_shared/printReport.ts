/**
 * Shared day-level print helper for all Jute SQC reports.
 *
 * SQC reports are printed **for the day** — a single consolidated printout that
 * covers the whole selected date. They are NOT split or filtered by shift/spell:
 * if a report captures a spell/shift it is rendered as an ordinary data column,
 * never as a separate per-shift report. All `*_by_date` endpoints already return
 * the full day's data (filtered by `entry_date` only), so callers simply pass the
 * day's rows straight through.
 *
 * Mirrors the established print approach in the codebase
 * (see SalesOrderPreview.tsx): build an HTML string and render it into a fresh
 * `window.open` document, then trigger the browser print dialog.
 */

export type PrintAlign = "left" | "right" | "center";

export type PrintColumn = {
	/** Key into each row object. */
	key: string;
	/** Column header label. */
	label: string;
	/** Cell alignment (default "left"). */
	align?: PrintAlign;
};

/** A primitive cell value. */
export type PrintCell = string | number | null | undefined;

/** A tabular section — the day's rows rendered as one table. */
export type PrintTableSection = {
	kind: "table";
	/** Optional sub-heading shown above the table (e.g. a sub-report name). */
	title?: string;
	columns: PrintColumn[];
	rows: Array<Record<string, PrintCell>>;
	/** Optional bold summary/average rows rendered at the foot of the table. */
	footerRows?: Array<Record<string, PrintCell>>;
	/** Text shown when there are no rows (default "No data for the selected date."). */
	emptyText?: string;
};

/** A label/value section — e.g. report-level standards or header attributes. */
export type PrintMetaSection = {
	kind: "meta";
	title?: string;
	fields: Array<{ label: string; value: PrintCell }>;
};

export type PrintSection = PrintTableSection | PrintMetaSection;

export type SqcPrintReport = {
	/** Human report name, e.g. "Cutting Length SQC". */
	reportTitle: string;
	/** Report code, e.g. "R-08-20". */
	reportCode?: string;
	/** Company name for the letterhead. */
	companyName?: string;
	/** Branch name (single branch — reports are scoped to one branch). */
	branchName?: string;
	/** The day this report covers (ISO `YYYY-MM-DD` or any display string). */
	reportDate?: string;
	/** Extra header attributes shown next to the date (e.g. inspector, quality). */
	headerFields?: Array<{ label: string; value: PrintCell }>;
	/** Report body. */
	sections: PrintSection[];
};

/** Escape a value for safe HTML interpolation. */
function esc(value: PrintCell): string {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Render a cell, using an em-dash placeholder for empty values. */
function cell(value: PrintCell): string {
	if (value === null || value === undefined || value === "") return "—";
	return esc(value);
}

/** Format an ISO `YYYY-MM-DD` date as `DD-MM-YYYY`; pass other strings through. */
export function formatPrintDate(date?: string): string {
	if (!date) return "";
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : date;
}

function renderMetaSection(section: PrintMetaSection): string {
	const fields = section.fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "");
	if (fields.length === 0) return "";
	const items = fields
		.map(
			(f) =>
				`<div class="meta-field"><span class="meta-label">${esc(f.label)}</span><span class="meta-value">${cell(
					f.value,
				)}</span></div>`,
		)
		.join("");
	return `${section.title ? `<div class="section-title">${esc(section.title)}</div>` : ""}<div class="meta-grid">${items}</div>`;
}

function renderRow(columns: PrintColumn[], row: Record<string, PrintCell>, bold = false): string {
	const tds = columns
		.map((c) => `<td class="al-${c.align ?? "left"}${bold ? " strong" : ""}">${cell(row[c.key])}</td>`)
		.join("");
	return `<tr${bold ? ' class="footer-row"' : ""}>${tds}</tr>`;
}

function renderTableSection(section: PrintTableSection): string {
	const head = `<tr>${section.columns
		.map((c) => `<th class="al-${c.align ?? "left"}">${esc(c.label)}</th>`)
		.join("")}</tr>`;

	const title = section.title ? `<div class="section-title">${esc(section.title)}</div>` : "";

	if (section.rows.length === 0) {
		return `${title}<div class="empty">${esc(
			section.emptyText ?? "No data for the selected date.",
		)}</div>`;
	}

	const body = section.rows.map((r) => renderRow(section.columns, r)).join("");
	const footer = (section.footerRows ?? []).map((r) => renderRow(section.columns, r, true)).join("");

	return `${title}<table><thead>${head}</thead><tbody>${body}${footer}</tbody></table>`;
}

/** Build the full printable HTML document for an SQC report. */
export function buildSqcReportHtml(report: SqcPrintReport): string {
	const title = `${report.reportCode ? `${report.reportCode} ` : ""}${report.reportTitle}`;

	const headerFields = (report.headerFields ?? []).filter(
		(f) => f.value !== null && f.value !== undefined && f.value !== "",
	);
	const headerChips = [
		report.reportDate ? { label: "Date", value: formatPrintDate(report.reportDate) } : null,
		report.branchName ? { label: "Branch", value: report.branchName } : null,
		...headerFields,
	]
		.filter((f): f is { label: string; value: PrintCell } => f !== null)
		.map(
			(f) =>
				`<div class="meta-field"><span class="meta-label">${esc(f.label)}</span><span class="meta-value">${cell(
					f.value,
				)}</span></div>`,
		)
		.join("");

	const sections = report.sections
		.map((s) => (s.kind === "meta" ? renderMetaSection(s) : renderTableSection(s)))
		.join('<div class="section-gap"></div>');

	return `
		<html>
		<head>
			<title>${esc(title)}</title>
			<style>
				* { box-sizing: border-box; }
				body { font-family: Arial, Helvetica, sans-serif; margin: 20px; color: #222; }
				.report-head { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
				.company { font-size: 18px; font-weight: 700; }
				.report-title { font-size: 15px; font-weight: 600; margin-top: 2px; }
				.report-code { font-size: 12px; color: #666; }
				.meta-grid { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 10px 0 14px; }
				.meta-field { display: flex; flex-direction: column; }
				.meta-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.03em; }
				.meta-value { font-size: 13px; font-weight: 600; }
				.section-title { font-size: 13px; font-weight: 700; margin: 14px 0 4px; }
				.section-gap { height: 6px; }
				table { width: 100%; border-collapse: collapse; margin-top: 4px; }
				th, td { border: 1px solid #bbb; padding: 5px 7px; font-size: 11.5px; }
				th { background: #f0f0f0; text-align: left; }
				td.al-right, th.al-right { text-align: right; }
				td.al-center, th.al-center { text-align: center; }
				td.strong, .footer-row td { font-weight: 700; background: #fafafa; }
				.empty { font-size: 12px; color: #888; padding: 8px 0; }
				.print-footer { margin-top: 24px; font-size: 10px; color: #999; text-align: right; }
				@media print { @page { size: A4; margin: 10mm; } body { margin: 0; } }
			</style>
		</head>
		<body>
			<div class="report-head">
				<div class="company">${esc(report.companyName || "Company")}</div>
				<div class="report-title">${esc(report.reportTitle)}</div>
				${report.reportCode ? `<div class="report-code">${esc(report.reportCode)}</div>` : ""}
			</div>
			${headerChips ? `<div class="meta-grid">${headerChips}</div>` : ""}
			${sections}
		</body>
		</html>
	`;
}

/**
 * Open the day-level report in a new window and trigger the browser print dialog.
 * The print stylesheet pins the page to A4, so "Save as PDF" from the dialog
 * produces an A4 PDF. No-op when called outside the browser (e.g. SSR).
 */
export function openSqcPrint(report: SqcPrintReport): void {
	if (typeof window === "undefined") return;
	const printWindow = window.open("", "_blank");
	if (!printWindow) return;
	printWindow.document.write(buildSqcReportHtml(report));
	printWindow.document.close();
	printWindow.focus();
	setTimeout(() => {
		printWindow.print();
		printWindow.close();
	}, 250);
}

/** A safe download base filename, e.g. "R-08-20_Cutting-Length-SQC_28-06-2026". */
function reportBaseName(report: SqcPrintReport): string {
	const parts = [report.reportCode, report.reportTitle, formatPrintDate(report.reportDate)]
		.filter((p): p is string => !!p)
		.join("_");
	return parts.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "sqc-report";
}

/** Header attribute chips (date + branch + extras) as label/value pairs. */
function headerChipPairs(report: SqcPrintReport): Array<{ label: string; value: PrintCell }> {
	return [
		report.reportDate ? { label: "Date", value: formatPrintDate(report.reportDate) } : null,
		report.branchName ? { label: "Branch", value: report.branchName } : null,
		...(report.headerFields ?? []),
	].filter(
		(f): f is { label: string; value: PrintCell } =>
			f !== null && f.value !== null && f.value !== undefined && f.value !== "",
	);
}

function cellToScalar(value: PrintCell): string | number {
	if (value === null || value === undefined) return "";
	return typeof value === "number" ? value : String(value);
}

/**
 * Download the day-level report as an `.xlsx` workbook (one sheet).
 * Sections are stacked vertically with their headers, mirroring the printout.
 */
export async function exportSqcExcel(report: SqcPrintReport): Promise<void> {
	if (typeof window === "undefined") return;
	const XLSX = await import("xlsx");

	const aoa: Array<Array<string | number>> = [];
	if (report.companyName) aoa.push([report.companyName]);
	aoa.push([`${report.reportCode ? `${report.reportCode} ` : ""}${report.reportTitle}`]);
	const chips = headerChipPairs(report);
	if (chips.length) aoa.push(chips.map((c) => `${c.label}: ${cellToScalar(c.value)}`));

	for (const section of report.sections) {
		aoa.push([]);
		if (section.kind === "meta") {
			if (section.title) aoa.push([section.title]);
			for (const f of section.fields) aoa.push([f.label, cellToScalar(f.value)]);
		} else {
			if (section.title) aoa.push([section.title]);
			aoa.push(section.columns.map((c) => c.label));
			for (const row of section.rows) aoa.push(section.columns.map((c) => cellToScalar(row[c.key])));
			for (const row of section.footerRows ?? []) aoa.push(section.columns.map((c) => cellToScalar(row[c.key])));
		}
	}

	const ws = XLSX.utils.aoa_to_sheet(aoa);
	const wb = XLSX.utils.book_new();
	const sheetName = (report.reportCode || report.reportTitle).replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
	XLSX.utils.book_append_sheet(wb, ws, sheetName || "Report");
	XLSX.writeFile(wb, `${reportBaseName(report)}.xlsx`);
}

/** jsPDF gains `lastAutoTable` after the autotable plugin runs; read finalY via this. */
type AutoTableDoc = { lastAutoTable?: { finalY: number } };

/**
 * Download the day-level report as an A4 (portrait) PDF using jsPDF + autotable.
 */
export async function exportSqcPdf(report: SqcPrintReport): Promise<void> {
	if (typeof window === "undefined") return;
	const { jsPDF } = await import("jspdf");
	const { autoTable } = await import("jspdf-autotable");

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const marginX = 10;
	let y = 14;

	doc.setFontSize(14);
	doc.text(report.companyName || "Company", pageWidth / 2, y, { align: "center" });
	y += 6;
	doc.setFontSize(11);
	doc.text(report.reportTitle, pageWidth / 2, y, { align: "center" });
	y += 5;
	if (report.reportCode) {
		doc.setFontSize(9);
		doc.text(report.reportCode, pageWidth / 2, y, { align: "center" });
		y += 5;
	}

	const chips = headerChipPairs(report);
	if (chips.length) {
		doc.setFontSize(9);
		const metaText = chips.map((c) => `${c.label}: ${cellToScalar(c.value)}`).join("    ");
		doc.text(metaText, marginX, y);
		y += 5;
	}

	const align = (a?: PrintAlign): "left" | "right" | "center" => a ?? "left";

	for (const section of report.sections) {
		if (section.kind === "meta") {
			autoTable(doc, {
				startY: y,
				body: section.fields.map((f) => [f.label, cellToScalar(f.value)]),
				theme: "plain",
				styles: { fontSize: 8 },
				margin: { left: marginX, right: marginX },
			});
		} else {
			autoTable(doc, {
				startY: y,
				head: [section.columns.map((c) => c.label)],
				body: section.rows.map((r) => section.columns.map((c) => cellToScalar(r[c.key]))),
				foot: (section.footerRows ?? []).map((r) => section.columns.map((c) => cellToScalar(r[c.key]))),
				styles: { fontSize: 7.5, cellPadding: 1.5 },
				headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
				footStyles: { fillColor: [250, 250, 250], textColor: 20, fontStyle: "bold" },
				columnStyles: Object.fromEntries(
					section.columns.map((c, i) => [i, { halign: align(c.align) }]),
				),
				margin: { left: marginX, right: marginX },
			});
		}
		const finalY = (doc as unknown as AutoTableDoc).lastAutoTable?.finalY;
		y = (finalY ?? y) + 8;
	}

	doc.save(`${reportBaseName(report)}.pdf`);
}
