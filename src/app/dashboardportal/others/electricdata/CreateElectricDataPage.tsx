"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { Save as SaveIcon, Trash2 as DeleteIcon, X } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import type {
  ElectricGridRow,
  ElectricRecord,
  ElectricSetup,
  Option,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const blankGridRow = (): ElectricGridRow => ({
  eb_id: "",
  amount: "",
  saved_id: null,
  dirty: false,
  remarks: null,
});

/** Saved and untouched since — shown as "Saved", skipped by Save All. */
function isRowSavedClean(row: ElectricGridRow): boolean {
  return row.saved_id != null && !row.dirty;
}

/** A row is "complete" when it can become a saved line: worker chosen, amount > 0. */
function isRowComplete(row: ElectricGridRow): boolean {
  const amount = Number(row.amount);
  return (
    row.eb_id !== "" &&
    row.amount.trim() !== "" &&
    Number.isFinite(amount) &&
    amount > 0
  );
}

/** A wholly-blank row (e.g. the trailing auto-added row) is ignored on save. */
function isRowBlank(row: ElectricGridRow): boolean {
  return row.eb_id === "" && row.amount.trim() === "";
}

/** Name part of an employee option label ("code - name" -> "name"). */
function nameFromLabel(label: string | undefined): string {
  if (!label) return "—";
  const sep = label.indexOf(" - ");
  return sep >= 0 ? label.slice(sep + 3) : label;
}

// Shared spreadsheet-cell styling — full grid lines (theme divider token) and
// tight padding, applied to every TableCell instead of repeating it per cell.
const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Create / edit dialog for Electric Data entries — one spreadsheet-style
 * grid for both modes. Date is entered once at the top; below is an
 * Excel-like bordered grid of worker/amount rows saved ROW BY ROW (each row
 * POSTs on first save, PUTs thereafter). The worker's name shows read-only
 * from the selected employee.
 *
 * CREATE: once the last row is complete a fresh blank row is auto-added. A
 * saved, unedited row shows a green "Saved" chip; any edit (or a header date
 * change) makes it pending again. "Save All" loops the pending rows,
 * skipping blanks and saved-clean rows. EDIT: the record loads as a single
 * grid row with its saved id.
 */
