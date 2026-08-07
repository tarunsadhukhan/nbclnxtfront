"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchPartyOutstanding } from "@/utils/accountingService";
import type { PartyOutstandingRow } from "@/app/dashboardportal/accounting/types/accountingTypes";

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

type POGridRow = PartyOutstandingRow & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PartyOutstandingPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [partyType, setPartyType] = useState<"CREDITOR" | "DEBTOR">("DEBTOR");
  const [branchId, setBranchId] = useState("");

  // Data
  const [rows, setRows] = useState<POGridRow[]>([]);
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
      const data = await fetchPartyOutstanding({
        coId: selectedCompany.co_id,
        partyType,
        branchId: branchId ? Number(branchId) : undefined,
      });

      // The service returns PartyOutstandingRow[] (service type with bills array).
      // Map to the UI type from accountingTypes which has flat bill rows.
      const serviceRows = data as unknown as Array<{
        acc_ledger_id?: number;
        party_id?: number;
        party_name: string;
        total_outstanding?: number;
        outstanding?: number;
        bill_no?: string;
        bill_date?: string | null;
        due_date?: string | null;
        bill_amount?: number;
        overdue_days?: number;
        bills?: Array<{
          ref_no: string;
          ref_date: string;
          amount: number;
          outstanding: number;
        }>;
      }>;

      const mapped: POGridRow[] = [];
      let idx = 0;
      for (const row of serviceRows) {
        if (row.bills && row.bills.length > 0) {
          // Expand bills into flat rows
          for (const bill of row.bills) {
            const dueDate = bill.ref_date; // approximate
            const now = new Date();
            const due = dueDate ? new Date(dueDate) : null;
            const overdueDays =
              due && !Number.isNaN(due.getTime())
                ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000))
                : 0;
            mapped.push({
              party_id: row.acc_ledger_id ?? row.party_id ?? 0,
              party_name: row.party_name,
              bill_no: bill.ref_no,
              bill_date: bill.ref_date ?? null,
              due_date: dueDate ?? null,
              bill_amount: bill.amount,
              outstanding: bill.outstanding,
              overdue_days: overdueDays,
              id: idx++,
            });
          }
        } else {
          // Already flat
          mapped.push({
            party_id: row.party_id ?? row.acc_ledger_id ?? 0,
            party_name: row.party_name,
            bill_no: row.bill_no ?? "",
            bill_date: row.bill_date ?? null,
            due_date: row.due_date ?? null,
            bill_amount: row.bill_amount ?? 0,
            outstanding: row.outstanding ?? row.total_outstanding ?? 0,
            overdue_days: row.overdue_days ?? 0,
            id: idx++,
          });
        }
      }
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load party outstanding";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, partyType, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Row styling for overdue
  // -----------------------------------------------------------------------

  const getRowClassName = useCallback(
    (params: { row: POGridRow }): string => {
      if (params.row.overdue_days > 90) return "row-overdue-critical";
      if (params.row.overdue_days > 30) return "row-overdue-warning";
      return "";
    },
    []
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<POGridRow>[]>(
    () => [
      { field: "party_name", headerName: "Party Name", flex: 2, minWidth: 200 },
      { field: "bill_no", headerName: "Bill No", minWidth: 130, flex: 1 },
      {
        field: "bill_date",
        headerName: "Bill Date",
        minWidth: 120,
        renderCell: (params) => formatDate(params.value as string | null),
      },
      {
        field: "due_date",
        headerName: "Due Date",
        minWidth: 120,
        renderCell: (params) => formatDate(params.value as string | null),
      },
      {
        field: "bill_amount",
        headerName: "Bill Amount",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "outstanding",
        headerName: "Outstanding",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatCurrency(params.value as number),
      },
      {
        field: "overdue_days",
        headerName: "Overdue Days",
        minWidth: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const days = params.value as number;
          if (days <= 0) return "-";
          return (
            <Typography
              variant="body2"
              fontWeight={600}
              color={days > 90 ? "error.main" : days > 30 ? "warning.main" : "text.primary"}
            >
              {days}
            </Typography>
          );
        },
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
        Party Outstanding
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <RadioGroup
          row
          value={partyType}
          onChange={(e) => setPartyType(e.target.value as "CREDITOR" | "DEBTOR")}
        >
          <FormControlLabel value="DEBTOR" control={<Radio size="small" />} label="Debtors" />
          <FormControlLabel value="CREDITOR" control={<Radio size="small" />} label="Creditors" />
        </RadioGroup>
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
            getRowClassName={getRowClassName}
            sx={{
              "& .row-overdue-critical": {
                backgroundColor: "error.light",
                "&:hover": { backgroundColor: "error.light" },
              },
              "& .row-overdue-warning": {
                backgroundColor: "warning.light",
                "&:hover": { backgroundColor: "warning.light" },
              },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
