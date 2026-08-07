"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { X } from "lucide-react";
import ReportGrid, { numCol } from "@/components/reports/ReportGrid";
import {
  fetchIssueItemwiseReport,
  type ConsumptionRow,
  type IssueItemwiseReportRow,
} from "@/utils/inventoryReportService";

/** Same columns as the Stores Issue Check List, minus the ones fixed by the
 * row being drilled into (department / cost center / item). */
const columns: GridColDef<IssueItemwiseReportRow>[] = [
  { field: "issue_no", headerName: "Issue No", width: 120 },
  { field: "issue_date", headerName: "Issue Date", width: 110 },
  { field: "uom_name", headerName: "Unit", width: 80 },
  numCol("issue_qty", "Quantity"),
  numCol("issue_value", "Value"),
  { field: "expense_type_name", headerName: "Exp Type", width: 120 },
  { field: "sr_no", headerName: "SR No", width: 140 },
  { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 130 },
  { field: "status_name", headerName: "Status", width: 110 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** The consumption row that was double-clicked (null when closed). */
  row: ConsumptionRow | null;
  coId: number | null;
  branchId: number | null;
  dateFrom: string;
  dateTo: string;
}

/**
 * Issue lines behind one Consumption IS-01 row. Reuses the Stores Issue Check
 * List endpoint filtered by the row's department / cost center / item ids, so
 * the detail always reconciles with the figure that was clicked.
 */
export default function IssueDetailDialog({
  open,
  onClose,
  row,
  coId,
  branchId,
  dateFrom,
  dateTo,
}: Props) {
  const [rows, setRows] = useState<IssueItemwiseReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open || !row || coId == null) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchIssueItemwiseReport({
        coId,
        branchId,
        dateFrom,
        dateTo,
        deptId: row.dept_id ?? null,
        costFactorId: row.cost_factor_id ?? null,
        itemId: row.item_id ?? null,
      });
      // The server filters by id, but an older build ignores those params and
      // returns every line for the period. Narrowing to the clicked row's
      // department / cost center / item here makes the dialog correct either
      // way, and is a no-op once the server has filtered.
      const match = (v: string | null, want: string | null | undefined) =>
        want == null || want === "" || v === want;
      setRows(
        fetched.filter(
          (r) =>
            match(r.item_code, row.item_code) &&
            match(r.department, row.department) &&
            match(r.cost_factor_name, row.cost_factor),
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load issue details");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [open, row, coId, branchId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalQty = rows.reduce((a, r) => a + Number(r.issue_qty ?? 0), 0);
  const totalValue = rows.reduce((a, r) => a + Number(r.issue_value ?? 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" component="span">
            Issue Details
          </Typography>
          {row && (
            <Typography variant="body2" color="text.secondary">
              {[row.department, row.cost_factor, row.item_code, row.item_name]
                .filter(Boolean)
                .join(" · ")}
              {` · ${dateFrom} To ${dateTo}`}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {!error && rows.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                No issue lines found for this row.
              </Typography>
            )}
            {rows.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {rows.length} issue line(s) · Quantity {totalQty.toFixed(2)} ·
                  Value {totalValue.toFixed(2)}
                </Typography>
                <ReportGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(r) => r.issue_li_id}
                  loading={false}
                  error={null}
                  height={460}
                  sortField="issue_date"
                  sortDir="desc"
                />
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
