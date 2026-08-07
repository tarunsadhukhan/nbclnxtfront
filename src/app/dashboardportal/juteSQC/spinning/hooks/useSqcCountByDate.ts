"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcCountByDateResponse } from "../types/sqcSpinningTypes";

const EMPTY: SqcCountByDateResponse = { readings: [], averages: [] };

export function useSqcCountByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<SqcCountByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !entryDate || branchId == null) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPINNING_SQC_COUNT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SqcCountByDateResponse }>(url, "GET").then(({ data: resp, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setData(EMPTY);
			} else {
				setError(null);
				setData({
					readings: resp?.data?.readings ?? [],
					averages: resp?.data?.averages ?? [],
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
		averages: data.averages,
		loading,
		error,
		refresh,
	};
}
