"use client";

import React, {
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  approveLeaveRequest,
  createLeaveRequest,
  rejectLeaveRequest,
  updateLeaveRequest,
} from "@/utils/hrmsService";
import LeaveBalancePanel from "./_components/LeaveBalancePanel";
import {
  type FormMode,
  useLeaveRequestForm,
} from "./hooks/useLeaveRequestForm";
import { leaveRequestFormSchema } from "./utils/schema";
import { STATUS_COLOR, STATUS_LABELS } from "../types/leaveRequestTypes";

const LIST_PATH = "/dashboardportal/hrms/LeaveRequest";

function CreateLeaveRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const mode = (searchParams.get("mode") ?? "create") as FormMode;
  const id = searchParams.get("id");

  // Branch dropdown options = branches active in the left sidebar; the first
  // sidebar-selected branch is the default for a new leave request.
  const branchOptions = useMemo(
    () =>
      (selectedCompany?.branches ?? []).filter((b) =>
        selectedBranches.includes(b.branch_id),
      ),
    [selectedCompany, selectedBranches],
  );
  const defaultBranchId = selectedBranches[0] ?? 0;

  const {
    values,
    setValues,
    updateField,
    updateEbNo,
    statusId,
    workerName,
    workerInvalid,
    leaveTypeOptions,
    ledger,
    approveButton,
    rejectButton,
    loadingDetail,
    error,
    setError,
    lookupWorker,
  } = useLeaveRequestForm({ coId: coId ?? "", defaultBranchId, mode, id });

  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const isView = mode === "view";
  const canEdit =
    mode !== "view" && statusId !== 3 && statusId !== 4 && !loadingDetail;
  const canApprove = mode !== "create" && approveButton && !isView;
  const canReject = mode !== "create" && rejectButton && !isView;

  const showSnack = useCallback(
    (message: string, severity: "success" | "error") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  const validateAndGetPayload = useCallback((ebId: number) => {
    const parsed = leaveRequestFormSchema.safeParse({ ...values, eb_id: ebId });
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Validation failed";
      showSnack(firstError, "error");
      return null;
    }
    return {
      branch_id: parsed.data.branch_id,
      eb_id: parsed.data.eb_id,
      leave_type_id: parsed.data.leave_type_id,
      leave_from_date: parsed.data.leave_from_date,
      leave_to_date: parsed.data.leave_to_date,
      non_working_days: parsed.data.non_working_days,
      leave_purpose: parsed.data.leave_purpose,
    };
  }, [values, showSnack]);

  const handleSave = useCallback(async () => {
    // Resolve the emp code via API if it hasn't been (e.g. save clicked before
    // the blur lookup ran), then validate against that fresh eb_id.
    let ebId = values.eb_id;
    if (values.eb_no && !ebId) ebId = await lookupWorker();
    const payload = validateAndGetPayload(ebId);
    if (!payload) return;
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await createLeaveRequest(payload);
        if (res?.error) throw new Error(res.error);
        showSnack("Leave request created", "success");
        router.push(LIST_PATH);
      } else if (mode === "edit" && id) {
        const res = await updateLeaveRequest(id, payload);
        if (res?.error) throw new Error(res.error);
        showSnack("Leave request updated", "success");
        router.push(LIST_PATH);
      }
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }, [
    values.eb_id,
    values.eb_no,
    lookupWorker,
    validateAndGetPayload,
    mode,
    id,
    router,
    showSnack,
  ]);

  const handleApprove = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await approveLeaveRequest(id, { branch_id: values.branch_id });
      if (res?.error) throw new Error(res.error);
      showSnack("Leave request approved", "success");
      router.push(LIST_PATH);
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Approval failed", "error");
    } finally {
      setSaving(false);
    }
  }, [id, values.branch_id, router, showSnack]);

  const handleReject = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await rejectLeaveRequest(id, { branch_id: values.branch_id });
      if (res?.error) throw new Error(res.error);
      showSnack("Leave request rejected", "success");
      router.push(LIST_PATH);
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Rejection failed", "error");
    } finally {
      setSaving(false);
    }
  }, [id, values.branch_id, router, showSnack]);

  const titleText = useMemo(() => {
    if (mode === "view") return "View Leave Request";
    if (mode === "edit") return "Edit Leave Request";
    return "Apply Leave";
  }, [mode]);

  // Actual leave days = inclusive date span minus non-working days. Read-only.
  const leaveDays = useMemo(() => {
    const from = new Date(values.leave_from_date);
    const to = new Date(values.leave_to_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const days = spanDays - (values.non_working_days || 0);
    return days > 0 ? days : 0;
  }, [values.leave_from_date, values.leave_to_date, values.non_working_days]);

  const leaveDaysInvalid =
    Boolean(values.leave_from_date && values.leave_to_date) && leaveDays <= 0;

  return (
    <Box className="flex flex-col gap-6 p-4">
      <Box className="flex items-center justify-between">
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5">{titleText}</Typography>
          {mode !== "create" ? (
            <Box
              component="span"
              sx={{
                px: 1.5,
                py: 0.25,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 500,
                bgcolor: `${STATUS_COLOR[statusId] ?? "default"}.light`,
                color: `${STATUS_COLOR[statusId] ?? "default"}.contrastText`,
                border: "1px solid",
                borderColor: `${STATUS_COLOR[statusId] ?? "default"}.main`,
              }}
            >
              {STATUS_LABELS[statusId] ?? "Unknown"}
            </Box>
          ) : null}
        </Stack>
        <Box className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(LIST_PATH)}>
            Back
          </Button>
          {canEdit ? (
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Update"}
            </Button>
          ) : null}
          {canApprove ? (
            <Button onClick={handleApprove} disabled={saving}>
              Approve
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={saving}
            >
              Reject
            </Button>
          ) : null}
        </Box>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper className="p-4">
        <Typography variant="subtitle1" className="mb-3 font-semibold">
          Leave Details
        </Typography>
        <Box className="flex flex-col gap-4">
          {/* Row 1: employee selection */}
          <Box
            className="grid gap-4"
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}
          >
            <TextField
              select
              label="Branch"
              size="small"
              value={values.branch_id ? String(values.branch_id) : ""}
              onChange={(e) => {
                const nextBranch = Number(e.target.value);
                // Changing branch invalidates the current employee lookup.
                setValues((prev) => ({
                  ...prev,
                  branch_id: nextBranch,
                  eb_id: 0,
                }));
              }}
              disabled={isView || mode === "edit"}
              required
            >
              <MenuItem value="">Select branch</MenuItem>
              {branchOptions.map((b) => (
                <MenuItem key={b.branch_id} value={String(b.branch_id)}>
                  {b.branch_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Employee Code"
              size="small"
              value={values.eb_no}
              onChange={(e) => updateEbNo(e.target.value)}
              onBlur={() => lookupWorker()}
              disabled={isView || mode === "edit"}
            />
            <TextField
              label="Worker Name"
              size="small"
              value={workerName}
              placeholder={workerInvalid ? "Invalid Emp code/Name" : undefined}
              error={workerInvalid}
              InputProps={{ readOnly: true }}
              sx={
                workerInvalid
                  ? {
                      "& .MuiInputBase-input::placeholder": {
                        color: "error.main",
                        opacity: 1,
                      },
                    }
                  : undefined
              }
            />
          </Box>

          {/* Row 2: leave type, dates and day counts */}
          <Box
            className="grid gap-4"
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" } }}
          >
            <TextField
              select
              label="Leave Type"
              size="small"
              value={values.leave_type_id ? String(values.leave_type_id) : ""}
              onChange={(e) =>
                updateField("leave_type_id", Number(e.target.value))
              }
              disabled={isView || !canEdit}
              required
            >
              <MenuItem value="">Select leave type</MenuItem>
              {leaveTypeOptions.map((opt) => (
                <MenuItem
                  key={opt.leave_type_id}
                  value={String(opt.leave_type_id)}
                >
                  {opt.leave_type_description || opt.leave_type_code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="From Date"
              type="date"
              size="small"
              value={values.leave_from_date}
              onChange={(e) => updateField("leave_from_date", e.target.value)}
              disabled={isView || !canEdit}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              value={values.leave_to_date}
              onChange={(e) => updateField("leave_to_date", e.target.value)}
              disabled={isView || !canEdit}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Non Working Days"
              type="number"
              size="small"
              value={values.non_working_days}
              onChange={(e) =>
                updateField(
                  "non_working_days",
                  Math.max(0, Math.trunc(Number(e.target.value)) || 0),
                )
              }
              disabled={isView || !canEdit}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="No of Days Leave"
              size="small"
              value={leaveDays}
              error={leaveDaysInvalid}
              helperText={
                leaveDaysInvalid ? "Must be greater than 0" : undefined
              }
              InputProps={{ readOnly: true }}
            />
          </Box>

          <TextField
            label="Reason"
            size="small"
            multiline
            minRows={2}
            value={values.leave_purpose}
            onChange={(e) => updateField("leave_purpose", e.target.value)}
            disabled={isView || !canEdit}
            fullWidth
            required
          />
        </Box>
      </Paper>

      <LeaveBalancePanel
        ledger={ledger}
        selectedLeaveTypeId={values.leave_type_id}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => {
          setSnackbar((s) => ({ ...s, open: false }));
          setError(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function CreateLeaveRequestPage() {
  return (
    <Suspense
      fallback={
        <Box className="p-4">
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <CreateLeaveRequestContent />
    </Suspense>
  );
}
