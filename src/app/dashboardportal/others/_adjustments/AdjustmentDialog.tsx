"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
  Typography,
} from "@mui/material";
import { Save as SaveIcon, Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, fullScreenBesideSidebar, handleGridEnterKey } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { todayIso } from "@/components/reports/reportDates";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import type {
  AdjDocLine,
  AdjDocRow,
  AdjGridRow,
  AdjKind,
  AdjRates,
  AdjSetup,
  Option,
  PeriodOption,
  ShiftOption,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_PERIODS: PeriodOption[] = Object.freeze([]) as unknown as PeriodOption[];
const EMPTY_SHIFTS: ShiftOption[] = Object.freeze([]) as unknown as ShiftOption[];

const blankRow = (): AdjGridRow => ({ eb_id: "", adj_hr: "", adj_amt: "" });
const isBlank = (r: AdjGridRow) => r.eb_id === "" && r.adj_hr.trim() === "" && r.adj_amt.trim() === "";

/** Non-zero number within the backend's range. */
const nonZero = (label: string, max: number) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .refine((n) => n !== 0, `Kindly enter ${label}`)
    .refine((n) => Math.abs(n) <= max, `${label} is out of range`);

/** Save payload — mirrors the backend checks (legacy btnSave_Click). */
function buildSchema(kind: AdjKind) {
  const line = z.object({
    eb_id: z.number({ message: "Select an employee" }),
    adj_hr: kind === "hour" ? nonZero("Adj. Hour", 999) : z.coerce.number().refine((n) => Math.abs(n) <= 999, "Adj HR is out of range"),
    adj_amt: kind === "hour" ? z.unknown().optional() : nonZero("Adj. Amt.", 9_999_999),
  });
  return z.object({
    branch_id: z.number({ message: "Select a branch in the sidebar" }),
    period_id: z.coerce.number({ message: "Select a pay period" }).positive("Select a pay period"),
    dept_code: z.string().min(1, "Department can't be blank"),
    wshift: z.string().min(1, "Shift can't be blank"),
    lines: z.array(line).min(1, "Kindly enter at least one employee line"),
  });
}

const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

interface Props {
  kind: AdjKind;
  title: string;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  /** Document being edited; undefined = create. */
  editDoc?: AdjDocRow;
}

/**
 * Create / edit one adjustment document: pay period + department + shift in
 * the header, an employee grid below, saved as a whole (the backend replaces
 * the document). Adjustment Hour shows the server-computed Adj Day / Basic /
 * DA after save; PF / NPF key Adj HR + Adj Amt.
 */
export default function AdjustmentDialog({ kind, title, open, onClose, onSaved, editDoc }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const isHour = kind === "hour";
  const schema = useMemo(() => buildSchema(kind), [kind]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState<AdjSetup>({
    employees: EMPTY_OPTIONS,
    periods: EMPTY_PERIODS,
    depts: EMPTY_OPTIONS,
    shifts: EMPTY_SHIFTS,
  });
  const [periodId, setPeriodId] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [wshift, setWshift] = useState("");
  const [rows, setRows] = useState<AdjGridRow[]>(() => [blankRow()]);
  // Key of the document as saved — the backend deletes it when the header changes.
  const [orig, setOrig] = useState<{ fne_date: string; dept_code: string; wshift: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: AdjSetup }>(
        `${apiRoutesPortalMasters.PAY_ADJ_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        setError(error || "Failed to load options");
        return;
      }
      setSetup(data.data);
      if (!editDoc) {
        // default to the last completed period (list is newest first)
        const today = todayIso();
        const last = data.data.periods.find((p) => p.to_date != null && p.to_date < today);
        if (last) setPeriodId((prev) => prev || last.value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, editDoc]);

  const loadDoc = useCallback(
    async (doc: { fne_date: string; dept_code: string; wshift: string }) => {
      if (branchId == null) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ branch_id: String(branchId), ...doc });
        const { data, error } = await fetchWithCookie<{ data: AdjDocLine[]; period_id: number | null }>(
          `${apiRoutesPortalMasters.PAY_ADJ_DOC}/${kind}?${params}`,
          "GET",
        );
        if (error || !data) throw new Error(error || "Failed to load document");
        setPeriodId(data.period_id != null ? String(data.period_id) : "");
        setDeptCode(doc.dept_code);
        setWshift(doc.wshift);
        setOrig(doc);
        setRows([
          ...data.data.map((l) => ({
            eb_id: l.eb_id ?? ("" as const),
            adj_hr: String(l.adj_hr ?? ""),
            adj_amt: l.adj_amt != null ? String(l.adj_amt) : "",
            adj_day: l.adj_day,
            adj_bs: l.adj_bs,
            adj_da: l.adj_da,
          })),
          blankRow(),
        ]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading document");
      } finally {
        setLoading(false);
      }
    },
    [kind, branchId],
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editDoc) {
      void loadDoc({ fne_date: editDoc.fne_date, dept_code: editDoc.dept_code, wshift: editDoc.wshift });
    } else {
      setPeriodId("");
      setDeptCode("");
      setWshift("");
      setOrig(null);
      setRows([blankRow()]);
    }
  }, [open, editDoc, loadDoc]);

  const employeeById = useMemo(() => {
    const m = new Map<number, Option>();
    for (const o of setup.employees) m.set(Number(o.value), o);
    return m;
  }, [setup.employees]);

  // Adjustment Hour live preview: per-hour basic / DA at the period's to-date, fetched for
  // employees not yet looked up (null = no wages rate). Reset when the period changes.
  const [rates, setRates] = useState<Record<string, AdjRates[string] | null>>({});
  useEffect(() => setRates({}), [periodId]);
  const missingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rows) if (r.eb_id !== "" && !(String(r.eb_id) in rates)) ids.add(String(r.eb_id));
    return [...ids].join(",");
  }, [rows, rates]);
  useEffect(() => {
    if (!isHour || !open || periodId === "" || missingIds === "") return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ period_id: periodId, eb_ids: missingIds });
      const { data, error } = await fetchWithCookie<{ data: AdjRates }>(
        `${apiRoutesPortalMasters.PAY_ADJ_RATES}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        setError(error || "Failed to load wages rates");
        return;
      }
      setRates((prev) => {
        const next = { ...prev };
        for (const id of missingIds.split(",")) next[id] = data.data[id] ?? null;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isHour, open, periodId, missingIds]);

  const shiftHours = setup.shifts.find((s) => s.value === wshift)?.hours ?? 0;

  /** Adj Day / Basic / DA as legacy shows them on entry; saved values when no rate is loaded yet. */
  const hourCalc = (r: AdjGridRow) => {
    const hr = Number(r.adj_hr);
    const rate = r.eb_id === "" ? undefined : rates[String(r.eb_id)];
    if (r.adj_hr.trim() === "" || !Number.isFinite(hr) || rate === undefined) {
      return { day: r.adj_day, bs: r.adj_bs, da: r.adj_da, noRate: false };
    }
    if (rate === null) return { day: undefined, bs: undefined, da: undefined, noRate: true };
    return {
      day: shiftHours > 0 ? hr / shiftHours : undefined,
      bs: Math.round(hr * rate.bs_hr * 100) / 100,
      da: Math.round(hr * rate.da_hr * 100) / 100,
      noRate: false,
    };
  };

  const setRowField = useCallback(<K extends keyof AdjGridRow>(index: number, key: K, value: AdjGridRow[K]) => {
    setRows((prev) => {
      const next = [...prev];
      // edited lines lose their computed amounts until re-saved
      next[index] = { ...next[index], [key]: value, adj_day: undefined, adj_bs: undefined, adj_da: undefined };
      if (index === next.length - 1 && !isBlank(next[index])) next.push(blankRow());
      return next;
    });
  }, []);

  const handleSave = async () => {
    const lines = rows.filter((r) => !isBlank(r));
    const ebIds = lines.map((r) => r.eb_id);
    const dup = ebIds.findIndex((id, i) => id !== "" && ebIds.indexOf(id) !== i);
    if (dup >= 0) {
      setError(`Employee already selected — line ${dup + 1}`);
      return;
    }
    const parsed = schema.safeParse({
      branch_id: branchId,
      period_id: periodId || undefined,
      dept_code: deptCode,
      wshift,
      lines: lines.map((r) => ({ eb_id: r.eb_id === "" ? undefined : r.eb_id, adj_hr: r.adj_hr || 0, adj_amt: r.adj_amt || 0 })),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const lineNo = issue.path[0] === "lines" && typeof issue.path[1] === "number" ? `Line ${issue.path[1] + 1}: ` : "";
      setError(lineNo + issue.message);
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await fetchWithCookie<{ message: string; fne_date: string }>(
        `${apiRoutesPortalMasters.PAY_ADJ_SAVE}/${kind}`,
        "POST",
        { ...parsed.data, orig },
      );
      if (error || !data) throw new Error(error || "Save failed");
      onSaved(data.message);
      // reload so Adjustment Hour shows the computed day / basic / DA
      await loadDoc({ fne_date: data.fne_date, dept_code: deptCode, wshift });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orig || branchId == null) return;
    if (!window.confirm("Delete this whole adjustment document?")) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ branch_id: String(branchId), ...orig });
      const { data, error } = await fetchWithCookie<{ message: string }>(
        `${apiRoutesPortalMasters.PAY_ADJ_DELETE}/${kind}?${params}`,
        "DELETE",
      );
      if (error || !data) throw new Error(error || "Delete failed");
      onSaved(data.message);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number | undefined, digits = 2) => (n == null ? "—" : n.toFixed(digits));

  return (
    <>
      <Dialog open={open} onClose={onClose} {...fullScreenBesideSidebar}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {orig ? `Edit ${title}` : `Create ${title}`}
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
              sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}
              onKeyDown={handleGridEnterKey}
            >
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 2fr 1fr" }, gap: 2 }}>
                <Autocomplete
                  autoHighlight
                  options={setup.periods}
                  value={setup.periods.find((p) => p.value === periodId) ?? null}
                  onChange={(_, v) => setPeriodId(v?.value ?? "")}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  size="small"
                  renderInput={(params) => <TextField {...params} label="Pay Period (FNE Date)" required />}
                />
                <Autocomplete
                  autoHighlight
                  options={setup.depts}
                  value={setup.depts.find((d) => d.value === deptCode) ?? null}
                  onChange={(_, v) => setDeptCode(v?.value ?? "")}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  size="small"
                  renderInput={(params) => <TextField {...params} label="Department" required />}
                />
                <Autocomplete
                  autoHighlight
                  options={setup.shifts}
                  value={setup.shifts.find((s) => s.value === wshift) ?? null}
                  onChange={(_, v) => setWshift(v?.value ?? "")}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  size="small"
                  renderInput={(params) => <TextField {...params} label="Shift" required />}
                />
              </Box>

              <TableContainer sx={{ overflowX: "auto" }}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 720,
                    border: "1px solid",
                    borderColor: "divider",
                    borderCollapse: "collapse",
                    "& .MuiInputBase-input": { fontSize: "0.875rem" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                      <TableCell sx={{ ...headCellSx, minWidth: 260 }}>Employee</TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, width: 100 }}>Adj HR</TableCell>
                      {isHour ? (
                        <>
                          <TableCell align="right" sx={{ ...headCellSx, width: 90 }}>Adj Day</TableCell>
                          <TableCell align="right" sx={{ ...headCellSx, width: 110 }}>Adj Basic</TableCell>
                          <TableCell align="right" sx={{ ...headCellSx, width: 110 }}>Adj DA</TableCell>
                        </>
                      ) : (
                        <TableCell align="right" sx={{ ...headCellSx, width: 130 }}>Adj Amt</TableCell>
                      )}
                      <TableCell align="center" sx={{ ...headCellSx, width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`adj-row-${i}`}>
                        <TableCell sx={cellSx}>{i + 1}</TableCell>
                        <TableCell sx={cellSx}>
                          <Autocomplete
                            autoHighlight
                            options={setup.employees}
                            value={r.eb_id === "" ? null : employeeById.get(r.eb_id) ?? null}
                            onChange={(_, v) => setRowField(i, "eb_id", v ? Number(v.value) : "")}
                            isOptionEqualToValue={(o, v) => o.value === v.value}
                            size="small"
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="standard"
                                placeholder="EB No. / name"
                                InputProps={{ ...params.InputProps, disableUnderline: true }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell align="right" sx={cellSx}>
                          <TextField
                            type="number"
                            size="small"
                            variant="standard"
                            value={r.adj_hr}
                            onChange={(e) => setRowField(i, "adj_hr", e.target.value)}
                            InputProps={{ disableUnderline: true }}
                            inputProps={{ step: 0.5, "aria-label": `Line ${i + 1} adj hour`, style: { textAlign: "right" } }}
                          />
                        </TableCell>
                        {isHour ? (
                          (() => {
                            const c = hourCalc(r);
                            return c.noRate ? (
                              <TableCell colSpan={3} sx={{ ...cellSx, color: "error.main" }}>
                                No wages rate on or before the FNE date
                              </TableCell>
                            ) : (
                              <>
                                <TableCell align="right" sx={cellSx}>{fmt(c.day, 3)}</TableCell>
                                <TableCell align="right" sx={cellSx}>{fmt(c.bs)}</TableCell>
                                <TableCell align="right" sx={cellSx}>{fmt(c.da)}</TableCell>
                              </>
                            );
                          })()
                        ) : (
                          <TableCell align="right" sx={cellSx}>
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              value={r.adj_amt}
                              onChange={(e) => setRowField(i, "adj_amt", e.target.value)}
                              InputProps={{ disableUnderline: true }}
                              inputProps={{ step: 0.01, "aria-label": `Line ${i + 1} adj amount`, style: { textAlign: "right" } }}
                            />
                          </TableCell>
                        )}
                        <TableCell align="center" sx={cellSx}>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={rows.length <= 1}
                            onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                            aria-label={`Remove line ${i + 1}`}
                          >
                            <DeleteIcon size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {isHour && (
                <Typography variant="caption" color="text.secondary">
                  Adj Day, Basic and DA are calculated from the shift hours and the wages / DA rate in force on
                  the FNE date (recalculated on save).
                </Typography>
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                {orig && (
                  <Button color="error" onClick={handleDelete} disabled={saving} sx={{ mr: "auto" }}>
                    Delete Document
                  </Button>
                )}
                <Button onClick={onClose}>Close</Button>
                <Button variant="contained" startIcon={<SaveIcon size={18} />} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={error !== ""}
        autoHideDuration={5000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError("")} sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
