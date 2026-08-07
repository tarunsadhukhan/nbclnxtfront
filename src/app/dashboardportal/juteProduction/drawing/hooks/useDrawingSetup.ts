"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DrawingSetup } from "../types/drawingTypes";

export function useDrawingSetup(coId: string | null | undefined, branchId: number | null) {
	const [setup, setSetup] = React.useState<DrawingSetup | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const refresh = React.useCallback(async () => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		setLoading(true);
		setError(null);
		const url = `${apiRoutesPortalMasters.DRAWING_ENTRY_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		const { data, error: err } = await fetchWithCookie<{ data: DrawingSetup }>(url, "GET");
		if (err) {
			setError(err);
			setLoading(false);
			return;
		}
		setSetup(data?.data ?? null);
		setLoading(false);
	}, [coId, branchId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	return { setup, loading, error, refresh };
}
