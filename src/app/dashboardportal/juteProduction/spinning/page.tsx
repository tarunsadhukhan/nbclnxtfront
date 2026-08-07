"use client";

import * as React from "react";
import {
	Alert,
	Box,
	CircularProgress,
	MenuItem,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useSpinningSetup } from "./hooks/useSpinningSetup";
import DoffEntryForm from "./_components/DoffEntryForm";
import DailyDoffGrid from "./_components/DailyDoffGrid";
import FrameMapGrid from "./_components/FrameMapGrid";
import FrameWiseGrid from "./_components/FrameWiseGrid";
import PlanningGrid from "./_components/PlanningGrid";
import SpinningProcessBar from "./_components/SpinningProcessBar";
import type { DoffEntryRow } from "./types/spinningTypes";
import { todayISO } from "./utils/spinningCalc";

export default function SpinningPage() {
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
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() =>
			(selectedCompany?.branches ?? []).filter((b) =>
				sidebarBranchIds.includes(Number(b.branch_id))
			),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find(
		(b) => Number(b.branch_id) === branchId
	)?.branch_name;

	const [tab, setTab] = React.useState(0);
	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	// Selected spell_id from setup.spells (branch-correct — spell codes repeat
	// per branch); every payload sends spell_id, never the code string.
	const [spellId, setSpellId] = React.useState<number | "">("");

	const [editingEntry, setEditingEntry] = React.useState<DoffEntryRow | null>(null);
	// Bumped after a Process so the planning grid + lock status re-fetch the frozen log.
	const [reloadKey, setReloadKey] = React.useState(0);
	// Bumped after a doff create/edit so the sibling doff grid re-fetches.
	const [doffReloadKey, setDoffReloadKey] = React.useState(0);

	// statusKey: bumped by ANY grid mutation -> SpinningProcessBar re-checks
	// staleness immediately (spec 5.6.1). dataKey: bumped after Process (and
	// doff saves) -> grids re-fetch (locked units serve the frozen log).
	const [statusKey, setStatusKey] = React.useState(0);
	const [dataKey, setDataKey] = React.useState(0);
	const onMutated = React.useCallback(() => setStatusKey((k) => k + 1), []);

	const { setup, loading: setupLoading, error: setupError } = useSpinningSetup(coId, branchId);

	// Default the shared spell selector to the first available spell once setup loads.
	React.useEffect(() => {
		if (setup && setup.spells.length > 0 && spellId === "") {
			setSpellId(setup.spells[0].spell_id);
		}
	}, [setup, spellId]);

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

	// Spell selector applies to Doff Entry (0), Frame → Quality (1) and the
	// Planning Grid (2, optional filter) and Frame Wise Production (3).
	const showSpell = tab === 0 || tab === 1 || tab === 2 || tab === 3;
	const showDate = true;

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Spinning Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Doff entry, frame→quality mapping and planning grid.
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
				<Alert severity="info">Select a branch to load spinning data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : setup.machines.length === 0 ? (
						<Alert severity="info">
							No spinning machines found for this branch. Add machines, then set their
							standards (bobbin weight, spindles, speed) in Spinning Standards / Targets.
						</Alert>
					) : (
						<>
							<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
								<Tabs
									value={tab}
									onChange={(_e, v) => setTab(v as number)}
									variant="scrollable"
									scrollButtons="auto"
								>
									<Tab label="Doff Entry" />
									<Tab label="Frame → Quality" />
									<Tab label="Planning Grid" />
									<Tab label="Frame Wise Production" />
								</Tabs>
							</Box>

							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2,
									flexWrap: "wrap",
								}}
							>
								{showDate ? (
									<TextField
										type="date"
										size="small"
										label="Date"
										value={tranDate}
										onChange={(e) => setTranDate(e.target.value)}
										InputLabelProps={{ shrink: true }}
									/>
								) : null}
								{showSpell ? (
									<TextField
										select
										size="small"
										label="Spell"
										value={spellId}
										onChange={(e) =>
											setSpellId(e.target.value === "" ? "" : Number(e.target.value))
										}
										sx={{ minWidth: 160 }}
									>
										{setup.spells.map((s) => (
											<MenuItem key={s.spell_id} value={s.spell_id}>
												{s.spell_code} ({Number(s.working_hours)} hrs)
											</MenuItem>
										))}
									</TextField>
								) : null}
							</Box>

							{/* One process/staleness bar, visible on all three tabs (spec 5.6). */}
							<SpinningProcessBar
								coId={coId}
								branchId={branchId}
								date={tranDate}
								spellId={spellId === "" ? null : spellId}
								refreshKey={statusKey}
								onProcessed={() => setDataKey((k) => k + 1)}
							/>

							{tab === 0 ? (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
									<DoffEntryForm
										coId={coId}
										branchId={branchId}
										setup={setup}
										date={tranDate}
										spellId={spellId === "" ? null : spellId}
										editingEntry={editingEntry}
										onSaved={() => {
											setEditingEntry(null);
											onMutated();
											setDataKey((k) => k + 1);
										}}
										onCancelEdit={() => setEditingEntry(null)}
									/>
									<DailyDoffGrid
										coId={coId}
										branchId={branchId}
										date={tranDate}
										spellId={spellId === "" ? null : spellId}
										onEdit={(row) => setEditingEntry(row)}
										onMutated={onMutated}
										refreshKey={dataKey}
									/>
								</Box>
							) : null}

							{tab === 1 ? (
								<FrameMapGrid
									coId={coId}
									branchId={branchId}
									setup={setup}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									onMutated={onMutated}
								/>
							) : null}

							{tab === 2 ? (
								<PlanningGrid
									coId={coId}
									branchId={branchId}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									refreshKey={dataKey}
								/>
							) : null}

							{tab === 3 ? (
								<FrameWiseGrid
									coId={coId}
									branchId={branchId}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									spells={setup.spells}
									refreshKey={dataKey}
								/>
							) : null}
						</>
					)}
				</Box>
			)}
		</Box>
	);
}
