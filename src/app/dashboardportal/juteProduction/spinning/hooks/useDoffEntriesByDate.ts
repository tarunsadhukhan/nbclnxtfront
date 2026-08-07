"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DoffEntryRow, DoffUnsyncedCounts } from "../types/spinningTypes";

export function useDoffEntriesByDate(
	coId: string | null | undefined,
	tranDate: string,
	branchId: number | null,
	spellId?: number | null,
	machineId?: number | null,
	refreshKey = 0
) {
	const [rows, setRows] = React.useState<DoffEntryRow[]>([]);
	// Spec 5.6.4 badge counts — how many doffs still lack quality / operator stamps.
	const [unsynced, setUnsynced] = React.useState<DoffUnsyncedCounts | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !tranDate || branchId == null) {
			setRows([]);
			setUnsynced(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.SPINNING_DOFF_BY_DATE}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		if (spellId != null) url += `&spell_id=${spellId}`;
		if (machineId != null) url += `&machine_id=${machineId}`;
		void fetchWithCookie<{ data: DoffEntryRow[]; unsynced?: DoffUnsyncedCounts }>(url, "GET").then(
			({ data, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setRows([]);
					setUnsynced(null);
				} else {
					setError(null);
					setRows(data?.data ?? []);
					setUnsynced(data?.unsynced ?? null);
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, tranDate, branchId, spellId, machineId, version, refreshKey]);

	return { rows, unsynced, loading, error, refresh };
}
