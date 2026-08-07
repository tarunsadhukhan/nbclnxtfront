"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcQrCvByDateResponse } from "../types/sqcSpinningTypes";

const EMPTY: SqcQrCvByDateResponse = { groups: [] };

export function useSqcQrCvByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<SqcQrCvByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.SPINNING_SQC_QR_CV_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SqcQrCvByDateResponse }>(url, "GET").then(({ data: resp, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setData(EMPTY);
			} else {
				setError(null);
				setData({
					groups: resp?.data?.groups ?? [],
				});
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	return {
		groups: data.groups,
		loading,
		error,
		refresh,
	};
}
