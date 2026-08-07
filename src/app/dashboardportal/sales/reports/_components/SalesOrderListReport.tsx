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
  fetchSalesOrderListDownload,
  fetchSalesOrderListReport,
} from "@/utils/salesReportService";
import {
  formatCurrency,
  formatDate,
  formatInt,
} from "@/utils/displayFormatters";
import type {
  BranchOption,
  SalesOrderReportRow,
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

const columns: GridColDef<SalesOrderReportRow>[] = [
  {
    field: "sales_no_formatted",
    headerName: "SO Number",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "sales_order_date",
    headerName: "Date",
    width: 130,
    valueFormatter: (value: string | null | undefined) => formatDate(value),
  },
  { field: "branch_name", headerName: "Branch", width: 160 },
  { field: "party_name", headerName: "Party", flex: 1, minWidth: 200 },
  { field: "quotation_no", headerName: "Quotation No", width: 150 },
  { field: "status_name", headerName: "Status", width: 140 },
  {
    field: "approval_level",
    headerName: "Apv Level",
    type: "number",
    width: 110,
    valueFormatter: (value: number | null | undefined) => formatInt(value),
  },
  {
    field: "gross_amount",
    headerName: "Gross Amount",
    type: "number",
    width: 160,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
  {
    field: "net_amount",
    headerName: "Net Amount",
    type: "number",
    width: 160,
    valueFormatter: (value: number | null | undefined) => formatCurrency(value),
  },
];

export default function SalesOrderListReport({ coId, branches }: Props) {
  const initialRange = useMemo(() => currentMonthRange(), []);

  const [fromDate, setFromDate] = useState<string>(initialRange.from);
  const [toDate, setToDate] = useState<string>(initialRange.to);
  const [branch, setBranch] = useState<BranchOption | null>(null);

  const [rows, setRows] = useState<SalesOrderReportRow[]>([]);
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
      const data = await fetchSalesOrderListReport({
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
      const blob = await fetchSalesOrderListDownload({
        coId,
        branchId: branch?.branch_id ?? null,
        dateFrom: fromDate,
        dateTo: toDate,
      });
      if (!blob || blob.size === 0) {
        setSnackbar("No data for the selected range.");
        return;
      }
      saveAs(blob, `sales_orders_${fromDate}_${toDate}.xlsx`);
      setDownloadSuccess("Excel downloaded.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed.";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  }, [coId, branch, fromDate, toDate]);

  const getRowId = useCallback(
    (row: SalesOrderReportRow) => row.sales_order_id,
    [],
  );

  if (coId == null) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select a company to view Sales Orders
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
          Sales Order Filter
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
                sortModel: [{ field: "sales_order_date", sort: "desc" }],
              },
            }}
            disableRowSelectionOnClick
            sx={{
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#3ea6da",
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
