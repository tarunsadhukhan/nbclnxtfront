"use client";

import * as React from "react";
import Link from "next/link";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import { ArrowLeft } from "lucide-react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useFinishingSetup } from "../hooks/useFinishingSetup";
import FinishingEntryForm from "./FinishingEntryForm";
import DailyFinishingGrid from "./DailyFinishingGrid";
import type { FinishingEntryRow, FinishingProcess } from "../types/finishingTypes";
import { FINISHING_PROCESS_CONFIG, todayISO } from "../_shared/finishingConfig";

type Props = {
	process: FinishingProcess;
};

/**
 * Reusable Finishing daily-entry container for a single sub-process.
 *
 * Honors the SidebarContext company/branch selection on every call, defaults the
 * header date/spell from the sidebar + setup, and shows the day's entries. The
 * user captures only the production figure per spell x machine x quality.
 */
export default function FinishingEntry({ process }: Props) {
	const config = FINISHING_PROCESS_CONFIG[process];

	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

	// Branch resolution: 1 sidebar branch -> auto-use it; several -> user picks one.
	const sidebarBranchIds = React.useMemo(
		() => selectedBranches.map(Number),
		[selectedBranches]
	);
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

	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	const [spell, setSpell] = React.useState<string>("");

	const [editingEntry, setEditingEntry] = React.useState<FinishingEntryRow | null>(null);
	// Bumped after each successful save so the day grid below auto-refetches.
	const [entriesRefresh, setEntriesRefresh] = React.useState(0);

	const { setup, loading: setupLoading, error: setupError } = useFinishingSetup(
		coId,
		process,
		branchId
	);

	// Default the spell selector to the first available spell once setup loads.
	React.useEffect(() => {
		if (setup && setup.spells.length > 0 && !spell) {
			setSpell(setup.spells[0].spell_code);
		}
	}, [setup, spell]);

	// Resolve the numeric spell_id from the spell_code selector — the backend
	// filters on `spell_id` (int), not the spell_code string.
	const spellId = React.useMemo(
		() => setup?.spells.find((s) => s.spell_code === spell)?.spell_id ?? null,
		[setup, spell]
	);

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
			<Button
				component={Link}
				href="/dashboardportal/juteProduction/finishing"
				startIcon={<ArrowLeft size={18} />}
				size="small"
				sx={{ mb: 1 }}
			>
				Back to Finishing
			</Button>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				{config.title}
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				{config.subtitle}
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) =>
						setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))
					}
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
				<Alert severity="info">Select a branch to load {config.title} data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : !config.usesEmployee && setup.machines.length === 0 ? (
						<Alert severity="info">
							No machines found for this process/branch. Tag machines to the{" "}
							{config.title.replace(" Production", "")} machine type, then set their
							standards in the Finishing Spec Sheet.
						</Alert>
					) : (
						<>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2,
									flexWrap: "wrap",
								}}
							>
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
									value={spell}
									onChange={(e) => setSpell(e.target.value)}
									sx={{ minWidth: 160 }}
								>
									{setup.spells.map((s) => (
										<MenuItem key={s.spell_code} value={s.spell_code}>
											{s.spell_code} ({Number(s.working_hours)} hrs)
										</MenuItem>
									))}
								</TextField>
							</Box>

							<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
								<FinishingEntryForm
									coId={coId}
									branchId={branchId}
									process={process}
									config={config}
									setup={setup}
									date={tranDate}
									spellId={spellId}
									editingEntry={editingEntry}
									onSaved={() => {
										setEditingEntry(null);
										setEntriesRefresh((v) => v + 1);
									}}
									onCancelEdit={() => setEditingEntry(null)}
								/>
								<DailyFinishingGrid
									coId={coId}
									branchId={branchId}
									process={process}
									config={config}
									date={tranDate}
									spellId={spellId}
									refreshKey={entriesRefresh}
									onEdit={(row) => setEditingEntry(row)}
								/>
							</Box>
						</>
					)}
				</Box>
			)}
		</Box>
	);
}
