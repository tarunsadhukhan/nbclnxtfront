"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPaySchemeCreateSetup } from "@/utils/hrmsService";
import type { PaySchemeSetupData, PayComponent, Option } from "../types/paySchemeTypes";

export function usePaySchemeSetup(coId: string | null) {
  const [setupData, setSetupData] = useState<PaySchemeSetupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPaySchemeCreateSetup(coId);
        if (!cancelled && res?.data) {
          setSetupData(res.data as PaySchemeSetupData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load setup");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [coId]);

  const earningOptions = useMemo<Option[]>(
    () =>
      (setupData?.earnings ?? []).map((c: PayComponent) => ({
        label: `${c.code} — ${c.name}`,
        value: String(c.id),
      })),
    [setupData?.earnings],
  );

  const deductionOptions = useMemo<Option[]>(
    () =>
      (setupData?.deductions ?? []).map((c: PayComponent) => ({
        label: `${c.code} — ${c.name}`,
        value: String(c.id),
      })),
    [setupData?.deductions],
  );

  const allComponentOptions = useMemo<Option[]>(
    () =>
      (setupData?.all_components ?? []).map((c: PayComponent) => ({
        label: `${c.code} — ${c.name}`,
        value: String(c.id),
      })),
    [setupData?.all_components],
  );

  return {
    setupData,
    loading,
    error,
    earningOptions,
    deductionOptions,
    allComponentOptions,
  };
}
