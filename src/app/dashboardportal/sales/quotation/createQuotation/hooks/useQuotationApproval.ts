import React from "react";
import { toast } from "@/hooks/use-toast";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { useStatusChip } from "@/components/ui/transaction";
import {
	openQuotation,
	cancelDraftQuotation,
	sendQuotationForApproval,
	approveQuotation,
	rejectQuotation,
	reopenQuotation,
	type QuotationDetails,
	type ApprovalActionPermissions as ServicePermissions,
} from "@/utils/quotationService";
import { QUOTATION_STATUS_IDS, QUOTATION_STATUS_LABELS, type QuotationStatusId } from "../utils/quotationConstants";

const statusNameToId: Record<string, number> = {
	Draft: QUOTATION_STATUS_IDS.DRAFT,
	Open: QUOTATION_STATUS_IDS.OPEN,
	"Pending Approval": QUOTATION_STATUS_IDS.PENDING_APPROVAL,
	Approved: QUOTATION_STATUS_IDS.APPROVED,
	Rejected: QUOTATION_STATUS_IDS.REJECTED,
	Closed: QUOTATION_STATUS_IDS.CLOSED,
	Cancelled: QUOTATION_STATUS_IDS.CANCELLED,
};

function getApprovalPermissions(statusId?: number, backendPerms?: ServicePermissions): ApprovalActionPermissions {
	if (backendPerms) {
		return {
			canApprove: !!backendPerms.canApprove,
			canReject: !!backendPerms.canReject,
			canOpen: !!backendPerms.canOpen,
			canSendForApproval: !!backendPerms.canSendForApproval,
			canCancelDraft: !!backendPerms.canCancelDraft,
			canReopen: !!backendPerms.canReopen,
			canViewApprovalLog: !!backendPerms.canViewApprovalLog,
			canClone: !!backendPerms.canClone,
		};
	}

	const base: ApprovalActionPermissions = {
		canApprove: false,
		canReject: false,
		canOpen: false,
		canSendForApproval: false,
		canCancelDraft: false,
		canReopen: false,
		canViewApprovalLog: false,
		canClone: false,
	};

	switch (statusId) {
		case QUOTATION_STATUS_IDS.DRAFT:
			return { ...base, canOpen: true, canCancelDraft: true };
		case QUOTATION_STATUS_IDS.OPEN:
			return { ...base, canSendForApproval: true };
		case QUOTATION_STATUS_IDS.PENDING_APPROVAL:
			return { ...base, canApprove: true, canReject: true, canViewApprovalLog: true };
		case QUOTATION_STATUS_IDS.APPROVED:
			return { ...base, canViewApprovalLog: true, canClone: true };
		case QUOTATION_STATUS_IDS.REJECTED:
			return { ...base, canReopen: true, canViewApprovalLog: true };
		case QUOTATION_STATUS_IDS.CANCELLED:
			return { ...base, canReopen: true };
		default:
			return base;
	}
}

type UseQuotationApprovalParams = {
	mode: "create" | "edit" | "view";
	requestedId: string;
	quotationDetails: QuotationDetails | null;
	branchId: string;
	menuId: string;
	onRefresh: () => void;
};

/**
 * Manages approval workflow actions and permissions for quotations.
 */
export const useQuotationApproval = ({
	mode,
	requestedId,
	quotationDetails,
	branchId,
	menuId,
	onRefresh,
}: UseQuotationApprovalParams) => {
	const [loading, setLoading] = React.useState(false);

	const statusId = React.useMemo((): QuotationStatusId | undefined => {
		if (!quotationDetails) return undefined;
		if (quotationDetails.statusId) return quotationDetails.statusId;
		if (quotationDetails.status) {
			const mapped = statusNameToId[quotationDetails.status];
			return mapped as QuotationStatusId | undefined;
		}
		return undefined;
	}, [quotationDetails]);

	const approvalInfo = React.useMemo((): ApprovalInfo => ({
		statusId: (statusId ?? QUOTATION_STATUS_IDS.DRAFT) as ApprovalStatusId,
		statusLabel: statusId != null ? (QUOTATION_STATUS_LABELS[statusId] ?? "Unknown") : "Draft",
		approvalLevel: quotationDetails?.approvalLevel ?? undefined,
		maxApprovalLevel: quotationDetails?.maxApprovalLevel ?? undefined,
	}), [statusId, quotationDetails]);

	const approvalPermissions = React.useMemo(
		() => getApprovalPermissions(statusId, quotationDetails?.permissions),
		[statusId, quotationDetails?.permissions],
	);

	const statusChipProps = useStatusChip({
		status: statusId != null ? (QUOTATION_STATUS_LABELS[statusId] ?? undefined) : undefined,
	});

	const handleOpen = React.useCallback(async () => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await openQuotation(requestedId, branchId, menuId);
			toast({ title: result?.message ?? "Quotation opened" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to open quotation", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	const handleCancelDraft = React.useCallback(async () => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await cancelDraftQuotation(requestedId, branchId, menuId);
			toast({ title: result?.message ?? "Quotation cancelled" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to cancel quotation", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	const handleSendForApproval = React.useCallback(async () => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await sendQuotationForApproval(requestedId, branchId, menuId);
			toast({ title: result?.message ?? "Quotation sent for approval" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to send for approval", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	const handleApprove = React.useCallback(async () => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await approveQuotation(requestedId, branchId, menuId);
			toast({ title: result?.message ?? "Quotation approved" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to approve quotation", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	const handleReject = React.useCallback(async (reason: string) => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await rejectQuotation(requestedId, branchId, menuId, reason);
			toast({ title: result?.message ?? "Quotation rejected" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to reject quotation", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	const handleReopen = React.useCallback(async () => {
		if (!requestedId || !branchId || !menuId) return;
		setLoading(true);
		try {
			const result = await reopenQuotation(requestedId, branchId, menuId);
			toast({ title: result?.message ?? "Quotation reopened" });
			onRefresh();
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to reopen quotation", description: error instanceof Error ? error.message : "Please try again." });
		} finally {
			setLoading(false);
		}
	}, [requestedId, branchId, menuId, onRefresh]);

	return {
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		loading,
		handleOpen,
		handleCancelDraft,
		handleSendForApproval,
		handleApprove,
		handleReject,
		handleReopen,
	};
};
