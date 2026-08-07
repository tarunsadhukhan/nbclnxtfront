"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WidthPicksSetup } from "../types/widthPicksTypes";

// GET width_picks_create_setup -> {data: {cloth_qualities, looms}}.
// Cloned from useFabricConstructionSetup.
export function useWidthPicksSetup(coId: string | null | undefined, branchId: number | null) {
	const [setup, setSetup] = React.useState<WidthPicksSetup | null>(null);
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
		const url = `${apiRoutesPortalMasters.WIDTH_PICKS_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: WidthPicksSetup }>(url, "GET").then(({ data, error: err }) => {
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
