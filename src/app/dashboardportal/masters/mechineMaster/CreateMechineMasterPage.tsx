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

interface OptionItem {
	label: string;
	value: string;
}

type Props = {
	open: boolean;
	onClose: (saved?: boolean) => void;
	onSaved?: () => void;
	editId?: number | string;
	initialMode?: MuiFormMode;
};

export default function CreateMechineMasterPage({
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

	const [branchOptions, setBranchOptions] = useState<OptionItem[]>([]);
	const [allDepartments, setAllDepartments] = useState<{ id: string; label: string; branch_id: string }[]>([]);
	const [departmentOptions, setDepartmentOptions] = useState<OptionItem[]>([]);
	const [machineTypeOptions, setMachineTypeOptions] = useState<OptionItem[]>([]);
	const [lastBranchId, setLastBranchId] = useState<string>("");

	const getCoAndBranchParams = useCallback(() => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
		const sidebar_selectedBranches = localStorage.getItem("sidebar_selectedBranches");
		let branch_ids = "";
		if (sidebar_selectedBranches) {
			try {
				const parsed = JSON.parse(sidebar_selectedBranches);
				if (Array.isArray(parsed)) {
					const ids = parsed
						.map((b: Record<string, unknown>) => {
							if (b && typeof b === "object")
								return b.branch_id ?? b.id ?? b.value ?? "";
							if (b === 0) return "0";
							if (b) return String(b);
							return "";
						})
						.map(String)
						.filter(Boolean);
					branch_ids = ids.join(",");
				} else if (parsed) {
					branch_ids = String(parsed);
				}
			} catch {
				/* ignore */
			}
		}
		return { co_id, branch_ids };
	}, []);

	const loadSetupAndDetail = useCallback(async () => {
		setLoading(true);
		try {
			const { co_id, branch_ids } = getCoAndBranchParams();

			if (editId !== undefined) {
				const params = new URLSearchParams({ co_id, branch_id: branch_ids });
				const url = `${apiRoutesPortalMasters.MECHINE_MASTER_BY_ID}/${editId}?${params}`;
				const { data, error } = (await fetchWithCookie(url, "GET")) as {
					data: { data: Record<string, unknown>; master: Record<string, unknown[]> } | null;
					error: string | null;
				};
				if (error || !data) throw new Error(error || "Failed to load");

				const record = data.data;
				const master = data.master;

				const branches = (master.branchs || []) as Record<string, unknown>[];
				const depts = (master.departments || []) as Record<string, unknown>[];
				const types = (master.mechine_types || []) as Record<string, unknown>[];

				const brOpts = branches.map((b) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				}));
				const allDepts = depts.map((d) => ({
					id: String(d.dept_id ?? ""),
					label: String(d.dept_name ?? ""),
					branch_id: String(d.branch_id ?? ""),
				}));
				const typeOpts = types.map((t) => ({
					label: String(t.mechine_type ?? ""),
					value: String(t.id ?? ""),
				}));

				setBranchOptions(brOpts);
				setAllDepartments(allDepts);
				setMachineTypeOptions(typeOpts);

				const branchVal = String(record.branch_id ?? "");
				setLastBranchId(branchVal);
				const filteredDepts = branchVal
					? allDepts.filter((d) => d.branch_id === branchVal)
					: allDepts;
				setDepartmentOptions(
					filteredDepts.map((d) => ({ label: d.label, value: d.id }))
				);

				setInitialValues({
					branch_id: branchVal,
					dept_id: String(record.dept_id ?? ""),
					machine_type_id: String(record.machine_type_id ?? ""),
					machine_name: String(record.mechine_name ?? ""),
					mech_code: String(record.mechine_code ?? ""),
					remarks: String(record.remarks ?? ""),
					active: String(record.active ?? "1"),
					mech_posting_code: record.mech_posting_code != null ? String(record.mech_posting_code) : "",
				});
			} else {
				const params = new URLSearchParams({ co_id, branch_id: branch_ids });
				const url = `${apiRoutesPortalMasters.MECHINE_MASTER_CREATE_SETUP}?${params}`;
				const { data, error } = (await fetchWithCookie(url, "GET")) as {
					data: Record<string, unknown> | null;
					error: string | null;
				};
				if (error || !data) throw new Error(error || "Failed to load setup");

				const candidate = (data as Record<string, unknown>).data ?? data;
				const branches = ((candidate as Record<string, unknown[]>).branchs || []) as Record<string, unknown>[];
				const depts = ((candidate as Record<string, unknown[]>).departments || []) as Record<string, unknown>[];
				const types = ((candidate as Record<string, unknown[]>).mechine_types || []) as Record<string, unknown>[];

				const brOpts = branches.map((b) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				}));
				const allDepts = depts.map((d) => ({
					id: String(d.dept_id ?? ""),
					label: String(d.dept_name ?? ""),
					branch_id: String(d.branch_id ?? ""),
				}));
				const typeOpts = types.map((t) => ({
					label: String(t.mechine_type ?? ""),
					value: String(t.id ?? ""),
				}));

				setBranchOptions(brOpts);
				setAllDepartments(allDepts);
				setDepartmentOptions(allDepts.map((d) => ({ label: d.label, value: d.id })));
				setMachineTypeOptions(typeOpts);
				setLastBranchId(brOpts[0]?.value ?? "");

				setInitialValues({
					branch_id: brOpts[0]?.value ?? "",
					dept_id: "",
					machine_type_id: "",
					machine_name: "",
					mech_code: "",
					remarks: "",
					active: "1",
					mech_posting_code: "",
				});
			}

			setFormKey((k) => k + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId, getCoAndBranchParams]);

	useEffect(() => {
		if (open) {
			setMode(editId !== undefined ? "edit" : "create");
			loadSetupAndDetail();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadSetupAndDetail]);

	const handleValuesChange = useCallback(
		(values: Record<string, unknown>) => {
			const branchVal = String(values.branch_id ?? "");
			if (branchVal !== lastBranchId) {
				setLastBranchId(branchVal);
				const filtered = branchVal
					? allDepartments.filter((d) => d.branch_id === branchVal)
					: allDepartments;
				setDepartmentOptions(filtered.map((d) => ({ label: d.label, value: d.id })));
			}
		},
		[allDepartments, lastBranchId]
	);

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Machine" : "Create Machine",
			fields: [
				{
					name: "branch_id",
					label: "Branch",
					type: "select",
					required: true,
					grid: { xs: 12, sm: 6 },
					options: branchOptions,
				},
				{
					name: "dept_id",
					label: "Department",
					type: "select",
					required: true,
					grid: { xs: 12, sm: 6 },
					options: departmentOptions,
				},
				{
					name: "machine_name",
					label: "Machine Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "machine_type_id",
					label: "Machine Type",
					type: "select",
					required: true,
					grid: { xs: 12, sm: 6 },
					options: machineTypeOptions,
				},
				{
					name: "mech_code",
					label: "Machine Code",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "mech_posting_code",
					label: "Posting Code",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "remarks",
					label: "Remarks",
					type: "text",
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
		[editId, branchOptions, departmentOptions, machineTypeOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				branch_id: values.branch_id,
				dept_id: values.dept_id,
				mechine_name: values.machine_name,
				mechine_type_id: values.machine_type_id,
				mechine_code: values.mech_code,
				mechine_posting_code: values.mech_posting_code || null,
				remarks: values.remarks || null,
				active: Number(values.active ?? 1),
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.MECHINE_MASTER_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.MECHINE_MASTER_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Machine updated successfully"
						: "Machine created successfully",
				severity: "success",
			});

			onSaved?.();
			onClose(true);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Save failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	const dialogTitle = editId !== undefined ? "Edit Machine" : "Create Machine";

	const handleSnackbarClose = () =>
		setSnackbar((prev) => ({ ...prev, open: false }));

	return (
		<>
			<Dialog
				open={open}
				onClose={() => onClose()}
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
					<IconButton onClick={() => onClose()} size="small" aria-label="Close dialog">
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
								onValuesChange={handleValuesChange}
								submitLabel={saving ? "Saving..." : "Save"}
								cancelLabel="Cancel"
								onCancel={() => onClose()}
								hideModeToggle
							/>
						</Box>
					)}
				</DialogContent>
			</Dialog>

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
		</>
	);
}
