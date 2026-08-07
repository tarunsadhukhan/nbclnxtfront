"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// ─── Shared contract shapes (jute_sqc_weaving_pick / vw_weaving_pick_act) ────

// Quality option (from get_weaving_entry_qualities_query).
export interface WeavingQualityOption {
	weaving_quality_id: number;
	item_id: number;
	item_code: string;
	item_name: string;
	weaving_quality_code: string;
	weaving_quality_name: string;
}

// Loom option (from get_weaving_entry_machines_query).
export interface WeavingLoomOption {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	line_no: number | null;
	branch_id: number | null;
}

// A single active reading row (jute_sqc_weaving_pick + quality/loom labels).
export interface WeavingPickReadingRow {
	weaving_sqc_pick_id: number;
	co_id: number;
	branch_id: number | null;
	entry_date: string; // 'YYYY-MM-DD'
	weaving_quality_id: number;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	item_code: string | null;
	item_name: string | null;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	line_no: number | null;
	width: number | null;
	picks: number;
}

// One summary row from vw_weaving_pick_act.
export interface WeavingPickSummaryRow {
	weaving_quality_id: number;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	avg_picks: number;
	std_picks: number;
	min_picks: number;
	max_picks: number;
	avg_width: number | null;
	min_width: number | null;
	max_width: number | null;
	n_obs: number;
}

export interface WeavingPickSetup {
	qualities: WeavingQualityOption[];
	looms: WeavingLoomOption[];
	readings: WeavingPickReadingRow[];
	summary: WeavingPickSummaryRow[];
}

export function useWeavingPickSetup(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [setup, setSetup] = React.useState<WeavingPickSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !entryDate) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let url = `${apiRoutesPortalMasters.WEAVING_SQC_PICK_SETUP}?co_id=${coId}&entry_date=${entryDate}`;
		if (branchId != null) {
			url += `&branch_id=${branchId}`;
		}
		void fetchWithCookie<{ data: WeavingPickSetup }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, entryDate, branchId, version]);

	return { setup, loading, error, refresh };
}
