"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchDayBook, fetchVoucherTypes } from "@/utils/accountingService";
import type { DayBookRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

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

type VoucherTypeOption = {
  acc_voucher_type_id: number;
  voucher_type_name: string;
};

type DBGridRow = DayBookRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DayBookPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [voucherTypeOptions, setVoucherTypeOptions] = useState<VoucherTypeOption[]>([]);
  const [selectedVoucherType, setSelectedVoucherType] =
    useState<VoucherTypeOption | null>(null);

  // Data
  const [rows, setRows] = useState<DBGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Load voucher type options
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    const load = async () => {
      try {
        const types = await fetchVoucherTypes(selectedCompany.co_id);
        if (!cancelled) {
          setVoucherTypeOptions(
            types.map((t) => ({
              acc_voucher_type_id: t.acc_voucher_type_id,
              voucher_type_name: t.type_name,
            }))
          );
        }
      } catch {
        // silently ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany]);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDayBook({
        coId: selectedCompany.co_id,
        fromDate,
        toDate,
        branchId: branchId ? Number(branchId) : undefined,
        voucherTypeId: selectedVoucherType?.acc_voucher_type_id,
      });

      // Backend rows already match DayBookRow; only the grid id is added.
      const mapped: DBGridRow[] = data.map((entry, idx) => ({
        ...entry,
        total_amount: entry.total_amount ?? 0,
        id: idx,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load day book";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate, branchId, selectedVoucherType]);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchData();
    }
  }, [fetchData, fromDate, toDate]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<DBGridRow>[]>(
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
        field: "total_amount",
        headerName: "Amount",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      { field: "narration", headerName: "Narration", flex: 2, minWidth: 200 },
      { field: "party_name", headerName: "Party Name", flex: 1, minWidth: 160 },
      {
        field: "is_auto_posted",
        headerName: "Auto Posted",
        minWidth: 110,
        align: "center",
        headerAlign: "center",
        renderCell: (params) =>
          params.value ? (
            <Chip label="Auto" size="small" color="info" />
          ) : (
            <Chip label="Manual" size="small" variant="outlined" />
          ),
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
        Day Book
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
        <Autocomplete
          options={voucherTypeOptions}
          getOptionLabel={(opt) => opt.voucher_type_name}
          isOptionEqualToValue={(opt, val) =>
            opt.acc_voucher_type_id === val.acc_voucher_type_id
          }
          value={selectedVoucherType}
          onChange={(_e, val) => setSelectedVoucherType(val)}
          renderInput={(params) => (
            <TextField {...params} label="Voucher Type" size="small" sx={{ minWidth: 200 }} />
          )}
          sx={{ minWidth: 200 }}
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
      )}
    </Box>
  );
}
