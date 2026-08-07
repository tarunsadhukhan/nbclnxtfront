"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	Box,
	Snackbar,
	Alert,
	IconButton,
	Typography,
	CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm, MuiFormMode } from "@/components/ui/muiform";
import type { Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Props for CreateYarnType dialog component
 */
type Props = {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback to close the dialog */
	onClose: () => void;
	/** Callback after successful save (create or edit) */
	onSaved?: () => void;
	/** ID of the yarn type to edit/view. If undefined, opens in create mode */
	editId?: number | string;
	/** Initial mode for the form */
	initialMode?: MuiFormMode;
};

/**
 * @component CreateYarnType
 * @description Dialog component for creating, editing, or viewing yarn type records.
 * Supports mode switching between view and edit.
 *
 * @example
 * <CreateYarnType
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateYarnType({
	open,
	onClose,
	onSaved,
	editId,
	initialMode = "create",
}: Props) {
	const [loadingSetup, setLoadingSetup] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>(initialMode);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	// Form state
	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	/**
	 * Get company ID from localStorage
	 */
	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	/**
	 * Load setup data from API
	 */
	const loadSetup = useCallback(async () => {
		setLoadingSetup(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			if (editId !== undefined) {
				// Edit/View mode - get existing details
				const url = `${apiRoutesPortalMasters.YARN_TYPE_EDIT_SETUP}/${editId}?co_id=${co_id}`;
				const { data, error } = await fetchWithCookie(url, "GET");

				if (error || !data) {
					throw new Error(error || "Failed to load setup data");
				}

				// Set initial values from existing record
				if (data.yarn_type_details) {
					const details = data.yarn_type_details;
					setInitialValues({
						item_grp_name: details.item_grp_name ?? "",
						item_grp_code: details.item_grp_code ?? "",
					});
				}
			} else {
				// Create mode - empty initial values
				setInitialValues({
					item_grp_name: "",
					item_grp_code: "",
				});
			}

			// Bump form key to re-render form with new initial values
			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, getCoId]);

	// Reset mode and load setup when dialog opens
	useEffect(() => {
		if (open) {
			// Set mode based on whether we're editing/viewing or creating
			if (editId !== undefined) {
				setMode(initialMode === "create" ? "edit" : initialMode);
			} else {
				setMode("create");
			}
			loadSetup();
		} else {
			// Reset state when dialog closes
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, initialMode, loadSetup]);

	/**
	 * Generate form schema based on mode
	 */
	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined
					? mode === "view"
						? "View Yarn Type"
						: "Edit Yarn Type"
					: "Create Yarn Type",
			fields: [
				{
					name: "item_grp_code",
					label: "Yarn Type Code",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12 },
				},
				{
					name: "item_grp_name",
					label: "Yarn Type Name",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12 },
				},
			],
		}),
		[editId, mode]
	);

	/**
	 * Handle form submission
	 */
	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				...values,
				co_id,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				// Edit mode
				url = `${apiRoutesPortalMasters.YARN_TYPE_EDIT}/${editId}?co_id=${co_id}`;
				method = "PUT";
			} else {
				// Create mode
				url = `${apiRoutesPortalMasters.YARN_TYPE_CREATE}?co_id=${co_id}`;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);

			if (error) {
				throw new Error(error);
			}

			setSnackbar({
				open: true,
				message:
					editId !== undefined ? "Yarn type updated successfully" : "Yarn type created successfully",
				severity: "success",
			});

			onSaved?.();
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Save failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Handle mode change (view -> edit)
	 */
	const handleModeChange = (newMode: MuiFormMode) => {
		setMode(newMode);
	};

	/**
	 * Dialog title based on mode
	 */
	const dialogTitle = useMemo(() => {
		if (editId !== undefined) {
			return mode === "view" ? "View Yarn Type" : "Edit Yarn Type";
		}
		return "Create Yarn Type";
	}, [editId, mode]);

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="sm"
				PaperProps={{
					sx: { borderRadius: 2 },
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						pb: 1,
					}}
				>
					<Typography variant="h6" component="span">
						{dialogTitle}
					</Typography>
					<IconButton onClick={onClose} size="small" aria-label="Close dialog">
						<X size={20} />
					</IconButton>
				</DialogTitle>

				<DialogContent dividers>
					{loadingSetup ? (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								minHeight: 200,
							}}
						>
							<CircularProgress />
						</Box>
					) : (
						<Box sx={{ pt: 1 }}>
							<MuiForm
								key={formKey}
								schema={schema}
								mode={mode}
								initialValues={initialValues}
								onSubmit={handleSubmit}
								onModeChange={handleModeChange}
								submitLabel={saving ? "Saving..." : "Save"}
								cancelLabel="Cancel"
								onCancel={onClose}
								hideModeToggle={mode === "create"}
							/>
						</Box>
					)}
				</DialogContent>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
}
