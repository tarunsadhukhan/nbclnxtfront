"use client";

import * as React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Snackbar,
	Typography,
} from "@mui/material";
import { ChevronDown as ExpandIcon, RefreshCw as SyncIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { DoffSyncResult } from "../types/spinningTypes";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	// Fired after a successful sync so the caller can refresh its grid + bump
	// the process-status bar (spec 5.6.1).
	onSynced?: () => void;
};

// Sync (spec 5.4, fill mode, both targets): stamps item_id from the mapper
// as-of and eb_id from attendance onto the unit's NULL doff rows. Idempotent —
// re-run any time; manual stamps are never touched.
export default function DoffSyncButton({ coId, branchId, date, spellId, onSynced }: Props) {
	const [busy, setBusy] = React.useState(false);
	const [result, setResult] = React.useState<DoffSyncResult | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleSync = async () => {
		if (spellId == null) {
			setSnack("Select a spell to sync.");
			return;
		}
		setBusy(true);
		setResult(null);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			tran_date: date,
			spell_id: spellId,
			mode: "fill",
			targets: ["quality", "operator"],
		};
		const { data, error } = await fetchWithCookie<{ data: DoffSyncResult }>(
			apiRoutesPortalMasters.SPINNING_DOFF_SYNC,
			"POST",
			body
		);
		setBusy(false);
		if (error) {
			setSnack(error);
			return;
		}
		const r = data?.data ?? null;
		setResult(r);
		setSnack(
			`Sync: ${r?.quality_stamped ?? 0} quality stamp(s), ${r?.operator_stamped ?? 0} operator stamp(s).`
		);
		onSynced?.();
	};

	const ex = result?.exceptions;
	const exceptionLines = ex
		? [
				ex.machines_unmapped.length
					? `Machines with unmapped doffs: ${ex.machines_unmapped.map((m) => `#${m}`).join(", ")}`
					: null,
				ex.doffs_no_operator > 0
					? `Doffs without operator (no matching attendance): ${ex.doffs_no_operator}`
					: null,
				ex.operator_ambiguous.length
					? `Operator ambiguous (stamped first-marked, review): ${ex.operator_ambiguous
							.map((a) => `machine #${a.machine_id} → eb ${a.stamped_eb_id} of [${a.eb_ids.join(", ")}]`)
							.join("; ")}`
					: null,
				ex.item_overridden.length
					? `Item overridden on ${ex.item_overridden.length} doff(s): ${ex.item_overridden
							.map((o) => `#${o.daily_doff_tbl_id} (${o.old_item_id ?? "—"} → ${o.new_item_id ?? "—"})`)
							.join(", ")}`
					: null,
				ex.bobbin_missing.length
					? `No bobbin standard (tare understated risk) on machines: ${ex.bobbin_missing
							.map((m) => `#${m}`)
							.join(", ")}`
					: null,
				ex.attendance_no_doffs?.length
					? `Attendance marked but no doffs (W7): ${ex.attendance_no_doffs
							.map((a) => `${a.mech_code ?? `#${a.machine_id}`} (eb ${a.eb_ids.join(", ")})`)
							.join("; ")}`
					: null,
			].filter((l): l is string => l !== null)
		: [];

	return (
		<>
			<Button
				variant="outlined"
				size="small"
				startIcon={<SyncIcon size={16} />}
				onClick={handleSync}
				disabled={busy || spellId == null}
			>
				{busy ? "Syncing…" : "Sync"}
			</Button>

			{result ? (
				<Box sx={{ width: "100%" }}>
					{exceptionLines.length > 0 ? (
						<Accordion disableGutters>
							<AccordionSummary expandIcon={<ExpandIcon size={16} />}>
								<Typography variant="body2">
									Sync exceptions ({exceptionLines.length} categor
									{exceptionLines.length === 1 ? "y" : "ies"})
								</Typography>
							</AccordionSummary>
							<AccordionDetails>
								{exceptionLines.map((l) => (
									<Typography key={l} variant="body2" sx={{ mb: 0.5 }}>
										{l}
									</Typography>
								))}
							</AccordionDetails>
						</Accordion>
					) : (
						<Alert severity="success" onClose={() => setResult(null)}>
							Sync clean — no exceptions.
						</Alert>
					)}
				</Box>
			) : null}

			<Snackbar
				open={!!snack}
				autoHideDuration={4000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</>
	);
}
