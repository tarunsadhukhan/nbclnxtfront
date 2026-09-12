"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
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
import { Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, fullScreenBesideSidebar, handleGridEnterKey } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import { beamingTotals, fortnightEndFor, isFortnightEnd, periodLabel } from "./beamingTotals";
import type {
  BeamingEntryRecord,
  BeamingGridLine,
  BeamingProdSetup,
  MachineOption,
  Option,
  QualityOption,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_MACHINES: MachineOption[] = Object.freeze([]) as unknown as MachineOption[];
const EMPTY_QUALITIES: QualityOption[] = Object.freeze([]) as unknown as QualityOption[];
const EMPTY_SETUP: BeamingProdSetup = Object.freeze({
  dept: null,
  machines: EMPTY_MACHINES,
  shifts: EMPTY_OPTIONS,
  qualities: EMPTY_QUALITIES,
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const blankLine = (): BeamingGridLine => ({ quality_id: "", prod_qty: "" });

const isLineBlank = (l: BeamingGridLine): boolean => l.quality_id === "" && l.prod_qty.trim() === "";

/** Keyed number or NaN when empty, so Zod reports it as missing. */
const toNum = (s: string): number => (s.trim() === "" ? Number.NaN : Number(s));

const fmt = (n: number, dp: number): string => (Number.isFinite(n) ? n.toFixed(dp) : "");

const machineFilter = createFilterOptions<MachineOption>({ stringify: (o) => `${o.code} ${o.name}` });
const qualityFilter = createFilterOptions<QualityOption>({ stringify: (o) => o.label });

// Shared spreadsheet-cell styling — full grid lines and tight padding.
const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/** Payload rules mirrored from the API (spec §3) — checked before submit. */
const entrySchema = z
  .object({
    branch_id: z.number({ error: "Select a branch in the sidebar" }).int(),
    fne_date: z.string().refine(isFortnightEnd, "F/N E. Date must be the 15th or the last day of the month"),
    shift: z.string().trim().min(1, "Select the W. Shift"),
    machine_id: z.number({ error: "Select the machine" }).int(),
    mach_hrs: z.number({ error: "Enter Mach. HR" }).positive("Mach. HR must be greater than 0"),
    lost_hrs: z.number({ error: "Lost HR must be a number" }).min(0, "Lost HR must be zero or more"),
    lines: z
      .array(
        z.object({
          quality_id: z.number({ error: "Select the Q. Code on every line" }).int(),
          prod_qty: z.number({ error: "Enter Prod_KG on every line" }).positive("Prod_KG must be greater than 0"),
        }),
      )
      .min(1, "Enter at least one quality line"),
  })
  .refine((e) => e.lost_hrs <= e.mach_hrs, { message: "Lost HR cannot exceed Mach. HR", path: ["lost_hrs"] })
  .refine((e) => new Set(e.lines.map((l) => l.quality_id)).size === e.lines.length, {
    message: "A quality code is entered twice",
    path: ["lines"],
  });

type EntryPayload = z.infer<typeof entrySchema>;

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  numeric?: boolean;
}

/** Derived/display-only field; skipped by Enter navigation (readOnly). */
function ReadOnlyField({ label, value, numeric = false }: ReadOnlyFieldProps) {
  return (
    <TextField
      size="small"
      label={label}
      value={value}
      slotProps={{
        input: { readOnly: true },
        htmlInput: { tabIndex: -1, style: numeric ? { textAlign: "right" } : undefined },
        inputLabel: { shrink: true },
      }}
    />
  );
}

interface HoursFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function HoursField({ label, value, onChange }: HoursFieldProps) {
  return (
    <TextField
      type="number"
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        htmlInput: { step: "any", min: 0, style: { textAlign: "right" } },
        inputLabel: { shrink: true },
      }}
    />
  );
}

/**
 * "Prod - Beaming" entry dialog, laid out like the legacy Smart Eye screen:
 * company/location/F/N date/shift/department on top, machine + hours and the
 * derived Eff/Div HR, values, KAV and Rate1-3 on the left, and the quality
 * grid (SlNo, Q. Code, Q. Name, Prod_KG, Rate, Amt) on the right with a
 * trailing blank row. Derived values are previewed with beamingTotals(); the
 * server resolves rates and vw_beaming_prod_hdr is the source of truth.
 */
