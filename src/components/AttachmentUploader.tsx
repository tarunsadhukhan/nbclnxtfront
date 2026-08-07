"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	IconButton,
	Paper,
	Snackbar,
	Stack,
	Typography,
} from "@mui/material";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * @component AttachmentUploader
 * @description Reusable PDF upload widget backed by the generic /api/attachments
 * subsystem (S3-backed). Renders an upload button when no file is present,
 * and a card row with Download/Replace/Delete actions when a file exists.
 *
 * Hydration safety: parent component is expected to gate rendering until
 * `coId` and `entityId` are resolved (per project convention). No mounted-gate
 * inside this component.
 */

export type AttachmentMeta = {
	attachment_id: number;
	original_filename: string;
	size_bytes: number;
	mime_type: string;
	file_type: string;
	uploaded_at: string;
	module?: string;
	entity_id?: number;
};

type AttachmentListResponse = {
	data?: AttachmentMeta[];
};

type AttachmentUploadResponse = {
	data?: AttachmentMeta;
};

type AttachmentDownloadResponse = {
	data?: {
		url: string;
		expires_in: number;
	};
};

type AttachmentDeleteResponse = {
	data?: {
		message: string;
	};
};

type Severity = "success" | "error" | "info" | "warning";

type Props = {
	module: string;
	entityId: number;
	fileType: string;
	coId: number;
	disabled?: boolean;
	label?: string;
	onChange?: (att: AttachmentMeta | null) => void;
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = "application/pdf";

const formatBytes = (bytes: number): string => {
	if (bytes == null) return "-";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const AttachmentUploader: React.FC<Props> = ({
	module,
	entityId,
	fileType,
	coId,
	disabled = false,
	label,
	onChange,
}) => {
	const [current, setCurrent] = React.useState<AttachmentMeta | null>(null);
	const [loading, setLoading] = React.useState<boolean>(false);
	const [snackbar, setSnackbar] = React.useState<{
		open: boolean;
		message: string;
		severity: Severity;
	}>({ open: false, message: "", severity: "success" });

	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const displayLabel = label ?? fileType;

	const showMessage = React.useCallback(
		(message: string, severity: Severity = "success") => {
			setSnackbar({ open: true, message, severity });
		},
		[],
	);

	// Load current attachment on mount / when keys change.
	React.useEffect(() => {
		let mounted = true;
		const loadCurrent = async () => {
			if (!coId || !entityId) {
				setCurrent(null);
				return;
			}
			setLoading(true);
			try {
				const url = `${apiRoutesPortalMasters.ATTACHMENT_LIST}?co_id=${coId}&module=${encodeURIComponent(
					module,
				)}&entity_id=${entityId}`;
				const { data, error } =
					await fetchWithCookie<AttachmentListResponse>(url, "GET");
				if (!mounted) return;
				if (error) {
					showMessage(error, "error");
					setCurrent(null);
					return;
				}
				const list = data?.data ?? [];
				const match = list.find((a) => a.file_type === fileType) ?? null;
				setCurrent(match);
			} catch (err) {
				if (!mounted) return;
				showMessage(
					err instanceof Error ? err.message : "Failed to load attachment",
					"error",
				);
			} finally {
				if (mounted) setLoading(false);
			}
		};
		void loadCurrent();
		return () => {
			mounted = false;
		};
	}, [coId, entityId, module, fileType, showMessage]);

	const triggerPicker = () => {
		if (disabled) return;
		inputRef.current?.click();
	};

	const handleFileChange = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		// Always clear the input value so picking the same file again re-fires onChange.
		if (inputRef.current) inputRef.current.value = "";
		if (!file) return;

		if (file.type !== ALLOWED_MIME) {
			showMessage("Only PDF files are allowed", "error");
			return;
		}
		if (file.size > MAX_SIZE_BYTES) {
			showMessage("File exceeds 10 MB limit", "error");
			return;
		}
		if (!coId || !entityId) {
			showMessage("Missing company or entity context", "error");
			return;
		}

		setLoading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("module", module);
			formData.append("entity_id", String(entityId));
			formData.append("file_type", fileType);

			const url = `${apiRoutesPortalMasters.ATTACHMENT_UPLOAD}?co_id=${coId}`;
			const { data, error } = await fetchWithCookie<AttachmentUploadResponse>(
				url,
				"POST",
				formData,
			);
			if (error) {
				showMessage(error, "error");
				return;
			}
			const uploaded = data?.data ?? null;
			if (!uploaded) {
				showMessage("Upload succeeded but no metadata returned", "error");
				return;
			}
			setCurrent(uploaded);
			onChange?.(uploaded);
			showMessage(`${displayLabel} uploaded successfully`, "success");
		} catch (err) {
			showMessage(
				err instanceof Error ? err.message : "Upload failed",
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async () => {
		if (!current) return;
		setLoading(true);
		try {
			const url = `${apiRoutesPortalMasters.ATTACHMENT_DOWNLOAD}/${current.attachment_id}/download?co_id=${coId}`;
			const { data, error } =
				await fetchWithCookie<AttachmentDownloadResponse>(url, "GET");
			if (error) {
				showMessage(error, "error");
				return;
			}
			const presigned = data?.data?.url;
			if (!presigned) {
				showMessage("No download URL returned", "error");
				return;
			}
			window.open(presigned, "_blank");
		} catch (err) {
			showMessage(
				err instanceof Error ? err.message : "Download failed",
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!current) return;
		const ok = window.confirm(`Delete ${current.original_filename}?`);
		if (!ok) return;
		setLoading(true);
		try {
			const url = `${apiRoutesPortalMasters.ATTACHMENT_DELETE}/${current.attachment_id}?co_id=${coId}`;
			const { error } = await fetchWithCookie<AttachmentDeleteResponse>(
				url,
				"DELETE",
			);
			if (error) {
				showMessage(error, "error");
				return;
			}
			setCurrent(null);
			onChange?.(null);
			showMessage(`${displayLabel} deleted`, "success");
		} catch (err) {
			showMessage(
				err instanceof Error ? err.message : "Delete failed",
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const renderEmpty = () => {
		if (disabled) {
			return (
				<Typography variant="body2" color="text.secondary">
					No {displayLabel} uploaded
				</Typography>
			);
		}
		return (
			<Button
				variant="outlined"
				size="small"
				startIcon={<Upload size={16} />}
				onClick={triggerPicker}
				disabled={loading}
			>
				Upload {displayLabel} PDF
			</Button>
		);
	};

	const renderCurrent = () => {
		if (!current) return null;
		return (
			<Paper
				variant="outlined"
				sx={{
					p: 1.25,
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					flexWrap: "wrap",
					width: "100%",
				}}
			>
				<FileText size={20} style={{ flexShrink: 0 }} />
				<Box sx={{ minWidth: 0, flexGrow: 1 }}>
					<Typography
						variant="body2"
						sx={{
							fontWeight: 500,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
						title={current.original_filename}
					>
						{current.original_filename}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{formatBytes(current.size_bytes)}
					</Typography>
				</Box>
				<Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
					<Button
						size="small"
						variant="text"
						startIcon={<Download size={14} />}
						onClick={handleDownload}
						disabled={loading}
					>
						Download
					</Button>
					{!disabled && (
						<Button
							size="small"
							variant="text"
							onClick={triggerPicker}
							disabled={loading}
						>
							Replace
						</Button>
					)}
					{!disabled && (
						<IconButton
							size="small"
							color="error"
							onClick={handleDelete}
							disabled={loading}
							aria-label={`Delete ${displayLabel}`}
						>
							<Trash2 size={16} />
						</IconButton>
					)}
				</Stack>
			</Paper>
		);
	};

	return (
		<Box>
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mb: 0.5 }}
			>
				{displayLabel}
			</Typography>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
				{current ? renderCurrent() : renderEmpty()}
				{loading && <CircularProgress size={18} />}
			</Box>
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf"
				onChange={handleFileChange}
				style={{ display: "none" }}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<Alert
					onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
					severity={snackbar.severity}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default AttachmentUploader;
