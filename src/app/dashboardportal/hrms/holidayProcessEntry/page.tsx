"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import HolidayEmployeesDialog from "./HolidayEmployeesDialog";
import type { HolidaySetup, PeriodHoliday } from "./types";

const fmtDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("-") : "—");

/** Day before / after an ISO date (legacy grid shows both as attendance choices). */
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Holiday Process / Entry — legacy Smart Eye FrmHolidayProcess. Pick a wages
 * fortnight; its holidays are listed with the attendance date that decides
 * eligibility (8+ duty hours that day earns 8 holiday hours). Process makes
 * the eligible employees; Employees opens the list for manual add / edit.
 */
export default function HolidayProcessEntryPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [setup, setSetup] = useState<HolidaySetup>({ periods: [], employees: [] });
  const [periodId, setPeriodId] = useState("");
  const [holidays, setHolidays] = useState<PeriodHoliday[]>([]);
  // attendance date per holiday_id, editable before Process
  const [attDates, setAttDates] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [openHoliday, setOpenHoliday] = useState<PeriodHoliday | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const notify = (message: string, severity: "success" | "error") => setSnackbar({ open: true, message, severity });

  useEffect(() => {
    if (coId == null || branchId == null) return;
    (async () => {
      const { data, error } = await fetchWithCookie<{ data: HolidaySetup }>(
        `${apiRoutesPortalMasters.HOLIDAY_PROCESS_SETUP}?co_id=${coId}&branch_id=${branchId}`,
        "GET",
      );
      if (error || !data) {
        notify(error || "Failed to load periods", "error");
        return;
      }
      setSetup(data.data);
      setPeriodId("");
      setHolidays([]);
    })();
  }, [coId, branchId]);

  const loadHolidays = useCallback(async () => {
    if (branchId == null || periodId === "") {
      setHolidays([]);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchWithCookie<{ data: PeriodHoliday[] }>(
      `${apiRoutesPortalMasters.HOLIDAY_PROCESS_HOLIDAYS}?branch_id=${branchId}&period_id=${periodId}`,
      "GET",
    );
    setLoading(false);
    if (error || !data) {
      notify(error || "Failed to load holidays", "error");
      return;
    }
    setHolidays(data.data);
    setAttDates(Object.fromEntries(data.data.map((h) => [h.holiday_id, h.attendance_date ?? ""])));
  }, [branchId, periodId]);

  useEffect(() => {
    void loadHolidays();
  }, [loadHolidays]);

  const process = async (h: PeriodHoliday) => {
    if (branchId == null) return;
    setProcessing(h.holiday_id);
    const { data, error } = await fetchWithCookie<{ data: { attendance_date: string; eligible: number } }>(
      apiRoutesPortalMasters.HOLIDAY_PROCESS,
      "POST",
      { branch_id: branchId, holiday_id: h.holiday_id, attendance_date: attDates[h.holiday_id] || null },
    );
    setProcessing(null);
    if (error || !data) {
      notify(error || "Process failed", "error");
      return;
    }
    notify(
      `${fmtDate(h.holiday_date)} processed: ${data.data.eligible} employees eligible (attendance of ${fmtDate(data.data.attendance_date)})`,
      "success",
    );
    void loadHolidays();
  };

  return (
    <Box className="p-4 flex flex-col gap-4">
      <Typography variant="h5">Holiday Process / Entry</Typography>
      {branchId == null && <Alert severity="info">Select a branch in the sidebar.</Alert>}

      <Autocomplete
        autoHighlight
        options={setup.periods}
        value={setup.periods.find((p) => p.value === periodId) ?? null}
        onChange={(_, v) => setPeriodId(v?.value ?? "")}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        size="small"
        sx={{ maxWidth: 420 }}
        renderInput={(params) => <TextField {...params} label="Wages Period" />}
      />

      {loading ? (
        <Box className="flex justify-center p-8">
          <CircularProgress />
        </Box>
      ) : periodId !== "" && holidays.length === 0 ? (
        <Alert severity="info">No holidays in this period — add them in HRMS Master → Holiday Masters.</Alert>
      ) : (
        holidays.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Holiday Date</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Consider Attendance Of</TableCell>
                  <TableCell align="right">Processed</TableCell>
                  <TableCell align="right">Manual</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.holiday_id}>
                    <TableCell>{fmtDate(h.holiday_date)}</TableCell>
                    <TableCell>{h.holiday}</TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={attDates[h.holiday_id] ?? ""}
                        onChange={(e) => setAttDates((prev) => ({ ...prev, [h.holiday_id]: e.target.value }))}
                        inputProps={{
                          max: shiftDay(h.holiday_date, 10),
                          min: shiftDay(h.holiday_date, -10),
                          "aria-label": `Attendance date for ${h.holiday}`,
                        }}
                        helperText={h.attendance_date ? undefined : "No attendance processed before this holiday"}
                      />
                    </TableCell>
                    <TableCell align="right">{h.processed}</TableCell>
                    <TableCell align="right">{h.manual}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={processing != null || !attDates[h.holiday_id]}
                        onClick={() => void process(h)}
                      >
                        {processing === h.holiday_id ? "Processing..." : "Process"}
                      </Button>{" "}
                      <Button size="small" onClick={() => setOpenHoliday(h)}>
                        Employees
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <HolidayEmployeesDialog
        holiday={openHoliday}
        branchId={branchId}
        employees={setup.employees}
        onClose={() => {
          setOpenHoliday(null);
          void loadHolidays();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
