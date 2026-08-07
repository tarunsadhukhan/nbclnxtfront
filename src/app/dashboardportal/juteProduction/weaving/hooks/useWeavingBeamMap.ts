"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingBeamMapRow } from "../types/weavingTypes";

// GET WEAVING_BEAM_MAP_GET?co_id&branch_id&tran_date&spell_id
// -> { data: WeavingBeamMapRow[], last_updated: string | null }.
// Mirrors useLoomQualityMap — one beam_no per loom for the date/spell. Companion
// endpoint: WEAVING_BEAM_MAP_SAVE (POST entries).
export function useWeavingBeamMap(
	coId: string | null | undefined,
	branchId: number | null,
	tranDate: string,
	spellId: number | null
) {
	const [rows, setRows] = React.useState<WeavingBeamMapRow[]>([]);
	const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !tranDate || spellId == null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.WEAVING_BEAM_MAP_GET}?co_id=${coId}&branch_id=${branchId}&tran_date=${tranDate}&spell_id=${spellId}`;
		void fetchWithCookie<{ data: WeavingBeamMapRow[]; last_updated: string | null }>(url, "GET").then(
			({ data, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setRows([]);
					setLastUpdated(null);
				} else {
					setError(null);
					setRows(data?.data ?? []);
					setLastUpdated(data?.last_updated ?? null);
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, tranDate, spellId, version]);

	return { rows, lastUpdated, loading, error, refresh };
}
