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
import { useWindingDoffSetup } from "./hooks/useWindingDoffSetup";
import { useJugarSetup } from "./hooks/useJugarSetup";
import DoffForm from "./_components/DoffForm";
import DoffGrid from "./_components/DoffGrid";
import JugarForm from "./_components/JugarForm";
import JugarGrid from "./_components/JugarGrid";
import QualityGrid from "./_components/QualityGrid";
import WinderWiseGrid from "./_components/WinderWiseGrid";
import { todayISO } from "../spinning/utils/spinningCalc";

export default function WindingPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

	// Branch resolution: 1 sidebar branch -> auto-use it; several -> user picks one.
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
	const selectedBranchName = branchOptions.find(
		(b) => Number(b.branch_id) === branchId,
	)?.branch_name;

	const [tab, setTab] = React.useState(0);
	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	// Selected spell_id from setup.spells (branch-correct — spell codes repeat
	// per branch); every payload sends spell_id, never the code string.
	const [spellId, setSpellId] = React.useState<number | "">("");

	// Bump a counter when a doff/jugar is saved so the grids re-fetch.
	const [doffSignal, setDoffSignal] = React.useState(0);
	const [jugarSignal, setJugarSignal] = React.useState(0);

	const { setup: doffSetup, loading: setupLoading, error: setupError } = useWindingDoffSetup(
		coId,
		branchId,
	);
	const { setup: jugarSetup } = useJugarSetup(coId, branchId);

	// Default the shared spell selector to the first available spell once setup loads.
	React.useEffect(() => {
		if (doffSetup && doffSetup.spells.length > 0 && spellId === "") {
			setSpellId(doffSetup.spells[0].spell_id);
		}
	}, [doffSetup, spellId]);

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
				Winding Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Doff entry, spindle jugar (open/close) and daily quality assignment.
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
				<Alert severity="info">Select a branch to load winding data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !doffSetup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : doffSetup.workers.length === 0 ? (
						<Alert severity="info">
							No workers found for this branch.
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
									<Tab label="Jugar" />
									<Tab label="Quality" />
									<Tab label="Winder Wise Production" />
								</Tabs>
							</Box>

							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<TextField
									type="date"
									size="small"
									label="Date"
									value={tranDate}
									onChange={(e) => setTranDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
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
									{doffSetup.spells.map((s) => (
										<MenuItem key={s.spell_id} value={s.spell_id}>
											{s.spell_code} ({Number(s.working_hours)} hrs)
										</MenuItem>
									))}
								</TextField>
							</Box>

							{tab === 0 ? (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
									<DoffForm
										coId={coId}
										branchId={branchId}
										setup={doffSetup}
										date={tranDate}
										spellId={spellId === "" ? null : spellId}
										onSaved={() => setDoffSignal((s) => s + 1)}
									/>
									<DoffGrid
										coId={coId}
										branchId={branchId}
										date={tranDate}
										spellId={spellId === "" ? null : spellId}
										refreshSignal={doffSignal}
										onChanged={() => setDoffSignal((s) => s + 1)}
									/>
								</Box>
							) : null}

							{tab === 1 ? (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
									{jugarSetup ? (
										<JugarForm
											coId={coId}
											branchId={branchId}
											setup={jugarSetup}
											date={tranDate}
											spellId={spellId === "" ? null : spellId}
											onSaved={() => setJugarSignal((s) => s + 1)}
										/>
									) : (
										<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
											<CircularProgress />
										</Box>
									)}
									<JugarGrid
										coId={coId}
										branchId={branchId}
										date={tranDate}
										spellId={spellId === "" ? null : spellId}
										refreshSignal={jugarSignal}
									/>
								</Box>
							) : null}

							{tab === 2 ? (
								<QualityGrid
									coId={coId}
									branchId={branchId}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									yarnItems={doffSetup.yarn_items}
								/>
							) : null}

							{tab === 3 ? (
								<WinderWiseGrid
									coId={coId}
									branchId={branchId}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									refreshSignal={doffSignal}
								/>
							) : null}
						</>
					)}
				</Box>
			)}
		</Box>
	);
}
