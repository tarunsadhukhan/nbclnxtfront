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
  MachineOption,
  Option,
  QualityOption,
  WeavingProdGridRow,
  WeavingProdRecord,
  WeavingProdSetup,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_MACHINES: MachineOption[] = Object.freeze([]) as unknown as MachineOption[];
const EMPTY_QUALITIES: QualityOption[] = Object.freeze([]) as unknown as QualityOption[];

/** Payable share of the value — the sheet's PAYBLE AMT is a flat 80%. */
const PAYABLE_PCT = 0.8;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const blankGridRow = (): WeavingProdGridRow => ({
  eb_id: "",
  machine_id: "",
  machine_id2: "",
  line_no: "",
  quality_id: "",
  wk_hrs: "",
  prod: "",
  saved_id: null,
  dirty: false,
  remarks: null,
});

/** Carry-forward row: quality repeats from the previous line (type and rate
 * derive from it). */
const carryForwardRow = (from: WeavingProdGridRow): WeavingProdGridRow => ({
  ...blankGridRow(),
  quality_id: from.quality_id,
});

/** Saved and untouched since — shown as "Saved", skipped by Save All. */
function isRowSavedClean(row: WeavingProdGridRow): boolean {
  return row.saved_id != null && !row.dirty;
}

/** A row is "complete" when it can become a saved line: worker, MC-1 and
 * quality chosen, prod > 0. */
function isRowComplete(row: WeavingProdGridRow): boolean {
  const prod = Number(row.prod);
  return (
    row.eb_id !== "" &&
    row.machine_id !== "" &&
    row.quality_id !== "" &&
    row.prod.trim() !== "" &&
    Number.isFinite(prod) &&
    prod > 0
  );
}

/** A trailing auto-added row (quality carried forward, so only the
 * user-keyed fields count) is treated as blank and ignored on save. */
function isRowBlank(row: WeavingProdGridRow): boolean {
  return (
    row.eb_id === "" &&
    row.machine_id === "" &&
    row.prod.trim() === "" &&
    row.wk_hrs.trim() === ""
  );
}

// Shared spreadsheet-cell styling — full grid lines (theme divider token) and
// tight padding, applied to every TableCell instead of repeating it per cell.
const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Create / edit dialog for Weaving Production entries — one spreadsheet-style
 * grid for both modes. Production Date + Spell are entered once at the top;
 * below is an Excel-like bordered grid of worker/loom/quality rows saved
 * ROW BY ROW (each row POSTs on first save, PUTs thereafter).
 *
 * CREATE: once the last row is complete a fresh row is auto-added with the
 * quality carried forward (worker/looms/prod blank; type and rate display
 * from the selected quality master row). A saved, unedited row shows a green
 * "Saved" chip; any edit (or a header date/spell change) makes it pending
 * again. "Save All" loops the pending rows, skipping blanks and saved-clean
 * rows. EDIT: the record loads as a single grid row with its saved id. Rate,
 * value and payable preview from the wages quality master; the server
 * resolves the real rate at save time.
 */
