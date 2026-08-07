"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpreaderSliverWtSetup } from "../types/sqcSpreaderTypes";

// GET get_spreader_sliver_wt_setup -> {"data": {spells, machines, qualities, entries}}.
// Copied from useSqcRollWtSetup (route + type swapped). Reuses the same
// spell / spreader-machine / raw-jute-quality masters as roll weight.
export function useSqcSliverWtSetup(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [setup, setSetup] = React.useState<SpreaderSliverWtSetup | null>(null);
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
		const url = `${apiRoutesPortalMasters.SPREADER_SLIVER_WT_SETUP}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SpreaderSliverWtSetup }>(url, "GET").then(({ data, error: err }) => {
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
