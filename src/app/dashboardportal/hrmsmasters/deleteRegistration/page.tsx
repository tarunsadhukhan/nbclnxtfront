"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  deleteEmployeeFace,
  fetchEmployeeFace,
  type EmployeeFaceRow,
} from "@/utils/hrmsReportService";

/**
 * Delete Registration — remove an employee's face registration
 * (employee_face_mst) so they can be enrolled again. The active registrations
 * of the selected company/branch are listed, the search box narrows them to
 * one EB no, and each row can be deleted after a Yes/No confirmation.
 * No create or edit here by design.
 */
export default function DeleteRegistrationPage() {
  const { selectedCompany, selectedBranches, hasMenuAccess } = useSidebarContext();
  const pathname = usePathname();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const canDelete = hasMenuAccess(pathname, "edit");

  const [empCode, setEmpCode] = useState("");
  const [rows, setRows] = useState<EmployeeFaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [confirmRow, setConfirmRow] = useState<EmployeeFaceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const search = empCode.trim();

  useEffect(() => {
    if (coId == null) {
      setRows([]);
      setLoading(false);
      return;
    }
    // `cancelled` so a superseded search (or an unmount) can't land its rows.
    let cancelled = false;
    setLoading(true);
    fetchEmployeeFace({ coId, branchId, active: "1", empCode: search || undefined })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRows([]);
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : "Error fetching registrations",
          severity: "error",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coId, branchId, search, reloadKey]);

  const handleDelete = async () => {
    if (!confirmRow || coId == null) return;
    setDeleting(true);
    try {
      await deleteEmployeeFace(coId, confirmRow.id);
      setSnackbar({
        open: true,
        message: `Registration deleted for ${confirmRow.emp_code ?? ""}`.trim(),
        severity: "success",
      });
      setConfirmRow(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error deleting registration",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<GridColDef<EmployeeFaceRow>[]>(
    () => [
      { field: "emp_code", headerName: "EB No", width: 110 },
      { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
      { field: "department", headerName: "Department", flex: 1, minWidth: 150 },
      { field: "sub_department", headerName: "Sub Department", flex: 1, minWidth: 150 },
      { field: "has_photo", headerName: "Photo", width: 90 },
      { field: "updated_date_time", headerName: "Registered On", width: 150 },
      {
        field: "__delete",
        headerName: "Delete",
        width: 90,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <IconButton
            size="small"
            color="error"
            disabled={!canDelete}
            // ponytail: native title — a MUI Tooltip per grid cell buys nothing here.
            title={canDelete ? "Delete registration" : "No delete permission"}
            onClick={() => setConfirmRow(params.row)}
          >
            <Trash2 size={16} />
          </IconButton>
        ),
      },
    ],
    [canDelete],
  );

  const subtitle = loading
    ? "Loading registrations…"
    : rows.length === 0
      ? search
        ? "No face registration found for this EB no"
        : "No face registrations for the selected company/branch"
      : search
        ? `${rows[0].emp_name ?? ""} — ${rows.length} registration(s)`
        : `${rows.length} registration(s)`;

  return (
    <IndexWrapper
      title="Delete Registration"
      subtitle={subtitle}
      rows={rows}
      columns={columns}
      rowCount={rows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: empCode,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setEmpCode(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Enter EB No",
        debounceDelayMs: 500,
      }}
    >
      <Dialog open={confirmRow != null} onClose={() => setConfirmRow(null)}>
        <DialogTitle>Delete Registration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the face registration of {confirmRow?.emp_code}
            {confirmRow?.emp_name ? ` - ${confirmRow.emp_name}` : ""}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRow(null)} disabled={deleting}>
            No
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

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
