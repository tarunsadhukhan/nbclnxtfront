"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/fabricFaultCalc";
import { useFabricFaultSetup } from "./hooks/useFabricFaultSetup";
import { useFabricFaultByDate } from "./hooks/useFabricFaultByDate";
import FabricFaultForm from "./_components/FabricFaultForm";
import FabricFaultGrid from "./_components/FabricFaultGrid";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn, PrintCell } from "../_shared/printReport";
import { FAULT_TYPES } from "./types/fabricFaultTypes";

// Label for a piece column in the print matrix — mirrors the grid's pieceLabel().
function piecePrintLabel(p: {
	loom_name?: string | null;
	mech_code?: string | null;
	item_name?: string | null;
	fabric_fault_id: number;
}): string {
	const loom = p.loom_name ? `${p.loom_name}${p.mech_code ? ` (${p.mech_code})` : ""}` : null;
	return loom ?? p.item_name ?? `Piece #${p.fabric_fault_id}`;
}

function fmtScore(n: number | null | undefined): PrintCell {
	return n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(4) : null;
}

export default function FabricFaultSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

	// Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
	const sidebarBranchIds = React.useMemo(() => selectedBranches.map(Number), [selectedBranches]);
	const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
	React.useEffect(() => {
		if (sidebarBranchIds.length === 1) {
			setPageBranchId(sidebarBranchIds[0]);
		} else if (sidebarBranchIds.length === 0) {
			setPageBranchId("");
		} else {
			setPageBranchId((prev) =>
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : "",
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() =>
			(selectedCompany?.branches ?? []).filter((b) =>
				sidebarBranchIds.includes(Number(b.branch_id)),
			),
		[selectedCompany, sidebarBranchIds],
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const { setup, loading: setupLoading, error: setupError } = useFabricFaultSetup(coId, branchId);
	const {
		data: byDate,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useFabricFaultByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: render the WHOLE day's fault matrix as ONE report (never
	// split by spell/shift). The matrix is fault-type rows × inspected-piece
	// columns + Total/Score columns, with a grand-total footer row — mirroring the
	// on-screen grid. Spell is shown only as an ordinary per-piece attribute.
	const getReport = React.useCallback((): SqcPrintReport | null => {
		const pieces = byDate.pieces ?? [];
		if (pieces.length === 0) return null;

		const faultLabels =
			byDate.fault_types?.length === FAULT_TYPES.length ? byDate.fault_types : [...FAULT_TYPES];

		// Columns: Fault type | one per inspected piece | Total | Score.
		const columns: PrintColumn[] = [
			{ key: "fault", label: "Fault type" },
			...pieces.map((p) => ({
				key: `p${p.fabric_fault_id}`,
				label: piecePrintLabel(p),
				align: "right" as const,
			})),
			{ key: "total", label: "Total", align: "right" as const },
			{ key: "score", label: "Score", align: "right" as const },
		];

		// One row per fault type; cells = per-piece counts, plus day total/score.
		const rows: Array<Record<string, PrintCell>> = faultLabels.map((name, i) => {
			const row: Record<string, PrintCell> = {
				fault: name,
				total: byDate.fault_totals?.[i] ?? 0,
				score: fmtScore(byDate.fault_scores?.[i]),
			};
			pieces.forEach((p) => {
				row[`p${p.fabric_fault_id}`] = p.fault_counts?.[i] ?? 0;
			});
			return row;
		});

		// Grand-total footer row: per-piece piece_total + day grand total/score.
		const grandRow: Record<string, PrintCell> = {
			fault: "Grand total",
			total: byDate.grand_total ?? 0,
			score: fmtScore(byDate.grand_score),
		};
		pieces.forEach((p) => {
			grandRow[`p${p.fabric_fault_id}`] = p.piece_total ?? null;
		});

		return {
			reportTitle: "Fabric Fault SQC",
			reportCode: "R-08-28",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			headerFields: [
				{ label: "Pieces inspected (N)", value: byDate.pieces_inspected ?? pieces.length },
				{ label: "Grand total", value: byDate.grand_total ?? 0 },
				{ label: "Grand score", value: fmtScore(byDate.grand_score) },
			],
			sections: [
				{
					kind: "table",
					title: "Day fault matrix",
					columns,
					rows,
					footerRows: [grandRow],
					emptyText: "No inspected pieces for this date.",
				},
				{
					kind: "table",
					title: "Inspected pieces",
					columns: [
						{ key: "loom", label: "Loom" },
						{ key: "quality", label: "Quality" },
						{ key: "spell", label: "Spell" },
						{ key: "weaving", label: "Date of weaving" },
						{ key: "inspector", label: "Inspector" },
						{ key: "piece_total", label: "Piece total", align: "right" as const },
					],
					rows: pieces.map((p) => ({
						loom: p.loom_name
							? `${p.loom_name}${p.mech_code ? ` (${p.mech_code})` : ""}`
							: null,
						quality: p.item_name ?? null,
						spell: p.spell_code ?? null,
						weaving: p.date_of_weaving ?? null,
						inspector: p.inspector_name ?? null,
						piece_total: p.piece_total ?? null,
					})),
				},
			],
		};
	}, [byDate, selectedCompany, selectedBranchName, entryDate]);

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	if (sidebarBranchIds.length === 0) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select at least one branch in the sidebar to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Fabric Fault SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-28 weaving woven-cloth defect tally. One save = one inspected piece (loom/cloth column):
				header + a fixed 15-fault checklist of counts (most are 0). The server computes piece_total and
				the day roll-up (per-fault totals/scores, grand total/score over all pieces for the date).
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, minWidth: 240 }}
				>
					{branchOptions.map((b) => (
						<MenuItem key={b.branch_id} value={Number(b.branch_id)}>
							{b.branch_name}
						</MenuItem>
					))}
				</TextField>
			) : selectedBranchName ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Branch: {selectedBranchName}
				</Typography>
			) : null}

			{branchId == null ? (
				<Alert severity="info">Select a branch to load Fabric Fault data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Entry date</Typography>
						<TextField
							type="date"
							size="small"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<Box sx={{ ml: "auto" }}>
							<SqcPrintButton
								getReport={getReport}
								disabled={byDateLoading || (byDate.pieces?.length ?? 0) === 0}
							/>
						</Box>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<FabricFaultForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<FabricFaultGrid
						coId={coId}
						branchId={branchId}
						byDate={byDate}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
