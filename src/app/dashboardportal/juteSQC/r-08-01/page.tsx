"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Paper,
} from "@mui/material";
import { X as CloseIcon } from "lucide-react";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type {
  SqcPrintReport,
  PrintColumn,
  PrintCell,
  PrintTableSection,
} from "../_shared/printReport";

// ─── Constants ──────────────────────────────────────────────────────────────

const STANDARD_MIN_WEIGHT = 1200;
const STANDARD_MAX_WEIGHT = 1400;
const SAMPLE_SIZE = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

type MorrahWtRow = {
  id: number;
  morrah_wt_id: number;
  entry_date: string;
  trolley_no: string;
  inspector_name: string;
  jute_quality: string;
  department: string;
  calc_avg_weight: number;
  calc_cv_pct: number;
  count_lt: number;
  count_ok: number;
  count_hy: number;
  /** Raw numeric values retained for the day-level print summary. */
  raw_avg_weight: number | null;
  raw_cv_pct: number | null;
  raw_entry_date: string;
  [key: string]: unknown;
};

type DeptOption = { dept_id: number; dept_desc: string; dept_code?: string };
type QualityOption = { item_id: number; item_name: string; item_code?: string };

type FormData = {
  entry_date: string;
  inspector_name: string;
  dept_id: number | null;
  item_id: number | null;
  trolley_no: string;
  avg_mr_pct: string;
  weights: string[];
};

type ViewData = {
  morrah_wt_id: number;
  entry_date: string;
  inspector_name: string;
  department: string;
  jute_quality: string;
  trolley_no: string;
  avg_mr_pct: number;
  weights: number[];
  calc_avg_weight: number;
  calc_max_weight: number;
  calc_min_weight: number;
  calc_range: number;
  calc_cv_pct: number;
  count_lt: number;
  count_ok: number;
  count_hy: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCoId(): string {
  try {
    const raw = localStorage.getItem("sidebar_selectedCompany");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.co_id ? String(parsed.co_id) : "";
  } catch {
    return "";
  }
}

function getBranchId(): string {
  try {
    const raw = localStorage.getItem("sidebar_selectedBranches");
    if (!raw) return "";
    const branches = JSON.parse(raw) as number[];
    return branches.length > 0 ? String(branches[0]) : "";
  } catch {
    return "";
  }
}

function getWeightColor(value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num) || value === "") return "";
  if (num < STANDARD_MIN_WEIGHT || num > STANDARD_MAX_WEIGHT) return "#FFEBEE";
  return "#E8F5E9";
}

function computePreviewStats(weights: string[]) {
  const nums = weights.map((w) => parseInt(w, 10)).filter((n) => !isNaN(n) && n > 0);
  if (nums.length === 0) return null;

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const maxW = Math.max(...nums);
  const minW = Math.min(...nums);
  const range = maxW - minW;

  let cv = 0;
  if (nums.length > 1 && avg > 0) {
    const variance = nums.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / (nums.length - 1);
    cv = (Math.sqrt(variance) / avg) * 100;
  }

  const lt = nums.filter((w) => w < STANDARD_MIN_WEIGHT).length;
  const ok = nums.filter((w) => w >= STANDARD_MIN_WEIGHT && w <= STANDARD_MAX_WEIGHT).length;
  const hy = nums.filter((w) => w > STANDARD_MAX_WEIGHT).length;

  return {
    avg: avg.toFixed(1),
    max: maxW,
    min: minW,
    range,
    cv: cv.toFixed(2),
    lt,
    ok,
    hy,
    total: nums.length,
  };
}

