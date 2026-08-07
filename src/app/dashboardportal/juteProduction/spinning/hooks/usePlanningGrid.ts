"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { PlanningGridData } from "../types/spinningTypes";

// GET SPINNING_PLANNING_GRID?co_id&tran_date&spell_id?&branch_id?
// -> { data: { rows: PlanningGridRow[], shift_rollup: ShiftRollupRow[] } }
export function usePlanningGrid(
	coId: string | null | undefined,
	branchId: number | null,
	tranDate: string,
	spellId?: number | null,
	refreshKey = 0
) {
	const [data, setData] = React.useState<PlanningGridData | null>(null);
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
		let url = `${apiRoutesPortalMasters.SPINNING_PLANNING_GRID}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		void fetchWithCookie<{ data: PlanningGridData }>(url, "GET").then(({ data: resp, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setData(null);
			} else {
				setError(null);
				setData(resp?.data ?? { rows: [], shift_rollup: [] });
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, tranDate, spellId, version, refreshKey]);

	return {
		data,
		loading,
		error,
		refresh,
		locked: data?.locked ?? false,
		reprocess_needed: data?.reprocess_needed ?? false,
	};
}