export default function CreateElectricDataPage({
  open,
  onClose,
  onSaved,
  editId,
}: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const isEdit = editId !== undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Option[]>(EMPTY_OPTIONS);

  const [tranDate, setTranDate] = useState("");
  const [rows, setRows] = useState<ElectricGridRow[]>(() => [blankGridRow()]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  // Employee options, refreshed whenever the dialog opens for a new branch.
  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: ElectricSetup }>(
        `${apiRoutesPortalMasters.ELECTRIC_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load employee options");
        return;
      }
      setEmployees(data.data?.employees ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) return;
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: ElectricRecord }>(
        `${apiRoutesPortalMasters.ELECTRIC_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load electric entry");
      const rec = data.data;
      setTranDate((rec.tran_date ?? "").slice(0, 10));
      setRows([
        {
          eb_id: rec.eb_id ?? "",
          amount: rec.amount != null ? String(rec.amount) : "",
          saved_id: rec.tran_id,
          dirty: false,
          remarks: rec.remarks ?? null,
        },
      ]);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading electric entry");
    } finally {
      setLoading(false);
    }
  }, [editId, notifyError]);

  useEffect(() => {
    if (!open) return;
    if (editId !== undefined) {
      void loadRecord();
    } else {
      setTranDate(todayIso());
      setRows([blankGridRow()]);
    }
  }, [open, editId, loadRecord]);

  const employeeById = useMemo(() => {
    const m = new Map<number, Option>();
    for (const o of employees) m.set(Number(o.value), o);
    return m;
  }, [employees]);

  const setRowField = useCallback(
    <K extends keyof ElectricGridRow>(index: number, key: K, value: ElectricGridRow[K]) => {
      setRows((prev) => {
        const next = [...prev];
        // Any change makes the row pending again ("Saved" clears until re-saved).
        next[index] = { ...next[index], [key]: value, dirty: true };
        // Auto-add a fresh blank row once the LAST row becomes complete (create only).
        if (!isEdit && index === next.length - 1 && isRowComplete(next[index])) {
          next.push(blankGridRow());
        }
        return next;
      });
    },
    [isEdit],
  );

  // Date applies to every row — changing it makes saved rows pending again.
  const markSavedRowsDirty = useCallback(() => {
    setRows((prev) =>
      prev.some((r) => r.saved_id != null && !r.dirty)
        ? prev.map((r) => (r.saved_id != null ? { ...r, dirty: true } : r))
        : prev,
    );
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const nonBlankRows = useMemo(() => rows.filter((r) => !isRowBlank(r)), [rows]);
  const pendingRows = useMemo(() => nonBlankRows.filter((r) => !isRowSavedClean(r)), [nonBlankRows]);

  const headerValid = tranDate.trim() !== "";
  const rowSaveable = (r: ElectricGridRow) => headerValid && isRowComplete(r);

  // Save All only sends pending rows (unsaved or edited); "Saved" rows are skipped.
  const canSaveAll =
    pendingRows.length > 0 && nonBlankRows.every((r) => rowSaveable(r));

  /** POST a new row or PUT an already-saved one; returns the row's server id. */
  const saveRowRequest = async (
    r: ElectricGridRow,
  ): Promise<{ id: number | null; error: string | null }> => {
    const body = {
      branch_id: branchId ?? null,
      tran_date: tranDate,
      eb_id: r.eb_id,
      amount: Number(r.amount),
      remarks: r.remarks,
    };
    if (r.saved_id != null) {
      const { error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.ELECTRIC_EDIT}/${r.saved_id}`,
        "PUT",
        body,
      );
      return { id: r.saved_id, error: error ?? null };
    }
    const { data, error } = await fetchWithCookie<{ tran_id: number }>(
      apiRoutesPortalMasters.ELECTRIC_CREATE,
      "POST",
      body,
    );
    return { id: data?.tran_id ?? null, error: error ?? null };
  };

  const markRowSaved = useCallback((index: number, id: number | null) => {
    setRows((prev) =>
      prev.map((row, j) =>
        j === index ? { ...row, saved_id: id ?? row.saved_id, dirty: false } : row,
      ),
    );
  }, []);

  const handleSaveRow = async (index: number) => {
    setSaving(true);
    try {
      const { id, error } = await saveRowRequest(rows[index]);
      if (error) throw new Error(`Row ${index + 1}: ${error}`);
      markRowSaved(index, id);
      onSaved?.(`Row ${index + 1} saved`);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      let savedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (isRowBlank(r) || isRowSavedClean(r)) continue;
        const { id, error } = await saveRowRequest(r);
        // Rows saved before the failing one keep their "Saved" state.
        if (error) throw new Error(`Row ${i + 1}: ${error}`);
        markRowSaved(i, id);
        savedCount += 1;
      }
      if (savedCount > 0) {
        onSaved?.(savedCount === 1 ? "1 row saved" : `${savedCount} rows saved`);
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? "Edit Electric Data" : "Create Electric Data";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <TextField
                  type="date"
                  size="small"
                  label="Date"
                  value={tranDate}
                  onChange={(e) => {
                    setTranDate(e.target.value);
                    markSavedRowsDirty();
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
              </Box>

              <TableContainer sx={{ overflowX: "auto" }}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 620,
                    border: "1px solid",
                    borderColor: "divider",
                    borderCollapse: "collapse",
                    "& .MuiInputBase-input": { fontSize: "0.875rem" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 170 }}>EB No.</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 190 }}>Name</TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 130 }}>
                        Electric Amount
                      </TableCell>
                      <TableCell align="center" sx={{ ...headCellSx, width: 110 }}>
                        Save
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => {
                      const employee =
                        r.eb_id === "" ? undefined : employeeById.get(r.eb_id);
                      return (
                        <TableRow key={`electric-row-${i}`}>
                          <TableCell sx={cellSx}>{i + 1}</TableCell>
                          <TableCell sx={cellSx}>
                            <Autocomplete
                              options={employees}
                              getOptionLabel={(opt) => opt.label}
                              value={employee ?? null}
                              onChange={(_, newVal) =>
                                setRowField(i, "eb_id", newVal ? Number(newVal.value) : "")
                              }
                              isOptionEqualToValue={(opt, val) => opt.value === val.value}
                              size="small"
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  variant="standard"
                                  placeholder="EB No."
                                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {nameFromLabel(employee?.label)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              value={r.amount}
                              onChange={(e) => setRowField(i, "amount", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} electric amount`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                            {isRowSavedClean(r) ? (
                              <Chip size="small" color="success" label="Saved" />
                            ) : (
                              <Tooltip title={`Save row ${i + 1}`}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    disabled={!rowSaveable(r) || saving}
                                    onClick={() => void handleSaveRow(i)}
                                    aria-label={`Save row ${i + 1}`}
                                  >
                                    <SaveIcon size={16} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip
                              title={
                                r.saved_id != null
                                  ? "Already saved — cannot remove here"
                                  : "Remove row"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={rows.length <= 1 || r.saved_id != null}
                                  onClick={() => removeRow(i)}
                                  aria-label={`Remove row ${i + 1}`}
                                >
                                  <DeleteIcon size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button onClick={onClose}>Close</Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon size={18} />}
                  onClick={handleSaveAll}
                  disabled={!canSaveAll || saving}
                >
                  {saving ? "Saving..." : "Save All"}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
