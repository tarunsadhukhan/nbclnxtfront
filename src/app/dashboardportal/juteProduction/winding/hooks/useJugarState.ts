"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingJugarState } from "../types/windingTypes";

// WINDING_JUGAR_STATE — opening AND closing for one winder/date/spell in a
// single call. Each side is either the row already stored (source "saved") or
// the carry-forward from the previous spell in sequence; the form prefills both
// and posts them back. No-ops while !coId / no winder / no date.
export function useJugarState(
	coId: string | null | undefined,
	ebId: number | null,
	tranDate: string,
	spellId: number | null,
	branchId: number | null,
) {
	const [state, setState] = React.useState<WindingJugarState | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || ebId == null || !tranDate) {
			setState(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WINDING_JUGAR_STATE}?co_id=${coId}&eb_id=${ebId}&tran_date=${tranDate}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		if (branchId != null) url += `&branch_id=${branchId}`;
		void fetchWithCookie<{ data: WindingJugarState }>(url, "GET").then(({ data }) => {
			if (cancelled) return;
			setState(data?.data ?? null);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, ebId, tranDate, spellId, branchId, version]);

	return { state, loading, refresh };
}
