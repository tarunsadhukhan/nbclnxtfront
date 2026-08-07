"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { LoomQualityMapRow } from "../types/weavingTypes";

type MapResponse = { data: LoomQualityMapRow[]; last_updated: string | null };

// machine_mst.line_no is INT on dev3 but VARCHAR on some tenants (e.g. sls), so the API
// may deliver "4" instead of 4 — which breaks the grids' strict line-filter comparison.
// Coerce once here so every consumer sees the declared number | null.
function normalizeLineNo(rows: LoomQualityMapRow[]): LoomQualityMapRow[] {
	return rows.map((r) => {
		const n = r.line_no == null ? null : Number(r.line_no);
		return { ...r, line_no: n == null || Number.isNaN(n) ? null : n };
	});
}

// Loom → Quality map data, loaded in up to two phases:
//   Phase 1 (always): GET /quality_map_saved — the loom list + today's saved mapping. Cheap
//     (~88ms) — the grid renders from this immediately. prev_quality_* come back null.
//   Phase 2 (only when savedOnly=false): GET /quality_map_get — the carry-forward prev_quality_*
//     (a per-loom history scan, ~5s on large tenants). Fetched LAZILY after phase 1 and merged
//     into the rows by machine_id, so the slow scan never blocks first paint.
// The Production Entry grid passes savedOnly=true (never needs carry-forward). The mapping
// editor leaves it false to get the lazy prefill. carryForwardLoading flags phase 2 in flight.
export function useLoomQualityMap(
	coId: string | null | undefined,
	branchId: number | null,
	tranDate: string,
	spellId: number | null,
	savedOnly = false
) {
	const [rows, setRows] = React.useState<LoomQualityMapRow[]>([]);
	const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [carryForwardLoading, setCarryForwardLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !tranDate || spellId == null) {
			setRows([]);
			setLastUpdated(null);
			return;
		}
		let cancelled = false;
		const qs = `?co_id=${coId}&branch_id=${branchId}&tran_date=${tranDate}&spell_id=${spellId}`;
		setLoading(true);
		setCarryForwardLoading(!savedOnly);

		// Phase 1 — cheap saved-mapping read; renders the grid immediately.
		void fetchWithCookie<MapResponse>(
			`${apiRoutesPortalMasters.WEAVING_QUALITY_MAP_SAVED}${qs}`,
			"GET"
		).then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setRows([]);
				setLastUpdated(null);
				setLoading(false);
				setCarryForwardLoading(false);
				return;
			}
			setError(null);
			setRows(normalizeLineNo(data?.data ?? []));
			setLastUpdated(data?.last_updated ?? null);
			setLoading(false);
			if (savedOnly) {
				setCarryForwardLoading(false);
				return;
			}

			// Phase 2 — lazy carry-forward. Best-effort: on failure the grid just has no prefill.
			void fetchWithCookie<MapResponse>(
				`${apiRoutesPortalMasters.WEAVING_QUALITY_MAP_GET}${qs}`,
				"GET"
			).then(({ data: cf, error: cfErr }) => {
				if (cancelled) return;
				setCarryForwardLoading(false);
				if (cfErr || !cf?.data) return;
				const prevByMachine = new Map(cf.data.map((r) => [r.machine_id, r]));
				setRows((curr) =>
					curr.map((r) => {
						const p = prevByMachine.get(r.machine_id);
						return p
							? {
									...r,
									prev_quality_id: p.prev_quality_id,
									prev_quality_code: p.prev_quality_code,
									prev_quality_name: p.prev_quality_name,
									prev_date: p.prev_date,
							  }
							: r;
					})
				);
			});
		});

		return () => {
			cancelled = true;
		};
	}, [coId, branchId, tranDate, spellId, savedOnly, version]);

	return { rows, lastUpdated, loading, carryForwardLoading, error, refresh };
}

// Shape returned by the hook — so the page can call it once and pass the result to both the
// Loom→Quality editor and the Production Entry grid (one fetch, shared across tab switches).
export type LoomQualityMapState = ReturnType<typeof useLoomQualityMap>;
