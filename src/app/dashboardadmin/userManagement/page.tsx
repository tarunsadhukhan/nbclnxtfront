"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton,
} from "@mui/material";
import { KeyRound } from "lucide-react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import { useUserList } from "./hooks/useUserList";
import type { User } from "./types";

interface ResetPasswordResponse {
  data?: {
    message?: string;
    default_password?: string;
  };
}

export default function UserManagementPage() {
  const router = useRouter();
  const {
    rows,
    totalRows,
    loading,
    error,
    paginationModel,
    handlePaginationModelChange,
    searchValue,
    handleSearchChange,
  } = useUserList();

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // State for the reset-password confirmation dialog
  const [resetTarget, setResetTarget] = React.useState<User | null>(null);
  const [resetSubmitting, setResetSubmitting] = React.useState(false);

  // Show error in snackbar when it occurs
  React.useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: "error",
      });
    }
  }, [error]);

  const handleEdit = useCallback(
    (row: User) => {
      router.push(`/dashboardadmin/userManagement/CreateUser?userId=${row.user_id}`);
    },
    [router]
  );

  const handleCreate = useCallback(() => {
    router.push("/dashboardadmin/userManagement/CreateUser");
  }, [router]);

  const handleOpenResetDialog = useCallback((row: User) => {
    setResetTarget(row);
  }, []);

  const handleCloseResetDialog = useCallback(() => {
    if (resetSubmitting) return;
    setResetTarget(null);
  }, [resetSubmitting]);

  const handleConfirmReset = useCallback(async () => {
    if (!resetTarget) return;
    setResetSubmitting(true);
    const { data, error: apiError } = await fetchWithCookie<ResetPasswordResponse>(
      apiRoutes.RESET_PORTAL_USER_PASSWORD,
      "POST",
      { user_id: resetTarget.user_id }
    );
    setResetSubmitting(false);

    if (apiError || !data?.data) {
      setSnackbar({
        open: true,
        message: apiError || "Failed to reset password",
        severity: "error",
      });
      setResetTarget(null);
      return;
    }

    const defaultPassword = data.data.default_password ?? "";
    const baseMessage = data.data.message ?? "Password reset to default";
    setSnackbar({
      open: true,
      message: defaultPassword
        ? `${baseMessage}. Default password: ${defaultPassword}`
        : baseMessage,
      severity: "success",
    });
    setResetTarget(null);
  }, [resetTarget]);

  const columns = useMemo<GridColDef<User>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "email_id",
        headerName: "Username",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "active",
        headerName: "Active",
        width: 100,
        valueGetter: (value: number) => (value === 1 ? "Yes" : "No"),
      },
      {
        field: "__reset_password",
        headerName: "Reset Password",
        width: 140,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => (
          <Tooltip title="Reset Password">
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleOpenResetDialog(params.row)}
              aria-label="Reset password"
            >
              <KeyRound size={16} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [handleOpenResetDialog]
  );

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <IndexWrapper
      title="User Management Portal"
      subtitle="Manage portal users and their branch/role assignments"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search users...",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "+ Create User",
        onClick: handleCreate,
      }}
      onEdit={handleEdit}
    >
      <Dialog
        open={Boolean(resetTarget)}
        onClose={handleCloseResetDialog}
        aria-labelledby="reset-password-dialog-title"
      >
        <DialogTitle id="reset-password-dialog-title">Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {resetTarget
              ? `This will reset the password for "${
                  resetTarget.name || resetTarget.email_id
                }" to the system default. The user's existing sessions will be invalidated. Continue?`
              : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleCloseResetDialog} disabled={resetSubmitting}>
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleConfirmReset}
            color="warning"
            variant="contained"
            disabled={resetSubmitting}
          >
            {resetSubmitting ? "Resetting..." : "Reset Password"}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === "success" ? 8000 : 4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleCloseSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
