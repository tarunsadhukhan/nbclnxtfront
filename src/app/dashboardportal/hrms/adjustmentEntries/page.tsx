"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
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
  createFilterOptions,
} from "@mui/material";
import { Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, handleGridEnterKey } from "@/components/ui/entryGrid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  deleteAdjustment,
  fetchAdjustmentSetup,
  fetchAdjustmentsByDate,
  saveAdjustment,
} from "@/utils/hrmsService";

interface Option {
  value: string;
  label: string;
}

type AmountKey = "hours" | "pf" | "npf";

interface GridRow {
  eb_id: number | "";
  hours: string;
  pf: string;
  npf: string;
  saved_id: number | null;
  dirty: boolean;
  emp_label: string;
}

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const defaultEmployeeFilter = createFilterOptions<Option>();

// Bounds follow the column precision: adj_hours decimal(6,3), amounts decimal(8,2).
const lineSchema = z
  .object({
    branch_id: z.number().int().positive("Select a branch in the sidebar"),
    adj_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
    eb_id: z.number().int().positive("Select an employee"),
    adj_hours: z.number().min(-999.999, "Hours out of range").max(999.999, "Hours out of range"),
    adj_pf_amt: z.number().min(-999999.99, "PF amount out of range").max(999999.99, "PF amount out of range"),
    adj_npf_amt: z.number().min(-999999.99, "Non-PF amount out of range").max(999999.99, "Non-PF amount out of range"),
    adjustment_id: z.number().int().positive().optional(),
  })
  .refine((v) => v.adj_hours !== 0 || v.adj_pf_amt !== 0 || v.adj_npf_amt !== 0, {
    message: "Enter hours, PF amount or non-PF amount",
  });

const blankRow = (): GridRow => ({ eb_id: "", hours: "", pf: "", npf: "", saved_id: null, dirty: false, emp_label: "" });

/** Blank / invalid text counts as 0 for the "has a value" check; the schema catches non-numbers. */
const num = (s: string) => (s.trim() === "" ? 0 : Number(s));
const isSavedClean = (r: GridRow) => r.saved_id != null && !r.dirty;
const isBlank = (r: GridRow) => r.eb_id === "";
const isComplete = (r: GridRow) =>
  r.eb_id !== "" &&
  [r.hours, r.pf, r.npf].every((s) => Number.isFinite(num(s))) &&
  [r.hours, r.pf, r.npf].some((s) => num(s) !== 0);

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

const AMOUNT_COLUMNS: { key: AmountKey; label: string; step: string }[] = [
  { key: "hours", label: "Adj. Hours", step: "0.001" },
  { key: "pf", label: "Adj. PF Amt", step: "0.01" },
  { key: "npf", label: "Adj. Non-PF Amt", step: "0.01" },
];

/**
 * Adjustment Entries — picking a date loads a spreadsheet grid of
 * employee + adjustment hours / PF amount / non-PF amount rows saved into
 * `adjustments`, row by row or via Save All (same grid as Holiday Process Entry).
 * Employees are scoped by the sidebar company/branch; delete is a soft delete.
 */
