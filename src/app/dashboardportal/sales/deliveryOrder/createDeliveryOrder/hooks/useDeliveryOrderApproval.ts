import React from "react";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { DO_STATUS_IDS, DO_STATUS_LABELS } from "../utils/deliveryOrderConstants";
import {
	approveDO, cancelDraftDO, getDOById, openDO, rejectDO, reopenDO, sendDOForApproval,
	type DODetails,
} from "@/utils/deliveryOrderService";

type Params = {
	mode: MuiFormMode;
	requestedId: string;
	formValues: Record<string, unknown>;
	doDetails: DODetails | null;
	coId?: string;
	getMenuId: () => string;
	setDODetails: React.Dispatch<React.SetStateAction<DODetails | null>>;
};

export const useDeliveryOrderApproval = ({ mode, requestedId, formValues, doDetails, coId, getMenuId, setDODetails }: Params) => {
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	const mapStatusToId = React.useCallback((status?: string): ApprovalStatusId | null => {
		if (!status) return null;
		const n = status.toLowerCase();
		if (n.includes("draft")) return DO_STATUS_IDS.DRAFT;
		if (n === "open") return DO_STATUS_IDS.OPEN;
		if (n.includes("pending") || n.includes("approval")) return DO_STATUS_IDS.PENDING_APPROVAL;
		if (n === "approved") return DO_STATUS_IDS.APPROVED;
		if (n === "rejected" || n === "reject") return DO_STATUS_IDS.REJECTED;
		if (n === "closed") return DO_STATUS_IDS.CLOSED;
		if (n === "cancelled") return DO_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	const statusId = React.useMemo<ApprovalStatusId>(() => {
		if (doDetails?.statusId) return doDetails.statusId as ApprovalStatusId;
		return mapStatusToId(doDetails?.status) ?? DO_STATUS_IDS.DRAFT;
	}, [doDetails, mapStatusToId]);

	const getPerms = React.useCallback(
		(status: ApprovalStatusId, currentMode: MuiFormMode, apiPerms?: ApprovalActionPermissions): ApprovalActionPermissions => {
			if (apiPerms) return apiPerms;
			if (currentMode === "view") return { canViewApprovalLog: true };
			if (status === DO_STATUS_IDS.DRAFT) return { canSave: true, canOpen: true, canCancelDraft: true };
			if (status === DO_STATUS_IDS.CANCELLED) return { canReopen: true, canViewApprovalLog: true };
			if (status === DO_STATUS_IDS.OPEN) return { canSave: true, canViewApprovalLog: true };
			if (status === DO_STATUS_IDS.PENDING_APPROVAL) return { canViewApprovalLog: true };
			if (status === DO_STATUS_IDS.APPROVED) return { canViewApprovalLog: true };
			if (status === DO_STATUS_IDS.REJECTED) return { canReopen: true, canViewApprovalLog: true };
			return {};
		}, [],
	);

	const approvalPermissions = React.useMemo(
		() => getPerms(statusId, mode, doDetails?.permissions as ApprovalActionPermissions | undefined),
		[statusId, mode, doDetails?.permissions, getPerms],
	);

	const approvalInfo: ApprovalInfo = React.useMemo(() => ({
		statusId,
		statusLabel: DO_STATUS_LABELS[statusId] ?? doDetails?.status ?? "Draft",
		approvalLevel: doDetails?.approvalLevel ?? null,
		maxApprovalLevel: doDetails?.maxApprovalLevel ?? null,
		isFinalLevel: doDetails?.approvalLevel != null && doDetails?.maxApprovalLevel != null
			? doDetails.approvalLevel >= doDetails.maxApprovalLevel : false,
	}), [statusId, doDetails]);

	const statusChipProps = React.useMemo(() => {
		type C = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: C =
			statusId === DO_STATUS_IDS.APPROVED ? "success"
				: statusId === DO_STATUS_IDS.REJECTED || statusId === DO_STATUS_IDS.CANCELLED ? "error"
					: statusId === DO_STATUS_IDS.PENDING_APPROVAL ? "warning" : "default";
		return { label: DO_STATUS_LABELS[statusId] ?? doDetails?.status ?? "Draft", color };
	}, [statusId, doDetails?.status]);

	const refreshDetails = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		const detail = await getDOById(requestedId, coId, menuId || undefined);
		setDODetails(detail);
	}, [requestedId, getMenuId, coId, setDODetails]);

	const branchIdFromForm = React.useCallback(() => String(formValues.branch ?? ""), [formValues.branch]);

	const handleOpen = React.useCallback(async () => {
		if (!requestedId) return;
		const branchId = branchIdFromForm();
		if (!branchId) { toast({ variant: "destructive", title: "Branch is required" }); return; }
		setApprovalLoading(true);
		try {
			await openDO(requestedId, branchId);
			toast({ title: "Delivery order opened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to open DO", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, branchIdFromForm, refreshDetails]);

	const handleCancelDraft = React.useCallback(async () => {
		if (!requestedId) return;
		setApprovalLoading(true);
		try {
			await cancelDraftDO(requestedId);
			toast({ title: "Draft cancelled successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to cancel draft", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, refreshDetails]);

	const handleReopen = React.useCallback(async () => {
		if (!requestedId) return;
		setApprovalLoading(true);
		try {
			await reopenDO(requestedId);
			toast({ title: "Delivery order reopened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reopen DO", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, refreshDetails]);

	const handleSendForApproval = React.useCallback(async () => {
		if (!requestedId) return;
		setApprovalLoading(true);
		try {
			await sendDOForApproval(requestedId);
			toast({ title: "Sent for approval successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to send for approval", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, refreshDetails]);

	const handleApprove = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		if (!menuId) { toast({ variant: "destructive", title: "Menu ID required" }); return; }
		setApprovalLoading(true);
		try {
			await approveDO(requestedId, menuId);
			toast({ title: "Delivery order approved successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to approve DO", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, getMenuId, refreshDetails]);

	const handleReject = React.useCallback(async (reason: string) => {
		if (!requestedId) return;
		const menuId = getMenuId();
		if (!menuId) { toast({ variant: "destructive", title: "Menu ID required" }); return; }
		setApprovalLoading(true);
		try {
			await rejectDO(requestedId, reason, menuId);
			toast({ title: "Delivery order rejected" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reject DO", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, getMenuId, refreshDetails]);

	const handleViewApprovalLog = React.useCallback(() => {
		toast({ title: "Opening approval log...", description: "Feature coming soon" });
	}, []);

	return {
		approvalLoading, approvalInfo, approvalPermissions, statusChipProps,
		handleApprove, handleReject, handleOpen, handleCancelDraft,
		handleReopen, handleSendForApproval, handleViewApprovalLog,
	};
};
