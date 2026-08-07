"use client";
import React from "react";
import { Box, Alert, CircularProgress, Typography } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridValidRowModel,
} from "@mui/x-data-grid";
import {
  useColumnsSizedToContent,
  wrappingGridSx,
  autoRowHeight,
  estimatedRowHeight,
  showCellTooltip,
  WRAPPED_HEADER_HEIGHT,
} from "@/components/ui/gridAutoSize";

const NO_ROWS: never[] = [];

interface ReportGridProps<T extends GridValidRowModel> {
  rows: T[];
  columns: GridColDef<T>[];
  getRowId: (row: T) => string | number;
  loading: boolean;
  error: string | null;
  /** When provided and null, shows a "select a branch" prompt instead of the grid. */
  branchId?: number | null;
  height?: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
  /** Marks summary rows to render bold. Defaults to detecting cells whose text
   * is "Total" / "Grand Total" / "Opening Balance" / "Closing". */
  isTotalRow?: (row: T) => boolean;
  /** Row drill-down. Never fired for total rows — they have no detail behind
   * them. When set, data rows get a pointer cursor to advertise it. */
  onRowDoubleClick?: (row: T) => void;
}

const TOTAL_ROW_RE = /^(grand\s+total|total|opening\s+balance|closing)$/i;

/** Shared summary-row detection — also used by the Excel export so grid and
 * sheet highlight the same rows. */
export function isReportTotalRow(row: GridValidRowModel): boolean {
  return Object.values(row).some(
    (v) => typeof v === "string" && TOTAL_ROW_RE.test(v.trim()),
  );
}

/** Summary rows come in levels on grouped reports (IS01: a Total per cost
 * centre, per department, then the Grand Total). The level is read off the
 * leading column: filled = the outer group's total, blank = an inner subtotal.
 * Shared with the Excel export so sheet and grid shade the same way. */
export function reportTotalLevel(
  row: GridValidRowModel,
  leadField: string,
): "grand" | "group" | "sub" | null {
  if (!isReportTotalRow(row)) return null;
  const lead = row[leadField];
  if (typeof lead === "string" && /^grand\s+total$/i.test(lead.trim())) {
    return "grand";
  }
  return lead ? "group" : "sub";
}

const TOTAL_ROW_CLASS = {
  grand: "report-total-row",
  group: "report-total-row report-group-total-row",
  sub: "report-subtotal-row",
} as const;

/**
 * Shared presentational grid shell for the jute report pages — loading overlay,
 * error alert, branch-null guard, and the standard DataGrid styling. Each report
 * component supplies its own rows/columns/getRowId.
 */
export default function ReportGrid<T extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading,
  error,
  branchId,
  height = 600,
  sortField,
  sortDir = "asc",
  isTotalRow = isReportTotalRow,
  onRowDoubleClick,
}: ReportGridProps<T>) {
  // Same content-width + hover-tooltip treatment the list grids get. While no branch
  // is selected the previous branch's rows may still be held, so don't size from them.
  const sizedColumns = useColumnsSizedToContent(columns, branchId === null ? NO_ROWS : rows);

  if (branchId === null) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select a branch to view the report
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box onMouseOver={showCellTooltip} sx={{ height, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={sizedColumns}
          getRowId={getRowId}
          getRowHeight={autoRowHeight}
          getEstimatedRowHeight={estimatedRowHeight}
          columnHeaderHeight={WRAPPED_HEADER_HEIGHT}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 50 } },
            ...(sortField
              ? { sorting: { sortModel: [{ field: sortField, sort: sortDir }] } }
              : {}),
          }}
          disableRowSelectionOnClick
          onRowDoubleClick={
            onRowDoubleClick
              ? (params) => {
                  if (!isTotalRow(params.row as T)) {
                    onRowDoubleClick(params.row as T);
                  }
                }
              : undefined
          }
          getRowClassName={(params) => {
            if (!isTotalRow(params.row)) return "";
            const level =
              reportTotalLevel(params.row, String(columns[0]?.field ?? "")) ??
              "grand";
            return TOTAL_ROW_CLASS[level];
          }}
          sx={{
            ...wrappingGridSx,
            border: "1px solid",
            borderColor: "divider",
            ...(onRowDoubleClick
              ? {
                  "& .MuiDataGrid-row:not(.report-total-row):not(.report-subtotal-row)":
                    {
                      cursor: "pointer",
                    },
                }
              : {}),
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#3ea6da",
              color: "white",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              ...wrappingGridSx["& .MuiDataGrid-columnHeaderTitle"],
              fontWeight: 700,
            },
            "& .MuiDataGrid-columnHeader:not(:last-of-type)": {
              borderRight: "1px solid rgba(255,255,255,0.4)",
            },
            "& .MuiDataGrid-cell": {
              borderRight: "1px solid",
              borderRightColor: "divider",
              whiteSpace: "normal",
              wordBreak: "break-word",
              display: "flex",
              alignItems: "center",
              py: 0.5,
            },
            "& .MuiDataGrid-cell:last-of-type": { borderRight: "none" },
            "& .MuiDataGrid-cell--textRight": { justifyContent: "flex-end" },
            "& .report-total-row, & .report-total-row:hover, & .report-total-row.Mui-hovered":
              {
                backgroundColor: "#3ea6da",
                color: "white",
              },
            "& .report-total-row .MuiDataGrid-cell": {
              fontWeight: 700,
              borderRightColor: "rgba(255,255,255,0.4)",
            },
            // Group total (e.g. IS01 department) — one shade off the Grand
            // Total so the two read as different levels.
            "& .report-group-total-row, & .report-group-total-row:hover, & .report-group-total-row.Mui-hovered":
              {
                backgroundColor: "#6fbde3",
                color: "white",
              },
            // Inner subtotal (e.g. IS01 cost centre) — lightest of the three.
            "& .report-subtotal-row, & .report-subtotal-row:hover, & .report-subtotal-row.Mui-hovered":
              {
                backgroundColor: "#d7ecf8",
                color: "#0C3C60",
              },
            "& .report-subtotal-row .MuiDataGrid-cell": {
              fontWeight: 700,
              borderRightColor: "rgba(12,60,96,0.2)",
            },
          }}
        />
      </Box>
    </Box>
  );
}

/** 2-decimal number formatter shared by the report column defs. */
export function fmtNum(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

/** Helper to build a right-aligned 2-decimal numeric column. */
export function numCol<T extends GridValidRowModel>(
  field: string,
  headerName: string,
  width = 120,
): GridColDef<T> {
  return {
    field,
    headerName,
    type: "number",
    width,
    valueFormatter: (value: unknown) => fmtNum(value),
  };
}
