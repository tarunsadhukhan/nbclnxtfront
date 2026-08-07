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

/** Dropdown option shape */
type Option = { label: string; value: string };

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
};

/** Static dropdown options matching the legacy CreateDesignation.js */
const TIME_PIECE_OPTIONS: Option[] = [
	{ label: "Time", value: "Time" },
	{ label: "Piece", value: "Piece" },
];

const DIRECT_INDIRECT_OPTIONS: Option[] = [
	{ label: "Direct", value: "D" },
	{ label: "Indirect", value: "I" },
];

const ON_MACHINE_OPTIONS: Option[] = [
	{ label: "Yes", value: "Yes" },
	{ label: "No", value: "No" },
];

const PIECE_RATE_TYPE_OPTIONS: Option[] = [
	{ label: "Time", value: "1" },
	{ label: "Piece", value: "2" },
];

export default function CreateDesignationPage({
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
	const [deptOptions, setDeptOptions] = useState<Option[]>([]);
	const [branchOptions, setBranchOptions] = useState<Option[]>([]);
	const [machineTypeOptions, setMachineTypeOptions] = useState<Option[]>([]);

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

			// Fetch setup data (departments + branches)
			const branchParam = selectedBranches.length > 0 ? `&branch_id=${selectedBranches[0]}` : "";
			const setupUrl = `${apiRoutesPortalMasters.DESIGNATION_CREATE_SETUP}?co_id=${co_id}${branchParam}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(setupUrl, "GET");
			if (setupErr || !setupData) throw new Error(setupErr || "Failed to load setup");

			const depts: Option[] = (setupData.departments || []).map(
				(d: Record<string, unknown>) => ({
					label: String(d.dept_desc ?? ""),
					value: String(d.dept_id ?? ""),
				})
			);
			const branches: Option[] = (setupData.branches || []).map(
				(b: Record<string, unknown>) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				})
			);
			const machineTypes: Option[] = (setupData.machine_types || []).map(
				(m: Record<string, unknown>) => ({
					label: String(m.machine_type_name ?? ""),
					value: String(m.machine_type_id ?? ""),
				})
			);
			setDeptOptions(depts);
			// Filter branches to only the sidebar-selected branch
			const selectedBranchSet = new Set(selectedBranches.map(String));
			const filteredBranches = selectedBranchSet.size > 0
				? branches.filter((b) => selectedBranchSet.has(b.value))
				: branches;
			setBranchOptions(filteredBranches);
			setMachineTypeOptions(machineTypes);

			if (editId !== undefined) {
				// Edit/View — load record
				const detailUrl = `${apiRoutesPortalMasters.DESIGNATION_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load designation");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					desig: rec.desig ?? "",
					dept_id: rec.dept_id != null ? String(rec.dept_id) : "",
					branch_id: rec.branch_id != null ? String(rec.branch_id) : "",
					norms: rec.norms ?? "",
					time_piece: rec.time_piece ?? "",
					direct_indirect: rec.direct_indirect ?? "",
					on_machine: rec.on_machine ?? "",
					machine_type: rec.machine_type ?? "",
					no_of_machines: rec.no_of_machines ?? "",
					cost_code: rec.cost_code ?? "",
					cost_description: rec.cost_description ?? "",
					piece_rate_type: rec.piece_rate_type ?? "",
				});
			} else {
				setInitialValues({
					desig: "",
					dept_id: "",
					branch_id: filteredBranches.length > 0 ? filteredBranches[0].value : "",
					norms: "",
					time_piece: "",
					direct_indirect: "",
					on_machine: "",
					machine_type: "",
					no_of_machines: "",
					cost_code: "",
					cost_description: "",
					piece_rate_type: "",
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
					? "Edit Designation"
					: "Create Designation",
			fields: [
				{
					name: "desig",
					label: "Designation Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "dept_id",
					label: "Department",
					type: "select",
					required: true,
					options: deptOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "branch_id",
					label: "Branch",
					type: "select",
					required: true,
					options: branchOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "time_piece",
					label: "Time/Piece",
					type: "select",
					required: true,
					options: TIME_PIECE_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "norms",
					label: "Norms",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "machine_type",
					label: "Machine Type",
					type: "select",
					options: machineTypeOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "direct_indirect",
					label: "Direct/Indirect",
					type: "select",
					required: true,
					options: DIRECT_INDIRECT_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "on_machine",
					label: "On Machine",
					type: "select",
					required: true,
					options: ON_MACHINE_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "no_of_machines",
					label: "No. of Machines",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "cost_code",
					label: "Cost Code",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "cost_description",
					label: "Cost Description",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "piece_rate_type",
					label: "Piece Rate Type",
					type: "select",
					required: true,
					options: PIECE_RATE_TYPE_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, deptOptions, branchOptions, machineTypeOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				desig: values.desig,
				dept_id: values.dept_id,
				branch_id: values.branch_id || null,
				norms: values.norms || null,
				time_piece: values.time_piece || null,
				direct_indirect: values.direct_indirect || null,
				on_machine: values.on_machine || null,
				machine_type: values.machine_type || null,
				no_of_machines: values.no_of_machines || null,
				cost_code: values.cost_code || null,
				cost_description: values.cost_description || null,
				piece_rate_type: values.piece_rate_type || null,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.DESIGNATION_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.DESIGNATION_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Designation updated successfully"
						: "Designation created successfully",
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
			return "Edit Designation";
		}
		return "Create Designation";
	}, [editId]);

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
