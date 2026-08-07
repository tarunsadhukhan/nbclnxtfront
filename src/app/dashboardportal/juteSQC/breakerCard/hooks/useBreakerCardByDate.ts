"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	BreakerCardByDateResponse,
	BreakerCardGrandAverage,
	BreakerCardReadingRow,
} from "../types/breakerCardTypes";

const EMPTY: BreakerCardByDateResponse = { rows: [], grand_averages: [] };

// GET get_breaker_card_swt_by_date -> {"data": {rows, grand_averages}}.
// OBJECT envelope (per R-08-04/03 review lessons): read BOTH resp.data.rows AND
// resp.data.grand_averages — the per-batch grand block is recomputed at read.
// Copied from the Spreader SQC useSqcRollWtByDate template (envelope + types swapped).
export function useBreakerCardByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<BreakerCardByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.BREAKER_CARD_SWT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: BreakerCardByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({
						rows: resp?.data?.rows ?? [],
						grand_averages: resp?.data?.grand_averages ?? [],
					});
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	const rows: BreakerCardReadingRow[] = data.rows;
	const grandAverages: BreakerCardGrandAverage[] = data.grand_averages;

	return { rows, grandAverages, loading, error, refresh };
}
