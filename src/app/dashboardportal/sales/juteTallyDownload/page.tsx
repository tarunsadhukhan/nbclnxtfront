"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchSalesJuteMrSummary,
  fetchSalesJuteTallyDownload,
  type SalesJuteMrSummaryRow,
} from "@/utils/salesReportService";
import { saveAs } from "file-saver";
import type { BranchOption } from "@/app/dashboardportal/jutePurchase/reports/types/reportTypes";

function fmtNum(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

const summaryColumns: GridColDef<SalesJuteMrSummaryRow>[] = [
  { field: "invoice_no", headerName: "Invoice #", width: 180 },
  { field: "invoice_date", headerName: "Date", width: 110 },
  { field: "party_name", headerName: "Party", flex: 1, minWidth: 180 },
  { field: "branch_name", headerName: "Branch", width: 160 },
  { field: "mr_number", headerName: "MR #", width: 140 },
  { field: "vehicle_no", headerName: "Vehicle", width: 120 },
  { field: "challan_no", headerName: "Challan #", width: 120 },
  {
    field: "total_qty_kg",
    headerName: "Qty (Kg)",
    type: "number",
    width: 120,
    valueFormatter: (value: unknown) => fmtNum(value),
  },
  {
    field: "invoice_amount",
    headerName: "Invoice Amt",
    type: "number",
    width: 130,
    valueFormatter: (value: unknown) => fmtNum(value),
  },
  {
    field: "claim_amount",
    headerName: "Claim Amt",
    type: "number",
    width: 120,
    valueFormatter: (value: unknown) => fmtNum(value),
  },
];

/** Returns {from, to} as YYYY-MM-DD for the first and last day of the current month. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return { from: fmt(first), to: fmt(last) };
}

export default function SalesJuteTallyDownloadPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { selectedCompany } = useSidebarContext();

  const initialRange = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState<string>(initialRange.from);
  const [dateTo, setDateTo] = useState<string>(initialRange.to);
  const [branch, setBranch] = useState<BranchOption | null>(null);

  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [summaryRows, setSummaryRows] = useState<SalesJuteMrSummaryRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const branchOptions: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  const coId = selectedCompany?.co_id ?? null;

  const handleLoad = useCallback(async () => {
    if (coId == null) return;
    if (!dateFrom || !dateTo) {
      setSnackbar("From and To dates are required.");
      return;
    }
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const rows = await fetchSalesJuteMrSummary({
        coId,
        branchId: branch?.branch_id ?? null,
        dateFrom,
        dateTo,
      });
      setSummaryRows(rows);
      if (rows.length === 0) {
        setSnackbar("No invoices found for the selected range.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load summary.";
      setSummaryError(message);
      setSummaryRows([]);
    } finally {
      setLoadingSummary(false);
    }
  }, [coId, branch, dateFrom, dateTo]);

  const handleDownload = useCallback(async () => {
    if (coId == null) return;
    if (!dateFrom || !dateTo) {
      setSnackbar("From and To dates are required.");
      return;
    }
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await fetchSalesJuteTallyDownload({
        coId,
        branchId: branch?.branch_id ?? null,
        dateFrom,
        dateTo,
      });
      if (!blob || blob.size === 0) {
        setSnackbar("No data for the selected range.");
        return;
      }
      saveAs(blob, `sales_raw_jute_tally_${dateFrom}_${dateTo}.xlsx`);
      setSuccess("Tally sheet downloaded.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Download failed.";
      setError(message);
    } finally {
      setDownloading(false);
    }
  }, [coId, branch, dateFrom, dateTo]);

  if (!mounted) return null;

  if (!selectedCompany?.co_id) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Select a company from the sidebar to continue.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Jute Tally Download (Sales — Raw Jute)
      </Typography>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: "#0C3C60", fontWeight: 600, mb: 1 }}
        >
          Filters
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <TextField
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <TextField
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <Autocomplete
            options={branchOptions}
            getOptionLabel={(option) => option.branch_name}
            isOptionEqualToValue={(option, value) =>
              option.branch_id === value.branch_id
            }
            value={branch}
            onChange={(_, newValue) => setBranch(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Branch (optional)" size="small" />
            )}
            sx={{ minWidth: 240 }}
          />
          <Button
            variant="contained"
            onClick={handleLoad}
            disabled={coId == null || !dateFrom || !dateTo || loadingSummary}
            startIcon={
              loadingSummary ? (
                <CircularProgress size={18} sx={{ color: "white" }} />
              ) : undefined
            }
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            {loadingSummary ? "Loading..." : "Load"}
          </Button>
          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={coId == null || !dateFrom || !dateTo || downloading}
            startIcon={
              downloading ? (
                <CircularProgress size={18} sx={{ color: "white" }} />
              ) : undefined
            }
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            {downloading ? "Downloading..." : "Download Tally Sheet"}
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="info" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Paper>

      <Box sx={{ position: "relative", width: "100%", mt: 2 }}>
        {summaryError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSummaryError(null)}>
            {summaryError}
          </Alert>
        )}
        {loadingSummary && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.7)",
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Box sx={{ height: 520, width: "100%" }}>
          <DataGrid
            rows={summaryRows}
            columns={summaryColumns}
            getRowId={(row) => row.invoice_id}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 50 } },
              sorting: {
                sortModel: [{ field: "invoice_date", sort: "desc" }],
              },
            }}
            disableRowSelectionOnClick
            sx={{
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "hsl(var(--table-header))",
                color: "white",
                fontWeight: "bold",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
              },
            }}
          />
        </Box>
      </Box>

      <Snackbar
        open={snackbar != null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
