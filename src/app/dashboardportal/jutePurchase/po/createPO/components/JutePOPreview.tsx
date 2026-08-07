"use client";

/**
 * @component JutePOPreview
 * @description Printable preview modal for Jute PO — centered-formal print layout
 * matching the Jute MR printout (MRPreview): centered company header, ruled title
 * band, PO no/date row, colon-separated detail rows, full-grid line items table.
 * All print styles are inline so the print window needs no stylesheet — identical
 * output in dev and deployed builds.
 */

import * as React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import useCompanyHeader from "@/hooks/useCompanyHeader";
import type { JutePOFormValues, JutePOLineItem, JutePOLabelResolvers } from "../types/jutePOTypes";
import { formatWeight, formatAmount, formatDate } from "../utils/jutePOCalculations";
import { JUTE_PO_STATUS_LABELS } from "../utils/jutePOConstants";
import type { ApprovalStatusId } from "../types/jutePOTypes";

// ── Inline styles (everything inline so the print window needs no stylesheet) ──
const thStyle: React.CSSProperties = {
  border: "1px solid #333",
  padding: "6px 7px",
  fontWeight: 600,
  fontSize: "10.5px",
  textAlign: "center",
  verticalAlign: "bottom",
  backgroundColor: "#efefef",
};
const tdStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px 7px", fontSize: "11px" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };
const tdTotal: React.CSSProperties = { ...tdStyle, fontWeight: 700, backgroundColor: "#f7f7f7" };
const tdTotalRight: React.CSSProperties = { ...tdTotal, textAlign: "right" };

