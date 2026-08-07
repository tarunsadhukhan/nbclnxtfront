"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Box,
	Snackbar,
	Alert,
	IconButton,
	Typography,
	TextField,
	Button,
	CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
};

type EmployeeOpt = {
	eb_id: number;
	emp_code: string | null;
	full_name: string | null;
	link_id: number | null;
	bio_dev_id: number | null;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

function getBranchIds(): string {
	if (typeof window === "undefined") return "";
	const raw = localStorage.getItem("sidebar_selectedBranches");
	if (!raw) return "";
	try {
		const branches = JSON.parse(raw) as number[];
		return Array.isArray(branches) && branches.length > 0 ? branches.join(",") : "";
	} catch {
		return "";
	}
}

/**
 * Create/edit an employee↔bio-device link. The user types an emp code, which
 * is validated against the branch's active employees (name shown on match),
 * then enters the bio device id. Saves master_id (= eb_id) with match_type 'E'.
 */
export default function CreateBioEmpLinkDialog({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
	const [empCode, setEmpCode] = useState("");
	const [bioDevId, setBioDevId] = useState("");
	// existing link found for the matched employee in create mode → save becomes an update
	const [linkId, setLinkId] = useState<number | undefined>(undefined);

	// Validate the typed emp code against the branch's employees.
	const matched = useMemo<EmployeeOpt | null>(() => {
		const code = empCode.trim().toLowerCase();
		if (!code) return null;
		return (
			employees.find((e) => String(e.emp_code ?? "").toLowerCase() === code) ?? null
		);
	}, [empCode, employees]);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");
			const params = new URLSearchParams({ co_id });
			const branch_id = getBranchIds();
			if (branch_id) params.append("branch_id", branch_id);
			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.BIO_EMP_LINK_SETUP}?${params}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to load employees");
			const emps = (data.employees as EmployeeOpt[]) ?? [];
			setEmployees(emps);

			if (editId !== undefined) {
				const detailUrl = `${apiRoutesPortalMasters.BIO_EMP_LINK_BY_ID}/${editId}`;
				const { data: detailData, error: detailErr } = await fetchWithCookie(
					detailUrl,
					"GET"
				);
				if (detailErr || !detailData) {
					throw new Error(detailErr || "Failed to load record");
				}
				const rec = detailData.data ?? detailData;
				setEmpCode(String(rec.emp_code ?? ""));
				setBioDevId(rec.bio_dev_id != null ? String(rec.bio_dev_id) : "");
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId]);

	useEffect(() => {
		if (open) {
			setEmpCode("");
			setBioDevId("");
			setLinkId(undefined);
			loadData();
		}
	}, [open, loadData]);

	// When the matched employee already has a link (create mode), prefill its
	// device id and switch the save into an update.
	useEffect(() => {
		if (editId !== undefined) return;
		if (matched?.link_id != null) {
			setLinkId(matched.link_id);
			setBioDevId(matched.bio_dev_id != null ? String(matched.bio_dev_id) : "");
		} else {
			setLinkId(undefined);
		}
	}, [matched, editId]);

	const handleSubmit = async () => {
		if (!matched) {
			setSnackbar({ open: true, message: "Enter a valid emp code", severity: "error" });
			return;
		}
		if (!bioDevId.trim() || Number.isNaN(Number(bioDevId))) {
			setSnackbar({ open: true, message: "Bio device id is required", severity: "error" });
			return;
		}
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				co_id,
				master_id: matched.eb_id,
				bio_dev_id: Number(bioDevId),
			};

			const effectiveId = editId ?? linkId;
			const url =
				effectiveId !== undefined
					? `${apiRoutesPortalMasters.BIO_EMP_LINK_EDIT}/${effectiveId}`
					: apiRoutesPortalMasters.BIO_EMP_LINK_CREATE;
			const method = effectiveId !== undefined ? "PUT" : "POST";

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			onSaved?.();
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Save failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	const empCodeTouched = empCode.trim().length > 0;
	const dialogTitle = editId !== undefined ? "Edit Bio Link" : "Create Bio Link";

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
								minHeight: 160,
							}}
						>
							<CircularProgress />
						</Box>
					) : (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
								gap: 2,
								pt: 1,
							}}
						>
							<TextField
								label="Emp Code"
								required
								value={empCode}
								onChange={(e) => setEmpCode(e.target.value)}
								error={empCodeTouched && !matched}
								helperText={
									empCodeTouched && !matched
										? "No active employee with this emp code"
										: " "
								}
								fullWidth
							/>
							<TextField
								label="Employee Name"
								value={matched?.full_name ?? ""}
								InputProps={{ readOnly: true }}
								placeholder="Validated from emp code"
								fullWidth
							/>
							<TextField
								label="Bio Device ID"
								type="number"
								required
								value={bioDevId}
								onChange={(e) => setBioDevId(e.target.value)}
								fullWidth
							/>
							{editId === undefined && linkId !== undefined && (
								<Alert
									severity="info"
									sx={{ gridColumn: { xs: "auto", sm: "1 / span 2" } }}
								>
									This employee already has a bio link — saving will update it.
								</Alert>
							)}
						</Box>
					)}
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleSubmit}
						disabled={saving || loading || !matched || !bioDevId.trim()}
					>
						{saving ? "Saving..." : "Save"}
					</Button>
				</DialogActions>
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
