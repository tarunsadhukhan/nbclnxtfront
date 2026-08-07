"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FabricFaultSetup } from "../types/fabricFaultTypes";

// GET fabric_fault_create_setup -> {data: {qualities, looms, spells, fault_types}}.
// Cloned from useStitchSetup.
export function useFabricFaultSetup(
	coId: string | null | undefined,
	branchId: number | null,
) {
	const [setup, setSetup] = React.useState<FabricFaultSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: FabricFaultSetup }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, branchId, version]);

	return { setup, loading, error, refresh };
}
