"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingEntryRow } from "../types/weavingTypes";

// GET WEAVING_ENTRY_INPUTS_BY_DATE?co_id&tran_date&branch_id&spell_id?&machine_id?
// -> { data: WeavingEntryRow[] } (light rows: inputs + open_jugar + jpc/fl — no
// standards/pick/stoppage probes; ~7x fewer per-row lookups than entries_by_date).
// Mirrors useDoffEntriesByDate / useBeamingEntriesByDate.
export function useWeavingEntriesByDate(
	coId: string | null | undefined,
	tranDate: string,
	branchId: number | null,
	spellId?: number | null,
	machineId?: number | null,
	// Bump from the parent (e.g. after a save) to force a refetch.
	refreshKey: number = 0
) {
	const [rows, setRows] = React.useState<WeavingEntryRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	// True once the CURRENT (co, date, branch, spell) fetch has completed — consumers that
	// seed local state from `rows` must wait for it: `loading` starts false, so on mount the
	// first render commits BEFORE the fetch effect flips it and a loading-only gate seeds blanks.
	const [loaded, setLoaded] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !tranDate || branchId == null) {
			setRows([]);
			setLoaded(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setLoaded(false);
		let url = `${apiRoutesPortalMasters.WEAVING_ENTRY_INPUTS_BY_DATE}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		if (machineId != null) url += `&machine_id=${machineId}`;
		void fetchWithCookie<{ data: WeavingEntryRow[] }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setRows([]);
			} else {
				setError(null);
				setRows(data?.data ?? []);
			}
			setLoading(false);
			setLoaded(true);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, tranDate, branchId, spellId, machineId, version, refreshKey]);

	return { rows, loading, loaded, error, refresh };
}
