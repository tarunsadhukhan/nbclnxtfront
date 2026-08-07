"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	Paper,
	Snackbar,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type IsoMapRow = {
	iso_map_id: number;
	co_id: number;
	menu_id: number;
	menu_name?: string | null;
	iso_doc_no: string;
};

type MenuOption = {
	menu_id: number;
	menu_name: string;
};

/**
 * ISO Document No. master — maps each document type (portal menu) to the
 * company's ISO document number. Documents whose type is mapped show the
 * number in their header/print; unmapped types stay blank (decision Q2/Q7).
 */
export default function IsoDocMapPage() {
	const { selectedCompany } = useSidebarContext();
	const coId = selectedCompany?.co_id ?? null;

	const [rows, setRows] = React.useState<IsoMapRow[]>([]);
	const [menus, setMenus] = React.useState<MenuOption[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [toast, setToast] = React.useState<string | null>(null);
	const [search, setSearch] = React.useState("");

	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [editRow, setEditRow] = React.useState<IsoMapRow | null>(null);
	const [formMenu, setFormMenu] = React.useState<MenuOption | null>(null);
	const [formIsoNo, setFormIsoNo] = React.useState("");
	const [saving, setSaving] = React.useState(false);

	const load = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		setErrorMessage(null);
		try {
			const query = new URLSearchParams({ co_id: String(coId) });
			if (search.trim()) query.set("search", search.trim());
			const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.ISO_MAP_TABLE}?${query.toString()}`, "GET");
			if (error) throw new Error(error);
			const payload = data as { data?: IsoMapRow[]; master?: MenuOption[] };
			setRows(payload?.data ?? []);
			setMenus(payload?.master ?? []);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load ISO document map");
		} finally {
			setLoading(false);
		}
	}, [coId, search]);

	React.useEffect(() => {
		load();
	}, [load]);

	const openCreate = React.useCallback(() => {
		setEditRow(null);
		setFormMenu(null);
		setFormIsoNo("");
		setDialogOpen(true);
	}, []);

	const openEdit = React.useCallback(
		(row: IsoMapRow) => {
			setEditRow(row);
			setFormMenu(menus.find((m) => m.menu_id === row.menu_id) ?? { menu_id: row.menu_id, menu_name: row.menu_name ?? "" });
			setFormIsoNo(row.iso_doc_no);
			setDialogOpen(true);
		},
		[menus]
	);

	const handleSave = React.useCallback(async () => {
		if (!coId || !formMenu) {
			setErrorMessage("Choose the document type (menu)");
			return;
		}
		const trimmed = formIsoNo.trim();
		if (trimmed.length > 50) {
			setErrorMessage("ISO document number must be at most 50 characters");
			return;
		}
		setSaving(true);
		try {
			const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.ISO_MAP_SAVE, "POST", {
				co_id: coId,
				menu_id: formMenu.menu_id,
				iso_doc_no: trimmed,
			});
			if (error) throw new Error(error);
			setToast((data as { message?: string })?.message ?? "Saved");
			setDialogOpen(false);
			await load();
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}, [coId, formMenu, formIsoNo, load]);

	const handleDelete = React.useCallback(
		async (row: IsoMapRow) => {
			try {
				const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.ISO_MAP_DELETE, "POST", {
					iso_map_id: row.iso_map_id,
				});
				if (error) throw new Error(error);
				setToast((data as { message?: string })?.message ?? "Mapping removed — the document header goes back to blank");
				await load();
			} catch (err) {
				setErrorMessage(err instanceof Error ? err.message : "Failed to remove mapping");
			}
		},
		[load]
	);

	if (!coId) {
		return (
			<Alert severity="info" sx={{ m: 3 }}>
				Select a company from the sidebar to manage its ISO document numbers.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						ISO Document Numbers
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Map each document type to the company&apos;s ISO document number. Mapped types show the number on the
						document; unmapped types stay blank.
					</Typography>
				</Box>
				<Stack direction="row" spacing={1}>
					<Button size="small" variant="outlined" startIcon={<RefreshCw size={16} />} onClick={load} disabled={loading}>
						Refresh
					</Button>
					<Button size="small" variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>
						Add Mapping
					</Button>
				</Stack>
			</Stack>

			{errorMessage ? (
				<Alert severity="error" onClose={() => setErrorMessage(null)}>
					{errorMessage}
				</Alert>
			) : null}

			<TextField
				size="small"
				placeholder="Search by document type or ISO number"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				sx={{ maxWidth: 360 }}
			/>

			<Paper variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Document Type (Menu)</TableCell>
							<TableCell>ISO Document No.</TableCell>
							<TableCell align="right" sx={{ width: 120 }}>
								Actions
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{!loading && rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										No ISO numbers mapped yet for this company.
									</Typography>
								</TableCell>
							</TableRow>
						) : null}
						{rows.map((row) => (
							<TableRow key={row.iso_map_id} hover>
								<TableCell>{row.menu_name || `Menu #${row.menu_id}`}</TableCell>
								<TableCell>
									<Typography variant="body2" fontWeight={600}>
										{row.iso_doc_no}
									</Typography>
								</TableCell>
								<TableCell align="right">
									<IconButton size="small" onClick={() => openEdit(row)}>
										<Pencil size={16} />
									</IconButton>
									<IconButton size="small" color="error" onClick={() => handleDelete(row)}>
										<Trash2 size={16} />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Paper>

			<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>{editRow ? "Edit ISO Mapping" : "Add ISO Mapping"}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
					<Autocomplete
						size="small"
						options={menus}
						getOptionLabel={(option) => option.menu_name}
						value={formMenu}
						onChange={(_, value) => setFormMenu(value)}
						disabled={Boolean(editRow)}
						renderInput={(params) => <TextField {...params} label="Document type (menu)" />}
					/>
					<TextField
						label="ISO document number"
						size="small"
						value={formIsoNo}
						onChange={(e) => setFormIsoNo(e.target.value)}
						helperText="Leave empty and save to clear the mapping"
						inputProps={{ maxLength: 50 }}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialogOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleSave} disabled={saving}>
						{saving ? "Saving…" : "Save"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={Boolean(toast)}
				autoHideDuration={3500}
				onClose={() => setToast(null)}
				message={toast ?? ""}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			/>
		</Box>
	);
}
