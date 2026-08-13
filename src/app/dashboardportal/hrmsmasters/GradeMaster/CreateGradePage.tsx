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

type Option = { label: string; value: string };

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
};

/** grade_type is stored as an int: 0 = Worker, 1 = Staff. */
const GRADE_TYPE_OPTIONS: Option[] = [
	{ label: "Worker", value: "0" },
	{ label: "Staff", value: "1" },
];

export default function CreateGradePage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>("create");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	const loadData = useCallback(async () => {
		if (editId === undefined) {
			setInitialValues({
				grade_code: "",
				grade_name: "",
				grade_type: "0",
			});
			setFormKey((prev) => prev + 1);
			return;
		}

		setLoading(true);
		try {
			const detailUrl = `${apiRoutesPortalMasters.GRADE_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
			if (detailErr || !detailData) throw new Error(detailErr || "Failed to load grade");

			const rec = detailData.data ?? detailData;
			setInitialValues({
				grade_code: rec.grade_code ?? "",
				grade_name: rec.grade_name ?? "",
				grade_type: String(rec.grade_type ?? 0),
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
			loadData();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadData]);

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Grade" : "Create Grade",
			fields: [
				{
					name: "grade_code",
					label: "Grade Code",
					type: "text",
					required: true,
					helperText: "Max 4 characters",
					// grade_code is varchar(4) in the DB — reject longer input before the round trip
					customValidate: (value) =>
						String(value ?? "").trim().length > 4
							? "Grade code cannot exceed 4 characters"
							: null,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "grade_name",
					label: "Grade Name",
					type: "text",
					required: true,
					customValidate: (value) =>
						String(value ?? "").trim().length > 100
							? "Grade name cannot exceed 100 characters"
							: null,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "grade_type",
					label: "Grade Type",
					type: "select",
					required: true,
					options: GRADE_TYPE_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				grade_code: String(values.grade_code ?? "").trim(),
				grade_name: String(values.grade_name ?? "").trim(),
				grade_type: Number(values.grade_type ?? 0),
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.GRADE_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.GRADE_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Grade updated successfully"
						: "Grade created successfully",
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

	const dialogTitle = editId !== undefined ? "Edit Grade" : "Create Grade";

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
