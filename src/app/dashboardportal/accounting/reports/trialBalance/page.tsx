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
import { fetchTrialBalance } from "@/utils/accountingService";
import type { TrialBalanceRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

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

type TBGridRow = TrialBalanceRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrialBalancePage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [rows, setRows] = useState<TBGridRow[]>([]);
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
      const data = await fetchTrialBalance({
        coId: selectedCompany.co_id,
        fromDate,
        toDate,
        branchId: branchId ? Number(branchId) : undefined,
      });
      const mapped: TBGridRow[] = data.map((row, idx) => ({
        acc_ledger_id: row.acc_ledger_id,
        ledger_name: row.ledger_name,
        group_name: row.group_name,
        nature: "A" as const,
        opening_balance: row.debit - row.credit,
        opening_balance_type: row.debit >= row.credit ? ("D" as const) : ("C" as const),
        period_debit: row.debit,
        period_credit: row.credit,
        closing_balance: row.closing_debit - row.closing_credit,
        id: row.acc_ledger_id ?? idx,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load trial balance";
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
  // Totals
  // -----------------------------------------------------------------------

  const totals = useMemo(() => {
    let openingBalance = 0;
    let periodDebit = 0;
    let periodCredit = 0;
    let closingBalance = 0;
    for (const r of rows) {
      openingBalance += r.opening_balance;
      periodDebit += r.period_debit;
      periodCredit += r.period_credit;
      closingBalance += r.closing_balance;
    }
    return { openingBalance, periodDebit, periodCredit, closingBalance };
  }, [rows]);

  // -----------------------------------------------------------------------
  // Export CSV
  // -----------------------------------------------------------------------

  const handleExportCsv = useCallback(() => {
    if (rows.length === 0) return;
    const header = "Ledger Name,Group Name,Opening Balance,Period Debit,Period Credit,Closing Balance";
    const csvRows = rows.map(
      (r) =>
        `"${r.ledger_name}","${r.group_name}",${r.opening_balance},${r.period_debit},${r.period_credit},${r.closing_balance}`
    );
    csvRows.push(
      `"TOTAL","",${totals.openingBalance},${totals.periodDebit},${totals.periodCredit},${totals.closingBalance}`
    );
    const csvContent = [header, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trial_balance_${fromDate}_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [rows, totals, fromDate, toDate]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<TBGridRow>[]>(
    () => [
      { field: "ledger_name", headerName: "Ledger Name", flex: 2, minWidth: 200 },
      { field: "group_name", headerName: "Group Name", flex: 1.5, minWidth: 160 },
      {
        field: "opening_balance",
        headerName: "Opening Balance",
        flex: 1,
        minWidth: 140,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "period_debit",
        headerName: "Period Debit",
        flex: 1,
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "period_credit",
        headerName: "Period Credit",
        flex: 1,
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "closing_balance",
        headerName: "Closing Balance",
        flex: 1,
        minWidth: 140,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Trial Balance
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
        <Button variant="outlined" onClick={handleExportCsv} disabled={rows.length === 0}>
          Export CSV
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
          <Paper sx={{ width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              disableRowSelectionOnClick
            />
          </Paper>

          {/* Footer totals */}
          {rows.length > 0 && (
            <Paper sx={{ p: 2, mt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Opening: {formatCurrency(totals.openingBalance)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Debit: {formatCurrency(totals.periodDebit)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Credit: {formatCurrency(totals.periodCredit)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Closing: {formatCurrency(totals.closingBalance)}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
