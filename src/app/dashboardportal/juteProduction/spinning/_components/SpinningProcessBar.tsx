"use client";

import * as React from "react";
import {
	Alert,
	AlertTitle,
	Box,
	Button,
	Chip,
	CircularProgress,
	Snackbar,
	Typography,
} from "@mui/material";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSpinningProcessStatus } from "../hooks/useSpinningProcessStatus";

type Props = {
	coId: string;
	branchId: number;
	date: string;
	spellId: number | null;
	// Bumped by page.tsx whenever ANY grid mutates (doff create/edit/delete,
	// mapper save, sync) so the staleness chip flips immediately (spec 5.6.1).
	refreshKey?: number;
	// Bumped after a successful Process so the grids re-fetch (locked -> frozen log).
	onProcessed?: () => void;
};

type WarnMachine = { machine_id?: number; mech_code?: string | null; machine_name?: string | null };
type BlockDetail = { message?: string; unmapped?: WarnMachine[] };

const codes = (machines: WarnMachine[] = []) =>
	machines.map((m) => m.mech_code ?? `#${m.machine_id}`).join(", ");

// Human labels for the warn categories we know; anything else the backend adds
// later still renders via the generic branch (spec 5.6.2 — drop nothing).
const WARN_LABELS: Record<string, string> = {
	no_standard: "No speed standard for",
	no_count: "No SQC count observation for",
	doffs_no_operator: "Doffs still without operator after sync",
	attendance_inactive: "Stamped operator's attendance later rejected/deactivated for",
};

function renderWarnValue(value: unknown): string {
	if (typeof value === "number" || typeof value === "string") return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return "";
		if (typeof value[0] === "object" && value[0] !== null) {
			return codes(value as WarnMachine[]);
		}
		return value.join(", ");
	}
	return JSON.stringify(value);
}

function warnLines(warnings: Record<string, unknown>): { key: string; text: string }[] {
	const lines: { key: string; text: string }[] = [];
	for (const [key, value] of Object.entries(warnings)) {
		if (key === "sync") continue; // rendered separately as info counts
		if (value == null) continue;
		if (Array.isArray(value) && value.length === 0) continue;
		if (typeof value === "number" && value === 0) continue;
		const label = WARN_LABELS[key] ?? key.replace(/_/g, " ");
		lines.push({ key, text: `${label}: ${renderWarnValue(value)}` });
	}
	return lines;
}

// The Process button (replaces the dead Planning-Grid Save, G1): runs fill-sync
// server-side, blocks on unmapped doffs (B1), freezes the day-slice into
// jute_prod_spinning_daily and locks the (date,spell) unit.
export default function SpinningProcessBar({
	coId,
	branchId,
	date,
	spellId,
	refreshKey = 0,
	onProcessed,
}: Props) {
	const pathname = usePathname();
	const { hasMenuAccess } = useSidebarContext();
	const canEdit = hasMenuAccess(pathname, "edit");

	const { status, loading: statusLoading, refresh } = useSpinningProcessStatus(
		coId,
		branchId,
		date,
		spellId,
		refreshKey
	);

	const [busy, setBusy] = React.useState(false);
	const [warnings, setWarnings] = React.useState<Record<string, unknown> | null>(null);
	const [block, setBlock] = React.useState<BlockDetail | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const lockedNoEdit = status.locked && !canEdit;

	const handleProcess = async () => {
		setBusy(true);
		setWarnings(null);
		setBlock(null);
		try {
			// Native fetch (not fetchWithCookie): the B1 BLOCK 400 carries the
			// unmapped machine list in detail.unmapped, which fetchWithCookie
			// flattens to a message string.
			const res = await fetch(apiRoutesPortalMasters.SPINNING_PROCESS, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					co_id: Number(coId),
					branch_id: branchId,
					tran_date: date,
					spell_id: spellId,
				}),
			});
			const payload = (await res.json().catch(() => null)) as {
				data?: { processed: number; warnings: Record<string, unknown> };
				detail?: BlockDetail | string;
			} | null;
			if (!res.ok) {
				const detail = payload?.detail;
				if (detail && typeof detail === "object" && detail.unmapped?.length) {
					setBlock(detail);
				} else {
					const msg =
						typeof detail === "string"
							? detail
							: detail?.message ?? `Process failed (${res.status})`;
					setSnack(msg);
				}
				return;
			}
			setWarnings(payload?.data?.warnings ?? null);
			setSnack(`Processed ${payload?.data?.processed ?? 0} frames — day/spell locked.`);
			refresh();
			onProcessed?.();
		} catch (e) {
			setSnack(e instanceof Error ? e.message : "Process failed");
		} finally {
			setBusy(false);
		}
	};

	if (spellId == null) return null;

	const lines = warnings ? warnLines(warnings) : [];
	const sync = warnings?.sync as
		| { quality_stamped?: number; operator_stamped?: number }
		| undefined;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Button
					variant="contained"
					color={status.locked ? "warning" : "primary"}
					size="small"
					onClick={handleProcess}
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
					<Chip size="small" color="warning" label="Entries changed after processing — reprocess" />
				) : null}

				{!statusLoading ? (
					<Typography variant="caption" color="text.secondary">
						{status.locked
							? `Processed (frozen) data as of ${status.processed_date_time ?? "—"}`
							: "Live data — not processed yet"}
					</Typography>
				) : null}

				{lockedNoEdit ? (
					<Typography variant="caption" color="text.secondary">
						Locked — Edit permission required to re-process or change entries.
					</Typography>
				) : null}
			</Box>

			{block ? (
				<Alert severity="error" onClose={() => setBlock(null)}>
					<AlertTitle>Cannot process — map a quality first</AlertTitle>
					These frames have doff production but no mapped quality: {codes(block.unmapped)}.
					Save a rule in Frame → Quality (or run Sync), then process again.
				</Alert>
			) : null}

			{warnings && lines.length > 0 ? (
				<Alert severity="warning" onClose={() => setWarnings(null)}>
					<AlertTitle>Processed with warnings</AlertTitle>
					{lines.map((l) => (
						<div key={l.key}>{l.text}</div>
					))}
					{sync ? (
						<Typography variant="caption" color="text.secondary">
							Sync ran first: {sync.quality_stamped ?? 0} quality / {sync.operator_stamped ?? 0}{" "}
							operator stamp(s).
						</Typography>
					) : null}
				</Alert>
			) : null}

			<Snackbar
				open={!!snack}
				autoHideDuration={5000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
