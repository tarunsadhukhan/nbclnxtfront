"use client";

import * as React from "react";
import { Box, Paper, Typography } from "@mui/material";

import type { BillPassAdditionalCharge } from "@/utils/billPassService";

const formatAmount = (value?: number | null): string => {
  if (value == null) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Read-only Additional Charges table. Inherited from SR (proc_inward_additional). */
export default function AdditionalChargesTable({
  lines,
}: {
  lines: BillPassAdditionalCharge[];
}) {
  const headers = [
    "Charge",
    "Qty",
    "Rate",
    "Net Amount",
    "Tax %",
    "CGST",
    "SGST",
    "IGST",
    "Tax Amt",
    "Total",
    "Remarks",
  ];
  const numericHeaders = new Set([
    "Qty",
    "Rate",
    "Net Amount",
    "Tax %",
    "CGST",
    "SGST",
    "IGST",
    "Tax Amt",
    "Total",
  ]);

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Paper variant="outlined">
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ bgcolor: "primary.main" }}>
            <Box component="tr">
              {headers.map((h) => (
                <Box
                  key={h}
                  component="th"
                  sx={{
                    p: 1,
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textAlign: numericHeaders.has(h) ? "right" : "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {lines.map((line, idx) => {
              const total = line.net_amount + line.tax_amount;
              return (
                <Box
                  key={line.proc_inward_additional_id}
                  component="tr"
                  sx={{ bgcolor: idx % 2 === 0 ? "grey.50" : "white" }}
                >
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                    <Typography variant="caption" fontWeight={600}>
                      {line.additional_charges_name || "-"}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.qty)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.rate)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.net_amount)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.tax_pct)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.cgst_amount)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.sgst_amount)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.igst_amount)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                    {formatAmount(line.tax_amount)}
                  </Box>
                  <Box
                    component="td"
                    sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}
                  >
                    {formatAmount(total)}
                  </Box>
                  <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                    {line.remarks || "-"}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
