"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FinishingSetup } from "../types/finishingTypes";

// GET FINISHING_PROD_ENTRY_SETUP?co_id&process&branch_id
// -> { data: { process, machines, qualities, spells } }
// `process` is required by the backend, so the hook returns an empty/idle state
// until co_id + process are present.
export function useFinishingSetup(
	coId: string | null | undefined,
	process: string,
	branchId: number | null
) {
	const [setup, setSetup] = React.useState<FinishingSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !process || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.FINISHING_PROD_ENTRY_SETUP}?co_id=${coId}&process=${process}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: FinishingSetup }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, process, branchId, version]);

	return { setup, loading, error, refresh };
}
