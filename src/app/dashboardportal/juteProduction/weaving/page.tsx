"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	MenuItem,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useWeavingSetup } from "./hooks/useWeavingSetup";
import { useLoomQualityMap } from "./hooks/useLoomQualityMap";
import LoomQualityMapGrid from "./_components/LoomQualityMapGrid";
import WeavingEntryGrid from "./_components/WeavingEntryGrid";
import WeavingProcessBar from "./_components/WeavingProcessBar";
import WeavingBeamChangeGrid from "./_components/WeavingBeamChangeGrid";
import WeavingAdjustmentGrid from "./_components/WeavingAdjustmentGrid";
import WeavingPlanningGrid from "./_components/WeavingPlanningGrid";
import { todayISO } from "./utils/weavingCalc";

export default function WeavingPage() {
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
	// Draft values edited in the inputs; only committed to the applied* values on Search.
	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	// Selected spell_id from setup.spells (branch-correct — spell codes repeat per
	// branch); every payload sends spell_id, never the code string.
	const [spellId, setSpellId] = React.useState<number | "">("");
	// Applied values are what the grids actually query — they change only on Search.
	const [appliedDate, setAppliedDate] = React.useState<string>(todayISO());
	const [appliedSpellId, setAppliedSpellId] = React.useState<number | "">("");

	const { setup, loading: setupLoading, error: setupError } = useWeavingSetup(coId, branchId);

	// One Loom→Quality map fetch for the whole page — shared by the mapping editor and the
	// Production Entry grid so switching between those tabs never refetches it. Phase 1 (saved
	// mapping) is ~88ms; the editor's carry-forward (prev_quality_*) loads lazily after.
	const qualityMap = useLoomQualityMap(
		coId,
		branchId,
		appliedDate,
		appliedSpellId === "" ? null : appliedSpellId
	);

	// Default the shared spell selector to the first available spell once setup loads.
	React.useEffect(() => {
		if (setup && setup.spells.length > 0 && spellId === "") {
			setSpellId(setup.spells[0].spell_id);
			setAppliedSpellId(setup.spells[0].spell_id);
		}
	}, [setup, spellId]);

	const [reloadKey, setReloadKey] = React.useState(0);

	const handleSearch = () => {
		setAppliedDate(tranDate);
		setAppliedSpellId(spellId);
	};

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

	// Date + Spell apply to every tab: Loom → Quality (0), Production Entry (1),
	// Beam Change (2) and the Planning Grid (3).
	const showSpell = true;
	const showDate = true;

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Weaving Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Loom → quality mapping, per-loom production entry, beam changes and the server-computed
				planning grid.
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
				<Alert severity="info">Select a branch to load weaving data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : setup.machines.length === 0 ? (
						<Alert severity="info">
							No weaving looms found for this branch. Tag machines to the Weaving machine type,
							then set their standards (full length, jpc, speed, picks, eff) in Weaving Standards /
							Targets.
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
									<Tab label="Loom → Quality" />
									<Tab label="Production Entry" />
									<Tab label="Beam Change" />
									<Tab label="Production Adjustment" />
									<Tab label="Planning Grid" />
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
								<Button variant="contained" size="small" onClick={handleSearch}>
									Search
								</Button>
							</Box>

							{branchId != null && appliedSpellId !== "" ? (
								<WeavingProcessBar
									coId={coId}
									branchId={branchId}
									date={appliedDate}
									spellId={appliedSpellId}
									onProcessed={() => setReloadKey((k) => k + 1)}
								/>
							) : null}

							{tab === 0 ? (
								<LoomQualityMapGrid
									coId={coId}
									branchId={branchId}
									setup={setup}
									date={appliedDate}
									spellId={appliedSpellId === "" ? null : appliedSpellId}
									map={qualityMap}
								/>
							) : null}

							{tab === 1 ? (
								<WeavingEntryGrid
									coId={coId}
									branchId={branchId}
									setup={setup}
									date={appliedDate}
									spellId={appliedSpellId === "" ? null : appliedSpellId}
									map={qualityMap}
									refreshKey={reloadKey}
								/>
							) : null}

							{tab === 2 ? (
								<WeavingBeamChangeGrid
									coId={coId}
									branchId={branchId}
									date={appliedDate}
									spellId={appliedSpellId === "" ? null : appliedSpellId}
								/>
							) : null}

							{tab === 3 ? (
								<WeavingAdjustmentGrid
									coId={coId}
									branchId={branchId}
									date={appliedDate}
									spellId={appliedSpellId === "" ? null : appliedSpellId}
								/>
							) : null}

							{tab === 4 ? (
								<WeavingPlanningGrid
									coId={coId}
									branchId={branchId}
									date={appliedDate}
									spellId={appliedSpellId === "" ? null : appliedSpellId}
								/>
							) : null}
						</>
					)}
				</Box>
			)}
		</Box>
	);
}
