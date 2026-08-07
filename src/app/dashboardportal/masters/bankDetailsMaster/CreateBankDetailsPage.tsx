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

export default function CreateBankDetailsPage({
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

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const loadSetup = useCallback(async () => {
		setLoadingSetup(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.BANK_DETAILS_BY_ID}/${editId}?co_id=${co_id}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load bank details");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					bank_name: rec.bank_name ?? "",
					bank_branch: rec.bank_branch ?? "",
					acc_no: rec.acc_no ?? "",
					ifsc_code: rec.ifsc_code ?? "",
					mcr_code: rec.mcr_code ?? "",
					swift_code: rec.swift_code ?? "",
				});
			} else {
				setInitialValues({
					bank_name: "",
					bank_branch: "",
					acc_no: "",
					ifsc_code: "",
					mcr_code: "",
					swift_code: "",
				});
			}

			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, getCoId]);

	useEffect(() => {
		if (open) {
			if (editId !== undefined) {
				setMode(initialMode === "create" ? "edit" : initialMode);
			} else {
				setMode("create");
			}
			loadSetup();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, initialMode, loadSetup]);

	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined
					? mode === "view"
						? "View Bank Details"
						: "Edit Bank Details"
					: "Create Bank Details",
			fields: [
				{
					name: "bank_name",
					label: "Bank Name",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "bank_branch",
					label: "Bank Branch",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "acc_no",
					label: "A/C No.",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "ifsc_code",
					label: "IFSC Code",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "mcr_code",
					label: "MCR Code",
					type: "text",
					required: false,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "swift_code",
					label: "SWIFT Code",
					type: "text",
					required: false,
					disabled: mode === "view",
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, mode]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			const payload = {
				bank_name: values.bank_name,
				bank_branch: values.bank_branch,
				acc_no: values.acc_no,
				ifsc_code: values.ifsc_code,
				mcr_code: values.mcr_code || null,
				swift_code: values.swift_code || null,
				co_id: co_id,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.BANK_DETAILS_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.BANK_DETAILS_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Bank details updated successfully"
						: "Bank details created successfully",
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

	const dialogTitle = useMemo(() => {
		if (editId !== undefined) {
			return mode === "view" ? "View Bank Details" : "Edit Bank Details";
		}
		return "Create Bank Details";
	}, [editId, mode]);

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
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
}
