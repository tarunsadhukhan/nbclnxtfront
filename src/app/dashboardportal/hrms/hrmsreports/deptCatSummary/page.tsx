"use client";
import React, { Suspense, useCallback, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel, {
  type ReportFilters,
} from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fetchEmployeeHeadcount } from "@/utils/hrmsReportService";

/** Pivoted row: department/sub-department plus one numeric field per category. */
type PivotRow = { id: string } & Record<string, string | number>;

const NONE = "(None)";

function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  // Category columns are tenant data — discovered from the fetched rows.
  const [categories, setCategories] = useState<string[]>([]);

  const fetcher = useCallback(
    async (f: ReportFilters): Promise<PivotRow[]> => {
      if (coId == null) return [];
      const rows = await fetchEmployeeHeadcount({
        coId,
        branchId: f.branchId,
      });
      const cats = [...new Set(rows.map((r) => r.category ?? NONE))].sort();
      const map = new Map<string, PivotRow>();
      const totals: PivotRow = { id: "__total__", department: "Total", sub_department: "", total: 0 };
      for (const c of cats) totals[c] = 0;
      for (const r of rows) {
        const dept = r.department ?? "";
        const sub = r.sub_department ?? "";
        const key = `${dept}|${sub}`;
        let row = map.get(key);
        if (!row) {
          row = { id: key, department: dept, sub_department: sub, total: 0 };
          for (const c of cats) row[c] = 0;
          map.set(key, row);
        }
        const cat = r.category ?? NONE;
        row[cat] = (row[cat] as number) + r.emp_count;
        row.total = (row.total as number) + r.emp_count;
        totals[cat] = (totals[cat] as number) + r.emp_count;
        totals.total = (totals.total as number) + r.emp_count;
      }
      setCategories(cats);
      return [...map.values(), totals];
    },
    [coId],
  );

  const columns = useMemo<GridColDef<PivotRow>[]>(
    () => [
      { field: "department", headerName: "Department", flex: 1, minWidth: 170 },
      { field: "sub_department", headerName: "Sub Department", flex: 1, minWidth: 170 },
      ...categories.map<GridColDef<PivotRow>>((c) => ({
        field: c,
        headerName: c,
        type: "number",
        width: 110,
      })),
      { field: "total", headerName: "Total", type: "number", width: 110 },
    ],
    [categories],
  );

  return (
    <ReportPanel
      title="Department Category Summary"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={fetcher}
      columns={columns}
      getRowId={(r) => r.id}
      exportName="department-category-summary"
    />
  );
}

export default function DeptCatSummaryPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <Content />
    </Suspense>
  );
}
