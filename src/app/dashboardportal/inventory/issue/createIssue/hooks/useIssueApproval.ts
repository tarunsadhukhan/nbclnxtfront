import React from "react";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { ISSUE_STATUS_IDS, ISSUE_STATUS_LABELS } from "../utils/issueConstants";
import {
	getIssueById,
	updateIssueStatus,
	type IssueDetails,
} from "@/utils/issueService";

type UseIssueApprovalParams = {
	mode: MuiFormMode;
	requestedId: string;
	formValues: Record<string, unknown>;
	issueDetails: IssueDetails | null;
	coId?: string;
	getMenuId: () => string;
	setIssueDetails: React.Dispatch<React.SetStateAction<IssueDetails | null>>;
	setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

/**
 * Centralizes approval-state derivation and action handlers for Issue transactions.
 */
export const useIssueApproval = ({
	mode,
	requestedId,
	formValues,
	issueDetails,
	coId,
	getMenuId,
	setIssueDetails,
	setFormValues,
}: UseIssueApprovalParams) => {
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	const mapStatusToId = React.useCallback((status?: string | null): ApprovalStatusId | null => {
		if (!status) return null;
		const normalized = String(status).toLowerCase().trim();
		if (normalized.includes("draft") || normalized === "21") return ISSUE_STATUS_IDS.DRAFT;
		if (normalized === "open" || normalized === "1") return ISSUE_STATUS_IDS.OPEN;
		if (normalized.includes("pending") || normalized.includes("approval") || normalized === "20") {
			return ISSUE_STATUS_IDS.PENDING_APPROVAL;
		}
		if (normalized === "approved" || normalized === "3") return ISSUE_STATUS_IDS.APPROVED;
		if (normalized === "rejected" || normalized === "4") return ISSUE_STATUS_IDS.REJECTED;
		if (normalized === "closed" || normalized === "5") return ISSUE_STATUS_IDS.CLOSED;
		if (normalized === "cancelled" || normalized === "6") return ISSUE_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	const statusId = React.useMemo<ApprovalStatusId>(() => {
		if (issueDetails?.statusId) return issueDetails.statusId as ApprovalStatusId;
		return mapStatusToId(issueDetails?.status) ?? ISSUE_STATUS_IDS.DRAFT;
	}, [issueDetails, mapStatusToId]);

	const getApprovalPermissions = React.useCallback(
		(status: ApprovalStatusId, currentMode: MuiFormMode, apiPermissions?: ApprovalActionPermissions): ApprovalActionPermissions => {
			// If backend provides permissions, use them directly (includes canApprove, canReject, etc.)
			if (apiPermissions) return apiPermissions;

			// Fallback permissions without backend-provided approval access.
			// Note: canApprove/canReject are NOT granted by default — they require backend permission check.
			// In view mode, canSave is omitted since the document is read-only.
			const isView = currentMode === "view";

			if (status === ISSUE_STATUS_IDS.DRAFT) {
				return isView
					? { canOpen: true, canCancelDraft: true }
					: { canSave: true, canOpen: true, canCancelDraft: true };
			}
			if (status === ISSUE_STATUS_IDS.CANCELLED) {
				return isView
					? { canReopen: true, canClone: true, canViewApprovalLog: true }
					: { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
			}
			if (status === ISSUE_STATUS_IDS.OPEN) {
				return isView
					? { canViewApprovalLog: true }
					: { canSave: true, canViewApprovalLog: true };
			}
			if (status === ISSUE_STATUS_IDS.PENDING_APPROVAL) {
				return isView
					? { canViewApprovalLog: true }
					: { canSave: true, canViewApprovalLog: true };
			}
			if (status === ISSUE_STATUS_IDS.APPROVED) {
				return { canViewApprovalLog: true, canClone: true };
			}
			if (status === ISSUE_STATUS_IDS.REJECTED) {
				return isView
					? { canReopen: true, canClone: true, canViewApprovalLog: true }
					: { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
			}
			if (status === ISSUE_STATUS_IDS.CLOSED) {
				return { canViewApprovalLog: true };
			}
			return {};
		},
		[]
	);

	const approvalPermissions = React.useMemo(
		() => getApprovalPermissions(statusId, mode, issueDetails?.permissions),
		[statusId, mode, issueDetails?.permissions, getApprovalPermissions]
	);

	const approvalInfo: ApprovalInfo = React.useMemo(() => ({
		statusId,
		statusLabel: ISSUE_STATUS_LABELS[statusId] ?? issueDetails?.status ?? "Draft",
		approvalLevel: issueDetails?.approvalLevel ?? null,
		maxApprovalLevel: issueDetails?.maxApprovalLevel ?? null,
		isFinalLevel:
			issueDetails?.approvalLevel != null && issueDetails?.maxApprovalLevel != null
				? issueDetails.approvalLevel >= issueDetails.maxApprovalLevel
				: false,
	}), [statusId, issueDetails]);

	const statusChipProps = React.useMemo(() => {
		type StatusChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: StatusChipColor =
			statusId === ISSUE_STATUS_IDS.APPROVED
				? "success"
				: statusId === ISSUE_STATUS_IDS.REJECTED || statusId === ISSUE_STATUS_IDS.CANCELLED
					? "error"
					: statusId === ISSUE_STATUS_IDS.PENDING_APPROVAL
						? "warning"
						: "default";
		return {
			label: ISSUE_STATUS_LABELS[statusId] ?? issueDetails?.status ?? "Draft",
			color,
		};
	}, [statusId, issueDetails?.status]);

	const branchIdFromForm = React.useCallback(
		() => String(formValues.branch ?? issueDetails?.branchId ?? ""),
		[formValues.branch, issueDetails?.branchId]
	);

	const refreshDetails = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		const detail = await getIssueById(requestedId, coId ?? "", menuId || undefined);
		setIssueDetails(detail);
		if (detail.status) {
			setFormValues((prev) => ({ ...prev, status: detail.status }));
		}
	}, [requestedId, getMenuId, coId, setIssueDetails, setFormValues]);

	const handleOpen = React.useCallback(async () => {
		if (!requestedId || !coId) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.OPEN }, menuId);
			toast({ title: result.message || "Issue opened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to open issue", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, getMenuId, refreshDetails]);

	const handleCancelDraft = React.useCallback(async () => {
		if (!requestedId || !coId) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.CANCELLED }, menuId);
			toast({ title: result.message || "Draft cancelled" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to cancel draft", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, getMenuId, refreshDetails]);

	const handleReopen = React.useCallback(async () => {
		if (!requestedId || !coId) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.DRAFT }, menuId);
			toast({ title: result.message || "Issue reopened" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reopen issue", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, getMenuId, refreshDetails]);

	const handleSendForApproval = React.useCallback(async () => {
		if (!requestedId || !coId) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.PENDING_APPROVAL }, menuId);
			toast({ title: result.message || "Sent for approval" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to send for approval", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, getMenuId, refreshDetails]);

	const handleApprove = React.useCallback(async () => {
		if (!requestedId || !coId || !issueDetails) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.APPROVED }, menuId);
			toast({ title: result.message || "Issue approved" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to approve issue", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, issueDetails, getMenuId, refreshDetails]);

	const handleReject = React.useCallback(async (reason: string) => {
		if (!requestedId || !coId) return;

		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await updateIssueStatus(coId, requestedId, { status_id: ISSUE_STATUS_IDS.REJECTED, remarks: reason }, menuId);
			toast({ title: result.message || "Issue rejected" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reject issue", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, coId, getMenuId, refreshDetails]);

	const handleViewApprovalLog = React.useCallback(() => {
		if (!requestedId) return;
		toast({ title: "Opening approval log...", description: "Feature coming soon" });
	}, [requestedId]);

	const handleClone = React.useCallback(() => {
		if (!requestedId) return;
		toast({ title: "Cloning issue...", description: "Feature coming soon" });
	}, [requestedId]);

	return {
		approvalLoading,
		statusId,
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		mapStatusToId,
		handleOpen,
		handleCancelDraft,
		handleReopen,
		handleSendForApproval,
		handleApprove,
		handleReject,
		handleViewApprovalLog,
		handleClone,
	};
};
