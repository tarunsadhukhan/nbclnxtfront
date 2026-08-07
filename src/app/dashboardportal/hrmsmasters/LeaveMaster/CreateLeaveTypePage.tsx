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

const PAYABLE_OPTIONS: Option[] = [
	{ label: "Yes", value: "Y" },
	{ label: "No", value: "N" },
];

export default function CreateLeaveTypePage({
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

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const loadData = useCallback(async () => {
		if (editId === undefined) {
			setInitialValues({
				leave_type_code: "",
				leave_type_description: "",
				payable: "N",
				leave_hours: "",
			});
			setFormKey((prev) => prev + 1);
			return;
		}

		setLoading(true);
		try {
			const detailUrl = `${apiRoutesPortalMasters.LEAVE_TYPE_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
			if (detailErr || !detailData) throw new Error(detailErr || "Failed to load leave type");

			const rec = detailData.data ?? detailData;
			setInitialValues({
				leave_type_code: rec.leave_type_code ?? "",
				leave_type_description: rec.leave_type_description ?? "",
				payable: rec.payable ?? "N",
				leave_hours: rec.Leave_hours ?? "",
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
			title: editId !== undefined ? "Edit Leave Type" : "Create Leave Type",
			fields: [
				{
					name: "leave_type_code",
					label: "Leave Type Code",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "leave_type_description",
					label: "Leave Description",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "payable",
					label: "Payable",
					type: "select",
					required: true,
					options: PAYABLE_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "leave_hours",
					label: "Leave Hours",
					type: "number",
					required: false,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				co_id,
				leave_type_code: values.leave_type_code,
				leave_type_description: values.leave_type_description,
				payable: values.payable || "N",
				leave_hours: values.leave_hours || null,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.LEAVE_TYPE_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.LEAVE_TYPE_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Leave type updated successfully"
						: "Leave type created successfully",
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

	const handleModeChange = (newMode: MuiFormMode) => {
		setMode(newMode);
	};

	const dialogTitle = editId !== undefined ? "Edit Leave Type" : "Create Leave Type";

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