const metaLbl: React.CSSProperties = { fontWeight: 700, whiteSpace: "nowrap", padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top", width: "15%" };
const metaLblRight: React.CSSProperties = { ...metaLbl, textAlign: "right" };
const metaSep: React.CSSProperties = { padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top", width: "2%" };
const metaVal: React.CSSProperties = { padding: "3.5px 4px", fontSize: "11.5px", verticalAlign: "top" };

type JutePOPreviewProps = {
  open: boolean;
  onClose: () => void;
  coId?: string | number | null;
  poNumber?: string;
  statusId: ApprovalStatusId;
  formValues: JutePOFormValues;
  lineItems: JutePOLineItem[];
  labelResolvers: JutePOLabelResolvers;
  totalWeight: number;
  totalAmount: number;
  percentageSum?: number;
  isLegacyPO?: boolean;
};

export function JutePOPreview({
  open,
  onClose,
  coId,
  poNumber,
  statusId,
  formValues,
  lineItems,
  labelResolvers,
  totalWeight,
  totalAmount,
  percentageSum = 0,
  isLegacyPO = false,
}: JutePOPreviewProps) {
  const printRef = React.useRef<HTMLDivElement>(null);
  const { coName, address: coAddress, logoBase64 } = useCompanyHeader(coId, formValues.branch || undefined);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups to print.");
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html><html><head><title>Jute PO - ${poNumber || "Draft"}</title></head><body><div id="root"></div></body></html>`);
    win.document.close();

    // Layout is fully inline-styled; the print window only needs page setup.
    // @page margin 0 suppresses the browser's own header/footer (date, title,
    // about:blank, page number) — body padding provides the paper margin instead.
    const s = win.document.createElement("style");
    s.textContent = `
      @media print { @page { size: A4; margin: 0; } }
      body { margin: 0; padding: 12mm 10mm; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `;
    win.document.head.appendChild(s);

    const root = win.document.getElementById("root");
    if (root) {
      root.innerHTML = content;
      const stamp = win.document.createElement("div");
      stamp.style.cssText = "font-size:9px;color:#777;text-align:right;margin-top:6px;";
      stamp.textContent = `Printed on: ${new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      }).format(new Date())}`;
      root.appendChild(stamp);
    }
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // Filter out blank lines
  const validLines = lineItems.filter((line) => line.itemId && parseFloat(line.quantity) > 0);
  const branchLabel = labelResolvers.branch(formValues.branch);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex justify-between items-center">
        <span>Jute Purchase Order Preview</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <IconButton onClick={onClose} size="small">
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent dividers>
        <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#111" }}>
          {/* ── Centered company header ── */}
          {logoBase64 && (
            <img
              src={logoBase64}
              alt="Company Logo"
              style={{ display: "block", margin: "0 auto 6px", maxHeight: "56px", maxWidth: "180px", objectFit: "contain" }}
            />
          )}
          {coName && (
            <div style={{ textAlign: "center", fontSize: "19px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {coName}
            </div>
          )}
          {coAddress && (
            <div style={{ textAlign: "center", fontSize: "11px", color: "#333", marginTop: "4px" }}>
              {coAddress}
            </div>
          )}
          {branchLabel && (
            <div style={{ textAlign: "center", fontSize: "10.5px", color: "#555", marginTop: "2px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {branchLabel}
            </div>
          )}

          {/* ── Title band ── */}
          <div
            style={{
              borderTop: "1.5px solid #111",
              borderBottom: "1.5px solid #111",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.28em",
              padding: "6px 0",
              marginTop: "14px",
            }}
          >
            JUTE PURCHASE ORDER
          </div>

          {/* ── PO No / PO Date row ── */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "8px 2px", borderBottom: "1px solid #ccc", marginBottom: "10px" }}>
            <span><b>PO No : </b><span>{poNumber ?? "Draft"}</span></span>
            <span><b>PO Date : </b><span>{formatDate(formValues.poDate)}</span></span>
          </div>

          {/* ── Detail rows (label : value) ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
            <tbody>
              <tr>
                <td style={metaLbl}>Supplier</td><td style={metaSep}>:</td>
                <td style={metaVal}>{labelResolvers.supplier(formValues.supplier)}</td>
                <td style={metaLblRight}>Mukam</td><td style={metaSep}>:</td>
                <td style={metaVal}>{labelResolvers.mukam(formValues.mukam)}</td>
              </tr>
              {formValues.partyName && (
                <tr>
                  <td style={metaLbl}>Party</td><td style={metaSep}>:</td>
                  <td style={metaVal} colSpan={4}>{labelResolvers.party(formValues.partyName)}</td>
                </tr>
              )}
              <tr>
                <td style={metaLbl}>Vehicle Type</td><td style={metaSep}>:</td>
                <td style={metaVal}>{labelResolvers.vehicleType(formValues.vehicleType)}</td>
                <td style={metaLblRight}>Vehicle Qty</td><td style={metaSep}>:</td>
                <td style={metaVal}>{formValues.vehicleQty}</td>
              </tr>
              <tr>
                <td style={metaLbl}>Channel</td><td style={metaSep}>:</td>
                <td style={metaVal}>{formValues.channelType}</td>
                <td style={metaLblRight}>Credit Term</td><td style={metaSep}>:</td>
                <td style={metaVal}>{formValues.creditTerm} days</td>
              </tr>
              <tr>
                <td style={metaLbl}>Expected Date</td><td style={metaSep}>:</td>
                <td style={metaVal}>{formatDate(formValues.expectedDate)}</td>
                <td style={metaLblRight}>Freight Charge</td><td style={metaSep}>:</td>
                <td style={metaVal}>Rs {formatAmount(parseFloat(formValues.freightCharge) || 0)}</td>
              </tr>
              <tr>
                <td style={metaLbl}>Unit</td><td style={metaSep}>:</td>
                <td style={metaVal}>{formValues.juteUnit}</td>
                <td style={metaLblRight} /><td style={metaSep} /><td style={metaVal} />
              </tr>
            </tbody>
          </table>

          {/* ── Line Items Table ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Quality</th>
                <th style={thStyle}>Crop<br/>Year</th>
                <th style={thStyle}>Marka</th>
                {!isLegacyPO && <th style={thRight}>%</th>}
                <th style={thRight}>Qty</th>
                <th style={thRight}>Rate</th>
                <th style={thRight}>Moisture<br/>%</th>
                <th style={thRight}>Weight<br/>(Qtl)</th>
                <th style={thRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {validLines.map((line, index) => (
                <tr key={line.id || index}>
                  <td style={tdStyle}>{labelResolvers.item(line.itemId)}</td>
                  <td style={tdStyle}>{labelResolvers.quality(line.itemId, line.quality)}</td>
                  <td style={tdStyle}>{line.cropYear}</td>
                  <td style={tdStyle}>{line.marka || "-"}</td>
                  {!isLegacyPO && <td style={tdRight}>{line.percentage || "-"}</td>}
                  <td style={tdRight}>{line.quantity}</td>
                  <td style={tdRight}>{formatAmount(parseFloat(line.rate) || 0)}</td>
                  <td style={tdRight}>{line.allowableMoisture || "-"}</td>
                  <td style={tdRight}>{formatWeight(parseFloat(line.weight) || 0)}</td>
                  <td style={tdRight}>{formatAmount(parseFloat(line.amount) || 0)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr>
                <td style={tdTotal}>TOTAL</td>
                <td style={tdTotal} />
                <td style={tdTotal} />
                <td style={tdTotal} />
                {!isLegacyPO && <td style={tdTotalRight}>{percentageSum.toFixed(2)}</td>}
                <td style={tdTotal} />
                <td style={tdTotal} />
                <td style={tdTotal} />
                <td style={tdTotalRight}>{formatWeight(totalWeight)}</td>
                <td style={tdTotalRight}>{formatAmount(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Status stamp ── */}
          <div style={{ marginTop: "16px" }}>
            <span style={{ display: "inline-block", border: "2px double #111", padding: "2px 10px", fontWeight: 700, letterSpacing: "0.08em", fontSize: "10px", textTransform: "uppercase" }}>
              Status : <strong>{JUTE_PO_STATUS_LABELS[statusId]}</strong>
            </span>
          </div>

          {/* ── Footer ── */}
          <div style={{ fontSize: "10px", color: "#555", textAlign: "center", marginTop: "28px" }}>
            Note*: This is a computer generated print, Signature is not required.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default JutePOPreview;
