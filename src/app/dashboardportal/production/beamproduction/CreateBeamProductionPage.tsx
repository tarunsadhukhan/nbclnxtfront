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
  MenuItem,
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
import { entryGridCellColorsSx, fullScreenBesideSidebar, handleGridEnterKey } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import type {
  BeamingProdGridRow,
  BeamingProdRecord,
  BeamingProdSetup,
  Option,
  QualityOption,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_QUALITIES: QualityOption[] = Object.freeze([]) as unknown as QualityOption[];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const blankGridRow = (): BeamingProdGridRow => ({
  machine_id: "",
  quality_id: "",
  prod_qty: "",
  wk_hrs: "",
  lost_hrs: "",
  saved_id: null,
  dirty: false,
  remarks: null,
});

/** Saved and untouched since — shown as "Saved", skipped by Save All. */
function isRowSavedClean(row: BeamingProdGridRow): boolean {
  return row.saved_id != null && !row.dirty;
}

/** A row is "complete" when it can become a saved line: machine + quality chosen, qty > 0. */
function isRowComplete(row: BeamingProdGridRow): boolean {
  const qty = Number(row.prod_qty);
  return (
    row.machine_id !== "" &&
    row.quality_id !== "" &&
    row.prod_qty.trim() !== "" &&
    Number.isFinite(qty) &&
    qty > 0
  );
}

/** A wholly-blank row (e.g. the trailing auto-added row) is ignored on save. */
function isRowBlank(row: BeamingProdGridRow): boolean {
  return (
    row.machine_id === "" &&
    row.quality_id === "" &&
    row.prod_qty.trim() === "" &&
    row.wk_hrs.trim() === "" &&
    row.lost_hrs.trim() === ""
  );
}

function optionalHourValid(value: string): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

function hoursValid(row: BeamingProdGridRow): boolean {
  return optionalHourValid(row.wk_hrs) && optionalHourValid(row.lost_hrs);
}

/** Read-only cell display for the rate / derived hours ("—" until known). */
function fmtNum(n: number | null): string {
  return n != null && Number.isFinite(n) ? String(n) : "—";
}

// Shared spreadsheet-cell styling — full grid lines (theme divider token) and
// tight padding, applied to every TableCell instead of repeating it per cell.
const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Create / edit dialog for Beaming Production entries — one spreadsheet-style
 * grid for both modes. Production Date + Spell are entered once at the top;
 * below is an Excel-like bordered grid of machine/quality/qty rows.
 *
 * CREATE: the last row auto-extends into a fresh blank row once complete, and
 * one POST saves every non-blank row as a bulk batch. EDIT: the record loads
 * as a single editable grid row (no auto-extend) and Save PUTs that record.
 * The rate shows read-only from the quality master; Div Hrs shows wk_hrs * 3.
 * The server resolves the real rate and computes amount/divisible hours.
 */
export default function CreateBeamProductionPage({
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
  const [machines, setMachines] = useState<Option[]>(EMPTY_OPTIONS);
  const [shifts, setShifts] = useState<Option[]>(EMPTY_OPTIONS);
  const [qualities, setQualities] = useState<QualityOption[]>(EMPTY_QUALITIES);

  const [prodDate, setProdDate] = useState("");
  const [shift, setShift] = useState("");
  const [rows, setRows] = useState<BeamingProdGridRow[]>(() => [blankGridRow()]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  // Dropdown options, refreshed whenever the dialog opens for a new branch.
  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: BeamingProdSetup }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setMachines(data.data?.machines ?? EMPTY_OPTIONS);
      setShifts(data.data?.shifts ?? EMPTY_OPTIONS);
      setQualities(data.data?.qualities ?? EMPTY_QUALITIES);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) return;
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: BeamingProdRecord }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load beaming entry");
      const rec = data.data;
      setProdDate((rec.prod_date ?? "").slice(0, 10));
      setShift(rec.shift ?? "");
      setRows([
        {
          machine_id: rec.machine_id ?? "",
          quality_id: rec.quality_id ?? "",
          prod_qty: rec.prod_qty != null ? String(rec.prod_qty) : "",
          wk_hrs: rec.wk_hrs != null ? String(rec.wk_hrs) : "",
          lost_hrs: rec.lost_hrs != null ? String(rec.lost_hrs) : "",
          saved_id: rec.beaming_prod_id,
          dirty: false,
          remarks: rec.remarks ?? null,
        },
      ]);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading beaming entry");
    } finally {
      setLoading(false);
    }
  }, [editId, notifyError]);

  useEffect(() => {
    if (!open) return;
    if (editId !== undefined) {
      void loadRecord();
    } else {
      setProdDate(todayIso());
      setShift("");
      setRows([blankGridRow()]);
    }
  }, [open, editId, loadRecord]);

  const machineById = useMemo(() => {
    const m = new Map<number, Option>();
    for (const o of machines) m.set(Number(o.value), o);
    return m;
  }, [machines]);

  const qualityById = useMemo(() => {
    const m = new Map<number, QualityOption>();
    for (const o of qualities) m.set(Number(o.value), o);
    return m;
  }, [qualities]);

  const setRowField = useCallback(
    <K extends keyof BeamingProdGridRow>(index: number, key: K, value: BeamingProdGridRow[K]) => {
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

  // Date/spell apply to every row — changing them makes saved rows pending again.
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

  const headerValid = prodDate.trim() !== "" && shift.trim() !== "";
  const rowSaveable = (r: BeamingProdGridRow) =>
    headerValid && isRowComplete(r) && hoursValid(r);

  // Save All only sends pending rows (unsaved or edited); "Saved" rows are skipped.
  const canSaveAll =
    pendingRows.length > 0 && nonBlankRows.every((r) => rowSaveable(r));

  /** POST a new row or PUT an already-saved one; returns the row's server id. */
  const saveRowRequest = async (
    r: BeamingProdGridRow,
  ): Promise<{ id: number | null; error: string | null }> => {
    const body = {
      branch_id: branchId ?? null,
      prod_date: prodDate,
      shift,
      machine_id: r.machine_id,
      quality_id: r.quality_id,
      prod_qty: Number(r.prod_qty),
      wk_hrs: r.wk_hrs.trim() === "" ? null : Number(r.wk_hrs),
      lost_hrs: r.lost_hrs.trim() === "" ? null : Number(r.lost_hrs),
      remarks: r.remarks,
    };
    if (r.saved_id != null) {
      const { error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BEAMING_PROD_EDIT}/${r.saved_id}`,
        "PUT",
        body,
      );
      return { id: r.saved_id, error: error ?? null };
    }
    const { data, error } = await fetchWithCookie<{ beaming_prod_id: number }>(
      apiRoutesPortalMasters.BEAMING_PROD_CREATE,
      "POST",
      body,
    );
    return { id: data?.beaming_prod_id ?? null, error: error ?? null };
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

  const title = isEdit ? "Edit Beaming Production" : "Create Beaming Production";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        {...fullScreenBesideSidebar}
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
            <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}>
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
                  label="Production Date"
                  value={prodDate}
                  onChange={(e) => {
                    setProdDate(e.target.value);
                    markSavedRowsDirty();
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
                <TextField
                  select
                  size="small"
                  label="Spell / Shift"
                  value={shift}
                  onChange={(e) => {
                    setShift(e.target.value);
                    markSavedRowsDirty();
                  }}
                >
                  {shifts.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <TableContainer sx={{ overflowX: "auto" }} onKeyDown={handleGridEnterKey}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 900,
                    border: "1px solid",
                    borderColor: "divider",
                    borderCollapse: "collapse",
                    "& .MuiInputBase-input": { fontSize: "0.875rem" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 170 }}>MC No.</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 230 }}>Q-Code / Quality</TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                        Rate
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 110 }}>
                        Prod KG/YDS
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                        WK Hrs
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                        Lost Hrs
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                        Div Hrs
                      </TableCell>
                      <TableCell align="center" sx={{ ...headCellSx, width: 110 }}>
                        Save
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => {
                      const quality = r.quality_id === "" ? undefined : qualityById.get(r.quality_id);
                      const wk = Number(r.wk_hrs);
                      // ponytail: divisible hrs = wk hrs * 3, mirrored from the DB generated column
                      const divHrs =
                        r.wk_hrs.trim() !== "" && Number.isFinite(wk) && wk >= 0 ? wk * 3 : null;
                      return (
                        <TableRow key={`beam-row-${i}`}>
                          <TableCell sx={cellSx}>{i + 1}</TableCell>
                          <TableCell sx={cellSx}>
                            <Autocomplete
                              autoHighlight
                              options={machines}
                              getOptionLabel={(opt) => opt.label}
                              value={r.machine_id === "" ? null : machineById.get(r.machine_id) ?? null}
                              onChange={(_, newVal) =>
                                setRowField(i, "machine_id", newVal ? Number(newVal.value) : "")
                              }
                              isOptionEqualToValue={(opt, val) => opt.value === val.value}
                              size="small"
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  variant="standard"
                                  placeholder="MC No."
                                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Autocomplete
                              autoHighlight
                              options={qualities}
                              getOptionLabel={(opt) => opt.label}
                              value={r.quality_id === "" ? null : qualityById.get(r.quality_id) ?? null}
                              onChange={(_, newVal) =>
                                setRowField(i, "quality_id", newVal ? Number(newVal.value) : "")
                              }
                              isOptionEqualToValue={(opt, val) => opt.value === val.value}
                              size="small"
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  variant="standard"
                                  placeholder="Q-Code"
                                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {fmtNum(quality?.quality_rate ?? null)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              value={r.prod_qty}
                              onChange={(e) => setRowField(i, "prod_qty", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} prod qty`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 92 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              placeholder="—"
                              value={r.wk_hrs}
                              onChange={(e) => setRowField(i, "wk_hrs", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} work hrs`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 76 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              placeholder="—"
                              value={r.lost_hrs}
                              onChange={(e) => setRowField(i, "lost_hrs", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} lost hrs`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 76 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {fmtNum(divHrs)}
                            </Typography>
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
