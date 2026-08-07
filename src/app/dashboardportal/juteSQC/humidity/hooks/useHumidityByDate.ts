"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { HumidityByDateResponse, HumidityDept } from "../types/humidityTypes";

const EMPTY: HumidityByDateResponse = { departments: [] };

// GET get_humidity_by_date -> {data: {departments}}.
// OBJECT envelope: read resp.data.departments (each dept carries its rounds, each
// round its spot readings + server avg_temp/avg_rh). Cloned from useBagWeightByDate.
export function useHumidityByDate(
	coId: string | null | undefined,
	branchId: number | null,
	reportDate: string,
) {
	const [data, setData] = React.useState<HumidityByDateResponse>(EMPTY);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !reportDate) {
			setData(EMPTY);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url = `${apiRoutesPortalMasters.HUMIDITY_BY_DATE}?co_id=${coId}&branch_id=${branchId}&report_date=${reportDate}`;
		void fetchWithCookie<{ data: HumidityByDateResponse }>(url, "GET").then(
			({ data: resp, error: err }) => {
				if (cancelled) return;
				if (err) {
					setError(err);
					setData(EMPTY);
				} else {
					setError(null);
					setData({ departments: resp?.data?.departments ?? [] });
				}
				setLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, reportDate, version]);

	const departments: HumidityDept[] = data.departments;

	return { departments, loading, error, refresh };
}
