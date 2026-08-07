"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DoffPrevState } from "../types/spinningTypes";

export function useDoffMachinePrevState(
	coId: string | null | undefined,
	machineId: number | null,
	tranDate: string,
	spellId: number | null,
	trollyId: number | null
) {
	const [state, setState] = React.useState<DoffPrevState | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || machineId == null || !tranDate || spellId == null || trollyId == null) {
			setState(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.SPINNING_DOFF_PREV_STATE}?co_id=${coId}&machine_id=${machineId}&tran_date=${tranDate}&spell_id=${spellId}&trolly_id=${trollyId}`;
		void fetchWithCookie<{ data: DoffPrevState }>(url, "GET").then(({ data }) => {
			if (cancelled) return;
			setState(data?.data ?? null);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, machineId, tranDate, spellId, trollyId, version]);

	return { state, loading, refresh };
}
