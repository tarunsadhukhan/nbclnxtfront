"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	SpreaderSliverWtByDateResponse,
	SpreaderSliverWtReadingRow,
} from "../types/sqcSpreaderTypes";

const EMPTY: SpreaderSliverWtByDateResponse = { readings: [] };

// GET get_spreader_sliver_wt_by_date -> {"data": {readings}}.
// Copied from useSqcRollWtByDate (route + type swapped). The endpoint returns an
// OBJECT envelope ({"data":{"readings":[...]}}), not a bare list.
export function useSqcSliverWtByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<SpreaderSliverWtByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.SPREADER_SLIVER_WT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SpreaderSliverWtByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ readings: resp?.data?.readings ?? [] });
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	const readings: SpreaderSliverWtReadingRow[] = data.readings;

	return { readings, loading, error, refresh };
}
