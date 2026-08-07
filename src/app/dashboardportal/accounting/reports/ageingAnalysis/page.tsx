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
import { fetchAgeingAnalysis } from "@/utils/accountingService";
import type { AgeingRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

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

const PARTY_TYPE_OPTIONS = [
  { label: "All", value: "" },
  { label: "Debtors", value: "DEBTOR" },
  { label: "Creditors", value: "CREDITOR" },
] as const;

type PartyTypeOption = (typeof PARTY_TYPE_OPTIONS)[number];

type AgeingGridRow = AgeingRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgeingAnalysisPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [selectedPartyType, setSelectedPartyType] = useState<PartyTypeOption>(
    PARTY_TYPE_OPTIONS[0]
  );
  const [branchId, setBranchId] = useState("");

  // Data
  const [rows, setRows] = useState<AgeingGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAgeingAnalysis({
        coId: selectedCompany.co_id,
        partyType: selectedPartyType.value || undefined,
        branchId: branchId ? Number(branchId) : undefined,
      });

      // Map AgeingBucket (service) to AgeingRow (types)
      const mapped: AgeingGridRow[] = data.map((bucket, idx) => ({
        party_id: bucket.acc_ledger_id,
        party_name: bucket.party_name,
        not_due: bucket.current,
        days_1_30: bucket.period_1_30,
        days_31_60: bucket.period_31_60,
        days_61_90: bucket.period_61_90,
        above_90: bucket.period_above_90,
        total_outstanding: bucket.total,
        id: idx,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load ageing analysis";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedPartyType, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Footer totals
  // -----------------------------------------------------------------------

  const totals = useMemo(() => {
    let notDue = 0;
    let d1_30 = 0;
    let d31_60 = 0;
    let d61_90 = 0;
    let above90 = 0;
    let totalOutstanding = 0;
    for (const r of rows) {
      notDue += r.not_due;
      d1_30 += r.days_1_30;
      d31_60 += r.days_31_60;
      d61_90 += r.days_61_90;
      above90 += r.above_90;
      totalOutstanding += r.total_outstanding;
    }
    return { notDue, d1_30, d31_60, d61_90, above90, totalOutstanding };
  }, [rows]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<AgeingGridRow>[]>(
    () => [
      { field: "party_name", headerName: "Party Name", flex: 2, minWidth: 200 },
      {
        field: "not_due",
        headerName: "Not Due",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "days_1_30",
        headerName: "1-30 Days",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "days_31_60",
        headerName: "31-60 Days",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "days_61_90",
        headerName: "61-90 Days",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "above_90",
        headerName: "Above 90 Days",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography
            variant="body2"
            fontWeight={600}
            color={(params.value as number) > 0 ? "error.main" : "text.primary"}
          >
            {formatCurrency(params.value as number)}
          </Typography>
        ),
      },
      {
        field: "total_outstanding",
        headerName: "Total Outstanding",
        minWidth: 140,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={700}>
            {formatCurrency(params.value as number)}
          </Typography>
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
        Ageing Analysis
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Autocomplete
          options={[...PARTY_TYPE_OPTIONS]}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(opt, val) => opt.value === val.value}
          value={selectedPartyType}
          onChange={(_e, val) => {
            if (val) setSelectedPartyType(val);
          }}
          disableClearable
          renderInput={(params) => (
            <TextField {...params} label="Party Type" size="small" sx={{ minWidth: 180 }} />
          )}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Branch ID"
          type="number"
          size="small"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={fetchData} disabled={loading}>
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

          {/* Footer totals */}
          {rows.length > 0 && (
            <Paper
              sx={{
                p: 2,
                mt: 1,
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Not Due: {formatCurrency(totals.notDue)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                1-30: {formatCurrency(totals.d1_30)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                31-60: {formatCurrency(totals.d31_60)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                61-90: {formatCurrency(totals.d61_90)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="error.main">
                Above 90: {formatCurrency(totals.above90)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                Total: {formatCurrency(totals.totalOutstanding)}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
