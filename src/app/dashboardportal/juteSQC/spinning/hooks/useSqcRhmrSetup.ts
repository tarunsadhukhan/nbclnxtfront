"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcRhmrSetup } from "../types/sqcSpinningTypes";

// Setup for the RHMR tab: just the spell dropdown options (branch-scoped).
export function useSqcRhmrSetup(coId: string | null | undefined, branchId: number | null) {
	const [setup, setSetup] = React.useState<SqcRhmrSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPINNING_SQC_RHMR_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SqcRhmrSetup }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setSetup(null);
			} else {
				setError(null);
				setSetup(data?.data ?? { spells: [] });
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, version]);

	return { setup, loading, error, refresh };
}
