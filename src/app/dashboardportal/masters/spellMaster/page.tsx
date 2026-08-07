"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateSpellPage from "./CreateSpellPage";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type SpellRow = {
	id: number | string;
	spell_id: number;
	spell_name: string;
	spell_code: string;
	shift_name: string;
	branch_name: string;
	starting_time: string;
	end_time: string;
	working_hours: number;
	[key: string]: unknown;
};

export default function SpellMasterPage() {
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = useState<SpellRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

	const fetchSpells = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			if (selectedBranches.length > 0) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.SPELL_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch spells");
			}

			const mapped: SpellRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.spell_id as number,
					spell_id: r.spell_id as number,
					spell_name: (r.spell_name as string) ?? "",
					spell_code: (r.spell_code as string) ?? "",
					shift_name: (r.shift_name as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
					starting_time: (r.starting_time as string) ?? "",
					end_time: (r.end_time as string) ?? "",
					working_hours: (r.working_hours as number) ?? 0,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching spells";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

	useEffect(() => {
		fetchSpells();
	}, [fetchSpells]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: SpellRow) => {
		setSelectedId(row.spell_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchSpells();
	}, [fetchSpells]);

	const columns = useMemo<GridColDef<SpellRow>[]>(
		() => [
			{
				field: "spell_code",
				headerName: "Spell Code",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "spell_name",
				headerName: "Spell Name",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "shift_name",
				headerName: "Shift",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "starting_time",
				headerName: "Start Time",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "end_time",
				headerName: "End Time",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "working_hours",
				headerName: "Working Hours",
				flex: 1,
				minWidth: 120,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Spell Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search by spell name or code",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Spell",
				onClick: handleCreate,
			}}
			onView={handleEdit}
			onEdit={handleEdit}
		>
			<CreateSpellPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={handleSnackbarClose}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
