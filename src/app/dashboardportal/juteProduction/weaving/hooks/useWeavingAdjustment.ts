"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WeavingAdjustmentRow } from "../types/weavingTypes";

// GET WEAVING_ADJUSTMENT_GET?co_id&branch_id&tran_date&spell_id -> { data: WeavingAdjustmentRow[] }.
// One row per loom for the date/spell: mapped quality + current less_production (reduce-jugar).
// Companion endpoint: WEAVING_ADJUSTMENT_SAVE (POST entries).
export function useWeavingAdjustment(
	coId: string | null | undefined,
	branchId: number | null,
	tranDate: string,
	spellId: number | null
) {
	const [rows, setRows] = React.useState<WeavingAdjustmentRow[]>([]);
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
		const url = `${apiRoutesPortalMasters.WEAVING_ADJUSTMENT_GET}?co_id=${coId}&branch_id=${branchId}&tran_date=${tranDate}&spell_id=${spellId}`;
		void fetchWithCookie<{ data: WeavingAdjustmentRow[] }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, branchId, tranDate, spellId, version]);

	return { rows, loading, error, refresh };
}
