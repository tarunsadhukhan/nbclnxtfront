"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { saveAs } from "file-saver";
import { Download as DownloadIcon, Printer as PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import MuiDataGrid from "@/components/ui/muiDataGrid";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  exportPayRegister,
  fetchPayRegisterById,
  fetchPayRegisterSalary,
  printPaySlips,
  updatePayRegister,
} from "@/utils/hrmsService";
import type { PayRegisterDetail, PaySalaryRow, FormMode } from "../types/payRegisterTypes";
import { PAY_REGISTER_STATUS } from "../types/payRegisterTypes";

function ViewPayRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();

  const payRegisterId = searchParams.get("id");
  const mode = (searchParams.get("mode") ?? "view") as FormMode;

  const [detail, setDetail] = useState<PayRegisterDetail | null>(null);
  const [salaryData, setSalaryData] = useState<PaySalaryRow[]>([]);
  const [totalsRow, setTotalsRow] = useState<PaySalaryRow | null>(null);
  const [salaryColumns, setSalaryColumns] = useState<GridColDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // Load pay register details
  useEffect(() => {
    if (!coId || !payRegisterId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchPayRegisterById(coId, payRegisterId);
        if (cancelled) return;
        if (res?.error || !res?.data) throw new Error(res?.error || "Failed to load pay register");
        // Backend wraps the detail as { data: {...} }; unwrap that envelope.
        const body = res.data as { data?: PayRegisterDetail };
        const data = (body?.data ?? res.data) as PayRegisterDetail;
        setDetail(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error loading details", severity: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coId, payRegisterId]);

  // Load salary data once detail is available
  useEffect(() => {
    if (!coId || !detail || !payRegisterId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayRegisterSalary(coId, {
          branch_id: detail.branchId ?? undefined,
          pay_scheme_id: detail.paySchemeId ?? undefined,
          from_date: detail.fromDateDesc ?? undefined,
          to_date: detail.toDateDesc ?? undefined,
          pay_period_id: Number(payRegisterId),
        });
        if (cancelled) return;
        if (res?.error || !res?.data) return;

        const body = res.data as {
          data?: PaySalaryRow[];
          columns?: { field: string; headerName: string; minWidth?: number; type?: string }[];
          totals?: PaySalaryRow | null;
        };
        const rows = body.data ?? [];
        // Use the columns the backend provides (base columns are always present,
        // so the grid header renders even when there's no salary data).
        const cols: GridColDef[] = (body.columns ?? []).map((c) => ({
          field: c.field,
          headerName: c.headerName,
          flex: 1,
          minWidth: c.minWidth ?? 120,
          ...(c.type === "number" ? { type: "number" as const } : {}),
        }));
        setSalaryColumns(cols);
        // Ensure each row has a unique id
        setSalaryData(rows.map((row, idx) => ({ ...row, id: (row.id as number) ?? idx })));
        // Vertical grand-total row (id "__totals__") is pinned at the bottom.
        setTotalsRow(body.totals ?? null);
      } catch {
        // Silent failure for salary data
      }
    })();
    return () => { cancelled = true; };
  }, [coId, detail, payRegisterId]);

  // Approve / Reject handler
  const handleStatusUpdate = useCallback(async (status: number) => {
    if (!coId || !payRegisterId) return;
    setActionLoading(true);
    try {
      const payload = {
        id: Number(payRegisterId),
        status,
      };
      const res = await updatePayRegister(coId, payRegisterId, payload);
      if (res?.error) throw new Error(res.error);
      const statusLabel = status === PAY_REGISTER_STATUS.APPROVED ? "Approved" : "Rejected";
      setSnackbar({ open: true, message: `Pay register ${statusLabel} successfully`, severity: "success" });
      router.push("/dashboardportal/hrms/payRegister");
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to update status", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  }, [coId, payRegisterId, router]);

  // Pay Register → Excel export
  const handleExport = useCallback(async () => {
    if (!coId || !payRegisterId) return;
    setExporting(true);
    try {
      const blob = await exportPayRegister(coId, payRegisterId);
      if (!blob || blob.size === 0) {
        setSnackbar({ open: true, message: "No data to export.", severity: "error" });
        return;
      }
      saveAs(blob, `PayRegister_${payRegisterId}.xlsx`);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to export", severity: "error" });
    } finally {
      setExporting(false);
    }
  }, [coId, payRegisterId]);

  // Pay slips → PDF (one slip per employee)
  const handlePrintPaySlips = useCallback(async () => {
    if (!coId || !payRegisterId) return;
    setPrinting(true);
    try {
      const blob = await printPaySlips(coId, payRegisterId);
      if (!blob || blob.size === 0) {
        setSnackbar({ open: true, message: "No data for pay slips.", severity: "error" });
        return;
      }
      saveAs(blob, `PaySlips_${payRegisterId}.pdf`);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to print pay slips", severity: "error" });
    } finally {
      setPrinting(false);
    }
  }, [coId, payRegisterId]);

  const showApprovalButtons = detail?.approveButton === true;
  const isNotApproved = detail?.status_id != null && String(detail.status_id) !== String(PAY_REGISTER_STATUS.APPROVED);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });

  return (
    <Box className="flex flex-col gap-6 p-4">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Typography variant="h5">View Pay Register</Typography>
        <Box className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <DownloadIcon size={16} />
            {exporting ? "Exporting..." : "Pay Register Export"}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintPaySlips}
            disabled={printing}
            className="flex items-center gap-2"
          >
            <PrinterIcon size={16} />
            {printing ? "Generating..." : "Pay Slip Print"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboardportal/hrms/payRegister")}>
            Back
          </Button>
        </Box>
      </Box>

      {/* Pay Register Details Summary */}
      {detail && (
        <Paper className="p-4">
          <Box className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Box>
              <Typography variant="caption" color="text.secondary">From Date</Typography>
              <Typography variant="body1">{detail.fromDateDesc ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">To Date</Typography>
              <Typography variant="body1">{detail.toDateDesc ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Pay Scheme</Typography>
              <Typography variant="body1">{detail.payscheme ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="body1">{detail.status ?? "-"}</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Salary Data Grid — header always renders; empty body shows the no-rows overlay */}
      <Paper className="p-4">
        {salaryColumns.length > 0 ? (
          <MuiDataGrid
            rows={totalsRow ? [...salaryData, totalsRow] : salaryData}
            columns={salaryColumns}
            rowCount={salaryData.length + (totalsRow ? 1 : 0)}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
            paginationMode="client"
            getRowClassName={(params) =>
              params.row.id === "__totals__" ? "row-grand-total" : ""
            }
          />
        ) : (
          <Typography variant="body2" color="text.secondary" className="text-center py-8">
            {loading ? "Loading salary data..." : "No salary data available."}
          </Typography>
        )}
      </Paper>

      {/* Approval Buttons */}
      {showApprovalButtons && (
        <Box className="flex justify-end gap-3">
          {isNotApproved && (
            <Button
              onClick={() => handleStatusUpdate(PAY_REGISTER_STATUS.APPROVED)}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Approve"}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => handleStatusUpdate(PAY_REGISTER_STATUS.REJECTED)}
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : "Reject"}
          </Button>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function ViewPayRegisterPage() {
  return (
    <Suspense fallback={<Box className="p-4"><Typography>Loading...</Typography></Box>}>
      <ViewPayRegisterContent />
    </Suspense>
  );
}