export default function AdjustmentEntriesPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? Number(selectedBranches[0]) : undefined;

  const [employees, setEmployees] = useState<Option[]>(EMPTY_OPTIONS);
  const [adjDate, setAdjDate] = useState(today);
  const [entryOpen, setEntryOpen] = useState(false);
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow()]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const notify = useCallback(
    (message: string, severity: "success" | "error" = "error") => setSnackbar({ message, severity }),
    [],
  );

  // Employees follow the sidebar company/branch.
  useEffect(() => {
    if (coId == null || branchId == null) return;
    let cancelled = false;
    fetchAdjustmentSetup(coId, branchId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        notify(error || "Failed to load employees");
        return;
      }
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

  // One entry per EB No. per date: employees already on the grid are hidden from other rows' dropdowns.
  // (The backend enforces the same rule on save.)
  const usedEbIds = useMemo(() => new Set(rows.map((r) => r.eb_id).filter((id) => id !== "")), [rows]);

  // Saved rows load whenever the date or branch changes.
  useEffect(() => {
    setEntryOpen(false);
    if (branchId == null || !adjDate) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    fetchAdjustmentsByDate(branchId, adjDate).then(({ data, error }) => {
      if (cancelled) return;
      setBusy(false);
      if (error || !data) {
        notify(error || "Failed to load adjustments");
        return;
      }
      const str = (n: number | null) => (n != null && n !== 0 ? String(n) : "");
      const saved: GridRow[] = data.data.map((a) => ({
        eb_id: a.eb_id,
        hours: str(a.adj_hours),
        pf: str(a.adj_pf_amt),
        npf: str(a.adj_npf_amt),
        saved_id: a.adjustment_id,
        dirty: false,
        emp_label: a.emp_label,
      }));
      setRows([...saved, blankRow()]);
      setEntryOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [branchId, adjDate, notify]);

  const setRowField = useCallback(<K extends keyof GridRow>(index: number, key: K, value: GridRow[K]) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value, dirty: true };
      // Trailing blank row once the last row is complete.
      if (index === next.length - 1 && isComplete(next[index])) next.push(blankRow());
      return next;
    });
  }, []);

  /** Save one row; returns false (and notifies) on failure. */
  const saveRow = async (index: number, r: GridRow): Promise<boolean> => {
    const parsed = lineSchema.safeParse({
      branch_id: branchId,
      adj_date: adjDate,
      eb_id: r.eb_id === "" ? undefined : r.eb_id,
      adj_hours: num(r.hours),
      adj_pf_amt: num(r.pf),
      adj_npf_amt: num(r.npf),
      adjustment_id: r.saved_id ?? undefined,
    });
    if (!parsed.success) {
      notify(`Row ${index + 1}: ${parsed.error.issues[0].message}`);
      return false;
    }
    const { data, error } = await saveAdjustment(parsed.data);
    if (error || !data) {
      notify(`Row ${index + 1}: ${error || "Save failed"}`);
      return false;
    }
    setRows((prev) =>
      prev.map((row, j) => (j === index ? { ...row, saved_id: data.adjustment_id, dirty: false } : row)),
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
      if (isBlank(r) || isSavedClean(r)) continue;
      if (!(await saveRow(i, r))) break; // rows before the failure stay saved
      count += 1;
    }
    setBusy(false);
    if (count > 0) notify(count === 1 ? "1 row saved" : `${count} rows saved`, "success");
  };

  const handleRemove = async (index: number) => {
    const r = rows[index];
    if (r.saved_id != null && branchId != null) {
      if (!confirm(`Delete adjustment for ${employeeById.get(Number(r.eb_id))?.label ?? r.emp_label}?`)) return;
      setBusy(true);
      const { error } = await deleteAdjustment(r.saved_id, branchId);
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

  const pending = rows.filter((r) => !isBlank(r) && !isSavedClean(r));
  const canSaveAll = pending.length > 0 && pending.every(isComplete);
  const savedCount = rows.filter((r) => r.saved_id != null).length;

  // Filter by EB No. / name; blank rows stay visible so entry can continue. Indices stay original.
  const term = search.trim().toLowerCase();
  const visibleRows = rows
    .map((r, i) => ({ r, i }))
    .filter(
      ({ r }) =>
        !term ||
        isBlank(r) ||
        (employeeById.get(Number(r.eb_id))?.label ?? r.emp_label).toLowerCase().includes(term),
    );

  return (
    <Box className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Adjustment Entries
      </Typography>

      <Paper className="flex flex-wrap items-center gap-3 p-4">
        <TextField
          type="date"
          size="small"
          label="Adjustment Date"
          value={adjDate}
          onChange={(e) => {
            if (pending.length > 0 && !confirm("Discard unsaved rows?")) return;
            setAdjDate(e.target.value);
          }}
          InputLabelProps={{ shrink: true }}
          disabled={branchId == null}
          helperText={branchId == null ? "Select a branch in the sidebar" : busy && !entryOpen ? "Loading..." : undefined}
        />
      </Paper>

      {entryOpen && (
        <Paper className="flex flex-col gap-3 p-4" sx={entryGridCellColorsSx}>
          <Box className="flex flex-wrap items-center justify-between gap-3">
            <Typography variant="body2" color="text.secondary">
              {savedCount} saved {savedCount === 1 ? "entry" : "entries"}
            </Typography>
            <TextField
              type="search"
              size="small"
              placeholder="Search EB No. or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputProps={{ "aria-label": "Search EB No. or name" }}
              sx={{ width: 280, maxWidth: "100%" }}
            />
          </Box>
          <TableContainer sx={{ overflowX: "auto" }} onKeyDown={handleGridEnterKey}>
            <Table
              size="small"
              sx={{
                minWidth: 820,
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
                  {AMOUNT_COLUMNS.map((c) => (
                    <TableCell key={c.key} align="right" sx={{ ...headCellSx, width: 140 }}>
                      {c.label}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ ...headCellSx, width: 120 }}>
                    Save
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map(({ r, i }) => (
                  <TableRow key={`adjustment-row-${i}`}>
                    <TableCell sx={cellSx}>{i + 1}</TableCell>
                    <TableCell sx={cellSx}>
                      <Autocomplete
                        autoHighlight
                        size="small"
                        options={employees}
                        filterOptions={(opts, state) =>
                          defaultEmployeeFilter(
                            opts.filter((o) => Number(o.value) === r.eb_id || !usedEbIds.has(Number(o.value))),
                            state,
                          )
                        }
                        getOptionLabel={(o) => o.label}
                        value={r.eb_id === "" ? null : employeeById.get(r.eb_id) ?? null}
                        onChange={(_, v) => setRowField(i, "eb_id", v ? Number(v.value) : "")}
                        isOptionEqualToValue={(o, v) => o.value === v.value}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="standard"
                            placeholder={r.emp_label || "EB No."}
                            InputProps={{ ...params.InputProps, disableUnderline: true }}
                          />
                        )}
                      />
                    </TableCell>
                    {AMOUNT_COLUMNS.map((c) => (
                      <TableCell key={c.key} align="right" sx={cellSx}>
                        <TextField
                          type="number"
                          size="small"
                          variant="standard"
                          value={r[c.key]}
                          onChange={(e) => setRowField(i, c.key, e.target.value)}
                          InputProps={{ disableUnderline: true }}
                          inputProps={{
                            step: c.step,
                            "aria-label": `Row ${i + 1} ${c.label}`,
                            style: { textAlign: "right" },
                          }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                      {isSavedClean(r) ? (
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
                            disabled={busy || (isBlank(r) && rows.length <= 1)}
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
