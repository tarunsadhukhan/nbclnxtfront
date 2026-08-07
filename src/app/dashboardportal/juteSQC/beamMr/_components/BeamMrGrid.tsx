"use client";

import * as React from "react";
import {
	Box,
	CircularProgress,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	QUALITY_GROUPS,
	type BeamMrGroupSummary,
	type BeamMrRow,
	type QualityGroup,
} from "../types/beamMrTypes";

type Props = {
	coId: string;
	rows: BeamMrRow[];
	groupSummaries: BeamMrGroupSummary[];
	loading: boolean;
	onDeleted: () => void;
};

function machineLabel(r: BeamMrRow): string {
	if (r.machine_name) return `${r.machine_name}${r.mech_code ? ` (${r.mech_code})` : ""}`;
	return r.mc_id != null ? `MC #${r.mc_id}` : "—";
}

function spellLabel(r: BeamMrRow): string {
	return r.spell_code ?? (r.spell_id != null ? `Spell #${r.spell_id}` : "—");
}

function fmt(n: number | null | undefined, dp = 2): string {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—";
}

/**
 * R-08-18 Beam MR% by-date summary grid.
 *
 * Renders TWO grouped tables — HESSIAN and SACKING — each with the per-machine
 * reading-set rows (machine, quality, spell, N readings, avg_mr, std, deviation)
 * and a footer showing the group's overall_avg_mr (mean of the per-machine
 * avg_mr) from group_summaries. Per-row delete POSTs {beam_mr_id, co_id} to
 * delete_beam_mr. Server values are authoritative; this is a date-driven read of
 * jute_sqc_beam_mr.
 */
export default function BeamMrGrid({ coId, rows, groupSummaries, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [deletingId, setDeletingId] = React.useState<number | null>(null);

	const handleDelete = React.useCallback(
		async (beamMrId: number) => {
			if (!confirm(`Delete beam MR% row #${beamMrId}?`)) return;
			setDeletingId(beamMrId);
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.BEAM_MR_DELETE, "POST", {
				beam_mr_id: beamMrId,
				co_id: Number(coId),
			});
			setDeletingId(null);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted beam MR% row #${beamMrId}`);
			onDeleted();
		},
		[coId, onDeleted],
	);

	const rowsByGroup = React.useMemo(() => {
		const m = new Map<QualityGroup, BeamMrRow[]>();
		for (const g of QUALITY_GROUPS) m.set(g, []);
		for (const r of rows) {
			const list = m.get(r.quality_group);
			if (list) list.push(r);
		}
		return m;
	}, [rows]);

	const summaryByGroup = React.useMemo(() => {
		const m = new Map<QualityGroup, BeamMrGroupSummary>();
		for (const s of groupSummaries) m.set(s.quality_group, s);
		return m;
	}, [groupSummaries]);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
					<CircularProgress size={28} />
				</Box>
			) : null}

			{QUALITY_GROUPS.map((group) => {
				const groupRows = rowsByGroup.get(group) ?? [];
				const summary = summaryByGroup.get(group);
				// Column count follows the widest reading-set in this group (sets can
				// now carry different numbers of readings).
				const maxReadings = groupRows.reduce(
					(mx, r) => Math.max(mx, r.readings?.length ?? 0),
					0,
				);
				const readingHeaders = Array.from({ length: maxReadings }, (_, i) => i);
				return (
					<Paper key={group} variant="outlined" sx={{ p: 2 }}>
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "baseline",
								flexWrap: "wrap",
								mb: 1,
							}}
						>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								{group}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Overall Avg MR%: <strong>{fmt(summary?.overall_avg_mr)}</strong>
								{summary?.std_mr_pct != null ? ` · Std ${fmt(summary.std_mr_pct)}` : ""}
								{summary?.machine_count != null ? ` · ${summary.machine_count} machine(s)` : ""}
							</Typography>
						</Box>

						{groupRows.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No {group} reading-sets for this date.
							</Typography>
						) : (
							<TableContainer sx={{ overflowX: "auto" }}>
								<Table size="small" sx={{ minWidth: 900 }}>
									<TableHead>
										<TableRow>
											<TableCell sx={{ minWidth: 160 }}>Machine</TableCell>
											<TableCell sx={{ minWidth: 150 }}>Quality</TableCell>
											<TableCell sx={{ minWidth: 90 }}>Spell</TableCell>
											{readingHeaders.map((i) => (
												<TableCell key={`mr-h-${i}`} align="right" sx={{ minWidth: 70 }}>
													MR% {i + 1}
												</TableCell>
											))}
											<TableCell align="right" sx={{ minWidth: 80 }}>
												Avg MR%
											</TableCell>
											<TableCell align="right" sx={{ minWidth: 70 }}>
												Std
											</TableCell>
											<TableCell align="right" sx={{ minWidth: 90 }}>
												Deviation
											</TableCell>
											<TableCell align="center" sx={{ width: 56 }} />
										</TableRow>
									</TableHead>
									<TableBody>
										{groupRows.map((r) => (
											<TableRow key={r.beam_mr_id} hover>
												<TableCell>{machineLabel(r)}</TableCell>
												<TableCell>
													{r.item_name ?? (r.item_id != null ? `Item #${r.item_id}` : "—")}
												</TableCell>
												<TableCell>{spellLabel(r)}</TableCell>
												{readingHeaders.map((i) => (
													<TableCell key={`${r.beam_mr_id}-mr-${i}`} align="right">
														{fmt(r.readings?.[i])}
													</TableCell>
												))}
												<TableCell align="right" sx={{ fontWeight: 600 }}>
													{fmt(r.avg_mr)}
												</TableCell>
												<TableCell align="right">{fmt(r.std_mr_pct)}</TableCell>
												<TableCell align="right">{fmt(r.deviation)}</TableCell>
												<TableCell align="center">
													<Tooltip title="Delete row">
														<span>
															<IconButton
																size="small"
																color="error"
																disabled={deletingId === r.beam_mr_id}
																onClick={() => handleDelete(r.beam_mr_id)}
																sx={{ minWidth: 40, minHeight: 40 }}
															>
																<DeleteOutlineIcon size={16} />
															</IconButton>
														</span>
													</Tooltip>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Paper>
				);
			})}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
