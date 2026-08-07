"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DrawheadSetup } from "../types/drawheadTypes";

// GET get_draw_sliver_wt_setup -> {"data": {sections, time_bands, machines, spells, batches, entries}}.
// Cloned from useInterCardSetup (route + type swapped).
export function useDrawheadSetup(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [setup, setSetup] = React.useState<DrawheadSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.DRAW_SLIVER_WT_SETUP}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: DrawheadSetup }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setSetup(null);
			} else {
				setError(null);
				setSetup(data?.data ?? null);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	return { setup, loading, error, refresh };
}