export default function CreateWeavingProductionPage({
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
  const [shifts, setShifts] = useState<Option[]>(EMPTY_OPTIONS);
  const [machines, setMachines] = useState<MachineOption[]>(EMPTY_MACHINES);
  const [qualities, setQualities] = useState<QualityOption[]>(EMPTY_QUALITIES);

  const [prodDate, setProdDate] = useState("");
  const [shift, setShift] = useState("");
  const [rows, setRows] = useState<WeavingProdGridRow[]>(() => [blankGridRow()]);

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
      const { data, error } = await fetchWithCookie<{ data: WeavingProdSetup }>(
        `${apiRoutesPortalMasters.WEAVING_PROD_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setEmployees(data.data?.employees ?? EMPTY_OPTIONS);
      setShifts(data.data?.shifts ?? EMPTY_OPTIONS);
      setMachines(data.data?.machines ?? EMPTY_MACHINES);
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
      const { data, error } = await fetchWithCookie<{ data: WeavingProdRecord }>(
        `${apiRoutesPortalMasters.WEAVING_PROD_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load weaving entry");
      const rec = data.data;
      setProdDate((rec.prod_date ?? "").slice(0, 10));
      setShift(rec.shift ?? "");
      setRows([
        {
          eb_id: rec.eb_id ?? "",
          machine_id: rec.machine_id ?? "",
          machine_id2: rec.machine_id2 ?? "",
          line_no: rec.line_no ?? "",
          quality_id: rec.quality_id ?? "",
          wk_hrs: rec.wk_hrs != null ? String(rec.wk_hrs) : "",
          prod: rec.prod_qty != null ? String(rec.prod_qty) : "",
          saved_id: rec.weaving_prod_id,
          dirty: false,
          remarks: rec.remarks ?? null,
        },
      ]);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading weaving entry");
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

  const employeeById = useMemo(() => {
    const m = new Map<number, Option>();
    for (const o of employees) m.set(Number(o.value), o);
    return m;
  }, [employees]);

  const machineById = useMemo(() => {
    const m = new Map<number, MachineOption>();
    for (const o of machines) m.set(Number(o.value), o);
    return m;
  }, [machines]);

  const qualityById = useMemo(() => {
    const m = new Map<number, QualityOption>();
    for (const o of qualities) m.set(Number(o.value), o);
    return m;
  }, [qualities]);

  const setRowField = useCallback(
    <K extends keyof WeavingProdGridRow>(index: number, key: K, value: WeavingProdGridRow[K]) => {
      setRows((prev) => {
        const next = [...prev];
        // Any change makes the row pending again ("Saved" clears until re-saved).
        next[index] = { ...next[index], [key]: value, dirty: true };
        // Auto-add a fresh row (quality carried forward) once the
        // LAST row becomes complete (create only).
        if (!isEdit && index === next.length - 1 && isRowComplete(next[index])) {
          next.push(carryForwardRow(next[index]));
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
  const rowSaveable = (r: WeavingProdGridRow) => headerValid && isRowComplete(r);

  // Save All only sends pending rows (unsaved or edited); "Saved" rows are skipped.
  const canSaveAll =
    pendingRows.length > 0 && nonBlankRows.every((r) => rowSaveable(r));

  /** POST a new row or PUT an already-saved one; returns the row's server id. */
  const saveRowRequest = async (
    r: WeavingProdGridRow,
  ): Promise<{ id: number | null; error: string | null }> => {
    const body = {
      branch_id: branchId ?? null,
      prod_date: prodDate,
      shift,
      eb_id: r.eb_id,
      machine_id: r.machine_id,
      machine_id2: r.machine_id2 === "" ? null : r.machine_id2,
      line_no: r.line_no.trim() || null,
      quality_id: r.quality_id,
      wk_hrs: r.wk_hrs.trim() === "" ? null : Number(r.wk_hrs),
      prod_qty: Number(r.prod),
      remarks: r.remarks,
    };
    if (r.saved_id != null) {
      const { error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.WEAVING_PROD_EDIT}/${r.saved_id}`,
        "PUT",
        body,
      );
      return { id: r.saved_id, error: error ?? null };
    }
    const { data, error } = await fetchWithCookie<{ weaving_prod_id: number }>(
      apiRoutesPortalMasters.WEAVING_PROD_CREATE,
      "POST",
      body,
    );
    return { id: data?.weaving_prod_id ?? null, error: error ?? null };
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

  const title = isEdit ? "Edit Weaving Production" : "Create Weaving Production";

  /** Reusable loom cell — MC-1 and MC-2 differ only by field key. */
  const renderMachineCell = (
    i: number,
    key: "machine_id" | "machine_id2",
    row: WeavingProdGridRow,
  ) => (
    <TableCell sx={cellSx}>
      <Autocomplete
        autoHighlight
        options={machines}
        getOptionLabel={(opt) => opt.label}
        value={row[key] === "" ? null : machineById.get(row[key] as number) ?? null}
        onChange={(_, newVal) =>
          setRowField(i, key, newVal ? Number(newVal.value) : "")
        }
        isOptionEqualToValue={(opt, val) => opt.value === val.value}
        size="small"
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder={key === "machine_id" ? "MC-1" : "MC-2"}
            InputProps={{ ...params.InputProps, disableUnderline: true }}
          />
        )}
      />
    </TableCell>
  );

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
                    minWidth: 1250,
                    border: "1px solid",
                    borderColor: "divider",
                    borderCollapse: "collapse",
                    "& .MuiInputBase-input": { fontSize: "0.875rem" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 180 }}>EB No.</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 100 }}>MC-1</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 100 }}>MC-2</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 70 }}>Line</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 220 }}>Q-Code / Quality</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 60 }}>Type</TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 80 }}>
                        Wk Hrs
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                        Prod
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 100 }}>
                        Rate
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 80 }}>
                        Value
                      </TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, minWidth: 80 }}>
                        Payable
                      </TableCell>
                      <TableCell align="center" sx={{ ...headCellSx, width: 110 }}>
                        Save
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => {
                      const quality =
                        r.quality_id === "" ? undefined : qualityById.get(r.quality_id);
                      const rate = quality?.quality_rate ?? null;
                      const prod = Number(r.prod);
                      const amount =
                        rate != null && r.prod.trim() !== "" && Number.isFinite(prod) && prod > 0
                          ? Math.round(rate * prod * 100) / 100
                          : null;
                      const payable =
                        amount != null ? Math.round(amount * PAYABLE_PCT * 100) / 100 : null;
                      return (
                        <TableRow key={`weave-row-${i}`}>
                          <TableCell sx={cellSx}>{i + 1}</TableCell>
                          <TableCell sx={cellSx}>
                            <Autocomplete
                              autoHighlight
                              options={employees}
                              getOptionLabel={(opt) => opt.label}
                              value={r.eb_id === "" ? null : employeeById.get(r.eb_id) ?? null}
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
                          {renderMachineCell(i, "machine_id", r)}
                          {renderMachineCell(i, "machine_id2", r)}
                          <TableCell sx={cellSx}>
                            <TextField
                              size="small"
                              variant="standard"
                              value={r.line_no}
                              onChange={(e) => setRowField(i, "line_no", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{ "aria-label": `Row ${i + 1} line no` }}
                              sx={{ width: 55 }}
                            />
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Autocomplete
                              autoHighlight
                              options={qualities}
                              getOptionLabel={(opt) => opt.label}
                              value={quality ?? null}
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
                          <TableCell sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {quality?.quality_type ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              value={r.wk_hrs}
                              onChange={(e) => setRowField(i, "wk_hrs", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} wk hrs`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 65 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              value={r.prod}
                              onChange={(e) => setRowField(i, "prod", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{
                                step: "any",
                                min: 0,
                                "aria-label": `Row ${i + 1} prod`,
                                style: { textAlign: "right" },
                              }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {rate != null ? rate.toFixed(6) : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {amount != null ? amount.toFixed(2) : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={cellSx}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                              {payable != null ? payable.toFixed(2) : "—"}
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
