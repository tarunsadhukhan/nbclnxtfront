"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	FabricConstructionBlock,
	FabricConstructionByDateResponse,
} from "../types/fabricConstructionTypes";

const EMPTY: FabricConstructionByDateResponse = { blocks: [] };

// GET get_fabric_construction_by_date -> {data: {blocks}}.
// OBJECT envelope: read resp.data.blocks (each block carries its sample rows,
// per-column averages, and Std-vs-Actual comparison recomputed at read).
// Cloned from useBeamMrByDate.
export function useFabricConstructionByDate(
	coId: string | null | undefined,
	branchId: number | null,
	entryDate: string,
) {
	const [data, setData] = React.useState<FabricConstructionByDateResponse>(EMPTY);
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
		const url = `${apiRoutesPortalMasters.FABRIC_CONSTRUCTION_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`;
		void fetchWithCookie<{ data: FabricConstructionByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ blocks: resp?.data?.blocks ?? [] });
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const blocks: FabricConstructionBlock[] = data.blocks;

	return { blocks, loading, error, refresh };
}
