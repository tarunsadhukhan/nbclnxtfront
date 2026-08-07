"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
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
import { fetchLedgerReport, fetchLedgers } from "@/utils/accountingService";
import type { LedgerReportRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

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

type LedgerOption = {
  acc_ledger_id: number;
  ledger_name: string;
};

type LRGridRow = LedgerReportRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LedgerReportPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<LedgerOption | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [rows, setRows] = useState<LRGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch ledger options (autocomplete)
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetchLedgers({
          coId: selectedCompany.co_id,
          search: ledgerSearch || undefined,
          limit: 50,
        });
        if (!cancelled) {
          setLedgerOptions(
            result.ledgers.map((l) => ({
              acc_ledger_id: l.acc_ledger_id,
              ledger_name: l.ledger_name,
            }))
          );
        }
      } catch {
        // silently ignore autocomplete errors
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany, ledgerSearch]);

  // -----------------------------------------------------------------------
  // Fetch report
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany || !selectedLedger || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedgerReport({
        coId: selectedCompany.co_id,
        ledgerId: selectedLedger.acc_ledger_id,
        fromDate,
        toDate,
        branchId: branchId ? Number(branchId) : undefined,
      });
      const mapped: LRGridRow[] = data.map((row, idx) => ({
        voucher_date: row.date,
        voucher_no: row.voucher_no,
        voucher_type: row.voucher_type,
        dr_cr: row.debit > 0 ? ("D" as const) : ("C" as const),
        amount: row.debit || row.credit,
        debit: row.debit > 0 ? row.debit : null,
        credit: row.credit > 0 ? row.credit : null,
        narration: row.particulars || null,
        ref_no: null,
        contra_ledgers: row.particulars || null,
        running_balance: row.balance,
        id: idx,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load ledger report";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedLedger, fromDate, toDate, branchId]);

  // -----------------------------------------------------------------------
  // Opening / Closing balance
  // -----------------------------------------------------------------------

  const balanceSummary = useMemo(() => {
    if (rows.length === 0) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    // Opening balance: the running_balance of the first row minus its own debit/credit effect
    const openingBalance =
      first.running_balance !== undefined
        ? first.running_balance - (first.debit ?? 0) + (first.credit ?? 0)
        : 0;
    const closingBalance = last.running_balance ?? 0;
    return { openingBalance, closingBalance };
  }, [rows]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<LRGridRow>[]>(
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
        field: "debit",
        headerName: "Debit",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          params.value ? formatCurrency(params.value as number) : "-",
      },
      {
        field: "credit",
        headerName: "Credit",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          params.value ? formatCurrency(params.value as number) : "-",
      },
      {
        field: "running_balance",
        headerName: "Balance",
        minWidth: 140,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
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
        Ledger Report
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Autocomplete
          options={ledgerOptions}
          getOptionLabel={(opt) => opt.ledger_name}
          isOptionEqualToValue={(opt, val) => opt.acc_ledger_id === val.acc_ledger_id}
          value={selectedLedger}
          onChange={(_e, val) => setSelectedLedger(val)}
          onInputChange={(_e, val) => setLedgerSearch(val)}
          renderInput={(params) => (
            <TextField {...params} label="Ledger" size="small" sx={{ minWidth: 250 }} />
          )}
          sx={{ minWidth: 250 }}
        />
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
        <Button
          variant="contained"
          onClick={fetchData}
          disabled={!selectedLedger || !fromDate || !toDate || loading}
        >
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
          {/* Opening / Closing balance summary */}
          {balanceSummary && (
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
                Opening Balance: {formatCurrency(balanceSummary.openingBalance)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Closing Balance: {formatCurrency(balanceSummary.closingBalance)}
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
