"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SqcRhmrRow } from "../types/sqcSpinningTypes";

// RHMR rows for a co, filtered by an optional date and/or spell. Pass null/empty
// to leave a filter off (search by date and/or spell, per the requirement).
export function useSqcRhmrSearch(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string | null,
	spellId: number | null
) {
	const [rows, setRows] = React.useState<SqcRhmrRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.SPINNING_SQC_RHMR_SEARCH}?co_id=${coId}&branch_id=${branchId}`;
		if (entryDate) url += `&entry_date=${entryDate}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		void fetchWithCookie<{ data: { rows: SqcRhmrRow[] } }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setRows([]);
			} else {
				setError(null);
				setRows(data?.data?.rows ?? []);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, spellId, version]);

	return { rows, loading, error, refresh };
}