const defaultFormData: FormData = {
  entry_date: new Date().toISOString().split("T")[0],
  inspector_name: "",
  dept_id: null,
  item_id: null,
  trolley_no: "",
  avg_mr_pct: "",
  weights: Array(SAMPLE_SIZE).fill(""),
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MorrahWeightQCPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();

  // List state
  const [rows, setRows] = useState<MorrahWtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...defaultFormData });
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [juteQualities, setJuteQualities] = useState<QualityOption[]>([]);
  const [saving, setSaving] = useState(false);

  // View dialog state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ─── Fetch list ─────────────────────────────────────────────────────────

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const params = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
      });
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.MORRAH_WT_TABLE}?${params}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch data");

      const mapped: MorrahWtRow[] = (data.data || []).map(
        (r: Record<string, unknown>) => ({
          ...r,
          id: r.morrah_wt_id as number,
          raw_entry_date: (r.entry_date as string) ?? "",
          raw_avg_weight:
            r.calc_avg_weight != null ? Number(r.calc_avg_weight) : null,
          raw_cv_pct: r.calc_cv_pct != null ? Number(r.calc_cv_pct) : null,
          entry_date: r.entry_date
            ? new Date(r.entry_date as string).toLocaleDateString("en-IN")
            : "-",
          trolley_no: (r.trolley_no as string) ?? "-",
          inspector_name: (r.inspector_name as string) ?? "-",
          jute_quality: (r.jute_quality as string) ?? "-",
          department: (r.department as string) ?? "-",
          calc_avg_weight: r.calc_avg_weight
            ? Number(r.calc_avg_weight).toFixed(1)
            : "-",
          calc_cv_pct: r.calc_cv_pct
            ? Number(r.calc_cv_pct).toFixed(2) + "%"
            : "-",
          count_lt: r.count_lt as number,
          count_ok: r.count_ok as number,
          count_hy: r.count_hy as number,
        })
      );

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error fetching data";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  // ─── Create setup ───────────────────────────────────────────────────────

  const loadCreateSetup = useCallback(async () => {
    try {
      const co_id = getCoId();
      const branch_id = getBranchId();
      if (!co_id || !branch_id) return;

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.MORRAH_WT_CREATE_SETUP}?co_id=${co_id}&branch_id=${branch_id}`,
        "GET"
      );
      if (error || !data) return;

      setDepartments(data.data?.departments || []);
      setJuteQualities(data.data?.jute_qualities || []);
    } catch {
      // Silently fail setup load
    }
  }, []);

  // ─── Create handler ─────────────────────────────────────────────────────

  const handleCreateOpen = useCallback(() => {
    setFormData({ ...defaultFormData });
    setCreateOpen(true);
    loadCreateSetup();
  }, [loadCreateSetup]);

  const handleCreateClose = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleFormChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWeightChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newWeights = [...prev.weights];
      newWeights[index] = value;
      return { ...prev, weights: newWeights };
    });
  };

  const handleSubmit = async () => {
    try {
      const co_id = getCoId();
      const branch_id = getBranchId();
      if (!co_id || !branch_id) {
        setSnackbar({
          open: true,
          message: "No company or branch selected",
          severity: "error",
        });
        return;
      }

      const weights = formData.weights.map((w) => parseInt(w, 10));
      const filledCount = weights.filter((w) => !isNaN(w)).length;
      if (filledCount !== SAMPLE_SIZE) {
        setSnackbar({
          open: true,
          message: `Please fill all ${SAMPLE_SIZE} weight readings`,
          severity: "error",
        });
        return;
      }

      if (weights.some((w) => w <= 0)) {
        setSnackbar({
          open: true,
          message: "All weights must be positive numbers",
          severity: "error",
        });
        return;
      }

      setSaving(true);

      const payload = {
        co_id: parseInt(co_id, 10),
        branch_id: parseInt(branch_id, 10),
        entry_date: formData.entry_date,
        inspector_name: formData.inspector_name || null,
        dept_id: formData.dept_id,
        item_id: formData.item_id,
        trolley_no: formData.trolley_no || null,
        avg_mr_pct: formData.avg_mr_pct
          ? parseFloat(formData.avg_mr_pct)
          : null,
        weights,
      };

      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.MORRAH_WT_CREATE,
        "POST",
        payload
      );

      if (error || !data) {
        throw new Error(error || "Failed to create record");
      }

      setSnackbar({
        open: true,
        message: "Morrah weight QC entry saved successfully",
        severity: "success",
      });
      setCreateOpen(false);
      fetchTable();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error saving record";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ─── View handler ───────────────────────────────────────────────────────

  const handleView = useCallback(async (row: MorrahWtRow) => {
    setViewOpen(true);
    setViewLoading(true);
    try {
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.MORRAH_WT_BY_ID}?id=${row.morrah_wt_id}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch record");
      setViewData(data.data as ViewData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error loading record";
      setSnackbar({ open: true, message, severity: "error" });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleViewClose = useCallback(() => {
    setViewOpen(false);
    setViewData(null);
  }, []);

  // ─── Column definitions ─────────────────────────────────────────────────

  const columns = useMemo<GridColDef<MorrahWtRow>[]>(
    () => [
      { field: "entry_date", headerName: "Date", flex: 0.8, minWidth: 100 },
      {
        field: "trolley_no",
        headerName: "Trolley No",
        flex: 0.7,
        minWidth: 100,
      },
      {
        field: "inspector_name",
        headerName: "Inspector",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "jute_quality",
        headerName: "Quality",
        flex: 0.8,
        minWidth: 100,
      },
      {
        field: "calc_avg_weight",
        headerName: "Avg Wt (g)",
        flex: 0.7,
        minWidth: 100,
      },
      {
        field: "calc_cv_pct",
        headerName: "CV%",
        flex: 0.6,
        minWidth: 80,
      },
      {
        field: "count_ok",
        headerName: "OK",
        flex: 0.4,
        minWidth: 60,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color="success"
            variant="outlined"
          />
        ),
      },
      {
        field: "count_lt",
        headerName: "LT",
        flex: 0.4,
        minWidth: 60,
        renderCell: (params) =>
          (params.value as number) > 0 ? (
            <Chip
              label={params.value}
              size="small"
              color="warning"
              variant="outlined"
            />
          ) : (
            params.value
          ),
      },
      {
        field: "count_hy",
        headerName: "HY",
        flex: 0.4,
        minWidth: 60,
        renderCell: (params) =>
          (params.value as number) > 0 ? (
            <Chip
              label={params.value}
              size="small"
              color="error"
              variant="outlined"
            />
          ) : (
            params.value
          ),
      },
    ],
    []
  );

  // ─── Live preview stats ─────────────────────────────────────────────────

  const previewStats = useMemo(
    () => computePreviewStats(formData.weights),
    [formData.weights]
  );

  // ─── Day-level print ──────────────────────────────────────────────────────

  const selectedBranchName = useMemo(() => {
    if (!selectedCompany || selectedBranches.length === 0) return "";
    const branch = selectedCompany.branches.find(
      (b) => b.branch_id === selectedBranches[0]
    );
    return branch?.branch_name ?? "";
  }, [selectedCompany, selectedBranches]);

  const printColumns = useMemo<PrintColumn[]>(
    () => [
      { key: "trolley_no", label: "Trolley No" },
      { key: "inspector_name", label: "Inspector" },
      { key: "jute_quality", label: "Quality" },
      { key: "department", label: "Department" },
      { key: "calc_avg_weight", label: "Avg Wt (g)", align: "right" },
      { key: "calc_cv_pct", label: "CV%", align: "right" },
      { key: "count_ok", label: "OK", align: "right" },
      { key: "count_lt", label: "LT", align: "right" },
      { key: "count_hy", label: "HY", align: "right" },
    ],
    []
  );

  const getReport = useCallback((): SqcPrintReport | null => {
    if (rows.length === 0) return null;

    // Consolidate the currently-loaded rows into one day report, grouped by the
    // entry date each row carries (the list is not split by shift/spell).
    const groups = new Map<string, MorrahWtRow[]>();
    for (const row of rows) {
      const key = row.raw_entry_date || row.entry_date;
      const bucket = groups.get(key);
      if (bucket) bucket.push(row);
      else groups.set(key, [row]);
    }

    const sortedKeys = Array.from(groups.keys()).sort();

    const sections: PrintTableSection[] = sortedKeys.map((key) => {
      const dayRows = groups.get(key) ?? [];

      const bodyRows: Array<Record<string, PrintCell>> = dayRows.map((r) => ({
        trolley_no: r.trolley_no,
        inspector_name: r.inspector_name,
        jute_quality: r.jute_quality,
        department: r.department,
        calc_avg_weight: r.calc_avg_weight,
        calc_cv_pct: r.calc_cv_pct,
        count_ok: r.count_ok,
        count_lt: r.count_lt,
        count_hy: r.count_hy,
      }));

      // Server-computed summary mirrored as a bold footer row.
      const avgValues = dayRows
        .map((r) => r.raw_avg_weight)
        .filter((v): v is number => v != null);
      const cvValues = dayRows
        .map((r) => r.raw_cv_pct)
        .filter((v): v is number => v != null);
      const sum = (acc: number, n: number) => acc + n;
      const avgWt =
        avgValues.length > 0
          ? (avgValues.reduce(sum, 0) / avgValues.length).toFixed(1)
          : "-";
      const avgCv =
        cvValues.length > 0
          ? (cvValues.reduce(sum, 0) / cvValues.length).toFixed(2) + "%"
          : "-";
      const totalOk = dayRows.reduce((a, r) => a + (r.count_ok || 0), 0);
      const totalLt = dayRows.reduce((a, r) => a + (r.count_lt || 0), 0);
      const totalHy = dayRows.reduce((a, r) => a + (r.count_hy || 0), 0);

      const footerRow: Record<string, PrintCell> = {
        trolley_no: `Total / Avg (${dayRows.length} entries)`,
        inspector_name: "",
        jute_quality: "",
        department: "",
        calc_avg_weight: avgWt,
        calc_cv_pct: avgCv,
        count_ok: totalOk,
        count_lt: totalLt,
        count_hy: totalHy,
      };

      const dayLabel = dayRows[0]?.entry_date ?? key;

      return {
        kind: "table",
        title: sortedKeys.length > 1 ? `Date: ${dayLabel}` : undefined,
        columns: printColumns,
        rows: bodyRows,
        footerRows: [footerRow],
      };
    });

    const reportDate = sortedKeys.length === 1 ? sortedKeys[0] : undefined;

    return {
      reportTitle: "Morrah Weight SQC",
      reportCode: "R-08-01",
      companyName: selectedCompany?.co_name,
      branchName: selectedBranchName,
      reportDate,
      headerFields: [
        { label: "Standard Range", value: `${STANDARD_MIN_WEIGHT}–${STANDARD_MAX_WEIGHT} g` },
        { label: "Sample Size", value: SAMPLE_SIZE },
        { label: "Entries", value: rows.length },
      ],
      sections,
    };
  }, [rows, printColumns, selectedCompany, selectedBranchName]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <IndexWrapper
      title="Morrah Weight QC"
      subtitle="Quality Control - Weight Readings"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Search by trolley no, inspector, or quality",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "New QC Entry",
        onClick: handleCreateOpen,
      }}
      toolbarContent={
        <SqcPrintButton
          getReport={getReport}
          disabled={loading || rows.length === 0}
        />
      }
      onView={handleView}
    >
      {/* ─── Create Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={handleCreateClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          New Morrah Weight QC Entry
          <IconButton
            onClick={handleCreateClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Metadata row */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => handleFormChange("entry_date", e.target.value)}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Inspector Name"
                value={formData.inspector_name}
                onChange={(e) =>
                  handleFormChange("inspector_name", e.target.value)
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                options={departments}
                getOptionLabel={(o) => o.dept_desc || ""}
                value={
                  departments.find((d) => d.dept_id === formData.dept_id) ||
                  null
                }
                onChange={(_, val) =>
                  handleFormChange("dept_id", val?.dept_id ?? null)
                }
                renderInput={(params) => (
                  <TextField {...params} label="Department" size="small" />
                )}
                size="small"
              />
            </Grid>
          </Grid>

          {/* Batch info row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                options={juteQualities}
                getOptionLabel={(o) => o.item_name || ""}
                value={
                  juteQualities.find((q) => q.item_id === formData.item_id) ||
                  null
                }
                onChange={(_, val) =>
                  handleFormChange("item_id", val?.item_id ?? null)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Quality of Jute"
                    size="small"
                  />
                )}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Trolley No."
                value={formData.trolley_no}
                onChange={(e) =>
                  handleFormChange("trolley_no", e.target.value)
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Average MR%"
                type="number"
                value={formData.avg_mr_pct}
                onChange={(e) =>
                  handleFormChange("avg_mr_pct", e.target.value)
                }
                fullWidth
                size="small"
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 0.1 },
                }}
              />
            </Grid>
          </Grid>

          {/* Weight inputs */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Sample Weights (grams) — {SAMPLE_SIZE} readings required
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {formData.weights.map((w, i) => (
              <Grid size={{ xs: 6, sm: 2.4 }} key={i}>
                <TextField
                  label={`W${i + 1}`}
                  type="number"
                  value={w}
                  onChange={(e) => handleWeightChange(i, e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: getWeightColor(w),
                    },
                  }}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
            ))}
          </Grid>

          {/* Live preview */}
          {previewStats && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: "text.secondary" }}
              >
                Live Preview ({previewStats.total}/{SAMPLE_SIZE} readings)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Average
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {previewStats.avg}g
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Max / Min
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {previewStats.max} / {previewStats.min}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Range
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {previewStats.range}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    CV%
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {previewStats.cv}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 2.4 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Chip
                      label={`LT: ${previewStats.lt}`}
                      size="small"
                      color="warning"
                      variant={previewStats.lt > 0 ? "filled" : "outlined"}
                    />
                    <Chip
                      label={`OK: ${previewStats.ok}`}
                      size="small"
                      color="success"
                      variant="filled"
                    />
                    <Chip
                      label={`HY: ${previewStats.hy}`}
                      size="small"
                      color="error"
                      variant={previewStats.hy > 0 ? "filled" : "outlined"}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── View Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={viewOpen}
        onClose={handleViewClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Morrah Weight QC — View
          <IconButton
            onClick={handleViewClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading ? (
            <Typography>Loading...</Typography>
          ) : viewData ? (
            <>
              {/* Header info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body2">
                    {viewData.entry_date
                      ? new Date(viewData.entry_date).toLocaleDateString(
                          "en-IN"
                        )
                      : "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Inspector
                  </Typography>
                  <Typography variant="body2">
                    {viewData.inspector_name || "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Department
                  </Typography>
                  <Typography variant="body2">
                    {viewData.department || "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Quality of Jute
                  </Typography>
                  <Typography variant="body2">
                    {viewData.jute_quality || "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Trolley No
                  </Typography>
                  <Typography variant="body2">
                    {viewData.trolley_no || "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Average MR%
                  </Typography>
                  <Typography variant="body2">
                    {viewData.avg_mr_pct ?? "-"}
                  </Typography>
                </Grid>
              </Grid>

              {/* Weight readings */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sample Weights (grams)
              </Typography>
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {(viewData.weights || []).map((w, i) => (
                  <Grid size={{ xs: 6, sm: 2.4 }} key={i}>
                    <Card
                      variant="outlined"
                      sx={{
                        textAlign: "center",
                        backgroundColor:
                          w < STANDARD_MIN_WEIGHT || w > STANDARD_MAX_WEIGHT
                            ? "#FFEBEE"
                            : "#E8F5E9",
                      }}
                    >
                      <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                        <Typography variant="caption" color="text.secondary">
                          W{i + 1}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {w}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Computed stats */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Computed Analysis
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Average
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {viewData.calc_avg_weight}g
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Max
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {viewData.calc_max_weight}g
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Min
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {viewData.calc_min_weight}g
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Range
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {viewData.calc_range}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      CV%
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {viewData.calc_cv_pct}%
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <Chip
                    label={`LT (<1200g): ${viewData.count_lt} (${((viewData.count_lt / SAMPLE_SIZE) * 100).toFixed(0)}%)`}
                    color="warning"
                    variant={viewData.count_lt > 0 ? "filled" : "outlined"}
                  />
                  <Chip
                    label={`OK (1200-1400g): ${viewData.count_ok} (${((viewData.count_ok / SAMPLE_SIZE) * 100).toFixed(0)}%)`}
                    color="success"
                    variant="filled"
                  />
                  <Chip
                    label={`HY (>1400g): ${viewData.count_hy} (${((viewData.count_hy / SAMPLE_SIZE) * 100).toFixed(0)}%)`}
                    color="error"
                    variant={viewData.count_hy > 0 ? "filled" : "outlined"}
                  />
                </Box>
              </Paper>
            </>
          ) : (
            <Typography>No data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
