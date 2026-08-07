"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { MachinePrevState } from "../types/drawingTypes";

export function useMachinePrevState(
	coId: string | null | undefined,
	machineId: number | null,
	tranDate: string,
	spell: string,
	excludeEntryId: number | null
) {
	const [state, setState] = React.useState<MachinePrevState | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (!coId || !machineId || !tranDate || !spell) {
			setState(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			machine_id: String(machineId),
			tran_date: tranDate,
			spell,
		});
		if (excludeEntryId != null) {
			params.set("exclude_entry_id", String(excludeEntryId));
		}
		const url = `${apiRoutesPortalMasters.DRAWING_MACHINE_PREV_STATE}?${params.toString()}`;
		void fetchWithCookie<{ data: MachinePrevState }>(url, "GET").then(({ data, error: err }) => {
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
	}, [coId, machineId, tranDate, spell, excludeEntryId]);

	return { state, loading, error };
}
