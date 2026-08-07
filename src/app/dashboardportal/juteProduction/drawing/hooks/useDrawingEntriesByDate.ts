"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DrawingEntryRow } from "../types/drawingTypes";

export function useDrawingEntriesByDate(
	coId: string | null | undefined,
	tranDate: string,
	branchId: number | null
) {
	const [rows, setRows] = React.useState<DrawingEntryRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !tranDate || branchId == null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.DRAWING_ENTRIES_BY_DATE}?co_id=${coId}&tran_date=${tranDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: DrawingEntryRow[] }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, tranDate, branchId, version]);

	return { rows, loading, error, refresh };
}
