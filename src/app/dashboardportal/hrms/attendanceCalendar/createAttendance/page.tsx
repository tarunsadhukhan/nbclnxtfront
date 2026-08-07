"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  approveAttendance,
  createAttendance,
  rejectAttendance,
  updateAttendance,
} from "@/utils/hrmsService";
import { useAttendanceForm, type FormMode } from "./hooks/useAttendanceForm";
import { attendanceFormSchema } from "./utils/schema";
import {
  ATTENDANCE_MARK_OPTIONS,
  ATTENDANCE_SOURCE_OPTIONS,
  ATTENDANCE_TYPE_OPTIONS,
  STATUS_COLOR,
  STATUS_LABELS,
} from "../types/attendanceTypes";

const LIST_PATH = "/dashboardportal/hrms/attendanceCalendar";

// Light-blue grouped section, derived from the theme's info colour (no hardcode).
const sectionSx = {
  p: 3,
  borderRadius: 2,
  boxShadow: "none",
  bgcolor: (t: import("@mui/material/styles").Theme) =>
    alpha(t.palette.info.main, 0.12),
};

const fourColSx = {
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(4, 1fr)",
  },
};

// Employee row: keep all fields on a single row.
const fiveColSx = {
  gridTemplateColumns: {
    xs: "repeat(2, 1fr)",
    md: "repeat(5, 1fr)",
  },
};

type Opt = { value: string; label: string };

/** Searchable single-select built on MUI Autocomplete. */
function SearchSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  required,
  isOptionDisabled,
}: {
  label: string;
  value: string;
  options: readonly Opt[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Grey out (but still show) individual options by their value. */
  isOptionDisabled?: (value: string) => boolean;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Autocomplete
      size="small"
      options={options}
      value={selected}
      disabled={disabled}
      getOptionLabel={(o) => o.label}
      getOptionDisabled={
        isOptionDisabled ? (o) => isOptionDisabled(o.value) : undefined
      }
      isOptionEqualToValue={(o, v) => o.value === v.value}
      onChange={(_, v) => onChange(v ? v.value : "")}
      // MUI keys options by label by default; duplicate master descriptions
      // (e.g. two sub-depts named the same) collide. Key by the id instead.
      renderOption={({ key: _key, ...props }, o) => (
        <li key={o.value} {...props}>
          {o.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} />
      )}
    />
  );
}

function CreateAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const mode = (searchParams.get("mode") ?? "create") as FormMode;
  const id = searchParams.get("id");

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
    statusId,
    workerName,
    workerInvalid,
    spellOptions,
    subDeptOptions,
    designationOptions,
    machineOptions,
    approveButton,
    rejectButton,
    leaveStatus,
    loadingDetail,
    error,
    setError,
    lookupWorker,
    applySpell,
    selectDepartment,
    selectDesignation,
  } = useAttendanceForm({ coId: coId ?? "", defaultBranchId, mode, id });

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
  const disabled = isView || !canEdit;

  // Leave conflict (vw_leave_dates): unpaid leave blocks the save entirely;
  // paid leave (payable='Y') permits only Cash / OT, not Regular.
  const leaveBlocked = Boolean(
    leaveStatus?.on_leave && leaveStatus.payable !== "Y",
  );
  const leavePaidOnly = Boolean(
    leaveStatus?.on_leave && leaveStatus.payable === "Y",
  );
  // Save is deactivated while the leave check fails — a leave date blocks the
  // save outright, and a paid leave date still blocks it until the type is
  // switched off Regular. It reactivates the moment the selection is valid.
  const leaveInvalid =
    leaveBlocked || (leavePaidOnly && values.attendance_type === "R");

  // Searchable-select option lists.
  const branchOpts = useMemo<Opt[]>(
    () =>
      branchOptions.map((b) => ({
        value: String(b.branch_id),
        label: b.branch_name,
      })),
    [branchOptions],
  );
  const spellOpts = useMemo<Opt[]>(
    () =>
      spellOptions.map((s) => ({
        value: String(s.spell_id),
        label: s.spell_name,
      })),
    [spellOptions],
  );
  const deptOpts = useMemo<Opt[]>(
    () =>
      subDeptOptions.map((d) => ({
        value: String(d.sub_dept_id),
        label: d.sub_dept_desc,
      })),
    [subDeptOptions],
  );
  const desigOpts = useMemo<Opt[]>(
    () =>
      designationOptions.map((d) => ({
        value: String(d.designation_id),
        label: d.desig,
      })),
    [designationOptions],
  );

  const showSnack = useCallback(
    (message: string, severity: "success" | "error") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  const handleSave = useCallback(async () => {
    const parsed = attendanceFormSchema.safeParse(values);
    if (!parsed.success) {
      showSnack(parsed.error.issues[0]?.message ?? "Validation failed", "error");
      return;
    }
    if (leaveBlocked) {
      showSnack(
        "Employee is on leave on this date — attendance cannot be saved",
        "error",
      );
      return;
    }
    if (leavePaidOnly && parsed.data.attendance_type === "R") {
      showSnack(
        "Employee is on paid leave — only Cash or Over Time is allowed, not Regular",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await createAttendance(parsed.data);
        if (res?.error) throw new Error(res.error);
        showSnack("Attendance marked", "success");
        router.push(LIST_PATH);
      } else if (mode === "edit" && id) {
        const res = await updateAttendance(id, parsed.data);
        if (res?.error) throw new Error(res.error);
        showSnack("Attendance updated", "success");
        router.push(LIST_PATH);
      }
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }, [values, mode, id, router, showSnack, leaveBlocked, leavePaidOnly]);

  const handleApprove = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await approveAttendance(id);
      if (res?.error) throw new Error(res.error);
      showSnack("Attendance approved", "success");
      router.push(LIST_PATH);
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Approval failed", "error");
    } finally {
      setSaving(false);
    }
  }, [id, router, showSnack]);

  const handleReject = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await rejectAttendance(id);
      if (res?.error) throw new Error(res.error);
      showSnack("Attendance rejected", "success");
      router.push(LIST_PATH);
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : "Rejection failed", "error");
    } finally {
      setSaving(false);
    }
  }, [id, router, showSnack]);

  const titleText = useMemo(() => {
    if (mode === "view") return "View Attendance";
    if (mode === "edit") return "Edit Attendance";
    return "Mark Attendance";
  }, [mode]);

  return (
    <Box className="flex flex-col gap-5 p-4">
      {/* Header: back arrow + title (+ status chip for edit/view) */}
      <Box className="flex items-center justify-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            size="small"
            onClick={() => router.push(LIST_PATH)}
            aria-label="Back"
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" color="primary" fontWeight={700}>
            {titleText}
          </Typography>
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
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {leaveBlocked ? (
        <Alert severity="error">
          Employee is on leave on the selected date. Attendance cannot be saved.
        </Alert>
      ) : leavePaidOnly ? (
        <Alert severity="warning">
          Employee is on paid leave on this date — only Cash or Over Time
          attendance is allowed, not Regular.
        </Alert>
      ) : null}

      {/* Section 1: Employee / name / date / mark / source */}
      <Paper sx={sectionSx}>
        <Box className="grid gap-4" sx={fiveColSx}>
          <TextField
            label="Employee Code"
            size="small"
            value={values.eb_no}
            onChange={(e) => updateField("eb_no", e.target.value.toUpperCase())}
            onBlur={() => lookupWorker()}
            disabled={isView || mode === "edit"}
            required
            error={workerInvalid}
            helperText={workerInvalid ? "Invalid Emp code/Name" : undefined}
          />
          <TextField
            label="Name"
            size="small"
            value={workerName}
            placeholder={workerInvalid ? "Invalid Emp code/Name" : undefined}
            error={workerInvalid}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Attendance Date"
            type="date"
            size="small"
            value={values.attendance_date}
            onChange={(e) => updateField("attendance_date", e.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            required
          />
          <SearchSelect
            label="Attendance Mark"
            value={values.attendance_mark}
            options={ATTENDANCE_MARK_OPTIONS}
            onChange={(v) => updateField("attendance_mark", v)}
            disabled={disabled}
            required
          />
          <SearchSelect
            label="Attendance Source"
            value={values.attendance_source}
            options={ATTENDANCE_SOURCE_OPTIONS}
            onChange={(v) => updateField("attendance_source", v)}
            disabled={disabled}
            required
          />
        </Box>
      </Paper>

      {/* Branch (only when more than one selected) */}
      {branchOptions.length > 1 ? (
        <Paper sx={sectionSx}>
          <Box className="grid gap-4" sx={fourColSx}>
            <SearchSelect
              label="Branch"
              value={values.branch_id ? String(values.branch_id) : ""}
              options={branchOpts}
              onChange={(v) =>
                setValues((prev) => ({
                  ...prev,
                  branch_id: Number(v) || 0,
                  eb_id: 0,
                }))
              }
              disabled={isView || mode === "edit"}
              required
            />
          </Box>
        </Paper>
      ) : null}

      {/* Section 2: type / spell / entry / exit */}
      <Paper sx={sectionSx}>
        <Box className="grid gap-4" sx={fourColSx}>
          <SearchSelect
            label="Attendance Type"
            value={values.attendance_type}
            options={ATTENDANCE_TYPE_OPTIONS}
            onChange={(v) => updateField("attendance_type", v)}
            disabled={disabled}
            required
            isOptionDisabled={(v) => leavePaidOnly && v === "R"}
          />
          <SearchSelect
            label="Spell"
            value={values.spell_id ? String(values.spell_id) : ""}
            options={spellOpts}
            onChange={(v) => applySpell(Number(v) || 0)}
            disabled={disabled}
            required
          />
          <TextField
            label="Entry Time"
            type="time"
            size="small"
            value={values.entry_time}
            onChange={(e) => updateField("entry_time", e.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Exit Time"
            type="time"
            size="small"
            value={values.exit_time}
            onChange={(e) => updateField("exit_time", e.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Box>
      </Paper>

      {/* Section 3: hours / department / designation / machines + remarks */}
      <Paper sx={sectionSx}>
        <Box className="flex flex-col gap-4">
          <Box className="grid gap-4" sx={fourColSx}>
            <TextField
              label="Working Hours"
              type="number"
              size="small"
              placeholder="Enter Here"
              value={values.working_hours || ""}
              onChange={(e) =>
                updateField("working_hours", Number(e.target.value) || 0)
              }
              disabled={disabled}
              inputProps={{ min: 0, step: 0.5 }}
              required
            />
            <TextField
              label="Idle Hours"
              type="number"
              size="small"
              value={values.idle_hours}
              onChange={(e) =>
                updateField("idle_hours", Number(e.target.value) || 0)
              }
              disabled={disabled}
              inputProps={{ min: 0, step: 0.5 }}
              required
            />
            <SearchSelect
              label="Department"
              value={
                values.worked_department_id
                  ? String(values.worked_department_id)
                  : ""
              }
              options={deptOpts}
              onChange={(v) => selectDepartment(Number(v) || 0)}
              disabled={disabled}
              required
            />
            <SearchSelect
              label="Designation"
              value={
                values.worked_designation_id
                  ? String(values.worked_designation_id)
                  : ""
              }
              options={desigOpts}
              onChange={(v) => selectDesignation(Number(v) || 0)}
              disabled={disabled || !values.worked_department_id}
              required
            />
          </Box>

          <Box className="grid gap-4" sx={fourColSx}>
            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              options={machineOptions}
              value={machineOptions.filter((m) =>
                values.machine_ids.includes(m.mc_id),
              )}
              disabled={disabled || !values.worked_designation_id}
              getOptionLabel={(o) => o.machine_name}
              isOptionEqualToValue={(o, v) => o.mc_id === v.mc_id}
              onChange={(_, v) =>
                updateField(
                  "machine_ids",
                  v.map((m) => m.mc_id),
                )
              }
              renderOption={(props, option, { selected }) => {
                const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                  key?: React.Key;
                };
                return (
                  <li key={option.mc_id} {...rest}>
                    <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                    {option.machine_name}
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Machine No"
                  placeholder={values.machine_ids.length ? "" : "Select"}
                />
              )}
            />
            <TextField
              label="Remarks"
              size="small"
              placeholder="Enter Here"
              value={values.remarks}
              onChange={(e) => updateField("remarks", e.target.value)}
              disabled={disabled}
            />
          </Box>
        </Box>
      </Paper>

      {/* Centered action buttons */}
      <Box className="flex justify-center gap-3 py-2">
        <Button variant="outline" onClick={() => router.push(LIST_PATH)}>
          Cancel
        </Button>
        {canEdit ? (
          <Button onClick={handleSave} disabled={saving || leaveInvalid}>
            {saving ? "Saving..." : mode === "create" ? "Submit" : "Update"}
          </Button>
        ) : null}
        {canApprove ? (
          <Button onClick={handleApprove} disabled={saving}>
            Approve
          </Button>
        ) : null}
        {canReject ? (
          <Button variant="destructive" onClick={handleReject} disabled={saving}>
            Reject
          </Button>
        ) : null}
      </Box>

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

export default function CreateAttendancePage() {
  return (
    <Suspense
      fallback={
        <Box className="p-4">
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <CreateAttendanceContent />
    </Suspense>
  );
}
