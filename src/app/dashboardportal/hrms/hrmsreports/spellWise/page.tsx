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
      const map = new Map<string, PivotRow>();
      for (const r of rows) {
        const dept = r.department ?? "";
        const desig = r.designation ?? "";
        const key = `${dept}|${desig}`;
        let row = map.get(key);
        if (!row) {
          row = { id: key, department: dept, designation: desig, total: 0 };
          for (const s of names) row[s] = 0;
          map.set(key, row);
        }
        const spell = r.spell ?? NONE;
        row[spell] = Math.round(((row[spell] as number) + r.hands) * 100) / 100;
        row.total = Math.round(((row.total as number) + r.hands) * 100) / 100;
      }
      setSpells(names);
      return [...map.values()];
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
      sortField="department"
      exportName="spell-wise"
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
