"use client";

import * as React from "react";
import { Alert, Snackbar } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import TargetGrid, {
	type DirtyCell,
	type IdType,
	type TargetGridData,
	type ValueRole,
} from "./TargetGrid";

// --- Shared labels ---------------------------------------------------------
// Weaving standards split by id_type: 'mcid' = Machine (a LOOM, params=speed) and
// 'qid' = Quality (weaving quality, params=picks/eff). Roles: standard | target |
// actual. 'actual' is consumed by the Weaving SQC page (reuses these endpoints with
// value_role='actual'); the Standards page exposes [standard, target].

export const ID_TYPE_LABELS: Record<IdType, string> = { mcid: "Machine", qid: "Quality" };
export const VALUE_ROLE_LABELS: Record<ValueRole, string> = {
	standard: "Standard",
	target: "Target",
	actual: "Actual",
};
// Union of all weaving params across roles. The grid only renders the params the
// backend returns for the active value_role; target exposes speed + eff.
export const PARAM_LABELS: Record<string, string> = {
	speed: "Speed (picks/min)",
	picks: "Picks (PPI)",
	eff: "Efficiency %",
};

const EMPTY_GRID: TargetGridData = { params: [], rows: [] };

type Props = {
	coId: number | string;
	branchId: number | null;
	idType: IdType;
	valueRole: ValueRole;
	effectiveDate: string;
	paramLabels?: Record<string, string>;
	/** Label for the ref column in the grid (e.g. "Loom" for mcid). Defaults to "Quality" in TargetGrid. */
	refLabel?: string;
};

/**
 * Self-contained inline editor for one (idType, valueRole) at a controlled
 * effective date. Owns the grid fetch (WEAVING_TARGET_MAP_GRID), bulk-save
 * (WEAVING_TARGET_MAP_BULK_SAVE) and error/snack state, and renders the agnostic
 * TargetGrid. Date selector lives in the consuming page.
 *
 * Reusable: the Weaving Standards page mounts it with idType='qid' and
 * valueRole in [standard, target]; the Weaving SQC page mounts the same
 * component with valueRole pinned to 'actual'.
 */
export default function TargetMapEditor({
	coId,
	branchId,
	idType,
	valueRole,
	effectiveDate,
	paramLabels = PARAM_LABELS,
	refLabel,
}: Props) {
	const [grid, setGrid] = React.useState<TargetGridData>(EMPTY_GRID);
	const [loading, setLoading] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const refresh = React.useCallback(async () => {
		if (!coId || !idType || !valueRole || !effectiveDate) {
			setGrid(EMPTY_GRID);
			return;
		}
		setLoading(true);
		setError(null);
		const params = new URLSearchParams({
			co_id: String(coId),
			id_type: idType,
			value_role: valueRole,
			effective_date: effectiveDate,
		});
		if (branchId != null) params.set("branch_id", String(branchId));
		const { data, error: err } = await fetchWithCookie<{ data: TargetGridData }>(
			`${apiRoutesPortalMasters.WEAVING_TARGET_MAP_GRID}?${params.toString()}`,
			"GET"
		);
		if (err) {
			setError(err);
			setGrid(EMPTY_GRID);
		} else {
			setGrid(data?.data ?? EMPTY_GRID);
		}
		setLoading(false);
	}, [coId, idType, valueRole, effectiveDate, branchId]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async (cells: DirtyCell[]) => {
		if (!coId || !idType || !valueRole || cells.length === 0) return;
		setSaving(true);
		setError(null);
		try {
			const { data, error: err } = await fetchWithCookie<{
				data: { inserted: number; updated: number; cleared: number };
			}>(apiRoutesPortalMasters.WEAVING_TARGET_MAP_BULK_SAVE, "POST", {
				co_id: Number(coId),
				branch_id: branchId != null ? Number(branchId) : null,
				effective_date: effectiveDate,
				id_type: idType,
				value_role: valueRole,
				cells,
			});
			if (err) {
				setError(err);
				return;
			}
			const d = data?.data;
			setSnack(
				`Saved — inserted ${d?.inserted ?? 0}, updated ${d?.updated ?? 0}, cleared ${d?.cleared ?? 0}.`
			);
			await refresh();
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			{error ? (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<TargetGrid
				grid={grid}
				loading={loading}
				saving={saving}
				effectiveDate={effectiveDate}
				paramLabels={paramLabels}
				refLabel={refLabel}
				onSave={(cells) => void handleSave(cells)}
			/>

			<Snackbar
				open={!!snack}
				autoHideDuration={4000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</>
	);
}
