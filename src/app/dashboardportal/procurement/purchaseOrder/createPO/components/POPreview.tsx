"use client";

import React, { useRef } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { openStyledPrintWindow } from "@/utils/printUtils";
import CompanyHeaderBlock from "@/app/dashboardportal/procurement/_shared/PrintHeader";

export type POPreviewHeader = {
  poNo?: string;
  poDate?: string;
  expectedDate?: string;
  branch?: string;
  supplier?: string;
  supplierBranch?: string;
  billingAddress?: string;
  shippingAddress?: string;
  project?: string;
  expenseType?: string;
  status?: string;
  updatedBy?: string;
  updatedAt?: string;
  companyName?: string;
  companyLogo?: string;
  contactPerson?: string;
  contactNo?: string;
  taxType?: string;
  coId?: string | number | null;
  branchId?: string | number | null;
};

export type POPreviewItem = {
  srNo: number;
  indentNo?: string;
  itemCode?: string;
  itemGroup?: string;
  item?: string;
  quantity?: string | number;
  uom?: string;
  rate?: string | number;
  discountType?: string;
  discountValue?: string | number;
  discountAmount?: string | number;
  amount?: string | number;
  remarks?: string;
};

export type POPreviewTotals = {
  netAmount?: number;
  additionalCharges?: number;
  totalIGST?: number;
  totalCGST?: number;
  totalSGST?: number;
  totalAmount?: number;
  advanceAmount?: number;
  advancePercentage?: number;
};

export type POPreviewAdditionalCharge = {
  name: string;
  qty: number;
  rate: number;
  amount: number;
  taxPct: number;
  taxAmount: number;
  remarks?: string;
};

type POPreviewProps = {
  header: POPreviewHeader;
  items: POPreviewItem[];
  totals?: POPreviewTotals;
  additionalCharges?: POPreviewAdditionalCharge[];
  remarks?: string;
  onPrint?: () => void;
  onDownload?: () => void;
};

const FieldRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}:
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem", wordBreak: "break-word" }}>
      {value ?? "-"}
    </Typography>
  </Stack>
);

const TotalsRow = ({ label, value, isBold = false }: { label: string; value?: React.ReactNode; isBold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ minWidth: 280 }}>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ fontSize: "0.8125rem", fontWeight: isBold ? 600 : 400 }}
    >
      {label}:
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: isBold ? 600 : 400,
        fontSize: "0.875rem",
        textAlign: "right",
        minWidth: 120,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value ?? "-"}
    </Typography>
  </Stack>
);

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

