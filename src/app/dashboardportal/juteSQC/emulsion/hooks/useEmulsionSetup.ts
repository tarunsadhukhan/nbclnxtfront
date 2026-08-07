"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { EmulsionSetup } from "../types/emulsionTypes";

// GET emulsion_create_setup -> {data: {machines, default_oil_pct_low,
// default_oil_pct_high, default_tank_capacity}}. Cloned from useBagWeightSetup.
export function useEmulsionSetup(coId: string | null | undefined, branchId: number | null) {
	const [setup, setSetup] = React.useState<EmulsionSetup | null>(null);
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
		const url = `${apiRoutesPortalMasters.EMULSION_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: EmulsionSetup }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, branchId, version]);

	return { setup, loading, error, refresh };
}
