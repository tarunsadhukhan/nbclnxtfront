import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { PO_STATUS_IDS, PO_STATUS_LABELS } from "../utils/poConstants";
import {
  approvePO,
  cancelDraftPO,
  clonePO,
  getPOById,
  openPO,
  rejectPO,
  reopenPO,
  sendPOForApproval,
  type PODetails,
} from "@/utils/poService";

 type UsePOApprovalParams = {
  mode: MuiFormMode;
  requestedId: string;
  formValues: Record<string, unknown>;
  poDetails: PODetails | null;
  coId?: string;
  getMenuId: () => string;
  setPODetails: React.Dispatch<React.SetStateAction<PODetails | null>>;
};

const PO_INDEX_PATH = "/dashboardportal/procurement/purchaseOrder";

/**
 * Returns true when `err` is a backend 403 approval-level restriction:
 * e.g. "User does not have approval permission..." or
 *      "User approval level (X) does not match current...".
 */
function isApprovalPermissionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  return (
    lower.includes("approval permission") ||
    lower.includes("approval level") ||
    lower.includes("does not match current")
  );
}

/**
 * Centralises approval-state derivation and the action handlers (open/cancel/approve/etc.).
 */
export const usePOApproval = ({ mode, requestedId, formValues, poDetails, coId, getMenuId, setPODetails }: UsePOApprovalParams) => {
  const router = useRouter();
  const [approvalLoading, setApprovalLoading] = React.useState(false);

  /**
   * Maps status string to status ID. Used when statusId is not directly available.
   */
  const mapStatusToId = React.useCallback((status?: string): ApprovalStatusId | null => {
    if (!status) return null;
    const normalized = status.toLowerCase();
    if (normalized.includes("draft")) return PO_STATUS_IDS.DRAFT;
    if (normalized === "open") return PO_STATUS_IDS.OPEN;
    if (normalized.includes("pending") || normalized.includes("approval")) return PO_STATUS_IDS.PENDING_APPROVAL;
    if (normalized === "approved") return PO_STATUS_IDS.APPROVED;
    if (normalized === "rejected" || normalized === "reject") return PO_STATUS_IDS.REJECTED;
    if (normalized === "closed") return PO_STATUS_IDS.CLOSED;
    if (normalized === "cancelled") return PO_STATUS_IDS.CANCELLED;
    return null;
  }, []);

  /**
   * Derive statusId from poDetails, falling back to DRAFT (21) when not available.
   * This ensures approval bar always shows, similar to Indent implementation.
   */
  const statusId = React.useMemo<ApprovalStatusId>(() => {
    if (poDetails?.statusId) return poDetails.statusId as ApprovalStatusId;
    return mapStatusToId(poDetails?.status) ?? PO_STATUS_IDS.DRAFT;
  }, [poDetails, mapStatusToId]);

  const getApprovalPermissions = React.useCallback(
    (status: ApprovalStatusId, currentMode: MuiFormMode, apiPermissions?: ApprovalActionPermissions): ApprovalActionPermissions => {
      // If backend provides permissions, use them directly
      if (apiPermissions) return apiPermissions;
      
      // View mode only allows viewing log and cloning
      if (currentMode === "view") {
        return { canViewApprovalLog: true, canClone: true };
      }
      
      // Default permissions without backend-provided approval access
      // Note: canApprove/canReject are NOT granted by default - they require backend permission check
      if (status === PO_STATUS_IDS.DRAFT) return { canSave: true, canOpen: true, canCancelDraft: true };
      if (status === PO_STATUS_IDS.CANCELLED) return { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
      // Open status: allow save but NOT approve without backend permission
      if (status === PO_STATUS_IDS.OPEN) return { canSave: true, canViewApprovalLog: true };
      if (status === PO_STATUS_IDS.PENDING_APPROVAL) return { canSave: true, canViewApprovalLog: true };
      if (status === PO_STATUS_IDS.APPROVED) return { canViewApprovalLog: true, canClone: true };
      if (status === PO_STATUS_IDS.REJECTED) return { canSave: true, canReopen: true, canClone: true, canViewApprovalLog: true };
      return {};
    },
    [],
  );

  const approvalPermissions = React.useMemo(
    () => getApprovalPermissions(statusId, mode, poDetails?.permissions),
    [statusId, mode, poDetails?.permissions, getApprovalPermissions],
  );

  /**
   * Approval info is always defined (never null) to ensure the approval bar renders.
   * Falls back to Draft status when no status is available.
   */
  const approvalInfo: ApprovalInfo = React.useMemo(() => {
    return {
      statusId,
      statusLabel: PO_STATUS_LABELS[statusId] ?? poDetails?.status ?? "Draft",
      approvalLevel: poDetails?.approvalLevel ?? null,
      maxApprovalLevel: poDetails?.maxApprovalLevel ?? null,
      isFinalLevel: poDetails?.approvalLevel != null && poDetails?.maxApprovalLevel != null
        ? poDetails.approvalLevel >= poDetails.maxApprovalLevel
        : false,
    };
  }, [statusId, poDetails]);

  const statusChipProps = React.useMemo(() => {
    type StatusChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
    const color: StatusChipColor =
      statusId === PO_STATUS_IDS.APPROVED
        ? "success"
        : statusId === PO_STATUS_IDS.REJECTED || statusId === PO_STATUS_IDS.CANCELLED
          ? "error"
          : statusId === PO_STATUS_IDS.PENDING_APPROVAL
            ? "warning"
            : "default";
    return {
      label: PO_STATUS_LABELS[statusId] ?? poDetails?.status ?? "Draft",
      color,
    };
  }, [statusId, poDetails?.status]);

  const refreshDetails = React.useCallback(async () => {
    if (!requestedId) return;
    const menuId = getMenuId();
    if (!menuId) return;
    const detail = await getPOById(requestedId, coId, menuId || undefined);
    setPODetails(detail);
  }, [requestedId, getMenuId, coId, setPODetails]);

  const branchIdFromForm = React.useCallback(() => String(formValues.branch ?? ""), [formValues.branch]);

  const handleOpen = React.useCallback(async () => {
    if (!requestedId) return;
    const branchId = branchIdFromForm();
    const menuId = getMenuId();
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      await openPO(requestedId, branchId, menuId);
      toast({ title: "PO opened successfully" });
      await refreshDetails();
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to open PO", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

  const handleCancelDraft = React.useCallback(async () => {
    if (!requestedId) return;
    const branchId = branchIdFromForm();
    const menuId = getMenuId();
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      await cancelDraftPO(requestedId, branchId, menuId);
      toast({ title: "Draft cancelled successfully" });
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
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      await reopenPO(requestedId, branchId, menuId);
      toast({ title: "PO reopened successfully" });
      await refreshDetails();
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to reopen PO", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, branchIdFromForm, getMenuId, refreshDetails]);

  const handleSendForApproval = React.useCallback(async () => {
    if (!requestedId) return;
    const branchId = branchIdFromForm();
    const menuId = getMenuId();
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      await sendPOForApproval(requestedId, branchId, menuId);
      toast({ title: "PO sent for approval successfully" });
      await refreshDetails();
    } catch (error) {
      if (isApprovalPermissionError(error)) {
        toast({
          variant: "destructive",
          title: "Send for approval not permitted",
          description: "You do not have permission to send this purchase order for approval. Returning to the PO list.",
        });
        router.push(PO_INDEX_PATH);
      } else {
        toast({ variant: "destructive", title: "Unable to send for approval", description: error instanceof Error ? error.message : "Please try again." });
      }
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, branchIdFromForm, getMenuId, refreshDetails, router]);

  const handleApprove = React.useCallback(async () => {
    if (!requestedId) return;
    const branchId = branchIdFromForm();
    const menuId = getMenuId();
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      await approvePO(requestedId, branchId, menuId);
      toast({ title: "PO approved successfully" });
      await refreshDetails();
    } catch (error) {
      if (isApprovalPermissionError(error)) {
        toast({
          variant: "destructive",
          title: "Approval not permitted",
          description: "You do not have the required approval level for this purchase order. Returning to the PO list.",
        });
        router.push(PO_INDEX_PATH);
      } else {
        toast({ variant: "destructive", title: "Unable to approve PO", description: error instanceof Error ? error.message : "Please try again." });
      }
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, branchIdFromForm, getMenuId, refreshDetails, router]);

  const handleReject = React.useCallback(
    async (reason: string) => {
      if (!requestedId) return;
      const branchId = branchIdFromForm();
      const menuId = getMenuId();
      if (!branchId || !menuId) {
        toast({ variant: "destructive", title: "Branch and Menu ID required" });
        return;
      }
      setApprovalLoading(true);
      try {
        await rejectPO(requestedId, branchId, menuId, reason);
        toast({ title: "PO rejected successfully" });
        await refreshDetails();
      } catch (error) {
        if (isApprovalPermissionError(error)) {
          toast({
            variant: "destructive",
            title: "Rejection not permitted",
            description: "You do not have the required approval level to reject this purchase order. Returning to the PO list.",
          });
          router.push(PO_INDEX_PATH);
        } else {
          toast({
            variant: "destructive",
            title: "Unable to reject PO",
            description: error instanceof Error ? error.message : "Please try again.",
          });
        }
      } finally {
        setApprovalLoading(false);
      }
    },
    [requestedId, branchIdFromForm, getMenuId, refreshDetails, router],
  );

  const handleViewApprovalLog = React.useCallback(() => {
    if (!requestedId) return;
    // Log the query params that would be sent
    const queryParams = {
      po_id: requestedId,
      co_id: coId,
    };
    console.log("[View Approval Log] Query Params:", JSON.stringify(queryParams, null, 2));
    console.log("[View Approval Log] Endpoint: GET /api/procurement/po/approval-log");
    
    // TODO: Open approval log modal/page
    toast({ title: "Opening approval log...", description: "Feature coming soon" });
  }, [requestedId, coId]);

  const handleClone = React.useCallback(async () => {
    if (!requestedId) return;
    const branchId = branchIdFromForm();
    const menuId = getMenuId();
    if (!branchId || !menuId) {
      toast({ variant: "destructive", title: "Branch and Menu ID required" });
      return;
    }
    setApprovalLoading(true);
    try {
      const result = await clonePO(requestedId, branchId, menuId);
      toast({ title: "PO cloned successfully" });
      // Navigate to the new PO in edit mode
      if (result?.id) {
        // Use router to navigate - this will be handled by the page
        window.location.href = `/dashboardportal/procurement/purchaseOrder/createPO?mode=edit&id=${result.id}&branch_id=${branchId}`;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to clone PO",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, branchIdFromForm, getMenuId]);

  return {
    approvalLoading,
    approvalInfo,
    approvalPermissions,
    statusChipProps,
    handleApprove,
    handleReject,
    handleOpen,
    handleCancelDraft,
    handleReopen,
    handleSendForApproval,
    handleViewApprovalLog,
    handleClone,
  };
};
