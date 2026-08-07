"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingQualitySetup } from "../types/windingTypes";

// WINDING_QUALITY_SETUP — "Get Quality" auto-seeds one row per winder carried
// forward from the previous spell (inheriting its quality + spindle; nothing is
// seeded when there is no prior spell) then returns the rows + the quality
// picker + the "Add winder" list. Because this WRITES (seeds) server-side, it is NOT fired
// reactively: the component calls `run()` on the Get Quality button. No-ops the
// imperative call while !coId / no date / no spell.
export function useQualitySetup(
	coId: string | null | undefined,
	branchId: number | null,
) {
	const [setup, setSetup] = React.useState<WindingQualitySetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const run = React.useCallback(
		async (tranDate: string, spellId: number | null) => {
			if (!coId || !tranDate || spellId == null) {
				setSetup(null);
				return;
			}
			setLoading(true);
			let url = `${apiRoutesPortalMasters.WINDING_QUALITY_SETUP}?co_id=${coId}&tran_date=${tranDate}&spell_id=${spellId}`;
			if (branchId != null) url += `&branch_id=${branchId}`;
			const { data, error: err } = await fetchWithCookie<{ data: WindingQualitySetup }>(url, "GET");
			if (err) {
				setError(err);
				setSetup(null);
			} else {
				setError(null);
				setSetup(data?.data ?? null);
			}
			setLoading(false);
		},
		[coId, branchId],
	);

	const reset = React.useCallback(() => {
		setSetup(null);
		setError(null);
	}, []);

	return { setup, loading, error, run, reset };
}
