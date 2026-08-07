"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAttendanceById,
  fetchAttendanceCreateSetup,
  fetchAttendanceLeaveStatus,
  fetchDesignationsBySubDept,
  fetchMachinesByDesignation,
  fetchWorkerByEbNo,
} from "@/utils/hrmsService";
import type {
  AttendanceDetail,
  DesignationOption,
  MachineOption,
  SpellOption,
  SubDepartmentOption,
  WorkerLookupResult,
} from "../../types/attendanceTypes";
import type { AttendanceFormValues } from "../utils/schema";

export type FormMode = "create" | "edit" | "view";

const ACTIVE_EMP_STATUS = 35;

// Local "today" as YYYY-MM-DD for the date input default.
const todayISO = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const blankValues: AttendanceFormValues = {
  branch_id: 0,
  eb_no: "",
  eb_id: 0,
  attendance_date: "",
  attendance_mark: "P",
  attendance_source: "M",
  attendance_type: "R",
  spell: "",
  spell_id: 0,
  spell_hours: 0,
  worked_department_id: 0,
  worked_designation_id: 0,
  working_hours: 0,
  idle_hours: 0,
  remarks: "",
  entry_time: "",
  exit_time: "",
  machine_ids: [],
};

export function useAttendanceForm(params: {
  coId: string;
  defaultBranchId: number;
  mode: FormMode;
  id: string | null;
}) {
  const { coId, defaultBranchId, mode, id } = params;

  const [values, setValues] = useState<AttendanceFormValues>(() => ({
    ...blankValues,
    branch_id: defaultBranchId,
    // New records default to today; edit/view get overwritten on load.
    attendance_date: mode === "create" ? todayISO() : "",
  }));
  const [statusId, setStatusId] = useState<number>(21);
  const [workerName, setWorkerName] = useState<string>("");
  const [workerInvalid, setWorkerInvalid] = useState(false);
  const [spellOptions, setSpellOptions] = useState<SpellOption[]>([]);
  const [subDeptOptions, setSubDeptOptions] = useState<SubDepartmentOption[]>([]);
  const [designationOptions, setDesignationOptions] = useState<
    DesignationOption[]
  >([]);
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([]);
  const [approveButton, setApproveButton] = useState(false);
  const [rejectButton, setRejectButton] = useState(false);
  // Leave conflict for the selected employee + date (from vw_leave_dates).
  const [leaveStatus, setLeaveStatus] = useState<{
    on_leave: boolean;
    payable: string | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof AttendanceFormValues>(
      field: K,
      value: AttendanceFormValues[K],
    ) => setValues((prev) => ({ ...prev, [field]: value })),
    [],
  );

  // Load setup (spells + sub-departments) scoped to the selected branch.
  useEffect(() => {
    const branchId = values.branch_id || defaultBranchId;
    if (!branchId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await fetchAttendanceCreateSetup(branchId);
      if (cancelled || err || !data?.data) return;
      const setup = data.data as {
        spells?: SpellOption[];
        sub_departments?: SubDepartmentOption[];
      };
      setSpellOptions(setup.spells ?? []);
      setSubDeptOptions(setup.sub_departments ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [values.branch_id, defaultBranchId]);

  // Load machine options for the selected branch.
  useEffect(() => {
    const branchId = values.branch_id || defaultBranchId;
    if (!branchId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await fetchMachinesByDesignation(
        branchId,
        values.worked_designation_id || undefined,
      );
      if (cancelled || err || !data?.data) return;
      setMachineOptions((data.data as MachineOption[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [values.branch_id, values.worked_designation_id, defaultBranchId]);

  const loadDesignations = useCallback(
    async (subDeptId: number) => {
      if (!subDeptId) {
        setDesignationOptions([]);
        return;
      }
      const { data, error: err } = await fetchDesignationsBySubDept(
        coId,
        String(subDeptId),
      );
      if (err || !data?.data) {
        setDesignationOptions([]);
        return;
      }
      // Endpoint returns `{ label, value }`; normalise to the option shape.
      const opts = (data.data as { label: string; value: string }[]).map(
        (o) => ({ designation_id: Number(o.value), desig: o.label }),
      );
      setDesignationOptions(opts);
    },
    [coId],
  );

  // Load existing detail for edit / view.
  useEffect(() => {
    if (!id || mode === "create") return;
    let cancelled = false;
    setLoadingDetail(true);
    (async () => {
      try {
        const { data, error: err } = await fetchAttendanceById(id);
        if (cancelled) return;
        if (err || !data?.data) {
          setError(err || "Failed to load attendance record");
          return;
        }
        const detail = data.data as AttendanceDetail;
        const h = detail.header;
        setValues({
          branch_id: h.branch_id ?? defaultBranchId,
          eb_no: h.eb_no ?? "",
          eb_id: h.eb_id,
          attendance_date: h.attendance_date ?? "",
          attendance_mark: h.attendance_mark ?? "P",
          attendance_source: h.attendance_source ?? "M",
          attendance_type: h.attendance_type ?? "R",
          spell: h.spell ?? "",
          spell_id: h.spell_id ?? 0,
          spell_hours: Number(h.spell_hours ?? 0),
          worked_department_id: h.worked_department_id ?? 0,
          worked_designation_id: h.worked_designation_id ?? 0,
          working_hours: Number(h.working_hours ?? 0),
          idle_hours: Number(h.idle_hours ?? 0),
          remarks: h.remarks ?? "",
          entry_time: h.entry_time ?? "",
          exit_time: h.exit_time ?? "",
          machine_ids: (detail.machines ?? []).map((m) => m.mc_id),
        });
        setStatusId(Number(h.status_id));
        setWorkerName(h.worker_name ?? "");
        setApproveButton(Boolean(detail.approve_button));
        setRejectButton(Boolean(detail.reject_button));
        if (h.worked_department_id) loadDesignations(h.worked_department_id);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, mode, defaultBranchId, loadDesignations]);

  const markWorkerInvalid = useCallback(() => {
    setWorkerName("");
    setWorkerInvalid(true);
    setValues((prev) => ({ ...prev, eb_id: 0 }));
  }, []);

  const lookupWorker = useCallback(async () => {
    if (!values.branch_id) {
      setError("Select a branch first");
      return;
    }
    if (!values.eb_no) {
      setWorkerName("");
      setWorkerInvalid(false);
      setValues((prev) => ({ ...prev, eb_id: 0 }));
      return;
    }
    try {
      const { data, error: err } = await fetchWorkerByEbNo(
        values.branch_id,
        values.eb_no,
      );
      if (err || !data?.data) {
        markWorkerInvalid();
        return;
      }
      const w = data.data as WorkerLookupResult;
      if (w.emp_status !== ACTIVE_EMP_STATUS) {
        markWorkerInvalid();
        return;
      }
      setWorkerName(w.worker_name);
      setWorkerInvalid(false);
      setValues((prev) => ({ ...prev, eb_id: w.eb_id }));
      setError(null);
    } catch {
      markWorkerInvalid();
    }
  }, [values.branch_id, values.eb_no, markWorkerInvalid]);

  // Selecting a spell auto-fills entry/exit time + spell hours.
  const applySpell = useCallback(
    (spellId: number) => {
      const opt = spellOptions.find((s) => s.spell_id === spellId);
      setValues((prev) => ({
        ...prev,
        spell: opt?.spell_name ?? "",
        spell_id: spellId,
        spell_hours: opt?.working_hours ?? prev.spell_hours,
        entry_time: opt?.starting_time ?? prev.entry_time,
        exit_time: opt?.end_time ?? prev.exit_time,
        working_hours: opt?.working_hours ?? prev.working_hours,
      }));
    },
    [spellOptions],
  );

  // Changing department clears the dependent designation + machines, reloads options.
  const selectDepartment = useCallback(
    (subDeptId: number) => {
      setValues((prev) => ({
        ...prev,
        worked_department_id: subDeptId,
        worked_designation_id: 0,
        machine_ids: [],
      }));
      loadDesignations(subDeptId);
    },
    [loadDesignations],
  );

  // Changing designation clears the previously selected machines (they are
  // designation-specific via mech_occu_link) and triggers a machine refetch.
  const selectDesignation = useCallback((designationId: number) => {
    setValues((prev) => ({
      ...prev,
      worked_designation_id: designationId,
      machine_ids: [],
    }));
  }, []);

  // Leave check: whenever a valid employee + date is set, verify the date is
  // not a leave date (vw_leave_dates). Runs after EB-No lookup resolves eb_id
  // and again if the date changes.
  useEffect(() => {
    if (!values.eb_id || !values.attendance_date) {
      setLeaveStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await fetchAttendanceLeaveStatus(
        values.eb_id,
        values.attendance_date,
      );
      if (cancelled || err || !data?.data) return;
      setLeaveStatus(
        data.data as { on_leave: boolean; payable: string | null },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [values.eb_id, values.attendance_date]);

  // Apply the sidebar's default branch once available (create mode).
  useEffect(() => {
    if (mode !== "create" || !defaultBranchId) return;
    setValues((prev) =>
      prev.branch_id ? prev : { ...prev, branch_id: defaultBranchId },
    );
  }, [defaultBranchId, mode]);

  return {
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
  };
}
