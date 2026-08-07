"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	PackingMrByDateResponse,
	PackingMrColumn,
	PackingMrGroupSummary,
} from "../types/packingMrTypes";

const EMPTY: PackingMrByDateResponse = { columns: [], group_summaries: [] };

// GET get_packing_mr_by_date -> {data: {columns, group_summaries}}.
// OBJECT envelope: read resp.data.columns AND resp.data.group_summaries
// (per-group weighted group_avg_mr recomputed at read). Cloned from
// useBeamMrByDate.
export function usePackingMrByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<PackingMrByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.PACKING_MR_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: PackingMrByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({
						columns: resp?.data?.columns ?? [],
						group_summaries: resp?.data?.group_summaries ?? [],
					});
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const columns: PackingMrColumn[] = data.columns;
	const groupSummaries: PackingMrGroupSummary[] = data.group_summaries;

	return { columns, groupSummaries, loading, error, refresh };
}
