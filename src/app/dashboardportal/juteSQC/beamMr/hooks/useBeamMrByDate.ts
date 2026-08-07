"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	BeamMrByDateResponse,
	BeamMrGroupSummary,
	BeamMrRow,
} from "../types/beamMrTypes";

const EMPTY: BeamMrByDateResponse = { rows: [], group_summaries: [] };

// GET get_beam_mr_by_date -> {data: {rows, group_summaries}}.
// OBJECT envelope: read resp.data.rows AND resp.data.group_summaries (per-group
// overall_avg_mr recomputed at read). Cloned from useInterCardByDate.
export function useBeamMrByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<BeamMrByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.BEAM_MR_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: BeamMrByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({
						rows: resp?.data?.rows ?? [],
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

	const rows: BeamMrRow[] = data.rows;
	const groupSummaries: BeamMrGroupSummary[] = data.group_summaries;

	return { rows, groupSummaries, loading, error, refresh };
}
