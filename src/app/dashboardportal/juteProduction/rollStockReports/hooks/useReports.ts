"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { MaturityReportRow, ProductionSummaryResponse } from "../types/reportTypes";

export function useMaturityReport(coId: string | null | undefined, issueDate: string) {
	const [rows, setRows] = React.useState<MaturityReportRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const load = React.useCallback(async () => {
		if (!coId || !issueDate) return;
		setLoading(true);
		setError(null);
		const url = `${apiRoutesPortalMasters.JUTE_PROD_MATURITY_REPORT}?co_id=${coId}&issue_date=${issueDate}`;
		const { data, error: err } = await fetchWithCookie<{ data: MaturityReportRow[] }>(url, "GET");
		if (err) {
			setError(err);
			setRows([]);
		} else {
			setRows(data?.data ?? []);
		}
		setLoading(false);
	}, [coId, issueDate]);

	React.useEffect(() => {
		void load();
	}, [load]);

	return { rows, loading, error, refresh: load };
}

export function useProductionSummary(
	coId: string | null | undefined,
	reportDate: string,
	spreaders: number[],
	items: number[],
	shifts: string[]
) {
	const [data, setData] = React.useState<ProductionSummaryResponse | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const load = React.useCallback(async () => {
		if (!coId || !reportDate) return;
		setLoading(true);
		setError(null);
		const params = new URLSearchParams({ co_id: coId, report_date: reportDate });
		spreaders.forEach((s) => params.append("spreaders", String(s)));
		items.forEach((i) => params.append("items", String(i)));
		shifts.forEach((s) => params.append("shifts", s));
		const url = `${apiRoutesPortalMasters.JUTE_PROD_SPREADER_SUMMARY}?${params.toString()}`;
		const { data: resp, error: err } = await fetchWithCookie<{ data: ProductionSummaryResponse }>(url, "GET");
		if (err) {
			setError(err);
			setData(null);
		} else {
			setData(resp?.data ?? null);
		}
		setLoading(false);
	}, [coId, reportDate, spreaders, items, shifts]);

	React.useEffect(() => {
		void load();
	}, [load]);

	return { data, loading, error, refresh: load };
}
