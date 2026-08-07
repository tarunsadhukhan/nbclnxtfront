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

const DAYS_OPTIONS: Option[] = [
	{ label: "Sunday", value: "1" },
	{ label: "Monday", value: "2" },
	{ label: "Tuesday", value: "3" },
	{ label: "Wednesday", value: "4" },
	{ label: "Thursday", value: "5" },
	{ label: "Friday", value: "6" },
	{ label: "Saturday", value: "7" },
];

const YES_NO_OPTIONS: Option[] = [
	{ label: "Yes", value: "1" },
	{ label: "No", value: "0" },
];

export default function CreateShiftPage({
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

	const [branchOptions, setBranchOptions] = useState<Option[]>([]);
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

			const setupUrl = `${apiRoutesPortalMasters.SHIFT_CREATE_SETUP}?co_id=${co_id}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(setupUrl, "GET");
			if (setupErr || !setupData) throw new Error(setupErr || "Failed to load setup");

			const branches: Option[] = (setupData.branches || []).map(
				(b: Record<string, unknown>) => ({
					label: String(b.branch_name ?? ""),
					value: String(b.branch_id ?? ""),
				})
			);

			const selectedBranchSet = new Set(selectedBranches.map(String));
			const filteredBranches = selectedBranchSet.size > 0
				? branches.filter((b) => selectedBranchSet.has(b.value))
				: branches;
			setBranchOptions(filteredBranches);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.SHIFT_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load shift");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					shift_name: rec.shift_name ?? "",
					branch_id: rec.branch_id != null ? String(rec.branch_id) : "",
					starting_time: rec.starting_time ?? "",
					end_time: rec.end_time ?? "",
					working_hours: rec.working_hours ?? "",
					minimum_work_hours: rec.minimum_work_hours ?? "",
					break_hours: rec.break_hours ?? "",
					halfday_work_hours: rec.halfday_work_hours ?? "",
					late_minutes: rec.late_minutes != null ? String(rec.late_minutes) : "",
					late_minutes2: rec.late_minutes2 != null ? String(rec.late_minutes2) : "",
					week_off_day: rec.week_off_day != null ? String(rec.week_off_day) : "",
					week_off_day2: rec.week_off_day2 != null ? String(rec.week_off_day2) : "",
					week_off_halfDay: rec.week_off_halfDay != null ? String(rec.week_off_halfDay) : "",
					is_overnight: rec.is_overnight != null ? String(rec.is_overnight) : "0",
				});
			} else {
				setInitialValues({
					shift_name: "",
					branch_id: filteredBranches.length > 0 ? filteredBranches[0].value : "",
					starting_time: "",
					end_time: "",
					working_hours: "",
					minimum_work_hours: "",
					break_hours: "",
					halfday_work_hours: "",
					late_minutes: "",
					late_minutes2: "",
					week_off_day: "",
					week_off_day2: "",
					week_off_halfDay: "",
					is_overnight: "0",
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
					? "Edit Shift"
					: "Create Shift",
			fields: [
				{
					name: "shift_name",
					label: "Shift Name",
					type: "text",
					required: true,
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
					name: "starting_time",
					label: "Starting Time",
					type: "time",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "end_time",
					label: "End Time",
					type: "time",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "working_hours",
					label: "Working Hours",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "minimum_work_hours",
					label: "Minimum Work Hours",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "break_hours",
					label: "Break Hours",
					type: "text",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "halfday_work_hours",
					label: "Half Day Work Hours",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "late_minutes",
					label: "Late Minutes 1",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "late_minutes2",
					label: "Late Minutes 2",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "week_off_day",
					label: "Week Off Day",
					type: "select",
					options: DAYS_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "week_off_day2",
					label: "Week Off Day 2",
					type: "select",
					options: DAYS_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "week_off_halfDay",
					label: "Week Off Half Day",
					type: "select",
					options: DAYS_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "is_overnight",
					label: "Is Overnight",
					type: "select",
					options: YES_NO_OPTIONS,
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
				shift_name: values.shift_name,
				branch_id: values.branch_id || null,
				starting_time: values.starting_time || null,
				end_time: values.end_time || null,
				working_hours: values.working_hours || null,
				minimum_work_hours: values.minimum_work_hours || null,
				break_hours: values.break_hours || null,
				halfday_work_hours: values.halfday_work_hours || null,
				late_minutes: values.late_minutes || null,
				late_minutes2: values.late_minutes2 || null,
				week_off_day: values.week_off_day || null,
				week_off_day2: values.week_off_day2 || null,
				week_off_halfDay: values.week_off_halfDay || null,
				is_overnight: values.is_overnight || 0,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.SHIFT_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.SHIFT_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Shift updated successfully"
						: "Shift created successfully",
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
			return "Edit Shift";
		}
		return "Create Shift";
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
