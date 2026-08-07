"use client";

// Doff Data Editor (spec 5.8) — access-controlled corrections page replacing
// direct-DB edits for mid-shift quality/person changes. Reachable only via its
// own menu entry (menu_mst + role_menu_map); no extra FE gating needed.

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Chip,
	CircularProgress,
	IconButton,
	MenuItem,
	Snackbar,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Pencil as EditIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import SpinningProcessBar from "../spinning/_components/SpinningProcessBar";
import { useSpinningSetup } from "../spinning/hooks/useSpinningSetup";
import { useDoffEntriesByDate } from "../spinning/hooks/useDoffEntriesByDate";
import type { DoffEntryRow, YarnItemOption } from "../spinning/types/spinningTypes";
import { todayISO } from "../spinning/utils/spinningCalc";
import DoffEditDialog, { type WorkerOption } from "./_components/DoffEditDialog";

type EditorSetup = { yarn_items: YarnItemOption[]; workers: WorkerOption[] };

const sourceChip = (source: string | null) =>
	source ? (
		<Chip
			size="small"
			variant="outlined"
			color={source === "manual" ? "info" : "default"}
			label={source}
		/>
	) : null;

export default function DoffDataEditorPage() {
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

	const [tranDate, setTranDate] = React.useState<string>(todayISO());
	// Selected spell_id from setup.spells (branch-correct); payloads send spell_id.
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [machineId, setMachineId] = React.useState<number | null>(null);
	const [editRow, setEditRow] = React.useState<DoffEntryRow | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// statusKey: any row save bumps the SpinningProcessBar so it flips to
	// "reprocess needed" immediately. dataKey: grid re-fetch (save / Process).
	const [statusKey, setStatusKey] = React.useState(0);
	const [dataKey, setDataKey] = React.useState(0);

	// Spells / machines / trollies (same setup the spinning page uses).
	const { setup, loading: setupLoading, error: setupError } = useSpinningSetup(coId, branchId);

	React.useEffect(() => {
		if (setup && setup.spells.length > 0 && spellId === "") {
			setSpellId(setup.spells[0].spell_id);
		}
	}, [setup, spellId]);

	// Editor setup: yarn items + active branch workers for the edit dialog.
	const [editorSetup, setEditorSetup] = React.useState<EditorSetup | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setEditorSetup(null);
			return;
		}
		let cancelled = false;
		const url = `${apiRoutesPortalMasters.SPINNING_DOFF_EDITOR_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: EditorSetup }>(url, "GET").then(({ data, error: err }) => {
			if (cancelled) return;
			if (err) setSnack(err);
			setEditorSetup(data?.data ?? null);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	const { rows, loading, error } = useDoffEntriesByDate(
		coId,
		tranDate,
		branchId,
		spellId === "" ? null : spellId,
		machineId,
		dataKey
	);

	const columns = React.useMemo<GridColDef<DoffEntryRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Edit (audited correction)">
						<IconButton size="small" onClick={() => setEditRow(params.row)}>
							<EditIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "daily_doff_tbl_id", headerName: "ID", width: 70 },
			{ field: "mech_code", headerName: "Mc Code", width: 100 },
			{ field: "machine_name", headerName: "Machine", width: 160 },
			{ field: "trolly_name", headerName: "Trolly", width: 120 },
			{
				field: "item_name",
				headerName: "Yarn",
				width: 170,
				valueGetter: (_v, row) => row.item_name ?? row.item_code ?? "",
			},
			// eb_name arrives as "E1234 - Ramesh Das" — server-concatenated.
			{ field: "eb_name", headerName: "Operator", width: 180 },
			{ field: "gross_weight", headerName: "Gross", width: 85, type: "number" },
			{ field: "tare_weight", headerName: "Tare", width: 85, type: "number" },
			{ field: "net_weight", headerName: "Net", width: 85, type: "number" },
			{
				field: "sources",
				headerName: "Source",
				width: 150,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box sx={{ display: "flex", gap: 0.5, alignItems: "center", height: "100%" }}>
						{sourceChip(params.row.item_source)}
						{sourceChip(params.row.eb_source)}
					</Box>
				),
			},
			{
				field: "active",
				headerName: "Active",
				width: 80,
				sortable: false,
				filterable: false,
				// Endpoint only serves active rows; render from the row when the
				// backend adds the field, default to active meanwhile.
				renderCell: (params) => {
					const active = (params.row as { active?: number | null }).active ?? 1;
					return (
						<Chip
							size="small"
							variant="outlined"
							color={active ? "success" : "default"}
							label={active ? "Yes" : "No"}
						/>
					);
				},
			},
		],
		[]
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
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Doff Data Editor
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Audited corrections to doff entries (mid-shift quality / operator changes). Edits are
				stamped &quot;manual&quot; and protected from sync.
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
				<Alert severity="info">Select a branch to load doff data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<>
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
									{setup.spells.map((s) => (
										<MenuItem key={s.spell_id} value={s.spell_id}>
											{s.spell_code} ({Number(s.working_hours)} hrs)
										</MenuItem>
									))}
								</TextField>
								<Autocomplete
									options={setup.machines}
									getOptionLabel={(m) => `${m.mech_code} — ${m.machine_name}`}
									value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
									onChange={(_, v) => setMachineId(v ? v.machine_id : null)}
									isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
									renderOption={(props, m) => (
										<li {...props} key={m.machine_id}>
											{m.mech_code} — {m.machine_name}
										</li>
									)}
									size="small"
									sx={{ minWidth: 240 }}
									renderInput={(params) => <TextField {...params} label="Machine (all)" />}
								/>
							</Box>

							{/* Re-run Calculation = the Process/Re-process button on this bar. */}
							<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
								<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
									<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
										Re-run Calculation
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Editing rows marks the processed data stale. Re-process to fix the
										production table.
									</Typography>
								</Box>
								<SpinningProcessBar
									coId={coId}
									branchId={branchId}
									date={tranDate}
									spellId={spellId === "" ? null : spellId}
									refreshKey={statusKey}
									onProcessed={() => setDataKey((k) => k + 1)}
								/>
							</Box>

							{error ? <Alert severity="error">{error}</Alert> : null}
							<Box sx={{ width: "100%" }}>
								<DataGrid
									autoHeight
									rows={rows}
									getRowId={(r) => r.daily_doff_tbl_id}
									columns={columns}
									loading={loading}
									disableRowSelectionOnClick
									density="compact"
									pageSizeOptions={[25, 50, 100]}
									initialState={{
										pagination: { paginationModel: { pageSize: 50, page: 0 } },
									}}
									sx={{ width: "100%" }}
								/>
							</Box>
						</>
					)}
				</Box>
			)}

			{editRow ? (
				<DoffEditDialog
					row={editRow}
					coId={coId}
					yarnItems={editorSetup?.yarn_items ?? setup?.yarn_items ?? []}
					workers={editorSetup?.workers ?? []}
					trollies={setup?.trollies ?? []}
					onClose={() => setEditRow(null)}
					onSaved={() => {
						setEditRow(null);
						setStatusKey((k) => k + 1); // bar flips to "reprocess needed" now
						setDataKey((k) => k + 1); // grid re-fetch
						setSnack("Saved. Re-process to update the production table.");
					}}
				/>
			) : null}

			<Snackbar
				open={!!snack}
				autoHideDuration={4000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
