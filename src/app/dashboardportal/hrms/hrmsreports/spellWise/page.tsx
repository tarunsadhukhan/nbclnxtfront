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
import { fetchSpellWise } from "@/utils/hrmsReportService";

/** Pivoted row: department/designation plus one hands field per spell. */
type PivotRow = { id: string } & Record<string, string | number>;

const NONE = "(None)";

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  // Spell columns are tenant data — discovered from the fetched rows.
  const [spells, setSpells] = useState<string[]>([]);

  const fetcher = useCallback(
    async (f: ReportFilters): Promise<PivotRow[]> => {
      if (coId == null) return [];
      const rows = await fetchSpellWise({
        coId,
        branchId: f.branchId,
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
      });
      const names = [...new Set(rows.map((r) => r.spell ?? NONE))].sort();
      const round = (n: number) => Math.round(n * 100) / 100;
      const blank = (id: string, department: string, designation: string) => {
        const row: PivotRow = { id, department, designation, total: 0 };
        for (const s of names) row[s] = 0;
        return row;
      };
      const add = (row: PivotRow, spell: string, hands: number) => {
        row[spell] = round((row[spell] as number) + hands);
        row.total = round((row.total as number) + hands);
      };
      // Order by dept_mst.dept_code (numeric-aware), then department, designation.
      const sorted = [...rows].sort(
        (a, b) =>
          (a.dept_code ?? "").localeCompare(b.dept_code ?? "", undefined, { numeric: true }) ||
          (a.department ?? "").localeCompare(b.department ?? "") ||
          (a.designation ?? "").localeCompare(b.designation ?? ""),
      );
      // Detail rows with a "Total" row after each department, then Grand Total.
      const out: PivotRow[] = [];
      const grand = blank("grand", "Grand Total", "");
      let deptTotal: PivotRow | null = null;
      let detail: PivotRow | null = null;
      for (const r of sorted) {
        const dept = r.department ?? "";
        const desig = r.designation ?? "";
        const spell = r.spell ?? NONE;
        if (!deptTotal || deptTotal.department !== dept) {
          if (deptTotal) out.push(deptTotal);
          deptTotal = blank(`total|${r.dept_code ?? ""}|${dept}`, dept, "Total");
          detail = null;
        }
        if (!detail || detail.designation !== desig) {
          detail = blank(`${r.dept_code ?? ""}|${dept}|${desig}`, dept, desig);
          out.push(detail);
        }
        add(detail, spell, r.hands);
        add(deptTotal, spell, r.hands);
        add(grand, spell, r.hands);
      }
      if (deptTotal) out.push(deptTotal, grand);
      setSpells(names);
      return out;
    },
    [coId],
  );

  const columns = useMemo<GridColDef<PivotRow>[]>(
    () => [
      { field: "department", headerName: "Department", flex: 1, minWidth: 180 },
      { field: "designation", headerName: "Designation", flex: 1, minWidth: 180 },
      ...spells.map((s) => numCol<PivotRow>(s, s, 100)),
      numCol<PivotRow>("total", "Total Hands", 120),
    ],
    [spells],
  );

  return (
    <ReportPanel
      title="Spell Wise Summary"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={fetcher}
      columns={columns}
      getRowId={(r) => r.id}
      exportName="spell-wise"
      scroll
    />
  );
}

export default function SpellWisePage() {
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
