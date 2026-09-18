"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { Save as SaveIcon } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, handleGridEnterKey } from "@/components/ui/entryGrid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchGatePassRows, saveGatePassRows, type GatePassRow } from "@/utils/hrmsService";

const EMPTY_ROWS: GatePassRow[] = Object.freeze([]) as unknown as GatePassRow[];

const payloadSchema = z.object({
  branch_id: z.number().int().positive("Select a branch in the sidebar"),
  rows: z
    .array(
      z.object({
        daily_atten_id: z.number().int().positive(),
        idle_hours: z.number({ message: "Gate pass hours must be a number" }).min(0, "Gate pass hours cannot be negative"),
      }),
    )
    .min(1, "Nothing to save"),
});

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Gate Pass Correction — for a date, lists approved (status 3) daily attendance
 * rows of the sidebar branch and lets only Gate Pass Hours (daily_attendance.idle_hours)
 * be corrected. EB No. and working hours are read-only; Save All is all-or-nothing.
 */
export default function GatePassCorrectionPage() {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? Number(selectedBranches[0]) : undefined;

  const [attDate, setAttDate] = useState(today);
  const [rows, setRows] = useState<GatePassRow[]>(EMPTY_ROWS);
  /** daily_atten_id -> edited hours text; only changed rows are present */
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const notify = useCallback(
    (message: string, severity: "success" | "error" = "error") => setSnackbar({ message, severity }),
    [],
  );

  const load = useCallback(() => {
    setEdits({});
    if (branchId == null || !attDate) {
      setRows(EMPTY_ROWS);
      return () => undefined;
    }
    let cancelled = false;
    setBusy(true);
    fetchGatePassRows(branchId, attDate).then(({ data, error }) => {
      if (cancelled) return;
      setBusy(false);
      if (error || !data) {
        setRows(EMPTY_ROWS);
        notify(error || "Failed to load attendance");
        return;
      }
      setRows(data.data);
    });
    return () => {
      cancelled = true;
    };
  }, [branchId, attDate, notify]);

  useEffect(() => load(), [load]);

  const byId = new Map(rows.map((r) => [r.daily_atten_id, r]));
  const changed = Object.entries(edits)
    .map(([id, text]) => ({ row: byId.get(Number(id)), text }))
    .filter((c): c is { row: GatePassRow; text: string } => c.row != null && Number(c.text || 0) !== c.row.idle_hours);
  const rowError = (r: GatePassRow): string | null => {
    const text = edits[r.daily_atten_id];
    if (text == null) return null;
    const n = Number(text || 0);
    if (!Number.isFinite(n) || n < 0) return "Invalid";
    if (n > r.working_hours) return "> working hrs";
    return null;
  };
  const hasErrors = rows.some((r) => rowError(r) != null);

  const handleSaveAll = async () => {
    const parsed = payloadSchema.safeParse({
      branch_id: branchId,
      rows: changed.map((c) => ({ daily_atten_id: c.row.daily_atten_id, idle_hours: Number(c.text || 0) })),
    });
    if (!parsed.success) {
      notify(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { data, error } = await saveGatePassRows(parsed.data);
    setBusy(false);
    if (error || !data) {
      notify(error || "Save failed");
      return;
    }
    const saved = new Map(parsed.data.rows.map((r) => [r.daily_atten_id, r.idle_hours]));
    setRows((prev) => prev.map((r) => (saved.has(r.daily_atten_id) ? { ...r, idle_hours: saved.get(r.daily_atten_id) ?? 0 } : r)));
    setEdits({});
    notify(data.saved === 1 ? "1 row saved" : `${data.saved} rows saved`, "success");
  };

  const term = search.trim().toLowerCase();
  const visibleRows = term
    ? rows.filter((r) => `${r.eb_no} ${r.worker_name}`.toLowerCase().includes(term))
    : rows;

  return (
    <Box className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Gate Pass Correction
      </Typography>

      <Paper className="flex flex-wrap items-center gap-3 p-4">
        <TextField
          type="date"
          size="small"
          label="Attendance Date"
          value={attDate}
          onChange={(e) => {
            if (changed.length > 0 && !confirm("Discard unsaved changes?")) return;
            setAttDate(e.target.value);
          }}
          InputLabelProps={{ shrink: true }}
          disabled={branchId == null}
          helperText={branchId == null ? "Select a branch in the sidebar" : undefined}
        />
        <TextField
          type="search"
          size="small"
          placeholder="Search EB No. or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ "aria-label": "Search EB No. or name" }}
          sx={{ width: 280, maxWidth: "100%" }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {busy ? "Loading..." : `${rows.length} approved ${rows.length === 1 ? "row" : "rows"}`}
        </Typography>
      </Paper>

      {rows.length > 0 && (
        <Paper className="flex flex-col gap-3 p-4" sx={entryGridCellColorsSx}>
          <TableContainer sx={{ overflowX: "auto", maxHeight: "65vh" }} onKeyDown={handleGridEnterKey}>
            <Table
              size="small"
              stickyHeader
              sx={{
                minWidth: 900,
                borderCollapse: "collapse",
                "& .MuiInputBase-input": { fontSize: "0.875rem" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                  <TableCell sx={headCellSx}>EB No.</TableCell>
                  <TableCell sx={headCellSx}>Name</TableCell>
                  <TableCell sx={headCellSx}>Spell</TableCell>
                  <TableCell sx={headCellSx}>Department</TableCell>
                  <TableCell sx={headCellSx}>Designation</TableCell>
                  <TableCell align="right" sx={headCellSx}>Working Hours</TableCell>
                  <TableCell align="right" sx={{ ...headCellSx, width: 140 }}>Gate Pass Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((r, i) => {
                  const err = rowError(r);
                  return (
                    <TableRow key={r.daily_atten_id}>
                      <TableCell sx={cellSx}>{i + 1}</TableCell>
                      <TableCell sx={cellSx}>{r.eb_no}</TableCell>
                      <TableCell sx={cellSx}>{r.worker_name}</TableCell>
                      <TableCell sx={cellSx}>{r.spell}</TableCell>
                      <TableCell sx={cellSx}>{r.worked_department}</TableCell>
                      <TableCell sx={cellSx}>{r.worked_designation}</TableCell>
                      <TableCell align="right" sx={cellSx}>{r.working_hours}</TableCell>
                      <TableCell align="right" sx={cellSx}>
                        <TextField
                          type="number"
                          size="small"
                          variant="standard"
                          value={edits[r.daily_atten_id] ?? String(r.idle_hours)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEdits((prev) => ({ ...prev, [r.daily_atten_id]: value }));
                          }}
                          error={err != null}
                          helperText={err ?? undefined}
                          InputProps={{ disableUnderline: err == null }}
                          inputProps={{
                            step: "0.01",
                            min: 0,
                            max: r.working_hours,
                            "aria-label": `Gate pass hours for ${r.eb_no}`,
                            style: { textAlign: "right" },
                          }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {changed.length} changed
            </Typography>
            <Button
              variant="contained"
              startIcon={<SaveIcon size={18} />}
              onClick={() => void handleSaveAll()}
              disabled={changed.length === 0 || hasErrors || busy}
            >
              {busy ? "Saving..." : "Save All"}
            </Button>
          </Box>
        </Paper>
      )}

      {!busy && branchId != null && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No approved attendance for this date.
        </Typography>
      )}

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity ?? "success"} onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
