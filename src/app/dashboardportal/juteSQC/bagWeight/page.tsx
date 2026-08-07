"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "./utils/bagWeightCalc";
import { useBagWeightSetup } from "./hooks/useBagWeightSetup";
import { useBagWeightByDate } from "./hooks/useBagWeightByDate";
import BagWeightForm from "./_components/BagWeightForm";
import BagWeightGrid from "./_components/BagWeightGrid";
import { hyLtLabel } from "./utils/bagWeightCalc";
import SqcPrintButton from "../_shared/SqcPrintButton";
import type { SqcPrintReport, PrintColumn, PrintSection } from "../_shared/printReport";

export default function BagWeightSqcPage() {
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
	const { setup, loading: setupLoading, error: setupError } = useBagWeightSetup(coId, branchId);
	const {
		blocks,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useBagWeightByDate(coId, branchId, entryDate);

	// Bumped on each save/delete so the grid's history (trend) table reloads too.
	const [reloadKey, setReloadKey] = React.useState(0);
	const onSaved = React.useCallback(() => {
		refreshByDate();
		setReloadKey((k) => k + 1);
	}, [refreshByDate]);

	// Day-level print: one consolidated report for the whole entry date. The grid
	// groups the day's saved blocks by (date, bag type); each block becomes a
	// table sub-section mirroring the on-screen reading rows + Avg footer, with the
	// server-computed block stats listed as a meta section below it.
	const fmt = React.useCallback(
		(n: number | null | undefined, dp = 2): string =>
			n != null && Number.isFinite(Number(n)) ? Number(n).toFixed(dp) : "—",
		[],
	);
	const getReport = React.useCallback((): SqcPrintReport | null => {
		if (blocks.length === 0) return null;
		const columns: PrintColumn[] = [
			{ key: "idx", label: "#", align: "left" },
			{ key: "mr", label: "MR%", align: "right" },
			{ key: "obs", label: "Obs (gm)", align: "right" },
			{ key: "corr", label: "Corr (gm)", align: "right" },
		];
		const sections: PrintSection[] = [];
		for (const block of blocks) {
			const label =
				block.item_name ??
				block.bag_type_label ??
				(block.item_id != null ? `Item #${block.item_id}` : "—");
			const title = `${label} · Std ${fmt(block.std_bag_weight)} gm · Std MR% ${fmt(
				block.std_mr_pct,
			)}`;
			sections.push({
				kind: "table",
				title,
				columns,
				rows: block.readings.map((r, i) => ({
					idx: i + 1,
					mr: fmt(r.mr),
					obs: fmt(r.obs),
					corr: fmt(r.corr),
				})),
				footerRows: [
					{
						idx: "Avg",
						mr: fmt(block.avg_mr),
						obs: fmt(block.avg_obs),
						corr: fmt(block.avg_corr),
					},
				],
				emptyText: "No reading rows.",
			});
			sections.push({
				kind: "meta",
				fields: [
					{ label: "Obs std dev", value: fmt(block.obs_stdev, 4) },
					{ label: "Obs CV %", value: fmt(block.obs_cv_pct, 4) },
					{ label: "Obs HY/LT %", value: hyLtLabel(block.obs_hy_lt_pct) },
					{ label: "Corr HY/LT %", value: hyLtLabel(block.corr_hy_lt_pct) },
				],
			});
		}
		return {
			reportTitle: "Bag Weight SQC",
			reportCode: "R-08-23",
			companyName: selectedCompany?.co_name,
			branchName: selectedBranchName,
			reportDate: entryDate,
			sections,
		};
	}, [blocks, fmt, selectedCompany, selectedBranchName, entryDate]);

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
				Bag Weight SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-23 finished-bag weight control. Capture one (date, bag type) block at a time — its
				standards (std bag weight gm and Std MR%, which defaults to 20 for jute bags, both editable
				and snapshotted at save) plus any number of reading rows, each an MR% and an observed bag weight.
				The server corrects each observed weight to the std MR%, then computes the block averages,
				the SAMPLE std dev / CV% of the observed weights, and the OBS and CORR HY/LT% vs the std
				(positive = Heavy, negative = Light — display only).
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
				<Alert severity="info">Select a branch to load Bag Weight SQC data.</Alert>
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
								disabled={byDateLoading || blocks.length === 0}
							/>
						</Box>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<BagWeightForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onSaved}
						/>
					)}
					<BagWeightGrid
						coId={coId}
						branchId={branchId}
						blocks={blocks}
						loading={byDateLoading}
						onDeleted={onSaved}
						reloadKey={reloadKey}
					/>
				</Box>
			)}
		</Box>
	);
}
