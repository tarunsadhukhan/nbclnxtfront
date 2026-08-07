"use client";

import * as React from "react";
import {
	Alert,
	AlertTitle,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Snackbar,
	Typography,
} from "@mui/material";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useWeavingProcessStatus } from "../hooks/useWeavingProcessStatus";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number;
	// Bumped after a successful Process so the grids re-fetch (locked -> frozen log).
	onProcessed?: () => void;
};

type WarnLoom = { machine_id: number; mech_code?: string; machine_name?: string };
type Warnings = {
	no_worker: WarnLoom[];
	no_standard: WarnLoom[];
	no_picks: WarnLoom[];
	negative_jugar?: WarnLoom[];
};
type BlockDetail = { message: string; unmapped?: WarnLoom[]; quality_mismatch?: WarnLoom[] };

const codes = (looms: WarnLoom[] = []) =>
	looms.map((l) => l.mech_code ?? `#${l.machine_id}`).join(", ");

// The Process button: validates the 5 inputs server-side, freezes computed rows into
// the log and locks the (date,spell). A locked unit needs Edit permission to re-process
// or mutate; reprocess_needed flags SQC/stoppage drift since the last Process.
export default function WeavingProcessBar({ coId, branchId, date, spellId, onProcessed }: Props) {
	const pathname = usePathname();
	const { hasMenuAccess } = useSidebarContext();
	const canEdit = hasMenuAccess(pathname, "edit");

	const { status, loading: statusLoading, refresh } = useWeavingProcessStatus(
		coId,
		branchId,
		date,
		spellId
	);

	const [busy, setBusy] = React.useState(false);
	const [confirmOpen, setConfirmOpen] = React.useState(false);
	const [warnings, setWarnings] = React.useState<Warnings | null>(null);
	const [block, setBlock] = React.useState<BlockDetail | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const lockedNoEdit = status.locked && !canEdit;

	const handleProcess = async () => {
		setConfirmOpen(false);
		setBusy(true);
		setWarnings(null);
		setBlock(null);
		const body = { co_id: Number(coId), branch_id: branchId, tran_date: date, spell_id: spellId };
		const { data, error, payload } = await fetchWithCookie<{
			data: { processed: number; warnings: Warnings };
		}>(apiRoutesPortalMasters.WEAVING_PROCESS, "POST", body);
		setBusy(false);
		if (error) {
			// BLOCK (400) carries the offending loom lists in the raw payload's detail
			// (fetchWithCookie flattens error to detail.message only).
			const detail = (payload as { detail?: BlockDetail } | null | undefined)?.detail;
			if (detail && (detail.unmapped?.length || detail.quality_mismatch?.length)) {
				setBlock(detail);
			} else {
				setSnack(error);
			}
			return;
		}
		setWarnings(data?.data?.warnings ?? null);
		setSnack(`Processed ${data?.data?.processed ?? 0} looms — day/spell locked.`);
		refresh();
		onProcessed?.();
	};

	if (spellId == null) return null;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Button
					variant="contained"
					color={status.locked ? "warning" : "primary"}
					size="small"
					onClick={() => setConfirmOpen(true)}
					disabled={busy || statusLoading || lockedNoEdit}
				>
					{busy ? "Processing…" : status.locked ? "Re-process" : "Process day + spell"}
				</Button>

				{statusLoading ? (
					<CircularProgress size={16} />
				) : status.locked ? (
					<Chip size="small" color="success" label="Processed & Locked" variant="outlined" />
				) : (
					<Chip size="small" label="Not processed" variant="outlined" />
				)}

				{status.reprocess_needed ? (
					<Chip
						size="small"
						color="warning"
						label="SQC / stoppage changed — reprocess"
					/>
				) : null}

				{lockedNoEdit ? (
					<Typography variant="caption" color="text.secondary">
						Locked — Edit permission required to re-process or change entries.
					</Typography>
				) : null}
			</Box>

			{block ? (
				<Alert severity="error" onClose={() => setBlock(null)}>
					<AlertTitle>Cannot process — fix the loom mapping first</AlertTitle>
					{block.unmapped?.length ? (
						<div>Production but no mapped quality: {codes(block.unmapped)}</div>
					) : null}
					{block.quality_mismatch?.length ? (
						<div>Entry quality differs from mapped quality: {codes(block.quality_mismatch)}</div>
					) : null}
				</Alert>
			) : null}

			{warnings &&
			(warnings.no_worker.length ||
				warnings.no_standard.length ||
				warnings.no_picks.length ||
				warnings.negative_jugar?.length) ? (
				<Alert severity="warning" onClose={() => setWarnings(null)}>
					<AlertTitle>Processed with warnings</AlertTitle>
					{warnings.no_worker.length ? (
						<div>No worker (attendance) for: {codes(warnings.no_worker)}</div>
					) : null}
					{warnings.no_standard.length ? (
						<div>No speed/efficiency standard for: {codes(warnings.no_standard)}</div>
					) : null}
					{warnings.no_picks.length ? (
						<div>No SQC pick reading for: {codes(warnings.no_picks)}</div>
					) : null}
					{warnings.negative_jugar?.length ? (
						<div>Negative jugar (closing &lt; opening) for: {codes(warnings.negative_jugar)}</div>
					) : null}
				</Alert>
			) : null}

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>{status.locked ? "Re-process" : "Process"} day + spell?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{status.locked ? "Re-process" : "Process"} {date} for the selected spell? This freezes
						the computed rows and locks the day + spell.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleProcess}>
						{status.locked ? "Re-process" : "Process"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={!!snack}
				autoHideDuration={5000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
