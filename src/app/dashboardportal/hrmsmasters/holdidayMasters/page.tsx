"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import HolidayYearDialog from "./HolidayYearDialog";

/** A row of GET /hrms/holiday_years. */
interface HolidayYearRow {
  id: number;
  year: number;
  holidays: number;
  first_date: string;
  last_date: string;
}

const fmtDate = (iso: string) => iso.split("-").reverse().join("-");

/**
 * Holiday Master (holiday_master) — HRMS Master -> Holiday Masters. Legacy
 * Smart Eye FrmHoliday: holidays are kept per year for the sidebar branch;
 * each year opens as a date + event grid.
 */
export default function HolidayMasterPage() {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<HolidayYearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editYear, setEditYear] = useState<number | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchYears = useCallback(async () => {
    if (branchId == null) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchWithCookie<{ data: HolidayYearRow[] }>(
      `${apiRoutesPortalMasters.HOLIDAY_YEARS}?branch_id=${branchId}`,
      "GET",
    );
    if (error || !data) {
      setSnackbar({ open: true, message: error || "Failed to fetch holidays", severity: "error" });
    } else {
      setRows(data.data || []);
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    void fetchYears();
  }, [fetchYears]);

  const columns = useMemo<GridColDef<HolidayYearRow>[]>(
    () => [
      { field: "year", headerName: "YEAR", width: 100 },
      { field: "holidays", headerName: "HOLIDAYS", type: "number", width: 110 },
      { field: "first_date", headerName: "FIRST", width: 130, valueFormatter: (v: string) => fmtDate(v) },
      { field: "last_date", headerName: "LAST", width: 130, valueFormatter: (v: string) => fmtDate(v) },
    ],
    [],
  );

  // Years are few — client-side paging over the full list.
  const pageRows = rows.slice(
    paginationModel.page * paginationModel.pageSize,
    (paginationModel.page + 1) * paginationModel.pageSize,
  );

  return (
    <IndexWrapper
      title="Holiday Master"
      rows={pageRows}
      columns={columns}
      rowCount={rows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      createAction={{
        label: "Add Year",
        onClick: () => {
          setEditYear(undefined);
          setDialogOpen(true);
        },
      }}
      onEdit={(row) => {
        setEditYear(row.year);
        setDialogOpen(true);
      }}
    >
      <HolidayYearDialog
        open={dialogOpen}
        year={editYear}
        existingYears={rows.map((r) => r.year)}
        onClose={() => setDialogOpen(false)}
        onSaved={(message) => {
          setSnackbar({ open: true, message, severity: "success" });
          void fetchYears();
        }}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
