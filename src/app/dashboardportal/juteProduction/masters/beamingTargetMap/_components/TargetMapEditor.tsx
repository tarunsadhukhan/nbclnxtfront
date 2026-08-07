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
// Beaming standards split by id_type: 'mcid' (Machine — speed/dia) and 'qid'
// (Quality = bm_quality — laid_length/cuts_per_beam/eff). Roles: standard |
// target | actual. 'actual' is consumed by the Beaming SQC page (reuses these
// endpoints with value_role='actual'); the Standards page exposes [standard, target].

export const ID_TYPE_LABELS: Record<IdType, string> = { mcid: "Machine", qid: "Quality" };
export const VALUE_ROLE_LABELS: Record<ValueRole, string> = {
	standard: "Standard",
	target: "Target",
	actual: "Actual",
};
// Union of all beaming params across roles. The grid only renders the params the
// backend returns for the active (id_type, value_role); standard exposes the full
// set (incl. dia), target exposes only speed + eff.
export const PARAM_LABELS: Record<string, string> = {
	laid_length: "Laid Length",
	cuts_per_beam: "Cuts / Beam",
	dia: "Roller Dia",
	speed: "RPM",
	eff: "Efficiency",
};

const EMPTY_GRID: TargetGridData = { params: [], rows: [] };

type Props = {
	coId: number | string;
	branchId: number | null;
	idType: IdType;
	valueRole: ValueRole;
	effectiveDate: string;
	paramLabels?: Record<string, string>;
};

/**
 * Self-contained inline editor for one (idType, valueRole) at a controlled
 * effective date. Owns the grid fetch (BEAMING_TARGET_MAP_GRID), bulk-save
 * (BEAMING_TARGET_MAP_BULK_SAVE) and error/snack state, and renders the agnostic
 * TargetGrid. Type / Role / Date selectors live in the consuming page.
 *
 * Copied from spngTargetMap/_components/TargetMapEditor.tsx — that component
 * hardcodes the SPNG_TARGET_MAP_* routes internally (they are not props), so per
 * the clone instruction this copy swaps the route consts to BEAMING_TARGET_MAP_*
 * and supplies the beaming param labels.
 */
export default function TargetMapEditor({
	coId,
	branchId,
	idType,
	valueRole,
	effectiveDate,
	paramLabels = PARAM_LABELS,
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
			`${apiRoutesPortalMasters.BEAMING_TARGET_MAP_GRID}?${params.toString()}`,
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
			}>(apiRoutesPortalMasters.BEAMING_TARGET_MAP_BULK_SAVE, "POST", {
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
