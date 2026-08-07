"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { RollStockRow, QualitySummaryRow } from "../types/spreaderTypes";

export function useRollStock(coId: string | null | undefined, branchId: number | null) {
	const [rows, setRows] = React.useState<RollStockRow[]>([]);
	const [summary, setSummary] = React.useState<QualitySummaryRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);
	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setRows([]);
			setSummary([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const stockUrl = `${apiRoutesPortalMasters.SPREADER_ROLL_STOCK}?co_id=${coId}&branch_id=${branchId}`;
		const summaryUrl = `${apiRoutesPortalMasters.SPREADER_ROLL_STOCK_QUALITY_SUMMARY}?co_id=${coId}&branch_id=${branchId}`;
		void Promise.all([
			fetchWithCookie<{ data: RollStockRow[] }>(stockUrl, "GET"),
			fetchWithCookie<{ data: QualitySummaryRow[] }>(summaryUrl, "GET"),
		]).then(([s, q]) => {
			if (cancelled) return;
			if (s.error || q.error) {
				setError(s.error ?? q.error ?? null);
				setRows([]);
				setSummary([]);
			} else {
				setError(null);
				setRows(s.data?.data ?? []);
				setSummary(q.data?.data ?? []);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, version]);

	return { rows, summary, loading, error, refresh };
}
