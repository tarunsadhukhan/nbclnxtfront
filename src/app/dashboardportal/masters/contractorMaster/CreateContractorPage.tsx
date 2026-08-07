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
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Option = { label: string; value: string };

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
	initialMode?: MuiFormMode;
};

export default function CreateContractorPage({
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

	// Setup dropdown options from API
	const [branchOptions, setBranchOptions] = useState<Option[]>([]);

	// Form state
	const [initialValues, setInitialValues] = useState<Record<string, unknown>>(
		{}
	);
	const [formKey, setFormKey] = useState(0);

	const { selectedBranches } = useSidebarContext();

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const loadSetup = useCallback(async () => {
		setLoadingSetup(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const setupUrl = `${apiRoutesPortalMasters.CONTRACTOR_CREATE_SETUP}?co_id=${co_id}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(
				setupUrl,
				"GET"
			);
			if (setupErr || !setupData)
				throw new Error(setupErr || "Failed to load setup");

			const branches: Option[] = (setupData.branches || []).map(
				(b: Record<string, unknown>) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				})
			);

			// Filter branches to only the sidebar-selected branch
			const selectedBranchSet = new Set(selectedBranches.map(String));
			const filteredBranches =
				selectedBranchSet.size > 0
					? branches.filter((b) => selectedBranchSet.has(b.value))
					: branches;
			setBranchOptions(filteredBranches);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.CONTRACTOR_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(
					detailUrl,
					"GET"
				);
				if (detailErr || !detailData)
					throw new Error(detailErr || "Failed to load contractor");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					contractor_name: rec.contractor_name ?? "",
					address_1: rec.address_1 ?? "",
					address_2: rec.address_2 ?? "",
					address_3: rec.address_3 ?? "",
					phone_no: rec.phone_no ?? "",
					email_id: rec.email_id ?? "",
					pan_no: rec.pan_no ?? "",
					aadhar_no: rec.aadhar_no ?? "",
					pf_code: rec.pf_code ?? "",
					esi_code: rec.esi_code ?? "",
					bank_acc_no: rec.bank_acc_no ?? "",
					bank_name: rec.bank_name ?? "",
					ifsc_code: rec.ifsc_code ?? "",
					branch_id:
						rec.branch_id != null ? String(rec.branch_id) : "",
					date_of_registration: rec.date_of_registration ?? "",
					date_of_registration_mill:
						rec.date_of_registration_mill ?? "",
				});
			} else {
				setInitialValues({
					contractor_name: "",
					address_1: "",
					address_2: "",
					address_3: "",
					phone_no: "",
					email_id: "",
					pan_no: "",
					aadhar_no: "",
					pf_code: "",
					esi_code: "",
					bank_acc_no: "",
					bank_name: "",
					ifsc_code: "",
					branch_id:
						filteredBranches.length > 0
							? filteredBranches[0].value
							: "",
					date_of_registration: "",
					date_of_registration_mill: "",
				});
			}

			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, getCoId, selectedBranches]);

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

	const isDisabled = mode === "view";

	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined
					? mode === "view"
						? "View Contractor"
						: "Edit Contractor"
					: "Create Contractor",
			fields: [
				{
					name: "contractor_name",
					label: "Contractor Name",
					type: "text",
					required: true,
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "branch_id",
					label: "Branch",
					type: "select",
					disabled: isDisabled,
					options: branchOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "phone_no",
					label: "Phone No",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "email_id",
					label: "Email",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "address_1",
					label: "Address Line 1",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "address_2",
					label: "Address Line 2",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "address_3",
					label: "Address Line 3",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "pan_no",
					label: "PAN No",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "aadhar_no",
					label: "Aadhar No",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "pf_code",
					label: "PF Code",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "esi_code",
					label: "ESI Code",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "bank_acc_no",
					label: "Bank Account No",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "bank_name",
					label: "Bank Name",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "ifsc_code",
					label: "IFSC Code",
					type: "text",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "date_of_registration",
					label: "Date of Registration",
					type: "date",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "date_of_registration_mill",
					label: "Date of Registration (Mill)",
					type: "date",
					disabled: isDisabled,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, mode, isDisabled, branchOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				contractor_name: values.contractor_name,
				address_1: values.address_1 || null,
				address_2: values.address_2 || null,
				address_3: values.address_3 || null,
				phone_no: values.phone_no || null,
				email_id: values.email_id || null,
				pan_no: values.pan_no || null,
				aadhar_no: values.aadhar_no || null,
				pf_code: values.pf_code || null,
				esi_code: values.esi_code || null,
				bank_acc_no: values.bank_acc_no || null,
				bank_name: values.bank_name || null,
				ifsc_code: values.ifsc_code || null,
				branch_id: values.branch_id || null,
				date_of_registration: values.date_of_registration || null,
				date_of_registration_mill:
					values.date_of_registration_mill || null,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.CONTRACTOR_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.CONTRACTOR_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Contractor updated successfully"
						: "Contractor created successfully",
				severity: "success",
			});

			onSaved?.();
			onClose();
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Save failed";
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
			return mode === "view"
				? "View Contractor"
				: "Edit Contractor";
		}
		return "Create Contractor";
	}, [editId, mode]);

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="md"
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
					<IconButton
						onClick={onClose}
						size="small"
						aria-label="Close dialog"
					>
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
								submitLabel={
									saving ? "Saving..." : "Save"
								}
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
				onClose={() =>
					setSnackbar((prev) => ({ ...prev, open: false }))
				}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={() =>
						setSnackbar((prev) => ({ ...prev, open: false }))
					}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
}
