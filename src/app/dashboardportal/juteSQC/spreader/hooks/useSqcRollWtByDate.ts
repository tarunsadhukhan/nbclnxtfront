"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	SpreaderRollWtByDateResponse,
	SpreaderRollWtReadingRow,
} from "../types/sqcSpreaderTypes";

const EMPTY: SpreaderRollWtByDateResponse = { readings: [] };

// GET get_spreader_roll_wt_by_date -> {"data": {readings}}.
// Copied from the Spinning SQC useSqcCountByDate template (route + type swapped).
export function useSqcRollWtByDate(
	coId: string | null | undefined,
	entryDate: string,
	branchId: number | null
) {
	const [data, setData] = React.useState<SpreaderRollWtByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !entryDate || branchId == null) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPREADER_SQC_ROLL_WT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: SpreaderRollWtByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ readings: resp?.data?.readings ?? [] });
				}
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, entryDate, branchId, version]);

	const readings: SpreaderRollWtReadingRow[] = data.readings;

	return { readings, loading, error, refresh };
}
