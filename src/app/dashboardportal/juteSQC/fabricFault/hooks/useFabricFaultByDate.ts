"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { FAULT_COUNT } from "../types/fabricFaultTypes";
import type { FabricFaultByDateResponse } from "../types/fabricFaultTypes";

const EMPTY: FabricFaultByDateResponse = {
	pieces: [],
	fault_types: [],
	fault_totals: Array(FAULT_COUNT).fill(0),
	fault_scores: Array(FAULT_COUNT).fill(0),
	grand_total: 0,
	grand_score: 0,
	pieces_inspected: 0,
};

// GET get_fabric_fault_by_date -> {data: {pieces, fault_types, fault_totals,
// fault_scores, grand_total, grand_score, pieces_inspected}}. OBJECT envelope:
// read resp.data.* (server computes the whole day roll-up). Cloned from
// useStitchByDate. Returns the full response so the grid can render the matrix.
export function useFabricFaultByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<FabricFaultByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: FabricFaultByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData(resp?.data ?? EMPTY);
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	return { data, loading, error, refresh };
}
