"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, handleGridEnterKey } from "@/components/ui/entryGrid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  deleteHolidayTran,
  fetchHolidayProcessSetup,
  fetchHolidayTrans,
  processHoliday,
  saveHolidayTran,
  type HolidayOption,
} from "@/utils/hrmsService";

interface Option {
  value: string;
  label: string;
}

interface GridRow {
  eb_id: number | "";
  hours: string;
  saved_id: number | null;
  dirty: boolean;
  /** false = written by the holiday process: shown read-only */
  manual: boolean;
  emp_label: string;
}

const EMPTY_HOLIDAYS: HolidayOption[] = Object.freeze([]) as unknown as HolidayOption[];
const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

const lineSchema = z.object({
  branch_id: z.number().int().positive("Select a branch in the sidebar"),
  holiday_id: z.number().int().positive("Select a holiday date"),
  eb_id: z.number().int().positive("Select an employee"),
  holiday_hours: z.number().gt(0, "Hours must be above 0").max(24, "Hours cannot exceed 24"),
  holiday_tran_id: z.number().int().positive().optional(),
});

/** Blank row; hours carry forward from the previous line (usually the same for everyone). */
const blankRow = (hours = ""): GridRow => ({
  eb_id: "",
  hours,
  saved_id: null,
  dirty: false,
  manual: true,
  emp_label: "",
});

const isSavedClean = (r: GridRow) => r.saved_id != null && !r.dirty;
const isBlank = (r: GridRow) => r.eb_id === "";
const isComplete = (r: GridRow) => {
  const h = Number(r.hours);
  return r.eb_id !== "" && r.hours.trim() !== "" && h > 0 && h <= 24;
};

const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Holiday Process Entry — for one holiday date (holiday_master, latest first):
 * "Entry" opens a spreadsheet grid of employee + holiday hours rows saved into
 * hrms_holiday_transactions (manual = 1), row by row or via Save All, like the
 * winding production grid. Process-generated rows (manual = 0) show read-only.
 * Scoped by the sidebar company/branch.
 */
