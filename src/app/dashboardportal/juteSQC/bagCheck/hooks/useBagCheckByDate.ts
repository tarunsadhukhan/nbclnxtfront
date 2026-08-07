"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { BagCheckBlock, BagCheckByDateResponse } from "../types/bagCheckTypes";

const EMPTY: BagCheckByDateResponse = { blocks: [] };

// GET get_bag_check_by_date -> {data: {blocks}}.
// OBJECT envelope: read resp.data.blocks (each block carries its per-bag detail
// rows with server-computed corr_wt plus the per-column aggregates + HY/LT).
// Cloned from useBagWeightByDate.
export function useBagCheckByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<BagCheckByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.BAG_CHECK_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: BagCheckByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ blocks: resp?.data?.blocks ?? [] });
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const blocks: BagCheckBlock[] = data.blocks;

	return { blocks, loading, error, refresh };
}
