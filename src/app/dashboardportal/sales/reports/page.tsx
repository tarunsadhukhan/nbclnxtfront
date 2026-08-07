"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Paper,
  Typography,
} from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import SalesOrderListReport from "./_components/SalesOrderListReport";
import InvoiceListReport from "./_components/InvoiceListReport";
import type { BranchOption, ReportKey } from "./types/reportTypes";

export default function SalesReportsPage() {
  // Hydration safety: defer rendering until mounted because useSidebarContext
  // resolves co_id from a context value that differs between SSR and client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { selectedCompany } = useSidebarContext();
  const [selectedReport, setSelectedReport] = useState<ReportKey>("salesOrders");

  const branchOptions: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  const handleReportChange = useCallback(
    (e: SelectChangeEvent<ReportKey>) => {
      setSelectedReport(e.target.value as ReportKey);
    },
    [],
  );

  if (!mounted) return null;

  const coId = selectedCompany?.co_id ?? null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "text.primary", fontWeight: "bold", mb: 2 }}
      >
        Sales Reports
      </Typography>

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            flexWrap: "wrap",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="sales-report-select-label">Report</InputLabel>
            <Select<ReportKey>
              labelId="sales-report-select-label"
              label="Report"
              value={selectedReport}
              onChange={handleReportChange}
            >
              <MenuItem value="salesOrders">List of Sales Orders</MenuItem>
              <MenuItem value="invoices">List of Invoices</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {selectedReport === "salesOrders" && (
        <SalesOrderListReport coId={coId} branches={branchOptions} />
      )}
      {selectedReport === "invoices" && (
        <InvoiceListReport coId={coId} branches={branchOptions} />
      )}
    </Box>
  );
}