export default function HolidayProcessEntryPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? Number(selectedBranches[0]) : undefined;

  const [holidays, setHolidays] = useState<HolidayOption[]>(EMPTY_HOLIDAYS);
  const [employees, setEmployees] = useState<Option[]>(EMPTY_OPTIONS);
  const [holidayId, setHolidayId] = useState<number | "">("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow()]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const notify = useCallback(
    (message: string, severity: "success" | "error" = "error") => setSnackbar({ message, severity }),
    [],
  );

  // Holidays + employees follow the sidebar company/branch.
  useEffect(() => {
    setHolidayId("");
    setEntryOpen(false);
    if (coId == null || branchId == null) return;
    let cancelled = false;
    fetchHolidayProcessSetup(coId, branchId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        notify(error || "Failed to load holidays");
        return;
      }
      setHolidays(data.data.holidays ?? EMPTY_HOLIDAYS);
      setEmployees(data.data.employees ?? EMPTY_OPTIONS);
    });
    return () => {
      cancelled = true;
    };
  }, [coId, branchId, notify]);

  const employeeById = useMemo(() => {
    const m = new Map<number, Option>();
    for (const o of employees) m.set(Number(o.value), o);
    return m;
  }, [employees]);

  /** Load the table for a holiday (defaults to the selected one). */
  // EB No. already in the grid for this holiday → "processed" or "entered"; blocks re-selection.
  const usedEb = useMemo(() => {
    const m = new Map<number, "processed" | "entered">();
    for (const r of rows) if (r.eb_id !== "") m.set(r.eb_id, r.manual ? "entered" : "processed");
    return m;
  }, [rows]);

  const handleEntry = async (id: number | "" = holidayId) => {
    if (branchId == null || id === "") return;
    setBusy(true);
    const { data, error } = await fetchHolidayTrans(branchId, id);
    setBusy(false);
    if (error || !data) {
      notify(error || "Failed to load holiday entries");
      return;
    }
    const saved: GridRow[] = data.data.map((t) => ({
      eb_id: t.eb_id,
      hours: t.holiday_hours != null ? String(t.holiday_hours) : "",
      saved_id: t.holiday_tran_id,
      dirty: false,
      manual: t.manual === 1,
      emp_label: t.emp_label,
    }));
    setRows([...saved, blankRow(saved.at(-1)?.hours ?? "")]);
    setEntryOpen(true);
  };

  const handleProcess = async () => {
    const parsed = lineSchema.pick({ branch_id: true, holiday_id: true }).safeParse({
      branch_id: branchId,
      holiday_id: holidayId === "" ? undefined : holidayId,
    });
    if (!parsed.success) {
      notify(parsed.error.issues[0].message);
      return;
    }
    if (!confirm("Process this holiday? Previously processed rows are replaced; manual entries are kept.")) return;
    setBusy(true);
    const { data, error } = await processHoliday(parsed.data);
    setBusy(false);
    if (error || !data) {
      notify(error || "Holiday process failed");
      return;
    }
    notify(
      `${data.data.eligible} employees eligible (attendance of ${data.data.attendance_date})`,
      "success",
    );
    void handleEntry();
  };

  const setRowField = useCallback(<K extends keyof GridRow>(index: number, key: K, value: GridRow[K]) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value, dirty: true };
      // Trailing blank row once the last row is complete.
      if (index === next.length - 1 && isComplete(next[index])) next.push(blankRow(next[index].hours));
      return next;
    });
  }, []);

  /** Save one row; returns false (and notifies) on failure. */
  const saveRow = async (index: number, r: GridRow): Promise<boolean> => {
    const parsed = lineSchema.safeParse({
      branch_id: branchId,
      holiday_id: holidayId === "" ? undefined : holidayId,
      eb_id: r.eb_id === "" ? undefined : r.eb_id,
      holiday_hours: Number(r.hours),
      holiday_tran_id: r.saved_id ?? undefined,
    });
    if (!parsed.success) {
      notify(`Row ${index + 1}: ${parsed.error.issues[0].message}`);
      return false;
    }
    const { data, error } = await saveHolidayTran(parsed.data);
    if (error || !data) {
      notify(`Row ${index + 1}: ${error || "Save failed"}`);
      return false;
    }
    setRows((prev) =>
      prev.map((row, j) => (j === index ? { ...row, saved_id: data.holiday_tran_id, dirty: false } : row)),
    );
    return true;
  };

  const handleSaveRow = async (index: number) => {
    setBusy(true);
    if (await saveRow(index, rows[index])) notify(`Row ${index + 1} saved`, "success");
    setBusy(false);
  };

  const handleSaveAll = async () => {
    setBusy(true);
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isBlank(r) || isSavedClean(r) || !r.manual) continue;
      if (!(await saveRow(i, r))) break; // rows before the failure stay saved
      count += 1;
    }
    setBusy(false);
    if (count > 0) notify(count === 1 ? "1 row saved" : `${count} rows saved`, "success");
  };

  const handleRemove = async (index: number) => {
    const r = rows[index];
    if (r.saved_id != null) {
      if (!confirm(`Delete holiday hours for ${employeeById.get(Number(r.eb_id))?.label ?? r.emp_label}?`)) return;
      setBusy(true);
      const { error } = await deleteHolidayTran(r.saved_id);
      setBusy(false);
      if (error) {
        notify(error);
        return;
      }
    }
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [blankRow()];
    });
  };

  const pending = rows.filter((r) => r.manual && !isBlank(r) && !isSavedClean(r));
  const canSaveAll = pending.length > 0 && pending.every(isComplete);
  const savedCount = rows.filter((r) => r.saved_id != null).length;
  const processedCount = rows.filter((r) => !r.manual).length;

  // Filters the table only; unselected (new-entry) rows always stay visible, row # keeps its index.
  const query = search.trim().toLowerCase();
  const matchesSearch = (r: GridRow) =>
    !query ||
    r.eb_id === "" ||
    (employeeById.get(r.eb_id)?.label ?? r.emp_label).toLowerCase().includes(query);

  return (
    <Box className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Holiday Process Entry
      </Typography>

      <Paper className="flex flex-wrap items-center gap-3 p-4">
        <TextField
          select
          size="small"
          label="Holiday Date"
          value={holidayId === "" ? "" : String(holidayId)}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : "";
            setHolidayId(id);
            setEntryOpen(false);
            void handleEntry(id);
          }}
          sx={{ minWidth: 280 }}
          disabled={branchId == null}
          helperText={branchId == null ? "Select a branch in the sidebar" : undefined}
        >
          {holidays.map((h) => (
            <MenuItem key={h.holiday_id} value={String(h.holiday_id)}>
              {h.holiday_date} — {h.holiday}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => void handleEntry()} disabled={holidayId === "" || busy}>
          Entry
        </Button>
        <Button variant="outlined" onClick={() => void handleProcess()} disabled={holidayId === "" || busy}>
          {busy ? "Working..." : "Process"}
        </Button>
      </Paper>

      {entryOpen && (
        <Paper className="flex flex-col gap-3 p-4" sx={entryGridCellColorsSx}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {savedCount} saved {savedCount === 1 ? "entry" : "entries"} — {processedCount} processed,{" "}
              {savedCount - processedCount} manual
            </Typography>
            <TextField
              size="small"
              type="search"
              placeholder="Search EB No. or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 260 }}
            />
          </Box>
          <TableContainer sx={{ overflowX: "auto" }} onKeyDown={handleGridEnterKey}>
            <Table
              size="small"
              sx={{
                minWidth: 600,
                border: "1px solid",
                borderColor: "divider",
                borderCollapse: "collapse",
                "& .MuiInputBase-input": { fontSize: "0.875rem" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                  <TableCell sx={{ ...headCellSx, minWidth: 320 }}>EB No. / Name</TableCell>
                  <TableCell align="right" sx={{ ...headCellSx, width: 140 }}>
                    Holiday Hours
                  </TableCell>
                  <TableCell align="center" sx={{ ...headCellSx, width: 120 }}>
                    Save
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => !matchesSearch(r) ? null : (
                  <TableRow key={`holiday-row-${i}`}>
                    <TableCell sx={cellSx}>{i + 1}</TableCell>
                    <TableCell sx={cellSx}>
                      {r.manual ? (
                        <Autocomplete
                          autoHighlight
                          size="small"
                          options={employees}
                          getOptionLabel={(o) => o.label}
                          value={r.eb_id === "" ? null : employeeById.get(r.eb_id) ?? null}
                          onChange={(_, v) => setRowField(i, "eb_id", v ? Number(v.value) : "")}
                          isOptionEqualToValue={(o, v) => o.value === v.value}
                          getOptionDisabled={(o) => usedEb.has(Number(o.value)) && Number(o.value) !== r.eb_id}
                          renderOption={(props, o) => {
                            const { key, ...optionProps } = props;
                            const used = Number(o.value) !== r.eb_id ? usedEb.get(Number(o.value)) : undefined;
                            return (
                              <li key={key} {...optionProps}>
                                {o.label}
                                {used && (
                                  <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                                    already {used}
                                  </Typography>
                                )}
                              </li>
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="standard"
                              placeholder="EB No."
                              InputProps={{ ...params.InputProps, disableUnderline: true }}
                            />
                          )}
                        />
                      ) : (
                        <Typography variant="body2">{r.emp_label}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={cellSx}>
                      <TextField
                        type="number"
                        size="small"
                        variant="standard"
                        value={r.hours}
                        disabled={!r.manual}
                        onChange={(e) => setRowField(i, "hours", e.target.value)}
                        InputProps={{ disableUnderline: true }}
                        inputProps={{
                          step: "any",
                          min: 0,
                          max: 24,
                          "aria-label": `Row ${i + 1} holiday hours`,
                          style: { textAlign: "right" },
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                      {!r.manual ? (
                        <Chip size="small" label="Processed" />
                      ) : isSavedClean(r) ? (
                        <Chip size="small" color="success" label="Saved" />
                      ) : (
                        <Tooltip title={`Save row ${i + 1}`}>
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!isComplete(r) || busy}
                              onClick={() => void handleSaveRow(i)}
                              aria-label={`Save row ${i + 1}`}
                            >
                              <SaveIcon size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={r.saved_id != null ? "Delete entry" : "Remove row"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!r.manual || busy || (isBlank(r) && rows.length <= 1)}
                            onClick={() => void handleRemove(i)}
                            aria-label={`Remove row ${i + 1}`}
                          >
                            <DeleteIcon size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setEntryOpen(false)}>Close</Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon size={18} />}
              onClick={() => void handleSaveAll()}
              disabled={!canSaveAll || busy}
            >
              {busy ? "Saving..." : "Save All"}
            </Button>
          </Box>
        </Paper>
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
