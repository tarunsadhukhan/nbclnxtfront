"use client";
import React, { useCallback, useMemo, useState } from "react";
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
import { saveAs } from "file-saver";
import {
  fetchInvoiceListDownload,
  fetchInvoiceListReport,
} from "@/utils/salesReportService";
import {
  formatCurrency,
  formatDate,
  formatInt,
} from "@/utils/displayFormatters";
import type {
  BranchOption,
  InvoiceReportRow,
} from "../types/reportTypes";

interface Props {
  coId: number | null;
  branches: BranchOption[];
}

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

const columns: GridColDef<InvoiceReportRow>[] = [
  {
    field: "invoice_no_formatted",
    headerName: "Invoice Number",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "invoice_date",
    headerName: "Date",
    width: 130,
    valueFormatter: (value: string | null | undefined) => formatDate(value),
  },
  { field: "branch_name", headerName: "Branch", width: 160 },
  { field: "party_name", headerName: "Party", flex: 1, minWidth: 200 },
  { field: "status_name", headerName: "Status", width: 140 },
  {
    field: "approval_level",
    headerName: "Apv Level",
    type: "number",
    width: 110,
    valueFormatter: (value: number | null | undefined) => formatInt(value),
  },
  { field: "challan_no", headerName: "Challan No", width: 140 },
  {
    field: "challan_date",
    headerName: "Challan Date",
    width: 140,
    valueFormatter: (value: string | null | undefined) => formatDate(value),
  },
  {
    field: "due_date",
    headerName: "Due Date",
    width: 130,
    valueFormatter: (value: string | null | undefined) => formatDate(value),
  },
  {
    field: "invoice_amount",
    headerName: "Invoice Amount",
    type: "number",
    width: 170,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
  {
    field: "tax_amount",
    headerName: "Tax Amount",
    type: "number",
    width: 150,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
  {
    field: "tax_payable",
    headerName: "Tax Payable",
    type: "number",
    width: 150,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
  {
    field: "round_off",
    headerName: "Round Off",
    type: "number",
    width: 130,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
];

export default function InvoiceListReport({ coId, branches }: Props) {
  const initialRange = useMemo(() => currentMonthRange(), []);

  const [fromDate, setFromDate] = useState<string>(initialRange.from);
  const [toDate, setToDate] = useState<string>(initialRange.to);
  const [branch, setBranch] = useState<BranchOption | null>(null);

  const [rows, setRows] = useState<InvoiceReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleLoad = useCallback(async () => {
    if (coId == null) {
      setSnackbar("Select a company first.");
      return;
    }
    if (!fromDate || !toDate) {
      setSnackbar("From and To dates are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoiceListReport({
        coId,
        branchId: branch?.branch_id ?? null,
        dateFrom: fromDate,
        dateTo: toDate,
      });
      setRows(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [coId, branch, fromDate, toDate]);

  const handleDownload = useCallback(async () => {
    if (coId == null) {
      setSnackbar("Select a company first.");
      return;
    }
    if (!fromDate || !toDate) {
      setSnackbar("From and To dates are required.");
      return;
    }
    setDownloading(true);
    setError(null);
    setDownloadSuccess(null);
    try {
      const blob = await fetchInvoiceListDownload({
        coId,
        branchId: branch?.branch_id ?? null,
        dateFrom: fromDate,
        dateTo: toDate,
      });
      if (!blob || blob.size === 0) {
        setSnackbar("No data for the selected range.");
        return;
      }
      saveAs(blob, `sales_invoices_${fromDate}_${toDate}.xlsx`);
      setDownloadSuccess("Excel downloaded.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed.";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  }, [coId, branch, fromDate, toDate]);

  const getRowId = useCallback(
    (row: InvoiceReportRow) => row.invoice_id,
    [],
  );

  if (coId == null) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select a company to view Invoices
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: "#0C3C60", fontWeight: 600, mb: 1 }}
        >
          Invoice Filter
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
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <TextField
            type="date"
            label="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <Autocomplete
            options={branches}
            getOptionLabel={(option) => option.branch_name}
            isOptionEqualToValue={(option, value) =>
              option.branch_id === value.branch_id
            }
            value={branch}
            onChange={(_, newValue) => setBranch(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" />
            )}
            sx={{ minWidth: 240 }}
          />
          <Button
            variant="contained"
            onClick={handleLoad}
            disabled={loading}
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            {loading ? "Loading..." : "Load"}
          </Button>
          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={downloading || !fromDate || !toDate}
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
            {downloading ? "Downloading..." : "Download Excel"}
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {downloadSuccess && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            onClose={() => setDownloadSuccess(null)}
          >
            {downloadSuccess}
          </Alert>
        )}
      </Paper>

      <Box sx={{ position: "relative", width: "100%" }}>
        {loading && (
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

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={getRowId}
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
              "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
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