export default function CreateBeamProductionPage({ open, onClose, onSaved, editId }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const branchName = selectedCompany?.branches.find((b) => b.branch_id === branchId)?.branch_name ?? "";
  const isEdit = editId !== undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState<BeamingProdSetup>(EMPTY_SETUP);
  const [loaded, setLoaded] = useState<BeamingEntryRecord | null>(null);

  const [fneDate, setFneDate] = useState("");
  const [shift, setShift] = useState("");
  const [machineId, setMachineId] = useState<number | "">("");
  const [machHrs, setMachHrs] = useState("");
  const [lostHrs, setLostHrs] = useState("");
  const [lines, setLines] = useState<BeamingGridLine[]>(() => [blankLine()]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const notifyError = useCallback((message: string) => setSnackbar({ open: true, message }), []);

  /** Load a saved entry into the form, or reset to a blank one (Cancel uses this too). */
  const applyRecord = useCallback((rec: BeamingEntryRecord | null) => {
    setFneDate(rec ? rec.fne_date.slice(0, 10) : fortnightEndFor(todayIso()));
    setShift(rec?.shift ?? "");
    setMachineId(rec?.machine_id ?? "");
    setMachHrs(rec ? String(rec.mach_hrs) : "");
    setLostHrs(rec ? String(rec.lost_hrs) : "");
    setLines([
      ...(rec?.lines ?? []).map((l) => ({ quality_id: l.quality_id, prod_qty: String(l.prod_qty) })),
      blankLine(),
    ]);
  }, []);

  // Branch-scoped dropdowns, refreshed whenever the dialog opens.
  useEffect(() => {
    if (!open || coId == null) return;
    if (branchId == null) {
      notifyError("Select a branch in the sidebar");
      return;
    }
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId), branch_id: String(branchId) });
      const { data, error } = await fetchWithCookie<{ data: BeamingProdSetup }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data?.data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setSetup(data.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  // Blank form for create; header + lines for edit.
  useEffect(() => {
    if (!open) return;
    if (editId === undefined) {
      setLoaded(null);
      applyRecord(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await fetchWithCookie<{ data: BeamingEntryRecord }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_BY_ID}/${editId}`,
        "GET",
      );
      setLoading(false);
      if (cancelled) return;
      if (error || !data?.data) {
        notifyError(error || "Failed to load beaming entry");
        return;
      }
      setLoaded(data.data);
      applyRecord(data.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editId, applyRecord, notifyError]);

  const machineById = useMemo(
    () => new Map(setup.machines.map((o) => [Number(o.value), o])),
    [setup.machines],
  );
  const qualityById = useMemo(
    () => new Map(setup.qualities.map((o) => [Number(o.value), o])),
    [setup.qualities],
  );

  const setLine = useCallback((index: number, patch: Partial<BeamingGridLine>) => {
    setLines((prev) => {
      const next = prev.map((l, i) => (i === index ? { ...l, ...patch } : l));
      // Always keep one trailing blank row, like the legacy "*" row.
      if (!isLineBlank(next[next.length - 1])) next.push(blankLine());
      return next;
    });
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 && isLineBlank(next[next.length - 1]) ? next : [...next, blankLine()];
    });
  }, []);

  const filledLines = useMemo(() => lines.filter((l) => !isLineBlank(l)), [lines]);

  const totals = useMemo(
    () =>
      beamingTotals(
        Number(machHrs) || 0,
        Number(lostHrs) || 0,
        filledLines.map((l) => ({
          prodQty: Number(l.prod_qty) || 0,
          rate: (l.quality_id === "" ? null : qualityById.get(l.quality_id)?.quality_rate) ?? 0,
        })),
      ),
    [machHrs, lostHrs, filledLines, qualityById],
  );

  const parsed = useMemo(
    () =>
      entrySchema.safeParse({
        branch_id: branchId ?? Number.NaN,
        fne_date: fneDate,
        shift,
        machine_id: machineId === "" ? Number.NaN : machineId,
        mach_hrs: toNum(machHrs),
        lost_hrs: lostHrs.trim() === "" ? 0 : Number(lostHrs),
        lines: filledLines.map((l) => ({
          quality_id: l.quality_id === "" ? Number.NaN : l.quality_id,
          prod_qty: toNum(l.prod_qty),
        })),
      }),
    [branchId, fneDate, shift, machineId, machHrs, lostHrs, filledLines],
  );
  const firstIssue = parsed.success ? null : (parsed.error.issues[0]?.message ?? "Invalid entry");
  const touched = machineId !== "" || filledLines.length > 0 || machHrs.trim() !== "";
  const fneDateInvalid = fneDate !== "" && !isFortnightEnd(fneDate);

  const handleSave = async () => {
    if (!parsed.success) {
      notifyError(firstIssue ?? "Invalid entry");
      return;
    }
    const body: EntryPayload = parsed.data;
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await fetchWithCookie(`${apiRoutesPortalMasters.BEAMING_PROD_EDIT}/${editId}`, "PUT", body);
        if (error) throw new Error(error);
        onSaved?.("Beaming entry updated");
        onClose();
      } else {
        const { error } = await fetchWithCookie<{ beaming_hdr_id: number }>(
          apiRoutesPortalMasters.BEAMING_PROD_CREATE,
          "POST",
          body,
        );
        if (error) throw new Error(error);
        onSaved?.("Beaming entry saved");
        // Next machine for the same fortnight and shift, like the legacy form.
        setMachineId("");
        setMachHrs("");
        setLostHrs("");
        setLines([blankLine()]);
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !window.confirm("Delete this beaming entry?")) return;
    setSaving(true);
    try {
      const { error } = await fetchWithCookie(`${apiRoutesPortalMasters.BEAMING_PROD_DELETE}/${editId}`, "DELETE");
      if (error) throw new Error(error);
      onSaved?.("Beaming entry deleted");
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const dept = setup.dept;
  const machine = machineId === "" ? null : (machineById.get(machineId) ?? null);

  return (
    <>
      <Dialog open={open} onClose={onClose} {...fullScreenBesideSidebar}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {isEdit ? "Prod - Beaming (Edit)" : "Prod - Beaming"}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              onKeyDown={handleGridEnterKey}
              sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}
            >
              {/* Header: company, location, fortnight, shift, department */}
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "2fr 1fr 1fr 1fr" },
                }}
              >
                <ReadOnlyField label="Company" value={selectedCompany?.co_name ?? ""} />
                <TextField
                  type="date"
                  size="small"
                  label="F/N E. Date"
                  value={fneDate}
                  onChange={(e) => setFneDate(e.target.value)}
                  error={fneDateInvalid}
                  helperText={fneDateInvalid ? "Must be the 15th or the month end" : undefined}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
                <ReadOnlyField label="Period" value={periodLabel(fneDate)} />
                <TextField
                  select
                  size="small"
                  label="W. Shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  required
                >
                  {setup.shifts.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <ReadOnlyField label="Location" value={branchName} />
                <ReadOnlyField
                  label="Department"
                  value={dept ? `${dept.dept_desc}${dept.dept_code ? ` / ${dept.dept_code}` : ""}` : ""}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "minmax(300px, 400px) 1fr" },
                  alignItems: "start",
                }}
              >
                {/* Left: machine, hours and derived values (legacy two-column block) */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <Autocomplete
                      autoHighlight
                      options={setup.machines}
                      filterOptions={machineFilter}
                      getOptionLabel={(o) => o.code}
                      value={machine}
                      onChange={(_, v) => setMachineId(v ? Number(v.value) : "")}
                      isOptionEqualToValue={(o, v) => o.value === v.value}
                      size="small"
                      renderInput={(params) => <TextField {...params} label="Machine" required />}
                    />
                    <ReadOnlyField label="Machine Name" value={machine?.name ?? ""} />
                    <HoursField label="Mach. HR" value={machHrs} onChange={setMachHrs} />
                    <ReadOnlyField label="Div. HR" value={fmt(totals.divHrs, 2)} numeric />
                    <HoursField label="Lost HR" value={lostHrs} onChange={setLostHrs} />
                    <ReadOnlyField label="Prod." value={fmt(totals.prodQty, 2)} numeric />
                    <ReadOnlyField label="Eff. HR" value={fmt(totals.effHrs, 2)} numeric />
                    <ReadOnlyField label="Prod. Value" value={fmt(totals.prodValue, 2)} numeric />
                    <ReadOnlyField label="L.HR Value" value={fmt(totals.lhrValue, 2)} numeric />
                    <ReadOnlyField label="Total Value" value={fmt(totals.totalValue, 2)} numeric />
                    <ReadOnlyField label="KAV" value={fmt(totals.kav, 6)} numeric />
                    <span />
                    <span />
                    <ReadOnlyField label="Rate1" value={fmt(totals.rate1, 6)} numeric />
                    <span />
                    <ReadOnlyField label="Rate2" value={fmt(totals.rate2, 6)} numeric />
                    <span />
                    <ReadOnlyField label="Rate3" value={fmt(totals.rate3, 6)} numeric />
                  </Box>
                </Box>

                {/* Right: quality lines */}
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table
                    size="small"
                    sx={{ minWidth: 640, borderCollapse: "collapse", "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: 52 }}>SlNo</TableCell>
                        <TableCell sx={{ ...headCellSx, minWidth: 130 }}>Q. Code</TableCell>
                        <TableCell sx={{ ...headCellSx, minWidth: 200 }}>Q. Name</TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 110 }}>
                          Prod_KG
                        </TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                          Rate
                        </TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                          Amt
                        </TableCell>
                        <TableCell sx={{ ...headCellSx, width: 44 }} aria-label="Remove line" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lines.map((l, i) => {
                        const q = l.quality_id === "" ? null : (qualityById.get(l.quality_id) ?? null);
                        const qty = Number(l.prod_qty);
                        const amt =
                          q?.quality_rate != null && l.prod_qty.trim() !== "" && Number.isFinite(qty)
                            ? qty * q.quality_rate
                            : null;
                        const trailing = i === lines.length - 1 && isLineBlank(l);
                        return (
                          <TableRow key={`beam-line-${i}`}>
                            <TableCell sx={cellSx}>{trailing ? "*" : i + 1}</TableCell>
                            <TableCell sx={cellSx}>
                              <Autocomplete
                                autoHighlight
                                options={setup.qualities}
                                filterOptions={qualityFilter}
                                getOptionLabel={(o) => o.code}
                                renderOption={(props, o) => {
                                  const { key, ...rest } = props;
                                  return (
                                    <li key={key} {...rest}>
                                      {o.label}
                                    </li>
                                  );
                                }}
                                value={q}
                                onChange={(_, v) => setLine(i, { quality_id: v ? Number(v.value) : "" })}
                                isOptionEqualToValue={(o, v) => o.value === v.value}
                                size="small"
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    variant="standard"
                                    placeholder="Q. Code"
                                    InputProps={{ ...params.InputProps, disableUnderline: true }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell sx={cellSx}>{q?.name ?? ""}</TableCell>
                            <TableCell align="right" sx={cellSx}>
                              <TextField
                                type="number"
                                size="small"
                                variant="standard"
                                value={l.prod_qty}
                                onChange={(e) => setLine(i, { prod_qty: e.target.value })}
                                InputProps={{ disableUnderline: true }}
                                inputProps={{
                                  step: "any",
                                  min: 0,
                                  "aria-label": `Line ${i + 1} Prod_KG`,
                                  style: { textAlign: "right" },
                                }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={cellSx}>
                              {q?.quality_rate != null ? q.quality_rate.toFixed(6) : ""}
                            </TableCell>
                            <TableCell align="right" sx={cellSx}>
                              {amt != null ? amt.toFixed(2) : ""}
                            </TableCell>
                            <TableCell align="center" sx={cellSx}>
                              {!trailing && (
                                <Tooltip title="Remove line">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeLine(i)}
                                    aria-label={`Remove line ${i + 1}`}
                                  >
                                    <DeleteIcon size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {touched && firstIssue && <Alert severity="info">{firstIssue}</Alert>}

              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button variant="contained" onClick={handleSave} disabled={!parsed.success || saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={() => applyRecord(loaded)} disabled={saving}>
                    Cancel
                  </Button>
                  {isEdit && (
                    <Button color="error" onClick={handleDelete} disabled={saving}>
                      Delete
                    </Button>
                  )}
                </Box>
                <Button variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
