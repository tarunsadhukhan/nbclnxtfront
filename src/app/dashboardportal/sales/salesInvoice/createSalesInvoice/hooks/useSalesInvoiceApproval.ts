import React from "react";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { INVOICE_STATUS_IDS, INVOICE_STATUS_LABELS } from "../utils/salesInvoiceConstants";
import {
	approveInvoice, cancelDraftInvoice, getInvoiceById, openInvoice, rejectInvoice, reopenInvoice, sendInvoiceForApproval,
	type InvoiceDetails,
} from "@/utils/salesInvoiceService";

type Params = {
	mode: MuiFormMode;
	requestedId: string;
	formValues: Record<string, unknown>;
	invoiceDetails: InvoiceDetails | null;
	coId?: string;
	getMenuId: () => string;
	setInvoiceDetails: React.Dispatch<React.SetStateAction<InvoiceDetails | null>>;
};

export const useSalesInvoiceApproval = ({ mode, requestedId, formValues, invoiceDetails, coId, getMenuId, setInvoiceDetails }: Params) => {
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	const mapStatusToId = React.useCallback((status?: string): ApprovalStatusId | null => {
		if (!status) return null;
		const n = status.toLowerCase();
		if (n.includes("draft")) return INVOICE_STATUS_IDS.DRAFT;
		if (n === "open") return INVOICE_STATUS_IDS.OPEN;
		if (n.includes("pending") || n.includes("approval")) return INVOICE_STATUS_IDS.PENDING_APPROVAL;
		if (n === "approved") return INVOICE_STATUS_IDS.APPROVED;
		if (n === "rejected" || n === "reject") return INVOICE_STATUS_IDS.REJECTED;
		if (n === "closed") return INVOICE_STATUS_IDS.CLOSED;
		if (n === "cancelled") return INVOICE_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	const statusId = React.useMemo<ApprovalStatusId>(() => {
		if (invoiceDetails?.statusId) return invoiceDetails.statusId as ApprovalStatusId;
		return mapStatusToId(invoiceDetails?.status) ?? INVOICE_STATUS_IDS.DRAFT;
	}, [invoiceDetails, mapStatusToId]);

	const getPerms = React.useCallback(
		(status: ApprovalStatusId, currentMode: MuiFormMode, apiPerms?: ApprovalActionPermissions): ApprovalActionPermissions => {
			if (apiPerms) return apiPerms;
			if (currentMode === "view") return { canViewApprovalLog: true };
			if (status === INVOICE_STATUS_IDS.DRAFT) return { canSave: true, canOpen: true, canCancelDraft: true };
			if (status === INVOICE_STATUS_IDS.CANCELLED) return { canReopen: true, canViewApprovalLog: true };
			if (status === INVOICE_STATUS_IDS.OPEN) return { canSave: true, canViewApprovalLog: true };
			if (status === INVOICE_STATUS_IDS.PENDING_APPROVAL) return { canViewApprovalLog: true };
			if (status === INVOICE_STATUS_IDS.APPROVED) return { canViewApprovalLog: true };
			if (status === INVOICE_STATUS_IDS.REJECTED) return { canReopen: true, canViewApprovalLog: true };
			return {};
		}, [],
	);

	const approvalPermissions = React.useMemo(
		() => getPerms(statusId, mode, invoiceDetails?.permissions as ApprovalActionPermissions | undefined),
		[statusId, mode, invoiceDetails?.permissions, getPerms],
	);

	const approvalInfo: ApprovalInfo = React.useMemo(() => ({
		statusId,
		statusLabel: INVOICE_STATUS_LABELS[statusId] ?? invoiceDetails?.status ?? "Draft",
		approvalLevel: invoiceDetails?.approvalLevel ?? null,
		maxApprovalLevel: invoiceDetails?.maxApprovalLevel ?? null,
		isFinalLevel: invoiceDetails?.approvalLevel != null && invoiceDetails?.maxApprovalLevel != null
			? invoiceDetails.approvalLevel >= invoiceDetails.maxApprovalLevel : false,
	}), [statusId, invoiceDetails]);

	const statusChipProps = React.useMemo(() => {
		type C = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: C =
			statusId === INVOICE_STATUS_IDS.APPROVED ? "success"
				: statusId === INVOICE_STATUS_IDS.REJECTED || statusId === INVOICE_STATUS_IDS.CANCELLED ? "error"
					: statusId === INVOICE_STATUS_IDS.PENDING_APPROVAL ? "warning" : "default";
		return { label: INVOICE_STATUS_LABELS[statusId] ?? invoiceDetails?.status ?? "Draft", color };
	}, [statusId, invoiceDetails?.status]);

	const refreshDetails = React.useCallback(async () => {
		if (!requestedId) return;
		const menuId = getMenuId();
		const detail = await getInvoiceById(requestedId, coId, menuId || undefined);
		setInvoiceDetails(detail);
	}, [requestedId, getMenuId, coId, setInvoiceDetails]);

	const branchIdFromForm = React.useCallback(() => String(formValues.branch ?? ""), [formValues.branch]);

	const handleOpen = React.useCallback(async () => {
		if (!requestedId) return;
		const branchId = branchIdFromForm();
		if (!branchId) { toast({ variant: "destructive", title: "Branch is required" }); return; }
		setApprovalLoading(true);
		try {
			await openInvoice(requestedId, branchId);
			toast({ title: "Invoice opened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to open invoice", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, branchIdFromForm, refreshDetails]);

	const handleCancelDraft = React.useCallback(async () => {
		if (!requestedId) return;
		setApprovalLoading(true);
		try {
			await cancelDraftInvoice(requestedId);
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
			await reopenInvoice(requestedId);
			toast({ title: "Invoice reopened successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reopen invoice", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, refreshDetails]);

	const handleSendForApproval = React.useCallback(async () => {
		if (!requestedId) return;
		setApprovalLoading(true);
		try {
			await sendInvoiceForApproval(requestedId);
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
			await approveInvoice(requestedId, menuId);
			toast({ title: "Invoice approved successfully" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to approve invoice", description: error instanceof Error ? error.message : "Please try again." });
		} finally { setApprovalLoading(false); }
	}, [requestedId, getMenuId, refreshDetails]);

	const handleReject = React.useCallback(async (reason: string) => {
		if (!requestedId) return;
		const menuId = getMenuId();
		if (!menuId) { toast({ variant: "destructive", title: "Menu ID required" }); return; }
		setApprovalLoading(true);
		try {
			await rejectInvoice(requestedId, reason, menuId);
			toast({ title: "Invoice rejected" });
			await refreshDetails();
		} catch (error) {
			toast({ variant: "destructive", title: "Unable to reject invoice", description: error instanceof Error ? error.message : "Please try again." });
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
