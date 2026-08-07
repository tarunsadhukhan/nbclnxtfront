"use client";

import * as React from "react";
import ReactDOMServer from "react-dom/server";

import {
  buildDrcrLinesByInwardDtl,
  type BillPassDetail,
} from "@/utils/billPassService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillPassPreviewFormData = {
  invoice_no: string;
  invoice_date: string;
  invoice_amount: string;
  invoice_recvd_date: string;
  invoice_due_date: string;
  round_off_value: string;
  sr_remarks: string;
};

/**
 * Split an item name on the first "make:" marker (case-insensitive).
 * Some items embed make info in the name/desc field (e.g. "ss part 88 make: skf").
 * Returned `make` retains the literal "make: ..." prefix so callers can render it as-is.
 */
export const splitItemNameMake = (
  raw?: string | null
): { name: string; make: string | null } => {
  if (!raw) return { name: "-", make: null };
  const idx = raw.search(/\bmake\s*[:=]/i);
  if (idx < 0) return { name: raw, make: null };
  const namePart = raw.slice(0, idx).replace(/[\s,;|\-]+$/, "").trim();
  const makePart = raw.slice(idx).trim();
  if (!namePart) return { name: raw, make: null };
  return { name: namePart, make: makePart };
};

type BillPassPreviewProps = {
  detail: BillPassDetail;
  formData: BillPassPreviewFormData;
  netPayable: number;
  companyName?: string | null;
  /** Pre-resolved registered address (parent fetches via useCompanyHeader). */
  companyAddress?: string | null;
  /** Pre-resolved branch GSTIN. Hidden when empty. */
  companyGst?: string | null;
  /** Pre-resolved CIN. Hidden when empty. */
  companyCin?: string | null;
};

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmtAmt = (value?: number | null): string => {
  if (value == null) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const fmtDate = (value?: string | null): string => {
  if (!value) return "-";
  const match = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (!match) return "-";
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold,
  indent,
  color,
  prefix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  color?: string;
  prefix?: string;
}) {
  return (
    <div
      className="bp-summary-row"
      style={{ paddingLeft: indent ? 16 : 0, color }}
    >
      <span style={{ fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span
        className="bp-mono"
        style={{ fontWeight: bold ? 600 : 400 }}
      >
        {prefix ? `${prefix} ` : ""}
        {fmtAmt(value)}
      </span>
    </div>
  );
}

// ─── Main Preview component ───────────────────────────────────────────────────

/**
 * Printable voucher-style layout for a Bill Pass. Rendered with plain HTML tags
 * (no MUI) so styles are fully defined by BILL_PASS_PRINT_CSS and survive the
 * jump to a new window in openStyledPrintWindow.
 */
export const BillPassPreview: React.FC<BillPassPreviewProps> = ({
  detail,
  formData,
  netPayable,
  companyName,
  companyAddress,
  companyGst,
  companyCin,
}) => {
  const isComplete = detail.billpass_status === 1;
  const { summary } = detail;
  const drcrMap = buildDrcrLinesByInwardDtl(detail.debit_notes, detail.credit_notes);
  const hasAdditional = (detail.additional_charges?.length ?? 0) > 0;
  const roundOff = parseFloat(formData.round_off_value) || 0;

  return (
    <div className="bp-root">
      {!isComplete && <div className="bp-watermark">DRAFT</div>}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bp-header">
        <div className="bp-company">{companyName || "—"}</div>
        {companyAddress && <div className="bp-address">{companyAddress}</div>}
        {companyGst && <div className="bp-regn"><span className="bp-lbl">GSTIN:</span> {companyGst}</div>}
        {companyCin && <div className="bp-regn"><span className="bp-lbl">CIN:</span> {companyCin}</div>}
        <div className="bp-branch">Branch: {detail.branch_name || "—"}</div>
        <div className="bp-title">BILL PASS VOUCHER</div>
        <div className="bp-header-meta">
          <div>
            <span className="bp-lbl">Bill Pass No:</span>{" "}
            <strong>{detail.bill_pass_no || "Draft"}</strong>
            <span className="bp-sep">|</span>
            <span className="bp-lbl">SR Date:</span>{" "}
            <strong>{fmtDate(detail.bill_pass_date)}</strong>
          </div>
          <div className={`bp-chip ${isComplete ? "bp-chip-complete" : "bp-chip-draft"}`}>
            {isComplete ? "COMPLETE" : "DRAFT"}
          </div>
        </div>
      </div>

      {/* ── Metadata strip ───────────────────────────────────────────── */}
      <div className="bp-meta">
        <div>
          <span className="bp-lbl">Supplier:</span>{" "}
          <strong>{detail.supplier_name || "-"}</strong>
        </div>
        <div>
          <span className="bp-lbl">Inward No:</span>{" "}
          <strong>{detail.inward_no}</strong>
          <span className="bp-sep">|</span>
          <span className="bp-lbl">Date:</span>{" "}
          <strong>{fmtDate(detail.inward_date)}</strong>
        </div>
        <div>
          <span className="bp-lbl">Challan No:</span>{" "}
          <strong>{detail.challan_no || "-"}</strong>
          {detail.challan_date ? (
            <>
              <span className="bp-sep">|</span>
              <span className="bp-lbl">Date:</span>{" "}
              <strong>{fmtDate(detail.challan_date)}</strong>
            </>
          ) : null}
        </div>
      </div>

      {/* ── SR Line items ────────────────────────────────────────────── */}
      <table className="bp-table">
        <thead>
          <tr>
            <th>PO No.</th>
            <th>Item Code</th>
            <th>Item</th>
            <th>HSN</th>
            <th>Make</th>
            <th>UOM</th>
            <th className="bp-num">Qty</th>
            <th className="bp-num">PO Rate</th>
            <th className="bp-num">Accepted Rate</th>
            <th className="bp-num">Amount</th>
            <th className="bp-num">Tax</th>
            <th className="bp-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {detail.sr_lines.map((line) => {
            const adjustments = drcrMap.get(line.inward_dtl_id) ?? [];
            const drTotal = adjustments
              .filter((a) => a.note_type === 1)
              .reduce((s, a) => s + a.line_amount, 0);
            const crTotal = adjustments
              .filter((a) => a.note_type === 2)
              .reduce((s, a) => s + a.line_amount, 0);
            const lineNet = line.line_total - drTotal + crTotal;
            const hasAdj = adjustments.length > 0;

            return (
              <React.Fragment key={line.inward_dtl_id}>
                <tr>
                  <td>{line.po_no || "-"}</td>
                  <td className="bp-mono">
                    {line.full_item_code || line.item_code || "-"}
                  </td>
                  <td>
                    {(() => {
                      const { name, make } = splitItemNameMake(line.item_name);
                      return (
                        <>
                          <strong>{name}</strong>
                          {make && <div className="bp-item-make">{make}</div>}
                        </>
                      );
                    })()}
                  </td>
                  <td>{line.hsn_code || "-"}</td>
                  <td>{line.accepted_make_name || "-"}</td>
                  <td>{line.uom_name}</td>
                  <td className="bp-num">{fmtAmt(line.approved_qty)}</td>
                  <td className="bp-num">{fmtAmt(line.po_rate)}</td>
                  <td className="bp-num">{fmtAmt(line.accepted_rate)}</td>
                  <td className="bp-num">{fmtAmt(line.line_amount)}</td>
                  <td className="bp-num">{fmtAmt(line.tax_amount)}</td>
                  <td className="bp-num">
                    <strong>{fmtAmt(line.line_total)}</strong>
                  </td>
                </tr>

                {adjustments.map((adj) => {
                  const isDebit = adj.note_type === 1;
                  return (
                    <tr
                      key={adj.drcr_note_dtl_id}
                      className={`bp-drcr-row ${isDebit ? "debit" : "credit"}`}
                    >
                      <td colSpan={6} className="bp-drcr-label">
                        <span className={`bp-tag ${isDebit ? "debit" : "credit"}`}>
                          {isDebit ? "DEBIT" : "CREDIT"}
                        </span>{" "}
                        <em>{adj.adjustment_reason}</em>
                      </td>
                      <td className="bp-num">{fmtAmt(adj.quantity)}</td>
                      <td className="bp-num">{fmtAmt(adj.rate)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td
                        className="bp-num"
                        style={{
                          color: isDebit ? "#c62828" : "#2e7d32",
                          fontWeight: 600,
                        }}
                      >
                        {isDebit ? "-" : "+"}
                        {fmtAmt(adj.line_amount)}
                      </td>
                    </tr>
                  );
                })}

                {hasAdj && (
                  <tr className="bp-net-row">
                    <td colSpan={11} className="bp-net-label">
                      Line Net Payable:
                    </td>
                    <td className="bp-num" style={{ fontWeight: 700 }}>
                      {fmtAmt(lineNet)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* ── Additional Charges ───────────────────────────────────────── */}
      {hasAdditional && (
        <>
          <div className="bp-section-title">Additional Charges</div>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="bp-num">Qty</th>
                <th className="bp-num">Rate</th>
                <th className="bp-num">Net</th>
                <th className="bp-num">CGST</th>
                <th className="bp-num">SGST</th>
                <th className="bp-num">IGST</th>
                <th className="bp-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.additional_charges.map((c) => (
                <tr key={c.proc_inward_additional_id}>
                  <td>
                    <strong>{c.additional_charges_name}</strong>
                    {c.remarks ? <span className="bp-remark"> — {c.remarks}</span> : null}
                  </td>
                  <td className="bp-num">{fmtAmt(c.qty)}</td>
                  <td className="bp-num">{fmtAmt(c.rate)}</td>
                  <td className="bp-num">{fmtAmt(c.net_amount)}</td>
                  <td className="bp-num">{fmtAmt(c.cgst_amount)}</td>
                  <td className="bp-num">{fmtAmt(c.sgst_amount)}</td>
                  <td className="bp-num">{fmtAmt(c.igst_amount)}</td>
                  <td className="bp-num">
                    <strong>{fmtAmt(c.net_amount + c.tax_amount)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Two-column footer (Invoice + Summary) ────────────────────── */}
      <div className="bp-footer-grid">
        <div className="bp-footer-col">
          <div className="bp-section-title">Invoice Details</div>
          <div className="bp-kv">
            <span className="bp-lbl">Invoice No:</span>{" "}
            <strong>{formData.invoice_no || "-"}</strong>
          </div>
          <div className="bp-kv">
            <span className="bp-lbl">Invoice Date:</span>{" "}
            <strong>{fmtDate(formData.invoice_date)}</strong>
          </div>
          <div className="bp-kv">
            <span className="bp-lbl">Invoice Amount:</span>{" "}
            <strong className="bp-mono">
              {fmtAmt(parseFloat(formData.invoice_amount) || 0)}
            </strong>
          </div>
          <div className="bp-kv">
            <span className="bp-lbl">Invoice Received:</span>{" "}
            <strong>{fmtDate(formData.invoice_recvd_date)}</strong>
          </div>
          <div className="bp-kv">
            <span className="bp-lbl">Payment Due:</span>{" "}
            <strong>{fmtDate(formData.invoice_due_date)}</strong>
          </div>
          <div className="bp-kv">
            <span className="bp-lbl">Round Off:</span>{" "}
            <strong className="bp-mono">{fmtAmt(roundOff)}</strong>
          </div>
          {formData.sr_remarks && (
            <div className="bp-remarks">
              <span className="bp-lbl">Remarks:</span> {formData.sr_remarks}
            </div>
          )}
        </div>

        <div className="bp-footer-col">
          <div className="bp-section-title">Payment Summary</div>
          <SummaryRow label="SR Taxable" value={summary.sr_taxable} />
          {summary.sr_cgst > 0 && (
            <SummaryRow label="CGST" value={summary.sr_cgst} indent />
          )}
          {summary.sr_sgst > 0 && (
            <SummaryRow label="SGST" value={summary.sr_sgst} indent />
          )}
          {summary.sr_igst > 0 && (
            <SummaryRow label="IGST" value={summary.sr_igst} indent />
          )}
          <SummaryRow label="SR Total" value={summary.sr_total} bold />
          {summary.dr_count > 0 && (
            <SummaryRow
              label={`Less: Debit Notes (${summary.dr_count})`}
              value={summary.dr_total}
              color="#c62828"
              prefix="-"
            />
          )}
          {summary.cr_count > 0 && (
            <SummaryRow
              label={`Add: Credit Notes (${summary.cr_count})`}
              value={summary.cr_total}
              color="#2e7d32"
              prefix="+"
            />
          )}
          {summary.additional_count > 0 && (
            <>
              <SummaryRow
                label={`Add: Additional Charges (${summary.additional_count})`}
                value={summary.additional_net}
                prefix="+"
              />
              {summary.additional_cgst > 0 && (
                <SummaryRow label="Add. CGST" value={summary.additional_cgst} indent />
              )}
              {summary.additional_sgst > 0 && (
                <SummaryRow label="Add. SGST" value={summary.additional_sgst} indent />
              )}
              {summary.additional_igst > 0 && (
                <SummaryRow label="Add. IGST" value={summary.additional_igst} indent />
              )}
              <SummaryRow
                label="Additional Total"
                value={summary.additional_total}
                bold
              />
            </>
          )}
          {roundOff !== 0 && <SummaryRow label="Round Off" value={roundOff} />}
          <div className="bp-net-payable">
            <span>NET PAYABLE</span>
            <span className="bp-mono">{fmtAmt(netPayable)}</span>
          </div>
        </div>
      </div>

      {/* ── Signature footer ─────────────────────────────────────────── */}
      <div className="bp-signatures">
        <div className="bp-signature">
          <div className="bp-sig-line"></div>
          <div className="bp-sig-label">Prepared By</div>
        </div>
        <div className="bp-signature">
          <div className="bp-sig-line"></div>
          <div className="bp-sig-label">Checked By</div>
        </div>
        <div className="bp-signature">
          <div className="bp-sig-line"></div>
          <div className="bp-sig-label">Approved By</div>
        </div>
      </div>
    </div>
  );
};

// ─── Print CSS ────────────────────────────────────────────────────────────────

export const BILL_PASS_PRINT_CSS = `
  @page { size: A4; margin: 10mm; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 10pt;
    color: #111;
    margin: 0;
    padding: 12pt;
  }

  .bp-root { position: relative; z-index: 1; }

  .bp-mono { font-family: "Courier New", Consolas, monospace; }

  /* Header */
  .bp-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10pt; margin-bottom: 12pt; }
  .bp-company { font-size: 18pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; }
  .bp-address { font-size: 9pt; color: #555; margin-top: 2pt; }
  .bp-regn { font-size: 9pt; color: #333; margin-top: 1pt; }
  .bp-branch { font-size: 11pt; font-weight: 500; color: #555; margin-top: 2pt; }
  .bp-title { font-size: 13pt; letter-spacing: 3pt; margin-top: 6pt; color: #333; }
  .bp-header-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8pt;
    font-size: 9.5pt;
  }
  .bp-chip {
    padding: 2pt 10pt;
    border-radius: 10pt;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1pt;
    border: 1.5pt solid;
  }
  .bp-chip-draft { color: #e65100; border-color: #e65100; background: #fff3e0; }
  .bp-chip-complete { color: #1b5e20; border-color: #1b5e20; background: #e8f5e9; }

  /* Meta strip */
  .bp-meta {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6pt 12pt;
    border: 1px solid #bbb;
    padding: 6pt 8pt;
    margin-bottom: 10pt;
    background: #fafafa;
    font-size: 9.5pt;
  }

  .bp-lbl { color: #555; font-size: 9pt; }
  .bp-sep { margin: 0 6pt; color: #bbb; }

  /* Section titles */
  .bp-section-title {
    font-size: 10pt;
    font-weight: 700;
    margin: 10pt 0 4pt;
    padding-bottom: 2pt;
    border-bottom: 1px solid #999;
  }

  /* Tables */
  .bp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 8pt;
  }
  .bp-table th,
  .bp-table td {
    border: 1px solid #888;
    padding: 3pt 5pt;
    vertical-align: top;
    text-align: left;
  }
  .bp-table thead {
    display: table-header-group;
    background: #e0e0e0;
  }
  .bp-table th { font-weight: 700; font-size: 8pt; }
  .bp-table tr { page-break-inside: avoid; }
  .bp-num { text-align: right !important; white-space: nowrap; font-family: "Courier New", Consolas, monospace; }

  /* DR/CR rows */
  .bp-drcr-row { background: #fafafa; }
  .bp-drcr-row.debit { border-left: 3px solid #c62828; }
  .bp-drcr-row.credit { border-left: 3px solid #2e7d32; }
  .bp-drcr-label { padding-left: 20pt !important; font-size: 8pt; }
  .bp-tag {
    display: inline-block;
    padding: 0 4pt;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.5pt;
    border: 1px solid;
    border-radius: 3pt;
    margin-right: 4pt;
  }
  .bp-tag.debit { color: #c62828; border-color: #c62828; }
  .bp-tag.credit { color: #2e7d32; border-color: #2e7d32; }
  .bp-net-row { background: #eeeeee; font-weight: 700; }
  .bp-net-label { text-align: right !important; padding-right: 8pt !important; }

  .bp-remark { color: #666; font-size: 8pt; }
  .bp-item-make { color: #555; font-size: 8pt; font-style: italic; margin-top: 1pt; }

  /* Footer grid */
  .bp-footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16pt;
    margin-top: 10pt;
    page-break-inside: avoid;
  }
  .bp-footer-col { border: 1px solid #888; padding: 8pt; }
  .bp-kv { font-size: 9.5pt; margin-bottom: 3pt; }
  .bp-remarks { font-size: 9pt; margin-top: 4pt; padding-top: 4pt; border-top: 1px dashed #ccc; }

  .bp-summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    padding: 1pt 0;
  }
  .bp-net-payable {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6pt;
    padding: 6pt 8pt;
    border-top: 2px solid #333;
    border-bottom: 3px double #333;
    font-size: 12pt;
    font-weight: 700;
  }

  /* Signatures */
  .bp-signatures {
    display: flex;
    justify-content: space-between;
    gap: 20pt;
    margin-top: 50pt;
    page-break-inside: avoid;
  }
  .bp-signature { flex: 1; text-align: center; }
  .bp-sig-line { border-top: 1px solid #333; margin-top: 40pt; }
  .bp-sig-label { font-size: 9pt; font-weight: 600; padding-top: 3pt; }

  /* DRAFT watermark */
  .bp-watermark {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 120pt;
    font-weight: 700;
    color: rgba(200, 0, 0, 0.10);
    transform: rotate(-30deg);
    pointer-events: none;
    z-index: 0;
    letter-spacing: 20pt;
  }

  @media print {
    button, input, select, textarea { display: none !important; }
  }
`;

// ─── HTML renderer ────────────────────────────────────────────────────────────

/**
 * Renders the BillPassPreview to a static HTML string ready for
 * openStyledPrintWindow. Uses renderToStaticMarkup so the output has no React
 * runtime attributes and is safe to inject into a fresh document.
 */
export function renderBillPassPreviewHtml(props: BillPassPreviewProps): string {
  return ReactDOMServer.renderToStaticMarkup(<BillPassPreview {...props} />);
}
