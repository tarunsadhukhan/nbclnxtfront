/**
 * Hook for managing jute issue setup data fetching.
 */

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  JuteIssueSetupData,
  JuteItemRecord,
  YarnTypeRecord,
  BranchRecord,
} from "../types/juteIssueTypes";

type UseJuteIssueSetupParams = {
  coId: string | null;
};

type UseJuteIssueSetupReturn = {
  juteGroups: JuteItemRecord[];
  yarnTypes: YarnTypeRecord[];
  branches: BranchRecord[];
  loading: boolean;
  error: string | null;
};

export const useJuteIssueSetup = ({
  coId,
}: UseJuteIssueSetupParams): UseJuteIssueSetupReturn => {
  const [juteGroups, setJuteGroups] = React.useState<JuteItemRecord[]>([]);
  const [yarnTypes, setYarnTypes] = React.useState<YarnTypeRecord[]>([]);
  const [branches, setBranches] = React.useState<BranchRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!coId) return;

    const fetchSetup = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${apiRoutesPortalMasters.JUTE_ISSUE_CREATE_SETUP}?co_id=${coId}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError) {
          throw new Error(fetchError);
        }

        const response = data as Record<string, unknown>;
        // Map raw API fields (item_grp_name) to our type fields (item_grp_desc)
        const rawGroups = (response.jute_groups || []) as Record<string, unknown>[];
        setJuteGroups(
          rawGroups.map((g) => ({
            item_grp_id: Number(g.item_grp_id ?? 0),
            item_grp_desc: String(g.item_grp_name ?? g.item_grp_desc ?? ""),
            parent_grp_id: g.parent_grp_id ? Number(g.parent_grp_id) : undefined,
            parent_grp_name: g.parent_grp_name ? String(g.parent_grp_name) : undefined,
          }))
        );
        setYarnTypes((response.yarn_types || []) as YarnTypeRecord[]);
        setBranches((response.branches || []) as BranchRecord[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load setup data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchSetup();
  }, [coId]);

  return { juteGroups, yarnTypes, branches, loading, error };
};
