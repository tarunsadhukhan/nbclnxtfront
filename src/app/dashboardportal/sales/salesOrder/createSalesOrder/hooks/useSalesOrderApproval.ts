import React from "react";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { SO_STATUS_IDS, SO_STATUS_LABELS } from "../utils/salesOrderConstants";
import {
	approveSalesOrder,
	cancelDraftSalesOrder,
	getSalesOrderById,
	openSalesOrder,
	rejectSalesOrder,
	reopenSalesOrder,
	sendSalesOrderForApproval,
	type SalesOrderDetails,
} from "@/utils/salesOrderService";

type UseSalesOrderApprovalParams = {
	mode: MuiFormMode;
	requestedId: string;
	formValues: Record<string, unknown>;
	details: SalesOrderDetails | null;
	coId?: string;
	getMenuId: () => string;
	setDetails: React.Dispatch<React.SetStateAction<SalesOrderDetails | null>>;
};

export const useSalesOrderApproval = ({ mode, requestedId, formValues, details, coId, getMenuId, setDetails }: UseSalesOrderApprovalParams) => {
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	const mapStatusToId = React.useCallback((status?: string): ApprovalStatusId | null => {
		if (!status) return null;
		const n = status.toLowerCase();
		if (n.includes("draft")) return SO_STATUS_IDS.DRAFT;
		if (n === "open") return SO_STATUS_IDS.OPEN;
		if (n.includes("pending") || n.includes("approval")) return SO_STATUS_IDS.PENDING_APPROVAL;
		if (n === "approved") return SO_STATUS_IDS.APPROVED;
		if (n === "rejected" || n === "reject") return SO_STATUS_IDS.REJECTED;
		if (n === "closed") return SO_STATUS_IDS.CLOSED;
		if (n === "cancelled") return SO_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	const statusId = React.useMemo<ApprovalStatusId>(() => {
		if (details?.statusId) return details.statusId as ApprovalStatusId;
		return mapStatusToId(details?.status) ?? SO_STATUS_IDS.DRAFT;
	}, [details, mapStatusToId]);

	const getApprovalPermissions = React.useCallback(
		(status: ApprovalStatusId, currentMode: MuiFormMode, apiPermissions?: ApprovalActionPermissions): ApprovalActionPermissions => {
			if (apiPermissions) return apiPermissions;
			if (currentMode === "view") return { canViewApprovalLog: true };
			if (status === SO_STATUS_IDS.DRAFT) return { canSave: true, canOpen: true, canCancelDraft: true };
			if (status === SO_STATUS_IDS.CANCELLED) return { canReopen: true, canViewApprovalLog: true };
			if (status === SO_STATUS_IDS.OPEN) return { canSave: true, canViewApprovalLog: true };
			if (status === SO_STATUS_IDS.PENDING_APPROVAL) return { canViewApprovalLog: true };
			if (status === SO_STATUS_IDS.APPROVED) return { canViewApprovalLog: true };
			if (status === SO_STATUS_IDS.REJECTED) return { canReopen: true, canViewApprovalLog: true };
			return {};
		},
		[],
	);

	const approvalPermissions = React.useMemo(
		() => getApprovalPermissions(statusId, mode, details?.permissions),
		[statusId, mode, details?.permissions, getApprovalPermissions],
	);

	const approvalInfo: ApprovalInfo = React.useMemo(() => ({
		statusId,
		statusLabel: SO_STATUS_LABELS[statusId] ?? details?.status ?? "Draft",
		approvalLevel: details?.approvalLevel ?? null,
		maxApprovalLevel: details?.maxApprovalLevel ?? null,
		isFinalLevel: details?.approvalLevel != null && details?.maxApprovalLevel != null
			? details.approvalLevel >= details.maxApprovalLevel
			: false,
	}), [statusId, details]);

	const statusChipProps = React.useMemo(() => {
		type ChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: ChipColor =
			statusId === SO_STATUS_IDS.APPROVED ? "success"
				: statusId === SO_STATUS_IDS.REJECTED || statusId === SO_STATUS_IDS.CANCELLED ? "error"
					: statusId === SO_STATUS_IDS.PENDING_APPROVAL ? "warning"
						: "default";
		return { label: SO_STATUS_LABELS[statusId] ?? details?.status ?? "Draft", color };
	}, [statusId, details?.status]);

	const refreshDetails = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		if (!menuId) return;
		const detail = await getSalesOrderById(requestedId, coId, menuId);
		setDetails(detail);
	}, [requestedId, getMenuId, coId, setDetails]);

	const branchIdFromForm = React.useCallback(() => String(formValues.branch ?? ""), [formValues.branch]);

	const runAction = React.useCallback(
		async (action: () => Promise<unknown>, successMsg: string, errorMsg: string) => {
			const branchId = branchIdFromForm();
			const menuId = getMenuId();
			if (!branchId || !menuId) {
				toast({ variant: "destructive", title: "Branch and Menu ID required" });
				return;
			}
			setApprovalLoading(true);
			try {
				await action();
				toast({ title: successMsg });
				await refreshDetails();
			} catch (error) {
				toast({ variant: "destructive", title: errorMsg, description: error instanceof Error ? error.message : "Please try again." });
			} finally {
				setApprovalLoading(false);
			}
		},
		[branchIdFromForm, getMenuId, refreshDetails],
	);

	const handleOpen = React.useCallback(() => {
		if (!requestedId) return;
		return runAction(
			() => openSalesOrder(requestedId, branchIdFromForm(), getMenuId()),
			"Sales order opened successfully",
			"Unable to open sales order",
		);
	}, [requestedId, branchIdFromForm, getMenuId, runAction]);

	const handleCancelDraft = React.useCallback(() => {
		if (!requestedId) return;
		return runAction(
			() => cancelDraftSalesOrder(requestedId, branchIdFromForm(), getMenuId()),
			"Draft cancelled successfully",
			"Unable to cancel draft",
		);
	}, [requestedId, branchIdFromForm, getMenuId, runAction]);

	const handleReopen = React.useCallback(() => {
		if (!requestedId) return;
		return runAction(
			() => reopenSalesOrder(requestedId, branchIdFromForm(), getMenuId()),
			"Sales order reopened successfully",
			"Unable to reopen sales order",
		);
	}, [requestedId, branchIdFromForm, getMenuId, runAction]);

	const handleSendForApproval = React.useCallback(() => {
		if (!requestedId) return;
		return runAction(
			() => sendSalesOrderForApproval(requestedId, branchIdFromForm(), getMenuId()),
			"Sales order sent for approval",
			"Unable to send for approval",
		);
	}, [requestedId, branchIdFromForm, getMenuId, runAction]);

	const handleApprove = React.useCallback(() => {
		if (!requestedId) return;
		return runAction(
			() => approveSalesOrder(requestedId, branchIdFromForm(), getMenuId()),
			"Sales order approved successfully",
			"Unable to approve sales order",
		);
	}, [requestedId, branchIdFromForm, getMenuId, runAction]);

	const handleReject = React.useCallback(
		(reason: string) => {
			if (!requestedId) return;
			return runAction(
				() => rejectSalesOrder(requestedId, branchIdFromForm(), getMenuId(), reason),
				"Sales order rejected",
				"Unable to reject sales order",
			);
		},
		[requestedId, branchIdFromForm, getMenuId, runAction],
	);

	const handleViewApprovalLog = React.useCallback(() => {
		toast({ title: "Opening approval log...", description: "Feature coming soon" });
	}, []);

	return {
		approvalLoading, approvalInfo, approvalPermissions, statusChipProps,
		handleApprove, handleReject, handleOpen, handleCancelDraft,
		handleReopen, handleSendForApproval, handleViewApprovalLog,
	};
};
