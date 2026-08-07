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
// Finishing standards are three-dimensional: process · id_type · value_role.
// id_type 'mcid' = Machine, 'qid' = (Finishing) Quality. Roles: standard |
// target | actual. The Spec Sheet page exposes [standard, target]; 'actual' is
// captured on the Finishing SQC page, which reuses THIS editor pointed at the
// SQC actual endpoints (gridUrl / bulkSaveUrl props). The grid auto-renders only
// the params the backend returns for the active (process, id_type, value_role).

export const ID_TYPE_LABELS: Record<IdType, string> = { mcid: "Machine", qid: "Quality" };
export const VALUE_ROLE_LABELS: Record<ValueRole, string> = {
	standard: "Standard",
	target: "Target",
	actual: "Actual",
};

// Human labels for the finishing spec-sheet params (BE contract
// constants.FINISHING_PARAMS). The grid renders only the applicable subset per
// (process, id_type, value_role) — whatever the backend returns.
export const PARAM_LABELS: Record<string, string> = {
	std_prod_yds: "Std Production (yds)",
	target_pcs: "Target Pcs",
	pcs_per_bundle: "Pcs / Bundle",
	bundles: "No. of Bundles",
	no_of_bales: "No. of Bales",
};

const EMPTY_GRID: TargetGridData = { params: [], rows: [] };

type Props = {
	coId: number | string;
	branchId: number | null;
	process: string;
	idType: IdType;
	valueRole: ValueRole;
	effectiveDate: string;
	paramLabels?: Record<string, string>;
	// Endpoint overrides so the Finishing SQC page can reuse this editor against
	// the SQC actual endpoints (FINISHING_SQC_ACTUAL_GRID / _SAVE). Default to the
	// Finishing Spec Sheet endpoints. Both contracts take the SAME body shape; the
	// SQC save endpoint forces value_role='actual' server-side (so it is still sent
	// here for the spec-sheet endpoint and harmlessly ignored by the SQC endpoint).
	gridUrl?: string;
	bulkSaveUrl?: string;
};

/**
 * Self-contained inline editor for one (process, idType, valueRole) at a
 * controlled effective date. Owns the grid fetch, bulk-save and error/snack
 * state, and renders the agnostic TargetGrid. Process / Type / Role / Date
 * selectors live in the consuming page.
 *
 * Cloned from beamingTargetMap/_components/TargetMapEditor.tsx — extended with a
 * `process` dimension passed on every call and optional gridUrl/bulkSaveUrl props
 * so the Finishing SQC actuals page can reuse it verbatim with value_role='actual'.
 */
export default function TargetMapEditor({
	coId,
	branchId,
	process,
	idType,
	valueRole,
	effectiveDate,
	paramLabels = PARAM_LABELS,
	gridUrl = apiRoutesPortalMasters.FINISHING_TARGET_MAP_GRID,
	bulkSaveUrl = apiRoutesPortalMasters.FINISHING_TARGET_MAP_BULK_SAVE,
}: Props) {
	const [grid, setGrid] = React.useState<TargetGridData>(EMPTY_GRID);
	const [loading, setLoading] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const refresh = React.useCallback(async () => {
		if (!coId || !process || !idType || !valueRole || !effectiveDate) {
			setGrid(EMPTY_GRID);
			return;
		}
		setLoading(true);
		setError(null);
		const params = new URLSearchParams({
			co_id: String(coId),
			process,
			id_type: idType,
			value_role: valueRole,
			effective_date: effectiveDate,
		});
		if (branchId != null) params.set("branch_id", String(branchId));
		const { data, error: err } = await fetchWithCookie<{ data: TargetGridData }>(
			`${gridUrl}?${params.toString()}`,
			"GET"
		);
		if (err) {
			setError(err);
			setGrid(EMPTY_GRID);
		} else {
			setGrid(data?.data ?? EMPTY_GRID);
		}
		setLoading(false);
	}, [coId, process, idType, valueRole, effectiveDate, branchId, gridUrl]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async (cells: DirtyCell[]) => {
		if (!coId || !process || !idType || !valueRole || cells.length === 0) return;
		setSaving(true);
		setError(null);
		try {
			const { data, error: err } = await fetchWithCookie<{
				data: { inserted: number; updated: number; cleared: number };
			}>(bulkSaveUrl, "POST", {
				co_id: Number(coId),
				branch_id: branchId != null ? Number(branchId) : null,
				process,
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
