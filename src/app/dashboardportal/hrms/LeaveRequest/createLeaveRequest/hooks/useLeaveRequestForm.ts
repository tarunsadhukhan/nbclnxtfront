"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLeaveLedgerByEb,
  fetchLeaveRequestById,
  fetchLeaveTypeOptions,
  fetchWorkerByEbNo,
} from "@/utils/hrmsService";
import type {
  LeaveLedgerEntry,
  LeaveRequestDetail,
  LeaveTypeOption,
  WorkerLookupResult,
} from "../../types/leaveRequestTypes";
import type { LeaveRequestFormValues } from "../utils/schema";

export type FormMode = "create" | "edit" | "view";

const ACTIVE_EMP_STATUS = 35;

const blankValues: LeaveRequestFormValues = {
  branch_id: 0,
  eb_no: "",
  eb_id: 0,
  leave_type_id: 0,
  leave_from_date: "",
  leave_to_date: "",
  non_working_days: 0,
  leave_purpose: "",
};

export function useLeaveRequestForm(params: {
  coId: string;
  defaultBranchId: number;
  mode: FormMode;
  id: string | null;
}) {
  const { coId, defaultBranchId, mode, id } = params;

  const [values, setValues] = useState<LeaveRequestFormValues>(() => ({
    ...blankValues,
    branch_id: defaultBranchId,
  }));
  const [statusId, setStatusId] = useState<number>(21);
  const [workerName, setWorkerName] = useState<string>("");
  // True when the last emp-code lookup failed to resolve an active worker; the
  // UI uses this to flag the worker-name field as invalid.
  const [workerInvalid, setWorkerInvalid] = useState(false);
  const [empStatus, setEmpStatus] = useState<number | null>(null);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveTypeOption[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerEntry[]>([]);
  const [approveButton, setApproveButton] = useState(false);
  const [rejectButton, setRejectButton] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof LeaveRequestFormValues>(
      field: K,
      value: LeaveRequestFormValues[K],
    ) => setValues((prev) => ({ ...prev, [field]: value })),
    [],
  );

  // Editing the emp code invalidates any previously resolved worker so a stale
  // eb_id can never be submitted; onBlur re-runs lookupWorker to re-resolve.
  const updateEbNo = useCallback((raw: string) => {
    setValues((prev) => ({ ...prev, eb_no: raw.toUpperCase(), eb_id: 0 }));
    setWorkerName("");
    setWorkerInvalid(false);
    setLedger([]);
  }, []);

  // Load leave types
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await fetchLeaveTypeOptions(coId);
      if (cancelled) return;
      if (err || !data) return;
      const options = ((data.data ?? []) as Record<string, unknown>[]).map(
        (r) => ({
          leave_type_id: Number(r.leave_type_id),
          leave_type_code: String(r.leave_type_code ?? ""),
          leave_type_description: String(r.leave_type_description ?? ""),
        }),
      );
      setLeaveTypeOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, [coId]);

  // Load existing detail for edit/view
  useEffect(() => {
    if (!coId || !id || mode === "create") return;
    let cancelled = false;
    setLoadingDetail(true);
    (async () => {
      try {
        const { data, error: err } = await fetchLeaveRequestById(id);
        if (cancelled) return;
        if (err || !data?.data) {
          setError(err || "Failed to load leave request");
          return;
        }
        const detail = data.data as LeaveRequestDetail;
        const h = detail.header;
        setValues({
          branch_id: h.branch_id ?? defaultBranchId,
          eb_no: h.eb_no ?? "",
          eb_id: h.eb_id,
          leave_type_id: h.leave_type_id,
          leave_from_date: h.leave_from_date ?? "",
          leave_to_date: h.leave_to_date ?? "",
          non_working_days: h.non_working_days ?? 0,
          leave_purpose: h.leave_purpose ?? "",
        });
        setStatusId(Number(h.status));
        setWorkerName(h.worker_name ?? "");
        setApproveButton(Boolean(detail.approve_button));
        setRejectButton(Boolean(detail.reject_button));
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
  }, [coId, id, mode]);

  // Marks the current emp code as unresolved: clears the worker name, flags it
  // invalid, and drops any stale eb_id / ledger tied to a previous lookup.
  const markWorkerInvalid = useCallback(() => {
    setWorkerName("");
    setWorkerInvalid(true);
    setValues((prev) => ({ ...prev, eb_id: 0 }));
    setLedger([]);
  }, []);

  // Resolves the typed emp code against the worker API. Returns the resolved
  // eb_id (0 when unresolved/invalid) so callers like save can validate the
  // code via the API instead of trusting stale state.
  const lookupWorker = useCallback(async (): Promise<number> => {
    if (!values.branch_id) {
      setError("Select a branch first");
      return 0;
    }
    if (!values.eb_no) {
      // Empty code (e.g. blurred after clearing): reset to a neutral state.
      setWorkerName("");
      setWorkerInvalid(false);
      setValues((prev) => ({ ...prev, eb_id: 0 }));
      setLedger([]);
      return 0;
    }
    try {
      const { data, error: err } = await fetchWorkerByEbNo(
        values.branch_id,
        values.eb_no,
      );
      if (err || !data?.data) {
        markWorkerInvalid();
        return 0;
      }
      const w = data.data as WorkerLookupResult;
      if (w.emp_status !== ACTIVE_EMP_STATUS) {
        markWorkerInvalid();
        return 0;
      }
      setWorkerName(w.worker_name);
      setWorkerInvalid(false);
      setEmpStatus(w.emp_status);
      setValues((prev) => ({ ...prev, eb_id: w.eb_id }));
      setError(null);

      const ledgerRes = await fetchLeaveLedgerByEb(
        values.branch_id,
        values.eb_no,
      );
      if (!ledgerRes.error && ledgerRes.data) {
        const ledgerData =
          ((ledgerRes.data.data as { ledgers?: LeaveLedgerEntry[] })
            ?.ledgers ?? []) as LeaveLedgerEntry[];
        setLedger(ledgerData);
      }
      return w.eb_id;
    } catch {
      markWorkerInvalid();
      return 0;
    }
  }, [values.branch_id, values.eb_no, markWorkerInvalid]);

  const reset = useCallback(() => {
    setValues({ ...blankValues, branch_id: defaultBranchId });
    setStatusId(21);
    setWorkerName("");
    setWorkerInvalid(false);
    setEmpStatus(null);
    setLedger([]);
    setApproveButton(false);
    setRejectButton(false);
    setError(null);
  }, [defaultBranchId]);

  // Apply the sidebar's default branch once it becomes available (create mode).
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
    updateEbNo,
    statusId,
    workerName,
    workerInvalid,
    empStatus,
    leaveTypeOptions,
    ledger,
    approveButton,
    rejectButton,
    loadingDetail,
    error,
    setError,
    lookupWorker,
    reset,
  };
}