const formatAmount = (value?: number | string) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const POPreview: React.FC<POPreviewProps> = ({ header, items, totals, additionalCharges, remarks, onPrint, onDownload }) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const buildPrintableWindow = (titleSuffix: string) => {
    const printContent = previewRef.current?.innerHTML || "";
    return openStyledPrintWindow(
      printContent,
      `Purchase Order - ${titleSuffix}`
    );
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    const printWindow = buildPrintableWindow(header.poNo || "Print");
    if (!printWindow) return;
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const printWindow = buildPrintableWindow(header.poNo || "Download");
    if (!printWindow) return;
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box ref={previewRef} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 3, backgroundColor: "#fff" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <CompanyHeaderBlock
            coId={header.coId}
            branchId={header.branchId}
            branchLabel={header.branch}
            maxWidth="30%"
          />

          <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Purchase Order
              </Typography>
              {header.status ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                  {header.status}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Stack spacing={0.5} alignItems="flex-end" sx={{ minWidth: 200 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                PO Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
                {formatDate(header.poDate)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                PO No:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
                {header.poNo || "-"}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <FieldRow label="Supplier" value={header.supplier || "-"} />
          <FieldRow label="Supplier Branch" value={header.supplierBranch || "-"} />
          <FieldRow label="Project" value={header.project || "-"} />
          <FieldRow label="Expense Type" value={header.expenseType || "-"} />
          <FieldRow label="Billing Address" value={header.billingAddress || "-"} />
          <FieldRow label="Shipping Address" value={header.shippingAddress || "-"} />
          <FieldRow label="Expected Date" value={header.expectedDate ? formatDate(header.expectedDate) : "-"} />
          <FieldRow label="Tax Type" value={header.taxType || "-"} />
          {header.contactPerson ? <FieldRow label="Contact Person" value={header.contactPerson} /> : null}
          {header.contactNo ? <FieldRow label="Contact No." value={header.contactNo} /> : null}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.08)" }}>
              <Box component="tr">
                {["Sr No", "Indent No", "Item Code", "Item Name", "Qty", "UOM", "Rate", "Disc.", "Disc. Amt", "Amount", "Remarks"].map((col) => (
                  <Box
                    key={col}
                    component="th"
                    sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: col === "Remarks" || col === "Item Name" ? "left" : "center" }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {items.length ? (
                items.map((item) => (
                  <Box component="tr" key={`po-preview-row-${item.srNo}`}>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
                      {item.srNo}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, whiteSpace: "nowrap" }}>
                      {item.indentNo || "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {item.itemCode || "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>
                      {item.item || "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>
                      {item.quantity ?? "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
                      {item.uom || "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>
                      {formatAmount(item.rate)}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>
                      {item.discountType && item.discountValue ? `${item.discountValue}${item.discountType === "%" ? "%" : ""}` : "-"}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>
                      {formatAmount(item.discountAmount)}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>
                      {formatAmount(item.amount)}
                    </Box>
                    <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>
                      {item.remarks || "-"}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box component="tr">
                  <Box component="td" colSpan={11} sx={{ border: "1px solid", borderColor: "divider", p: 2, fontSize: 12, textAlign: "center" }}>
                    No line items captured yet.
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {additionalCharges && additionalCharges.length > 0 ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Additional Charges</Typography>
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <Box component="thead" sx={{ backgroundColor: "rgba(12,60,96,0.08)" }}>
                  <Box component="tr">
                    {["#", "Charge", "Qty", "Rate", "Amount", "Tax %", "Tax Amt", "Remarks"].map((col) => (
                      <Box
                        key={col}
                        component="th"
                        sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: col === "Charge" || col === "Remarks" ? "left" : "center" }}
                      >
                        {col}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {additionalCharges.map((charge, idx) => (
                    <Box component="tr" key={`po-preview-charge-${idx}`}>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>{idx + 1}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>{charge.name || "-"}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{charge.qty}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{formatAmount(charge.rate)}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{formatAmount(charge.amount)}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "center" }}>{charge.taxPct ? `${charge.taxPct}%` : "-"}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12, textAlign: "right" }}>{formatAmount(charge.taxAmount)}</Box>
                      <Box component="td" sx={{ border: "1px solid", borderColor: "divider", p: 1, fontSize: 12 }}>{charge.remarks || "-"}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </>
        ) : null}

        {totals ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="flex-end" sx={{ pr: 2 }}>
              <Box sx={{ minWidth: 280 }}>
                <Stack spacing={0.75}>
                  <TotalsRow label="Net Amount" value={formatAmount(totals.netAmount)} />
                  {totals.additionalCharges != null && totals.additionalCharges > 0 && (
                    <TotalsRow label="Additional Charges" value={formatAmount(totals.additionalCharges)} />
                  )}
                  <TotalsRow label="IGST" value={formatAmount(totals.totalIGST)} />
                  <TotalsRow label="CGST" value={formatAmount(totals.totalCGST)} />
                  <TotalsRow label="SGST" value={formatAmount(totals.totalSGST)} />
                  <Divider sx={{ my: 0.5 }} />
                  <TotalsRow label="Total Amount" value={formatAmount(totals.totalAmount)} isBold />
                  {totals.advancePercentage != null || totals.advanceAmount != null ? (
                    <TotalsRow
                      label="Advance"
                      value={`${totals.advancePercentage ?? 0}% (${formatAmount(totals.advanceAmount)})`}
                    />
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </>
        ) : null}

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          <Typography variant="subtitle2">Remarks</Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 80 }}>
            <Typography variant="body2" color="text.secondary">
              {remarks || "No remarks provided."}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-start" spacing={4}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Updated By
            </Typography>
            <Box sx={{ borderBottom: "1px solid", borderColor: "divider", width: 200, height: 24 }} />
            <Typography variant="caption" color="text.secondary">
              Last Updated: {header.updatedAt ? formatDateTime(header.updatedAt) : "-"}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Download
        </Button>
      </Stack>
    </Box>
  );
};

export default POPreview;


