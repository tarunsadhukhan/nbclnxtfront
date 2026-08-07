import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { INDENT_STATUS_IDS, INDENT_STATUS_LABELS } from "../utils/indentConstants";
import {
	approveIndent,
	cancelDraftIndent,
	getIndentById,
	openIndent,
	rejectIndent,
	reopenIndent,
	sendIndentForApproval,
	type IndentDetails,
} from "@/utils/indentService";

type UseIndentApprovalParams = {
	mode: MuiFormMode;
	requestedId: string;
	formValues: Record<string, unknown>;
	indentDetails: IndentDetails | null;
	coId?: string;
	getMenuId: () => string;
	setIndentDetails: React.Dispatch<React.SetStateAction<IndentDetails | null>>;
	setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

/**
 * Centralizes approval-state derivation and the action handlers (open/cancel/approve/etc.).
 */
export const useIndentApproval = ({
	mode,
	requestedId,
	formValues,
	indentDetails,
	coId,
	getMenuId,
	setIndentDetails,
	setFormValues,
}: UseIndentApprovalParams) => {
	const router = useRouter();
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	/**
	 * Maps status string to status ID.
	 */
	const mapStatusToId = React.useCallback((status?: string | null): ApprovalStatusId | null => {
		if (!status) return null;
		const normalized = String(status).toLowerCase().trim();
		if (normalized.includes("draft") || normalized === "21") return INDENT_STATUS_IDS.DRAFT;
		if (normalized === "open" || normalized === "1") return INDENT_STATUS_IDS.OPEN;
		if (normalized.includes("pending") || normalized.includes("approval") || normalized === "20") {
			return INDENT_STATUS_IDS.PENDING_APPROVAL;
		}
		if (normalized === "approved" || normalized === "3") return INDENT_STATUS_IDS.APPROVED;
		if (normalized === "rejected" || normalized === "4") return INDENT_STATUS_IDS.REJECTED;
		if (normalized === "closed" || normalized === "5") return INDENT_STATUS_IDS.CLOSED;
		if (normalized === "cancelled" || normalized === "6") return INDENT_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	/**
	 * Derive statusId from indentDetails, falling back to DRAFT (21) when not available.
	 */
	const statusId = React.useMemo<ApprovalStatusId>(() => {
		if (indentDetails?.statusId) return indentDetails.statusId as ApprovalStatusId;
		return mapStatusToId(indentDetails?.status) ?? INDENT_STATUS_IDS.DRAFT;
	}, [indentDetails, mapStatusToId]);

	/**
	 * Gets approval permissions based on status and mode.
	 */
	const getApprovalPermissions = React.useCallback(
		(status: ApprovalStatusId, currentMode: MuiFormMode, apiPermissions?: ApprovalActionPermissions): ApprovalActionPermissions => {
			// If backend provides permissions, use them directly
			if (apiPermissions) return apiPermissions;

			// View mode only allows viewing log and cloning
			if (currentMode === "view") {
				return { canViewApprovalLog: true, canClone: true };
			}

			// Drafted (21)
			if (status === INDENT_STATUS_IDS.DRAFT) {
				return { canSave: true, canOpen: true, canCancelDraft: true };
			}

			// Cancelled (6)
			if (status === INDENT_STATUS_IDS.CANCELLED) {
				return { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
			}

			// Open (1) - Do NOT grant canApprove without backend permission check
			if (status === INDENT_STATUS_IDS.OPEN) {
				return { canSave: true, canViewApprovalLog: true };
			}

			// Pending Approval (20)
			if (status === INDENT_STATUS_IDS.PENDING_APPROVAL) {
				return { canSave: true, canViewApprovalLog: true };
			}

			// Approved (3)
			if (status === INDENT_STATUS_IDS.APPROVED) {
				return { canViewApprovalLog: true, canClone: true };
			}

			// Rejected (4)
			if (status === INDENT_STATUS_IDS.REJECTED) {
				return { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
			}

			// Closed (5)
			if (status === INDENT_STATUS_IDS.CLOSED) {
				return { canViewApprovalLog: true };
			}

			return {};
		},
		[]
	);

	const approvalPermissions = React.useMemo(
		() => getApprovalPermissions(statusId, mode, indentDetails?.permissions),
		[statusId, mode, indentDetails?.permissions, getApprovalPermissions]
	);

	/**
	 * Approval info for the ApprovalActionsBar component.
	 */
	const approvalInfo: ApprovalInfo = React.useMemo(() => ({
		statusId,
		statusLabel: INDENT_STATUS_LABELS[statusId] ?? indentDetails?.status ?? "Draft",
		approvalLevel: indentDetails?.approvalLevel ?? null,
		maxApprovalLevel: indentDetails?.maxApprovalLevel ?? null,
		isFinalLevel:
			indentDetails?.approvalLevel != null && indentDetails?.maxApprovalLevel != null
				? indentDetails.approvalLevel >= indentDetails.maxApprovalLevel
				: false,
	}), [statusId, indentDetails]);

	const statusChipProps = React.useMemo(() => {
		type StatusChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: StatusChipColor =
			statusId === INDENT_STATUS_IDS.APPROVED
				? "success"
				: statusId === INDENT_STATUS_IDS.REJECTED || statusId === INDENT_STATUS_IDS.CANCELLED
					? "error"
					: statusId === INDENT_STATUS_IDS.PENDING_APPROVAL
						? "warning"
						: "default";
		return {
			label: INDENT_STATUS_LABELS[statusId] ?? indentDetails?.status ?? "Draft",
			color,
		};
	}, [statusId, indentDetails?.status]);

	const branchIdFromForm = React.useCallback(
		() => String(formValues.branch ?? indentDetails?.branch ?? ""),
		[formValues.branch, indentDetails?.branch]
	);

	const refreshDetails = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		const detail = await getIndentById(requestedId, coId, menuId || undefined);
		setIndentDetails(detail);
		if (detail.status) {
			setFormValues((prev) => ({ ...prev, status: detail.status }));
		}
	}, [requestedId, getMenuId, coId, setIndentDetails, setFormValues]);

	const handleOpen = React.useCallback(async () => {
		if (!requestedId) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required", description: "Branch is required to open indent." });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required", description: "Menu ID is required." });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await openIndent(requestedId, branchId, menuId);
			toast({ title: result.message || "Indent opened successfully", description: "Document number will be generated." });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to open indent", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

	const handleCancelDraft = React.useCallback(async () => {
		if (!requestedId) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required" });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await cancelDraftIndent(requestedId, branchId, menuId);
			toast({ title: result.message || "Draft cancelled successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to cancel draft", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

	const handleReopen = React.useCallback(async () => {
		if (!requestedId) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required" });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await reopenIndent(requestedId, branchId, menuId);
			toast({ title: result.message || "Indent reopened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reopen indent", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

	const handleSendForApproval = React.useCallback(async () => {
		if (!requestedId) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required" });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await sendIndentForApproval(requestedId, branchId, menuId);
			toast({
				title: result.message || "Sent for approval successfully",
				description: result.new_approval_level ? `Approval level: ${result.new_approval_level}` : undefined,
			});
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to send for approval", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

	const handleApprove = React.useCallback(async () => {
		if (!requestedId || !indentDetails) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required" });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await approveIndent(requestedId, branchId, menuId, approvalInfo.approvalLevel ?? null);
			toast({
				title: result.message || "Indent approved successfully",
				description: result.new_status_id === 3
					? "Indent has been fully approved."
					: `Moved to approval level ${result.new_approval_level}.`,
			});
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to approve indent", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, indentDetails, branchIdFromForm, getMenuId, approvalInfo.approvalLevel, refreshDetails]);

	const handleReject = React.useCallback(async (reason: string) => {
		if (!requestedId) return;

		const branchId = branchIdFromForm();
		const menuId = getMenuId();

		if (!branchId) {
			toast({ variant: "destructive", title: "Branch required" });
			return;
		}
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID required" });
			return;
		}

		setApprovalLoading(true);
		try {
			const result = await rejectIndent(requestedId, branchId, menuId, reason);
			toast({ title: result.message || "Indent rejected successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reject indent", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setApprovalLoading(false);
		}
	}, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

	const handleViewApprovalLog = React.useCallback(() => {
		if (!requestedId) return;
		toast({ title: "Opening approval log...", description: "Feature coming soon" });
	}, [requestedId]);

	const handleClone = React.useCallback(() => {
		if (!requestedId) return;
		toast({ title: "Cloning indent...", description: "Feature coming soon" });
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
