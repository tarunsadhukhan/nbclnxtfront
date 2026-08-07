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
};

export default function CreateCategoryPage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loadingSetup, setLoadingSetup] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>("create");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	// Setup dropdown options from API
	const [branchOptions, setBranchOptions] = useState<Option[]>([]);

	// Form state
	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
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

			const setupUrl = `${apiRoutesPortalMasters.CATEGORY_CREATE_SETUP}?co_id=${co_id}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(setupUrl, "GET");
			if (setupErr || !setupData) throw new Error(setupErr || "Failed to load setup");

			const branches: Option[] = (setupData.branches || []).map(
				(b: Record<string, unknown>) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				})
			);

			// Filter branches to only the sidebar-selected branch
			const selectedBranchSet = new Set(selectedBranches.map(String));
			const filteredBranches = selectedBranchSet.size > 0
				? branches.filter((b) => selectedBranchSet.has(b.value))
				: branches;
			setBranchOptions(filteredBranches);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.CATEGORY_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load category");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					cata_code: rec.cata_code ?? "",
					cata_desc: rec.cata_desc ?? "",
					branch_id: rec.branch_id != null ? String(rec.branch_id) : "",
				});
			} else {
				setInitialValues({
					cata_code: "",
					cata_desc: "",
					branch_id: filteredBranches.length > 0 ? filteredBranches[0].value : "",
				});
			}

			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, getCoId, selectedBranches]);

	useEffect(() => {
		if (open) {
			if (editId !== undefined) {
				setMode("edit");
			} else {
				setMode("create");
			}
			loadSetup();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadSetup]);

	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined
					? "Edit Category"
					: "Create Category",
			fields: [
				{
					name: "cata_code",
					label: "Category Code",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "cata_desc",
					label: "Category Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "branch_id",
					label: "Branch",
					type: "select",
					options: branchOptions,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, branchOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				cata_code: values.cata_code,
				cata_desc: values.cata_desc,
				branch_id: values.branch_id || null,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.CATEGORY_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.CATEGORY_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Category updated successfully"
						: "Category created successfully",
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

	const dialogTitle = useMemo(() => {
		if (editId !== undefined) {
			return "Edit Category";
		}
		return "Create Category";
	}, [editId]);

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
