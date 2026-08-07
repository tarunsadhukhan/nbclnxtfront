"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	WeavingPickReadingRow,
	WeavingPickSummaryRow,
} from "./useWeavingPickSetup";

export type { WeavingPickReadingRow, WeavingPickSummaryRow };

// Response of GET weaving_sqc_pick_by_date -> {"data": {readings, summary}}.
export interface WeavingPickByDateResponse {
	readings: WeavingPickReadingRow[];
	summary: WeavingPickSummaryRow[];
}

const EMPTY: WeavingPickByDateResponse = { readings: [], summary: [] };

export function useWeavingPickByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<WeavingPickByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !entryDate) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WEAVING_SQC_PICK_BY_DATE}?co_id=${coId}&entry_date=${entryDate}`;
		if (branchId != null) {
			url += `&branch_id=${branchId}`;
		}
		void fetchWithCookie<{ data: WeavingPickByDateResponse }>(url, "GET").then(({ data: resp, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setData(EMPTY);
			} else {
				setError(null);
				setData({
					readings: resp?.data?.readings ?? [],
					summary: resp?.data?.summary ?? [],
				});
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	return {
		readings: data.readings,
		summary: data.summary,
		loading,
		error,
		refresh,
	};
}
