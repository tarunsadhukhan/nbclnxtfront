"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchDailyWagesShifts, processDailyWages } from "@/utils/hrmsService";

interface ShiftOption {
  shift_id: number;
  shift_name: string;
}

interface SpellSummary {
  spell: string;
  records: number;
  working_hrs: number;
  ns_hrs: number;
  head_count: number;
  vouchers: number;
  overtime: number;
}

interface ProcessResult {
  processed: number;
  summary: SpellSummary[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const processSchema = z
  .object({
    branch_id: z.number().int().positive("Select a branch in the sidebar"),
    from_date: z.string().regex(DATE_RE, "Select the From Date"),
    to_date: z.string().regex(DATE_RE, "Select the To Date"),
    shift_id: z.number().int().positive().optional(),
  })
  .refine((v) => v.from_date <= v.to_date, "From Date should not be after To Date");

const COLUMNS: GridColDef<SpellSummary>[] = [
  { field: "spell", headerName: "Spell", flex: 0.6 },
  { field: "records", headerName: "Records", type: "number", flex: 0.7 },
  { field: "working_hrs", headerName: "Working Hrs", type: "number", flex: 0.8 },
  { field: "ns_hrs", headerName: "Night Hrs", type: "number", flex: 0.8 },
  { field: "head_count", headerName: "Head Count", type: "number", flex: 0.8 },
  { field: "overtime", headerName: "OT", type: "number", flex: 0.5 },
  { field: "vouchers", headerName: "Vouchers", type: "number", flex: 0.6 },
];

export default function DailyWagesProcessPage() {
  const { selectedBranches } = useSidebarContext();
  const branchId = Number(selectedBranches[0] ?? 0);

  const [open, setOpen] = useState(false);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shiftId, setShiftId] = useState(""); // "" = all shifts
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  // Default both dates to today (local date). Set after mount to avoid an SSR hydration mismatch.
  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    setFromDate(today);
    setToDate(today);
  }, []);

  // Shift options (shift_mst) follow the sidebar branch.
  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    fetchDailyWagesShifts(branchId).then((res) => {
      const data = (res?.data as { data?: ShiftOption[] } | null)?.data;
      if (!cancelled) {
        setShifts(data ?? []);
        setShiftId("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const handleProcess = useCallback(async () => {
    const parsed = processSchema.safeParse({
      branch_id: branchId,
      from_date: fromDate,
      to_date: toDate,
      shift_id: shiftId ? Number(shiftId) : undefined,
    });
    if (!parsed.success) {
      setSnackbar({ message: parsed.error.issues[0].message, severity: "error" });
      return;
    }
    setProcessing(true);
    try {
      const res = await processDailyWages(parsed.data);
      if (res?.error || !res?.data) throw new Error(res?.error || "Wages process failed");
      const data = (res.data as { data: ProcessResult }).data;
      setResult(data);
      setOpen(false);
      setSnackbar({ message: `Processed ${data.processed} attendance records`, severity: "success" });
    } catch (err: unknown) {
      setSnackbar({ message: err instanceof Error ? err.message : "Wages process failed", severity: "error" });
    } finally {
      setProcessing(false);
    }
  }, [branchId, fromDate, toDate, shiftId]);

  return (
    <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8">
      <Box className="flex flex-wrap items-start justify-between gap-4">
        <Box className="flex flex-col gap-1">
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Daily Wages Process
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update pay attendance from approved daily attendance for a date range and shift
          </Typography>
        </Box>
        <Button onClick={() => setOpen(true)}>Process</Button>
      </Box>

      {result && (
        <Paper className="p-4">
          <DataGrid
            rows={result.summary}
            columns={COLUMNS}
            getRowId={(row) => row.spell}
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            sx={{
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "hsl(var(--table-header))",
                color: "white",
                fontWeight: "bold",
              },
            }}
          />
        </Paper>
      )}

      <Dialog open={open} onClose={() => !processing && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Daily Wages Process</DialogTitle>
        <DialogContent>
          <Box className="flex flex-col gap-4 pt-2">
            <TextField
              label="From Date"
              type="date"
              size="small"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              required
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fromDate || undefined } }}
            />
            <TextField
              select
              label="Shift"
              size="small"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              helperText="All spells under the selected shift are processed"
            >
              <MenuItem value="">All shifts</MenuItem>
              {shifts.map((s) => (
                <MenuItem key={s.shift_id} value={String(s.shift_id)}>
                  {s.shift_name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={processing}>
            {processing ? "Processing..." : "Process"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity ?? "success"} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
