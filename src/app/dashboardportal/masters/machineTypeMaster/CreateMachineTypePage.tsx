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
import { MuiForm } from "@/components/ui/muiform";
import type { MuiFormMode, Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
	initialMode?: MuiFormMode;
};

export default function CreateMachineTypePage({
	open,
	onClose,
	onSaved,
	editId,
	initialMode = "create",
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>(initialMode);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	const loadDetail = useCallback(async () => {
		if (editId === undefined) {
			setInitialValues({ machine_type_name: "", active: "1" });
			setFormKey((prev) => prev + 1);
			return;
		}

		setLoading(true);
		try {
			const detailUrl = `${apiRoutesPortalMasters.MACHINE_TYPE_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
			if (detailErr || !detailData) throw new Error(detailErr || "Failed to load machine type");

			const rec = detailData.data ?? detailData;
			setInitialValues({
				machine_type_name: rec.machine_type_name ?? "",
				active: String(rec.active ?? 1),
			});
			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId]);

	useEffect(() => {
		if (open) {
			setMode(editId !== undefined ? "edit" : "create");
			loadDetail();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadDetail]);

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Machine Type" : "Create Machine Type",
			fields: [
				{
					name: "machine_type_name",
					label: "Machine Type Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "active",
					label: "Status",
					type: "select",
					required: true,
					grid: { xs: 12, sm: 6 },
					options: [
						{ label: "Active", value: "1" },
						{ label: "Inactive", value: "0" },
					],
				},
			],
		}),
		[editId]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				machine_type_name: values.machine_type_name,
				active: Number(values.active ?? 1),
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.MACHINE_TYPE_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.MACHINE_TYPE_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Machine type updated successfully"
						: "Machine type created successfully",
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

	const dialogTitle = editId !== undefined ? "Edit Machine Type" : "Create Machine Type";

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 2 } }}
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
					{loading ? (
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
							submitLabel={saving ? "Saving..." : "Save"}
							cancelLabel="Cancel"
							onCancel={onClose}
							hideModeToggle
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
