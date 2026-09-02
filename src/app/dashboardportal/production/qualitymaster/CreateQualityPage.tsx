"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	Box,
	Button,
	Chip,
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
	editId?: number;
};

// Standard status contract (instructions.md): 1 Open, 3 Approved, 4 Rejected.
// Legacy imported rows have status null — treated as Open.
const STATUS = { OPEN: 1, APPROVED: 3, REJECTED: 4 } as const;
type StatusAction = "approve" | "reject" | "reopen";

// decimal(10,7) in the DB -> 3 integer digits max
const DECIMAL_MAX = 999.9999999;

const validateDecimal = (label: string) => (value: unknown): string | null => {
	if (value === "" || value === null || value === undefined) return null;
	const n = Number(value);
	if (Number.isNaN(n)) return `${label} must be a number`;
	if (n < 0 || n > DECIMAL_MAX) return `${label} must be between 0 and ${DECIMAL_MAX}`;
	return null;
};

const EMPTY_VALUES = Object.freeze({
	dept_id: "",
	quality_code: "",
	quality_desc: "",
	quality_rate: "",
	conv_factor: "",
	active: true,
});

export default function CreateQualityPage({ open, onClose, onSaved, editId }: Props) {
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const coId = selectedCompany?.co_id;

	const [loadingSetup, setLoadingSetup] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>("create");
	const [statusId, setStatusId] = useState<number | null>(null);
	const [statusName, setStatusName] = useState("");
	const [deptOptions, setDeptOptions] = useState<Option[]>([]);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	// Same shape as Spell Master's loadSetup: dropdown options + (on edit) the record, one loader
	const loadSetup = useCallback(async () => {
		setLoadingSetup(true);
		try {
			if (!coId) throw new Error("No company selected");

			// Departments of the sidebar-selected company/branches feed the dept dropdown
			const queryParams = new URLSearchParams({ co_id: String(coId) });
			if (selectedBranches.length > 0) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}
			const setupUrl = `${apiRoutesPortalMasters.DEPT_MASTER_TABLE}?${queryParams}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(setupUrl, "GET");
			if (setupErr || !setupData) throw new Error(setupErr || "Failed to load departments");

			const depts: Option[] = (setupData.data || []).map(
				(d: Record<string, unknown>) => ({
					label: `${d.dept_code ?? ""} - ${d.dept_name ?? ""}`,
					value: String(d.id ?? ""),
				})
			);
			setDeptOptions(depts);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.QUALITY_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load quality");

				const rec = detailData.data ?? detailData;
				const recStatus: number | null = rec.status_id == null ? null : Number(rec.status_id);
				setStatusId(recStatus);
				setStatusName(rec.status_name ?? "");
				// Approved / Rejected are read-only per the status contract
				setMode(recStatus === null || recStatus === STATUS.OPEN ? "edit" : "view");
				setInitialValues({
					dept_id: rec.dept_id != null ? String(rec.dept_id) : "",
					quality_code: rec.quality_code ?? "",
					quality_desc: rec.quality_desc ?? "",
					quality_rate: rec.quality_rate ?? "",
					conv_factor: rec.conv_factor ?? "",
					active: rec.active !== 0,
				});
			} else {
				setInitialValues({ ...EMPTY_VALUES });
			}

			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, coId, selectedBranches]);

	useEffect(() => {
		if (open) {
			setMode(editId !== undefined ? "edit" : "create");
			setStatusId(null);
			setStatusName("");
			loadSetup();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadSetup]);

	const handleStatusAction = async (action: StatusAction) => {
		if (editId === undefined) return;
		setSaving(true);
		try {
			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.QUALITY_STATUS}/${editId}`,
				"PUT",
				{ action }
			);
			if (error) throw new Error(error);
			setSnackbar({ open: true, message: `Quality ${action === "reopen" ? "re-opened" : `${action}d`}`, severity: "success" });
			onSaved?.();
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Status update failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	// Button visibility per instructions.md: Open -> Approve/Reject, Rejected -> Re-Open, Approved -> none
	const isOpen = editId !== undefined && (statusId === null || statusId === STATUS.OPEN);
	const isRejected = statusId === STATUS.REJECTED;

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Quality" : "Create Quality",
			fields: [
				{
					name: "dept_id",
					label: "Department",
					type: "select",
					required: true,
					options: deptOptions,
					grid: { xs: 12 },
				},
				{
					name: "quality_code",
					label: "Quality Code",
					type: "text",
					required: true,
					helperText: "Max 10 characters",
					customValidate: (value) =>
						String(value ?? "").trim().length > 10
							? "Quality code cannot exceed 10 characters"
							: null,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "quality_desc",
					label: "Quality Description",
					type: "text",
					customValidate: (value) =>
						String(value ?? "").trim().length > 100
							? "Quality description cannot exceed 100 characters"
							: null,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "quality_rate",
					label: "Quality Rate",
					type: "number",
					customValidate: validateDecimal("Quality rate"),
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "conv_factor",
					label: "Conversion Factor",
					type: "number",
					customValidate: validateDecimal("Conversion factor"),
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "active",
					label: "Active",
					type: "checkbox",
					grid: { xs: 12 },
				},
			],
		}),
		[editId, deptOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				dept_id: Number(values.dept_id),
				quality_code: String(values.quality_code ?? "").trim(),
				quality_desc: String(values.quality_desc ?? "").trim(),
				quality_rate: values.quality_rate === "" ? null : values.quality_rate,
				conv_factor: values.conv_factor === "" ? null : values.conv_factor,
				active: values.active ? 1 : 0,
			};

			const { error } = await fetchWithCookie(
				editId !== undefined
					? `${apiRoutesPortalMasters.QUALITY_EDIT}/${editId}`
					: apiRoutesPortalMasters.QUALITY_CREATE,
				editId !== undefined ? "PUT" : "POST",
				payload
			);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message: editId !== undefined ? "Quality updated successfully" : "Quality created successfully",
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

	const dialogTitle =
		editId === undefined ? "Create Quality" : mode === "view" ? "View Quality" : "Edit Quality";

	return (
		<>
			<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
				<DialogTitle
					sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<Typography variant="h6" component="span">
							{dialogTitle}
						</Typography>
						{statusName && (
							<Chip
								size="small"
								label={statusName}
								color={statusId === STATUS.APPROVED ? "success" : statusId === STATUS.REJECTED ? "error" : "default"}
							/>
						)}
					</Box>
					<IconButton onClick={onClose} size="small" aria-label="Close dialog">
						<X size={20} />
					</IconButton>
				</DialogTitle>

				<DialogContent dividers>
					{loadingSetup ? (
						<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
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
							{(isOpen || isRejected) && (
								<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
									{isOpen && (
										<>
											<Button variant="outlined" color="error" disabled={saving} onClick={() => handleStatusAction("reject")}>
												Reject
											</Button>
											<Button variant="contained" color="success" disabled={saving} onClick={() => handleStatusAction("approve")}>
												Approve
											</Button>
										</>
									)}
									{isRejected && (
										<Button variant="contained" disabled={saving} onClick={() => handleStatusAction("reopen")}>
											Re-Open
										</Button>
									)}
								</Box>
							)}
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
