/**
 * Hook to fetch employee setup data (dropdown options) and memoize them.
 */
"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchEmployeeCreateSetup } from "@/utils/hrmsService";
import type { EmployeeSetupData, Option } from "../types/employeeTypes";

const EMPTY_OPTIONS: readonly Option[] = Object.freeze([]);

interface UseEmployeeSetupReturn {
  setupData: EmployeeSetupData | null;
  loading: boolean;
  error: string | null;
  bloodGroupOptions: readonly Option[];
  subDeptOptions: readonly Option[];
  branchOptions: readonly Option[];
  categoryOptions: readonly Option[];
  contractorOptions: readonly Option[];
  reportingEmployeeOptions: readonly Option[];
}

export function useEmployeeSetup(coId: string, branchId?: string): UseEmployeeSetupReturn {
  const [setupData, setSetupData] = useState<EmployeeSetupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: apiErr } = await fetchEmployeeCreateSetup(coId, branchId);
        if (cancelled) return;
        if (apiErr) throw new Error(apiErr);
        setSetupData(data?.data ?? null);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load setup data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [coId, branchId]);

  const bloodGroupOptions = useMemo(() => setupData?.blood_groups ?? EMPTY_OPTIONS, [setupData]);
  const subDeptOptions = useMemo(() => setupData?.sub_departments ?? EMPTY_OPTIONS, [setupData]);
  const branchOptions = useMemo(() => setupData?.branches ?? EMPTY_OPTIONS, [setupData]);
  const categoryOptions = useMemo(() => setupData?.categories ?? EMPTY_OPTIONS, [setupData]);
  const contractorOptions = useMemo(() => setupData?.contractors ?? EMPTY_OPTIONS, [setupData]);
  const reportingEmployeeOptions = useMemo(() => setupData?.reporting_employees ?? EMPTY_OPTIONS, [setupData]);

  return {
    setupData,
    loading,
    error,
    bloodGroupOptions,
    subDeptOptions,
    branchOptions,
    categoryOptions,
    contractorOptions,
    reportingEmployeeOptions,
  };
}
