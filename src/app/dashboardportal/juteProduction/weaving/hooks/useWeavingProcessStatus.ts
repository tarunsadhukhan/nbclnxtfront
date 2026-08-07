"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// GET WEAVING_PROCESS_STATUS?co_id&branch_id&tran_date&spell_id
//   -> { data: { locked: boolean; reprocess_needed: boolean } }
// A locked (date,spell) unit serves the frozen log and requires Edit to mutate;
// reprocess_needed is raised when SQC picks or stoppage changed after processing.
export type WeavingProcessStatus = { locked: boolean; reprocess_needed: boolean };

export function useWeavingProcessStatus(
	coId: string | null | undefined,
	branchId: number | null,
	date: string,
	spellId: number | null | undefined,
	refreshKey = 0
) {
	const [status, setStatus] = React.useState<WeavingProcessStatus>({
		locked: false,
		reprocess_needed: false,
	});
	const [loading, setLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);
	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || !date || branchId == null || spellId == null) {
			setStatus({ locked: false, reprocess_needed: false });
			return;
		}
		let cancelled = false;
		setLoading(true);
		const url =
			`${apiRoutesPortalMasters.WEAVING_PROCESS_STATUS}?co_id=${coId}` +
			`&branch_id=${branchId}&tran_date=${date}&spell_id=${spellId}`;
		void fetchWithCookie<{ data: WeavingProcessStatus }>(url, "GET").then(({ data }) => {
			if (cancelled) return;
			setStatus(data?.data ?? { locked: false, reprocess_needed: false });
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, date, spellId, version, refreshKey]);

	return { status, loading, refresh };
}
