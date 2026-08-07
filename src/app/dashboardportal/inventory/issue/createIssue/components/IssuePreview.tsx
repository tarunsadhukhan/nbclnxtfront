"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { IssueDetails, IssueLabelResolvers } from "../types/issueTypes";

type IssuePreviewProps = {
	details: IssueDetails | null;
	labelResolvers: IssueLabelResolvers;
};

const joinNonEmpty = (parts: Array<string | number | null | undefined>, sep = ", "): string =>
	parts
		.map((p) => (p == null ? "" : String(p).trim()))
		.filter(Boolean)
		.join(sep);

/**
 * @component IssuePreview
 * @description Printable preview of the Issue transaction with company + branch header.
 */
export const IssuePreview: React.FC<IssuePreviewProps> = ({
	details,
	labelResolvers,
}) => {
	const previewRef = React.useRef<HTMLDivElement>(null);

	const handlePrint = React.useCallback(() => {
		const content = previewRef.current?.innerHTML ?? "";
		const win = window.open("", "_blank");
		if (!win) {
			alert("Please allow popups to print.");
			return;
		}

		const title = `Issue Pass - ${details?.issuePassNo ?? "Draft"}`;
		win.document.open();
		win.document.write(
			`<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`
		);
		win.document.close();

		document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
			win.document.head.appendChild(n.cloneNode(true));
		});

		const s = win.document.createElement("style");
		s.textContent = `
			@media print { @page { size: A4; margin: 10mm; } }
			body { margin: 0; padding: 16px; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000; }
			table { width: 100%; border-collapse: collapse; }
			th, td { border: 1px solid #333; padding: 5px 8px; font-size: 11px; }
			th { background-color: #f5f5f5; font-weight: 600; }
			.print-hidden { display: none !important; }
		`;
		win.document.head.appendChild(s);

		const root = win.document.getElementById("root");
		if (root) root.innerHTML = content;
		win.focus();
		setTimeout(() => {
			win.print();
			win.close();
		}, 300);
	}, [details?.issuePassNo]);

	if (!details) {
		return (
			<div className="p-4 text-center text-slate-500">
				No issue data available for preview.
			</div>
		);
	}

	const coAddressLine = joinNonEmpty([
		details.coAddress1,
		details.coAddress2,
		details.coZipcode,
	]);
	const branchAddressLine = joinNonEmpty([
		details.branchAddress1,
		details.branchAddress2,
		details.branchZipcode,
	]);

	return (
		<div className="p-4 print:p-0 space-y-4">
			{/* Print button (hidden in printout) */}
			<div className="flex justify-end print-hidden print:hidden">
				<Button variant="outline" size="sm" onClick={handlePrint}>
					<Printer className="h-4 w-4 mr-2" />
					Print
				</Button>
			</div>

			<div ref={previewRef}>
				{/* Company / Branch header */}
				<div className="flex justify-between items-start border-b-2 border-slate-700 pb-3 mb-3">
					<div className="flex items-start gap-3">
						{details.coLogo ? (
							<img
								src={details.coLogo}
								alt="Company Logo"
								style={{ maxHeight: 64, maxWidth: 180, objectFit: "contain" }}
							/>
						) : null}
						<div className="text-xs leading-snug">
							{details.coName ? (
								<div className="text-base font-bold">{details.coName}</div>
							) : null}
							{coAddressLine ? <div>{coAddressLine}</div> : null}
							{details.coCinNo ? (
								<div>
									<span className="font-medium">CIN No:</span> {details.coCinNo}
								</div>
							) : null}
							{details.coPanNo ? (
								<div>
									<span className="font-medium">PAN No:</span> {details.coPanNo}
								</div>
							) : null}
							{details.coEmailId ? (
								<div>
									<span className="font-medium">Email:</span> {details.coEmailId}
								</div>
							) : null}
						</div>
					</div>
					<div className="text-xs leading-snug text-right">
						{details.branchName ? (
							<div className="font-semibold">{details.branchName}</div>
						) : null}
						{branchAddressLine ? <div>{branchAddressLine}</div> : null}
						{details.branchGstNo ? (
							<div>
								<span className="font-medium">GST No:</span> {details.branchGstNo}
							</div>
						) : null}
					</div>
				</div>

				{/* Title */}
				<div className="text-center mb-3">
					<h2 className="text-lg font-bold uppercase tracking-wide">Issue Pass</h2>
				</div>

				{/* Issue meta */}
				<div className="border-b pb-2 mb-3 flex justify-between text-sm">
					<div>
						<span className="font-medium text-slate-600">Issue Pass No:</span>
						<span className="ml-2 font-semibold">
							{details.issuePassNo || "Draft"}
						</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Date:</span>
						<span className="ml-2">
							{details.date ? new Date(details.date).toLocaleDateString() : "-"}
						</span>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
					<div>
						<span className="font-medium text-slate-600">Branch:</span>
						<span className="ml-2">{details.branchName || "-"}</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Department:</span>
						<span className="ml-2">
							{labelResolvers.department(String(details.deptId ?? ""))}
						</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Project:</span>
						<span className="ml-2">
							{details.projectId
								? labelResolvers.project(String(details.projectId))
								: "-"}
						</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Issued To:</span>
						<span className="ml-2">{details.issuedTo || "-"}</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Requested By:</span>
						<span className="ml-2">{details.reqBy || "-"}</span>
					</div>
					<div>
						<span className="font-medium text-slate-600">Status:</span>
						<span className="ml-2">{details.status || "-"}</span>
					</div>
				</div>

				{/* Internal Note */}
				{details.internalNote ? (
					<div className="text-sm mb-3">
						<span className="font-medium text-slate-600">Internal Note:</span>
						<p className="mt-1 text-slate-700">{details.internalNote}</p>
					</div>
				) : null}

				{/* Line Items */}
				{details.lineItems && details.lineItems.length > 0 ? (
					<div className="mt-2">
						<h3 className="text-sm font-semibold text-slate-700 mb-2">
							Line Items
						</h3>
						<table className="w-full text-sm border border-slate-300">
							<thead className="bg-slate-100">
								<tr>
									<th className="border-b px-2 py-1 text-left">#</th>
									<th className="border-b px-2 py-1 text-left">Item Code</th>
									<th className="border-b px-2 py-1 text-left">Item</th>
									<th className="border-b px-2 py-1 text-left">SR No</th>
									<th className="border-b px-2 py-1 text-right">Qty</th>
									<th className="border-b px-2 py-1 text-left">UOM</th>
									<th className="border-b px-2 py-1 text-right">Rate</th>
									<th className="border-b px-2 py-1 text-left">Expense</th>
								</tr>
							</thead>
							<tbody>
								{details.lineItems.map((line, index) => (
									<tr key={line.id || index} className="border-b">
										<td className="px-2 py-1">{index + 1}</td>
										<td className="px-2 py-1 whitespace-nowrap">{line.itemCode || "-"}</td>
										<td className="px-2 py-1">{line.itemName || "-"}</td>
										<td className="px-2 py-1">{line.srNo || "-"}</td>
										<td className="px-2 py-1 text-right">{line.qty}</td>
										<td className="px-2 py-1">{line.uomName || "-"}</td>
										<td className="px-2 py-1 text-right">
											{line.rate
												? parseFloat(String(line.rate)).toFixed(2)
												: "-"}
										</td>
										<td className="px-2 py-1">{line.expenseTypeName || "-"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				<div className="text-center text-xs text-slate-500 mt-6">
					Note*: This is a computer generated print, signature is not required.
				</div>
			</div>
		</div>
	);
};
