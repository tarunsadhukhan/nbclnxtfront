"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  YarnTypeRecord,
  BatchPlanRecord,
} from "../types/batchAssignTypes";

interface UseBatchAssignSetupResult {
  yarnTypes: YarnTypeRecord[];
  batchPlans: BatchPlanRecord[];
  loading: boolean;
  error: string | null;
}

export function useBatchAssignSetup(
  coId: string | undefined,
  branchId: string | undefined
): UseBatchAssignSetupResult {
  const [yarnTypes, setYarnTypes] = React.useState<YarnTypeRecord[]>([]);
  const [batchPlans, setBatchPlans] = React.useState<BatchPlanRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!coId || !branchId) return;

    let cancelled = false;
    const fetchSetup = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError) {
          throw new Error(fetchError);
        }

        if (cancelled) return;

        const response = data as Record<string, unknown>;
        setYarnTypes((response.yarn_types || []) as YarnTypeRecord[]);
        setBatchPlans((response.batch_plans || []) as BatchPlanRecord[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load setup data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSetup();
    return () => { cancelled = true; };
  }, [coId, branchId]);

  return { yarnTypes, batchPlans, loading, error };
}
