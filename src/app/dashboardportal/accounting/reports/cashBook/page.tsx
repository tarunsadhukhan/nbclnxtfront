"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchCashBook } from "@/utils/accountingService";
import type { CashBookRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

type CBGridRow = CashBookRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CashBookPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [rows, setRows] = useState<CBGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashBook({
        coId: selectedCompany.co_id,
        fromDate,
        toDate,
        branchId: branchId ? Number(branchId) : undefined,
      });

      // Backend rows already match CashBookRow; only the grid id is added.
      const mapped: CBGridRow[] = data.map((entry, idx) => ({
        ...entry,
        id: idx,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load cash book";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate, branchId]);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchData();
    }
  }, [fetchData, fromDate, toDate]);

  // -----------------------------------------------------------------------
  // Opening / Closing cash balance
  // -----------------------------------------------------------------------

  const cashSummary = useMemo(() => {
    if (rows.length === 0) return null;
    let totalReceipts = 0;
    let totalPayments = 0;
    for (const r of rows) {
      totalReceipts += r.receipt ?? 0;
      totalPayments += r.payment ?? 0;
    }
    // Net cash movement for the period
    const netMovement = totalReceipts - totalPayments;
    return { totalReceipts, totalPayments, netMovement };
  }, [rows]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<CBGridRow>[]>(
    () => [
      {
        field: "voucher_date",
        headerName: "Date",
        minWidth: 120,
        renderCell: (params) => formatDate(params.value as string),
      },
      { field: "voucher_no", headerName: "Voucher No", minWidth: 140, flex: 1 },
      { field: "voucher_type", headerName: "Type", minWidth: 120 },
      {
        field: "receipt",
        headerName: "Receipt (Dr)",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          params.value ? formatCurrency(params.value as number) : "-",
      },
      {
        field: "payment",
        headerName: "Payment (Cr)",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          params.value ? formatCurrency(params.value as number) : "-",
      },
      { field: "narration", headerName: "Narration", flex: 2, minWidth: 200 },
      { field: "contra_ledgers", headerName: "Contra Ledgers", flex: 1.5, minWidth: 180 },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Cash Book
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="From Date"
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To Date"
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Branch ID"
          type="number"
          size="small"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={fetchData} disabled={!fromDate || !toDate || loading}>
          Load
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Opening / Closing summary */}
          {cashSummary && (
            <Paper
              sx={{
                p: 2,
                mb: 1,
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Total Receipts: {formatCurrency(cashSummary.totalReceipts)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Payments: {formatCurrency(cashSummary.totalPayments)}
              </Typography>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color={cashSummary.netMovement >= 0 ? "success.main" : "error.main"}
              >
                Net Cash Movement: {formatCurrency(cashSummary.netMovement)}
              </Typography>
            </Paper>
          )}

          <Paper sx={{ width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              disableRowSelectionOnClick
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
