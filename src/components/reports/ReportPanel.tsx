"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { resolveReportMenuId } from "@/utils/reportMenuService";
import ReportGrid from "./ReportGrid";
import { exportRowsToExcel } from "./exportExcel";
import type { BranchOption } from "./types";

/** The filter values handed to the fetcher when the user submits (branch is
 * always set — the fetcher only runs once a branch is selected). */
export interface ReportFilters {
  branchId: number;
  dateFrom: string;
  dateTo: string;
  extra: string;
}

interface ExtraSelect {
  label: string;
  /** Omit for a free-text box instead of a dropdown (e.g. Item Code). */
  options?: { value: string; label: string }[];
}

interface ReportPanelProps<TRow extends GridValidRowModel> {
  title: string;
  branches: BranchOption[];
  initialBranchId: number | null;
  /** "range" = From+To, "single" = one date (bound to dateTo), "none" = no date. */
  dates?: "range" | "single" | "none";
  initialDateFrom?: string;
  initialDateTo?: string;
  fromLabel?: string;
  toLabel?: string;
  singleLabel?: string;
  /** Optional single-select filter (e.g. Receipts/Issues/All). */
  extra?: ExtraSelect;
  initialExtra?: string;
  /** Fetches the rows for the submitted filters. */
  fetcher: (filters: ReportFilters) => Promise<TRow[]>;
  columns: GridColDef<TRow>[];
  getRowId: (row: TRow) => string | number;
  sortField?: string;
  sortDir?: "asc" | "desc";
  exportName: string;
  /** Optional row drill-down (see ReportGrid); not fired for total rows. */
  onRowDoubleClick?: (row: TRow) => void;
}

/**
 * Filter toolbar (branch + date(s) + optional select + Submit + Export) over a
 * data grid. The report only (re)loads when Submit is clicked — plus one
 * automatic load once a branch is available — so changing filters doesn't fire
 * a request on every keystroke. Export builds an .xlsx from the loaded rows.
 */
export default function ReportPanel<TRow extends GridValidRowModel>({
  title,
  branches,
  initialBranchId,
  dates = "range",
  initialDateFrom = "",
  initialDateTo = "",
  fromLabel = "From Date",
  toLabel = "To Date",
  singleLabel = "Date",
  extra,
  initialExtra = "",
  fetcher,
  columns,
  getRowId,
  sortField,
  sortDir,
  exportName,
  onRowDoubleClick,
}: ReportPanelProps<TRow>) {
  // Draft filters — bound to the inputs.
  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom);
  const [dateTo, setDateTo] = useState<string>(initialDateTo);
  const [extraValue, setExtraValue] = useState<string>(initialExtra);

  const pathname = usePathname();
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<TRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(async () => {
    if (branchId == null) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetcher({ branchId, dateFrom, dateTo, extra: extraValue }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, dateFrom, dateTo, extraValue, fetcher]);

  // One automatic load once a branch is available; afterwards only on Submit.
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && branchId != null) {
      didInit.current = true;
      void runFetch();
    }
  }, [branchId, runFetch]);

  const branch = branches.find((b) => b.branch_id === branchId) ?? null;

  // Company / branch / report / period block written above the column headers
  // in the exported sheet.
  const handleExport = useCallback(async () => {
    const reportFor =
      dates === "range"
        ? [dateFrom, dateTo].filter(Boolean).join(" To ")
        : dates === "single"
          ? dateTo
          : "";
    await exportRowsToExcel(columns, rows, exportName, {
      companyName: selectedCompany?.co_name,
      branchName: branch?.branch_name,
      reportName: title,
      reportNo: await resolveReportMenuId(pathname),
      reportFor,
    });
  }, [
    dates,
    dateFrom,
    dateTo,
    columns,
    rows,
    exportName,
    selectedCompany?.co_name,
    branch?.branch_name,
    title,
    pathname,
  ]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        {title}
      </Typography>

      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Autocomplete
            options={branches}
            getOptionLabel={(option) => option.branch_name}
            isOptionEqualToValue={(option, value) =>
              option.branch_id === value.branch_id
            }
            value={branch}
            onChange={(_, newValue) => setBranchId(newValue?.branch_id ?? null)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" />
            )}
            sx={{ minWidth: 240 }}
          />

          {dates === "range" && (
            <>
              <TextField
                type="date"
                label={fromLabel}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: 170 }}
              />
              <TextField
                type="date"
                label={toLabel}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: 170 }}
              />
            </>
          )}

          {dates === "single" && (
            <TextField
              type="date"
              label={singleLabel}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 180 }}
            />
          )}

          {extra && !extra.options && (
            <TextField
              label={extra.label}
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runFetch();
              }}
              size="small"
              sx={{ width: 170 }}
            />
          )}

          {extra?.options && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="report-extra-label">{extra.label}</InputLabel>
              <Select
                labelId="report-extra-label"
                label={extra.label}
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
              >
                {extra.options.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            disabled={branchId == null || loading}
            onClick={() => {
              void runFetch();
            }}
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            Submit
          </Button>

          <Button
            variant="outlined"
            disabled={rows.length === 0}
            onClick={() => {
              void handleExport();
            }}
            sx={{ textTransform: "none" }}
          >
            Export to Excel
          </Button>
        </Box>
      </Paper>

      <ReportGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        error={error}
        branchId={branchId}
        sortField={sortField}
        sortDir={sortDir}
        onRowDoubleClick={onRowDoubleClick}
      />
    </Box>
  );
}
