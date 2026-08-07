"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingPlanningGridData } from "../types/weavingTypes";

// GET WEAVING_PLANNING_GRID?co_id&tran_date&branch_id&spell_id?
// -> { data: { rows: WeavingPlanningGridRow[], shift_rollup: WeavingShiftRollupRow[] } }
// Mirrors usePlanningGrid / useBeamingPlanningGrid. The companion save endpoint is
// WEAVING_PLANNING_GRID_SAVE (POSTed from WeavingPlanningGrid.tsx).
export function useWeavingPlanningGrid(
	coId: string | null | undefined,
	branchId: number | null,
	tranDate: string,
	spellId?: number | null
) {
	const [data, setData] = React.useState<WeavingPlanningGridData | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !tranDate) {
			setData(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WEAVING_PLANNING_GRID}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		void fetchWithCookie<{ data: WeavingPlanningGridData }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(null);
				} else {
					setError(null);
					setData(resp?.data ?? { rows: [], shift_rollup: [] });
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, tranDate, spellId, version]);

	return { data, loading, error, refresh };
}
