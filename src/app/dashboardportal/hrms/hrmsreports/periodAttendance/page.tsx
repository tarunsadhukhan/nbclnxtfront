"use client";
import React, { Suspense, useCallback, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel, {
  type ReportFilters,
} from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchPeriodAttendance } from "@/utils/hrmsReportService";

/** Pivoted row: department/employee plus one hours field per date (d_YYYY-MM-DD). */
type PivotRow = { id: string } & Record<string, string | number>;

/** daily_attendance.attendance_type values ("ALL" = no filter). */
const WORK_TYPES = [
  { value: "R", label: "Duty" },
  { value: "O", label: "OT" },
  { value: "C", label: "Cash" },
  { value: "ALL", label: "All" },
];

// ponytail: one column per day — cap keeps the grid/PDF readable.
const MAX_DAYS = 62;

/** Every ISO date from `from` to `to` inclusive. */
function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length <= MAX_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  const [days, setDays] = useState<string[]>([]);

  const fetcher = useCallback(
    async (f: ReportFilters): Promise<PivotRow[]> => {
      if (coId == null) return [];
      if (!f.dateFrom || !f.dateTo || f.dateFrom > f.dateTo) {
        throw new Error("Select a valid From / To date");
      }
      const dates = daysBetween(f.dateFrom, f.dateTo);
      if (dates.length > MAX_DAYS) {
        throw new Error(`Period cannot exceed ${MAX_DAYS} days`);
      }
      const rows = await fetchPeriodAttendance({
        coId,
        branchId: f.branchId,
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        attType: f.extra === "ALL" ? undefined : f.extra,
      });
      const round = (n: number) => Math.round(n * 100) / 100;
      const blank = (id: string, department: string, emp_code: string, emp_name: string) => {
        const row: PivotRow = { id, department, emp_code, emp_name, total: 0 };
        for (const d of dates) row[`d_${d}`] = 0;
        return row;
      };
      const add = (row: PivotRow, date: string, hours: number) => {
        const k = `d_${date}`;
        row[k] = round((row[k] as number) + hours);
        row.total = round((row.total as number) + hours);
      };
      // Backend orders by dept_code, emp_code, date — rows arrive grouped.
      const out: PivotRow[] = [];
      const grand = blank("grand", "Grand Total", "", "");
      let deptTotal: PivotRow | null = null;
      let detail: PivotRow | null = null;
      for (const r of rows) {
        const dept = r.department ?? "";
        const deptKey = `${r.dept_code ?? ""}|${dept}`;
        if (!deptTotal || deptTotal.id !== `total|${deptKey}`) {
          if (deptTotal) out.push(deptTotal);
          deptTotal = blank(`total|${deptKey}`, dept, "Total", "");
          detail = null;
        }
        const emp = r.emp_code ?? "";
        if (!detail || detail.emp_code !== emp) {
          detail = blank(`${deptKey}|${emp}`, dept, emp, r.emp_name ?? "");
          out.push(detail);
        }
        add(detail, r.attendance_date, r.hours);
        add(deptTotal, r.attendance_date, r.hours);
        add(grand, r.attendance_date, r.hours);
      }
      if (deptTotal) out.push(deptTotal, grand);
      setDays(dates);
      return out;
    },
    [coId],
  );

  const columns = useMemo<GridColDef<PivotRow>[]>(
    () => [
      { field: "department", headerName: "Department", minWidth: 150 },
      { field: "emp_code", headerName: "EB No", width: 90 },
      { field: "emp_name", headerName: "Name", minWidth: 180 },
      ...days.map((d) => numCol<PivotRow>(`d_${d}`, d.slice(8), 62)),
      numCol<PivotRow>("total", "Total", 90),
    ],
    [days],
  );

  return (
    <ReportPanel
      title="Period Wise Attendance Register"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      extra={{ label: "Work Type", options: WORK_TYPES }}
      initialExtra="R"
      fetcher={fetcher}
      columns={columns}
      getRowId={(r) => r.id}
      exportName="period-attendance-register"
    />
  );
}

export default function PeriodAttendancePage() {
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
