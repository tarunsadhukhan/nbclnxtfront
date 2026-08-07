"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { SpinningProcessStatus } from "../types/spinningTypes";

// GET SPINNING_PROCESS_STATUS?co_id&branch_id&tran_date&spell_id
//   -> { data: { locked, reprocess_needed, processed_date_time } }
// A locked (date,spell) unit serves the frozen log and requires Edit to mutate;
// reprocess_needed is raised (sticky) when doffs / mapper retro / sync / SQC /
// winding changed after processing (spec 5.6). refreshKey lets ANY grid
// mutation bump the status without prop-drilling the refresh fn.
const IDLE: SpinningProcessStatus = {
	locked: false,
	reprocess_needed: false,
	processed_date_time: null,
};

export function useSpinningProcessStatus(
	coId: string | null | undefined,
	branchId: number | null,
	date: string,
	spellId: number | null | undefined,
	refreshKey = 0
) {
	const [status, setStatus] = React.useState<SpinningProcessStatus>(IDLE);
	const [loading, setLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);
	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !date || branchId == null || spellId == null) {
			setStatus(IDLE);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url =
			`${apiRoutesPortalMasters.SPINNING_PROCESS_STATUS}?co_id=${coId}` +
			`&branch_id=${branchId}&tran_date=${date}&spell_id=${spellId}`;
		void fetchWithCookie<{ data: SpinningProcessStatus }>(url, "GET").then(({ data }) => {
			if (cancelled) return;
			setStatus(data?.data ?? IDLE);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, date, spellId, version, refreshKey]);

	return { status, loading, refresh };
}
