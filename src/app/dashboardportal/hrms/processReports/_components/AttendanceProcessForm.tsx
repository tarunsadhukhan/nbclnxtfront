"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

interface ShiftOption {
  shift: string;
  main_shift: string;
  start: string;
  end: string;
  hours: number;
  active: string;
}

interface ProcessResult {
  rows: number;
  shifts?: { wdate: string; wshift: string; rows: number }[];
}

interface AttendanceProcessFormProps {
  /** true = "Attendance Process - BULK" (date range, every shift); false = one date + shift. */
  bulk: boolean;
}

const today = () => new Date().toLocaleDateString("en-CA");

const singleSchema = z.object({
  wdate: z.string().min(1, "Select a date"),
  wshift: z.string().min(1, "Shift Can't Be Blank."),
});

const bulkSchema = z
  .object({ from_date: z.string().min(1, "Select From date"), to_date: z.string().min(1, "Select To date") })
  .refine((v) => v.from_date <= v.to_date, { message: "Start Date can not be greater than End Date." });

/**
 * Winsome legacy "Attendance Process" (ProcessFrm -> Attn_Process) and "Attendance Process - BULK"
 * (FrmProcessBulk -> ATTEN_PROCESS_BULK): rebuilds ATTEN from the raw ATTENDANCE punches.
 * Backend: pyhback src/hrms/winsomeAttendanceProcess.py.
 */
export default function AttendanceProcessForm({ bulk }: AttendanceProcessFormProps) {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [wdate, setWdate] = useState(today());
  const [wshift, setWshift] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (bulk || branchId == null) return;
    void fetchWithCookie<{ data: ShiftOption[] }>(
      `${apiRoutesPortalMasters.WINSOME_ATTEN_SHIFTS}?branch_id=${branchId}`,
      "GET",
    ).then(({ data, error: err }) => (err || !data ? setError(err || "Failed to load shifts") : setShifts(data.data)));
  }, [bulk, branchId]);

  const askProcess = () => {
    const parsed = bulk
      ? bulkSchema.safeParse({ from_date: fromDate, to_date: toDate })
      : singleSchema.safeParse({ wdate, wshift });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setConfirmOpen(true);
  };

  const handleProcess = async () => {
    setConfirmOpen(false);
    setRunning(true);
    setResult(null);
    const { data, error: err } = await fetchWithCookie<{ message: string; data: ProcessResult }>(
      bulk ? apiRoutesPortalMasters.WINSOME_ATTEN_PROCESS_BULK : apiRoutesPortalMasters.WINSOME_ATTEN_PROCESS,
      "POST",
      bulk ? { branch_id: branchId, from_date: fromDate, to_date: toDate } : { branch_id: branchId, wdate, wshift },
    );
    setRunning(false);
    if (err || !data) return setError(err || "Problem In Process");
    setResult(
      bulk
        ? `${data.message} ${data.data.shifts?.length ?? 0} date/shift(s), ${data.data.rows} attendance rows.`
        : `${data.message} ${data.data.rows} attendance rows for ${wdate} shift ${wshift}.`,
    );
  };

  const shift = shifts.find((s) => s.shift === wshift) ?? null;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, maxWidth: 640 }}>
      <Typography variant="h6">{bulk ? "Attendance Process - BULK" : "Attendance Process"}</Typography>
      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {branchId == null && <Alert severity="info">Select a company and branch in the sidebar.</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {bulk ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField size="small" type="date" label="From" value={fromDate} InputLabelProps={{ shrink: true }}
              onChange={(e) => setFromDate(e.target.value)} />
            <TextField size="small" type="date" label="To" value={toDate} InputLabelProps={{ shrink: true }}
              onChange={(e) => setToDate(e.target.value)} />
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField size="small" type="date" label="Date" value={wdate} InputLabelProps={{ shrink: true }}
              onChange={(e) => setWdate(e.target.value)} />
            <Autocomplete
              size="small"
              options={shifts}
              value={shift}
              getOptionLabel={(s) => `${s.shift} (${s.start} - ${s.end})`}
              isOptionEqualToValue={(o, v) => o.shift === v.shift}
              onChange={(_, v) => setWshift(v ? v.shift : "")}
              renderInput={(params) => <TextField {...params} label="Shift" required />}
            />
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" disabled={running || branchId == null} onClick={askProcess}>
            {running ? "Processing..." : "Process"}
          </Button>
        </Box>
        {result && <Alert severity="success" onClose={() => setResult(null)}>{result}</Alert>}
      </Paper>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Attendance Process</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulk
              ? `Do you want to process attendance from ${fromDate} to ${toDate}? Processed attendance of these dates is rebuilt.`
              : `Do you want to process ${wdate} shift ${wshift}?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button variant="contained" onClick={() => void handleProcess()}>Yes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
