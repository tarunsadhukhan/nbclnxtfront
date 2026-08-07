"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { BinState } from "../types/spreaderTypes";

export function useBinState(
	coId: string | null | undefined,
	binId: number | null | undefined,
	entryDate: string,
	entryTime: number
) {
	const [state, setState] = React.useState<BinState | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (!coId || !binId || !entryDate || entryTime == null) {
			setState(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			bin_id: String(binId),
			entry_date: entryDate,
			entry_time: String(entryTime),
		});
		const url = `${apiRoutesPortalMasters.SPREADER_ENTRY_BIN_STATE}?${params.toString()}`;
		void fetchWithCookie<{ data: BinState }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setState(null);
			} else {
				setError(null);
				setState(data?.data ?? null);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, binId, entryDate, entryTime]);

	return { state, loading, error };
}
