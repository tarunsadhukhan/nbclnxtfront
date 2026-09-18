"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, IconButton, Snackbar, Tooltip } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Trash2 } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateHolidayPage from "./CreateHolidayPage";
import { HOLIDAY_TYPE_OPTIONS, type HolidayRow } from "./types";

/**
 * Holiday Master — holidays per branch (table holiday_master), typed as
 * occasional / weekly / monthly with an optional applicable period.
 * Scoped by the sidebar company/branch selection.
 */
export default function HolidayMasterPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchHolidays = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        co_id: String(coId),
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
      });
      if (branchId != null) params.append("branch_id", String(branchId));
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = await fetchWithCookie<{
        data: HolidayRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.HOLIDAY_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch holidays");

      setRows((data.data || []).map((r) => ({ ...r, id: r.holiday_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching holidays",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchHolidays();
  }, [fetchHolidays]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: HolidayRow) => {
    setSelectedId(row.holiday_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchHolidays();
    },
    [fetchHolidays],
  );

  // Columns must keep a stable identity: a new columns array right after mount
  // makes the DataGrid update state before it has mounted. Read the latest
  // refresh through a ref so handleDelete (and columns) never change.
  const handleSavedRef = useRef(handleSaved);
  useEffect(() => {
    handleSavedRef.current = handleSaved;
  }, [handleSaved]);

  const handleDelete = useCallback(async (row: HolidayRow) => {
    if (!confirm(`Delete holiday "${row.holiday ?? ""}" (${row.holiday_date ?? ""})?`)) return;
    const { error } = await fetchWithCookie(
      `${apiRoutesPortalMasters.HOLIDAY_DELETE}/${row.holiday_id}`,
      "DELETE",
    );
    if (error) {
      setSnackbar({ open: true, message: error, severity: "error" });
      return;
    }
    handleSavedRef.current("Holiday deleted successfully");
  }, []);

  const columns = useMemo<GridColDef<HolidayRow>[]>(
    () => [
      { field: "holiday", headerName: "HOLIDAY", flex: 1.5, minWidth: 180 },
      { field: "holiday_date", headerName: "DATE", width: 120 },
      {
        field: "holiday_type",
        headerName: "TYPE",
        width: 120,
        valueFormatter: (value: number | null) =>
          HOLIDAY_TYPE_OPTIONS.find((o) => o.value === String(value))?.label ?? "",
      },
      { field: "period_start_date", headerName: "PERIOD FROM", width: 130 },
      { field: "period_end_date", headerName: "PERIOD TO", width: 130 },
      { field: "branch_name", headerName: "BRANCH", flex: 1, minWidth: 140 },
      {
        field: "__delete",
        headerName: "DELETE",
        width: 80,
        sortable: false,
        renderCell: ({ row }) => (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              aria-label="Delete holiday"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete(row);
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [handleDelete],
  );

  return (
    <IndexWrapper
      title="Holiday Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Search by holiday name",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Holiday", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateHolidayPage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
