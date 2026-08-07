"use client";
import React, { Suspense, useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Autocomplete,
  Typography,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { usePathname } from "next/navigation";
import ReportGrid, { numCol } from "@/components/reports/ReportGrid";
import { exportRowsToExcel } from "@/components/reports/exportExcel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { resolveReportMenuId } from "@/utils/reportMenuService";
import {
  fetchItemMonthwise,
  type ItemMonthwiseRow,
} from "@/utils/inventoryReportService";

const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
/** "2026-03" -> "Mar 2026". */
function prettyMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MON[Number(m) - 1] ?? m} ${y}`;
}

function ItemMonthwiseContent() {
  const { coId, companyName, branches, initialBranchId } = useReportBranches();
  const pathname = usePathname();
  const { from, to } = currentMonthRange();

  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [dateFrom, setDateFrom] = useState<string>(from);
  const [dateTo, setDateTo] = useState<string>(to);

  const [months, setMonths] = useState<string[]>([]);
  const [rows, setRows] = useState<ItemMonthwiseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runReport = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchItemMonthwise({ coId, dateFrom, dateTo, branchId });
      setMonths(res.months);
      setRows(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setMonths([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [coId, dateFrom, dateTo, branchId]);

  // Columns depend on the months returned by the last fetch.
  const columns: GridColDef<ItemMonthwiseRow>[] = useMemo(
    () => [
      { field: "item_grp_name", headerName: "Item Group", flex: 1, minWidth: 140 },
      { field: "item_name", headerName: "Item Description", width: 450 },
      { field: "uom_name", headerName: "UOM", width: 80 },
      ...months.map((m) => numCol<ItemMonthwiseRow>(m, prettyMonth(m))),
      numCol<ItemMonthwiseRow>("total", "Total", 120),
      { field: "active_months", headerName: "Months", type: "number", width: 90 },
      numCol<ItemMonthwiseRow>("avg", "Avg", 120),
    ],
    [months],
  );

  const branch = branches.find((b) => b.branch_id === branchId) ?? null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Item Month-wise
      </Typography>

      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
        >
          <Autocomplete
            options={branches}
            getOptionLabel={(o) => o.branch_name}
            isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
            value={branch}
            onChange={(_, v) => setBranchId(v?.branch_id ?? null)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" />
            )}
            sx={{ minWidth: 220 }}
          />
          <TextField
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <TextField
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <Button
            variant="contained"
            disabled={coId == null || loading}
            onClick={() => {
              void runReport();
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
              void (async () =>
                exportRowsToExcel(columns, rows, "item-monthwise", {
                  companyName,
                  branchName: branch?.branch_name,
                  reportName: "Item Month-wise",
                  reportNo: await resolveReportMenuId(pathname),
                  reportFor: [dateFrom, dateTo].filter(Boolean).join(" To "),
                }))();
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
        getRowId={(r) => r.item_id}
        loading={loading}
        error={error}
      />
    </Box>
  );
}

export default function ItemMonthwisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <ItemMonthwiseContent />
    </Suspense>
  );
}
