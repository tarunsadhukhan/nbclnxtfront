"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	DrawheadByDateResponse,
	DrawheadGrandAverage,
	DrawheadReadingRow,
	SectionAverage,
} from "../types/drawheadTypes";

const EMPTY: DrawheadByDateResponse = { rows: [], section_averages: [], grand_averages: [] };

// GET get_draw_sliver_wt_by_date -> {"data": {rows, section_averages, grand_averages}}.
// OBJECT envelope: read resp.data.rows, resp.data.section_averages AND
// resp.data.grand_averages — the per-section averages and per-batch grand block
// are both recomputed at read. Cloned from useInterCardByDate (route + types swapped).
export function useDrawheadByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<DrawheadByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.DRAW_SLIVER_WT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: DrawheadByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({
						rows: resp?.data?.rows ?? [],
						section_averages: resp?.data?.section_averages ?? [],
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

	const rows: DrawheadReadingRow[] = data.rows;
	const sectionAverages: SectionAverage[] = data.section_averages;
	const grandAverages: DrawheadGrandAverage[] = data.grand_averages;

	return { rows, sectionAverages, grandAverages, loading, error, refresh };
}
