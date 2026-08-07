"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingDoffPrevState } from "../types/windingTypes";

// WINDING_DOFF_PREV_STATE — prefill the doff form from the selected winder's
// last active doff (trolly/spool/quality/weights). data may be null. No-ops
// while !coId or no worker selected.
export function useWindingDoffPrevState(
	coId: string | null | undefined,
	ebId: number | null,
	branchId: number | null,
) {
	const [state, setState] = React.useState<WindingDoffPrevState | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || ebId == null) {
			setState(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WINDING_DOFF_PREV_STATE}?co_id=${coId}&eb_id=${ebId}`;
		if (branchId != null) url += `&branch_id=${branchId}`;
		void fetchWithCookie<{ data: WindingDoffPrevState | null }>(url, "GET").then(({ data }) => {
			if (cancelled) return;
			setState(data?.data ?? null);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, ebId, branchId, version]);

	return { state, loading, refresh };
}
