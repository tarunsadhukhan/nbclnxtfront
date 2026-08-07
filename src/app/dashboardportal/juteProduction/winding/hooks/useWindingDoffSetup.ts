"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingDoffSetup } from "../types/windingTypes";

// WINDING_DOFF_SETUP — winders (HRMS masters), yarn items, trollies (type T),
// spools (type S) and spells for the Doff tab. No-ops while !coId (and while
// branch unresolved) per the hydration rule.
export function useWindingDoffSetup(
	coId: string | null | undefined,
	branchId: number | null,
) {
	const [setup, setSetup] = React.useState<WindingDoffSetup | null>(null);
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
		const url = `${apiRoutesPortalMasters.WINDING_DOFF_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: WindingDoffSetup }>(url, "GET").then(({ data, error: err }) => {
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
