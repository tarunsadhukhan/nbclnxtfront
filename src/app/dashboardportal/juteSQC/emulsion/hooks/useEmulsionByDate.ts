"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { EmulsionRow, EmulsionByDateResponse } from "../types/emulsionTypes";

const EMPTY: EmulsionByDateResponse = { rows: [] };

// GET get_emulsion_by_date -> {data: {rows}}. OBJECT envelope: read
// resp.data.rows (each row carries all fields + server-computed
// theoretical_oil_pct / oil_pct_status). Cloned from useBagWeightByDate.
export function useEmulsionByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<EmulsionByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.EMULSION_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: EmulsionByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ rows: resp?.data?.rows ?? [] });
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const rows: EmulsionRow[] = data.rows;

	return { rows, loading, error, refresh };
}
