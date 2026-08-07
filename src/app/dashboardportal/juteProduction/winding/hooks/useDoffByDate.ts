"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WindingDoffRow } from "../types/windingTypes";

// WINDING_DOFF_BY_DATE — doff rows for the day grid (spell + worker optional).
// No-ops while !coId / no date / branch unresolved.
export function useDoffByDate(
	coId: string | null | undefined,
	tranDate: string,
	branchId: number | null,
	spellId?: number | null,
) {
	const [rows, setRows] = React.useState<WindingDoffRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !tranDate || branchId == null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WINDING_DOFF_BY_DATE}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		void fetchWithCookie<{ data: WindingDoffRow[] }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setRows([]);
			} else {
				setError(null);
				setRows(data?.data ?? []);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, tranDate, branchId, spellId, version]);

	return { rows, loading, error, refresh };
}
