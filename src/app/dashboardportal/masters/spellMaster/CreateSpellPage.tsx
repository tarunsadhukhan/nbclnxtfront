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

const YES_NO_OPTIONS: Option[] = [
	{ label: "Yes", value: "1" },
	{ label: "No", value: "0" },
];

export default function CreateSpellPage({
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

	const [shiftOptions, setShiftOptions] = useState<Option[]>([]);
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

			const queryParams = new URLSearchParams({ co_id });
			if (selectedBranches.length > 0) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}

			const setupUrl = `${apiRoutesPortalMasters.SPELL_CREATE_SETUP}?${queryParams}`;
			const { data: setupData, error: setupErr } = await fetchWithCookie(setupUrl, "GET");
			if (setupErr || !setupData) throw new Error(setupErr || "Failed to load setup");

			const shifts: Option[] = (setupData.shifts || []).map(
				(s: Record<string, unknown>) => ({
					label: String(s.shift_name ?? ""),
					value: String(s.shift_id ?? ""),
				})
			);
			setShiftOptions(shifts);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.SPELL_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(detailUrl, "GET");
				if (detailErr || !detailData) throw new Error(detailErr || "Failed to load spell");

				const rec = detailData.data ?? detailData;
				setInitialValues({
					spell_name: rec.spell_name ?? "",
					spell_code: rec.spell_code ?? "",
					shift_id: rec.shift_id != null ? String(rec.shift_id) : "",
					starting_time: rec.starting_time ?? "",
					end_time: rec.end_time ?? "",
					working_hours: rec.working_hours ?? "",
					minimum_work_hours: rec.minimum_work_hours ?? "",
					break_hours: rec.break_hours ?? "",
					halfday_work_hours: rec.halfday_work_hours ?? "",
					late_minutes: rec.late_minutes != null ? String(rec.late_minutes) : "",
					late_minutes2: rec.late_minutes2 != null ? String(rec.late_minutes2) : "",
					is_overnight: rec.is_overnight != null ? String(rec.is_overnight) : "0",
				});
			} else {
				setInitialValues({
					spell_name: "",
					spell_code: "",
					shift_id: shifts.length > 0 ? shifts[0].value : "",
					starting_time: "",
					end_time: "",
					working_hours: "",
					minimum_work_hours: "",
					break_hours: "",
					halfday_work_hours: "",
					late_minutes: "",
					late_minutes2: "",
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
					? "Edit Spell"
					: "Create Spell",
			fields: [
				{
					name: "spell_name",
					label: "Spell Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "spell_code",
					label: "Spell Code",
					type: "text",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "shift_id",
					label: "Shift",
					type: "select",
					required: true,
					options: shiftOptions,
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
					name: "is_overnight",
					label: "Is Overnight",
					type: "select",
					options: YES_NO_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, shiftOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload = {
				spell_name: values.spell_name,
				spell_code: values.spell_code || null,
				shift_id: values.shift_id || null,
				starting_time: values.starting_time || null,
				end_time: values.end_time || null,
				working_hours: values.working_hours || null,
				minimum_work_hours: values.minimum_work_hours || null,
				break_hours: values.break_hours || null,
				halfday_work_hours: values.halfday_work_hours || null,
				late_minutes: values.late_minutes || null,
				late_minutes2: values.late_minutes2 || null,
				is_overnight: values.is_overnight || 0,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.SPELL_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.SPELL_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Spell updated successfully"
						: "Spell created successfully",
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
			return "Edit Spell";
		}
		return "Create Spell";
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
