"use client";

import React from "react";
import { Chip, Stack } from "@mui/material";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

export type ApprovalStatusId = 1 | 3 | 4 | 5 | 6 | 20 | 21;

export type ApprovalActionPermissions = {
  canSave?: boolean;
  canOpen?: boolean;
  canCancelDraft?: boolean;
  canReopen?: boolean;
  canSendForApproval?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canViewApprovalLog?: boolean;
  canClone?: boolean;
};

export type ApprovalInfo = {
  statusId: ApprovalStatusId;
  statusLabel: string;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  isFinalLevel?: boolean;
};

export type ApprovalActionsBarProps = {
  approvalInfo: ApprovalInfo;
  permissions: ApprovalActionPermissions;
  menuCode?: string;
  onSave?: () => void;
  onOpen?: () => void;
  onCancelDraft?: () => void;
  onReopen?: () => void;
  onSendForApproval?: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onViewApprovalLog?: () => void;
  onClone?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type VisibleButton = {
  id: string;
  label: string;
  variant: "default" | "secondary" | "outline" | "ghost" | "destructive" | "primary" | "success";
  onClick: () => void;
  disabled?: boolean;
};

const getStatusBadgeColor = (statusId: ApprovalStatusId): "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" => {
  switch (statusId) {
    case 21: // Drafted
      return "default";
    case 1: // Open
      return "primary";
    case 20: // Pending Approval
      return "warning";
    case 3: // Approved
      return "success";
    case 4: // Rejected
      return "error";
    case 5: // Closed
      return "default";
    case 6: // Cancelled
      return "default";
    default:
      return "default";
  }
};

const getVisibleButtons = (
  approvalInfo: ApprovalInfo,
  permissions: ApprovalActionPermissions,
  handlers: {
    onSave?: () => void;
    onOpen?: () => void;
    onCancelDraft?: () => void;
    onReopen?: () => void;
    onSendForApproval?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onViewApprovalLog?: () => void;
    onClone?: () => void;
  }
): VisibleButton[] => {
  const { statusId } = approvalInfo;
  const buttons: VisibleButton[] = [];

  // Drafted (21)
  if (statusId === 21) {
    if (permissions.canOpen && handlers.onOpen) {
      buttons.push({
        id: "open",
        label: "Open",
        variant: "primary" as const,
        onClick: handlers.onOpen,
      });
    }
    if (permissions.canCancelDraft && handlers.onCancelDraft) {
      buttons.push({
        id: "cancel-draft",
        label: "Cancel Draft",
        variant: "ghost",
        onClick: handlers.onCancelDraft,
      });
    }
  }

  // Cancelled (6)
  if (statusId === 6) {
    if (permissions.canReopen && handlers.onReopen) {
      buttons.push({
        id: "reopen",
        label: "Re-Open",
        variant: "secondary",
        onClick: handlers.onReopen,
      });
    }
  }

  // Open (1) - Approve directly, or Send for Approval when the caller opts in
  // (the shared backend permission builder never grants canSendForApproval, so
  // modules that take their permissions from the API are unaffected).
  if (statusId === 1) {
    if (permissions.canSendForApproval && handlers.onSendForApproval) {
      buttons.push({
        id: "send-for-approval",
        label: "Send for Approval",
        variant: "primary" as const,
        onClick: handlers.onSendForApproval,
      });
    }
    if (permissions.canApprove && handlers.onApprove) {
      buttons.push({
        id: "approve",
        label: "Approve",
        variant: "success" as const,
        onClick: handlers.onApprove,
      });
    }
  }

  // Pending Approval (20)
  if (statusId === 20) {
    if (permissions.canApprove && handlers.onApprove) {
      buttons.push({
        id: "approve",
        label: "Approve",
        variant: "success" as const,
        onClick: handlers.onApprove,
      });
    }
    if (permissions.canReject && handlers.onReject) {
      buttons.push({
        id: "reject",
        label: "Reject",
        variant: "destructive",
        onClick: handlers.onReject,
      });
    }
    if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
      buttons.push({
        id: "view-approval-log",
        label: "View Approval Log",
        variant: "outline",
        onClick: handlers.onViewApprovalLog,
      });
    }
  }

  // Approved (3)
  if (statusId === 3) {
    if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
      buttons.push({
        id: "view-approval-log",
        label: "View Approval Log",
        variant: "outline",
        onClick: handlers.onViewApprovalLog,
      });
    }
    if (permissions.canClone && handlers.onClone) {
      buttons.push({
        id: "clone",
        label: "Clone",
        variant: "outline",
        onClick: handlers.onClone,
      });
    }
  }

  // Rejected (4)
  if (statusId === 4) {
    if (permissions.canReopen && handlers.onReopen) {
      buttons.push({
        id: "reopen",
        label: "Re-Open",
        variant: "secondary",
        onClick: handlers.onReopen,
      });
    }
    if (permissions.canClone && handlers.onClone) {
      buttons.push({
        id: "clone",
        label: "Clone",
        variant: "outline",
        onClick: handlers.onClone,
      });
    }
    if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
      buttons.push({
        id: "view-approval-log",
        label: "View Approval Log",
        variant: "outline",
        onClick: handlers.onViewApprovalLog,
      });
    }
  }

  // Closed (5)
  if (statusId === 5) {
    if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
      buttons.push({
        id: "view-approval-log",
        label: "View Approval Log",
        variant: "outline",
        onClick: handlers.onViewApprovalLog,
      });
    }
  }

  return buttons;
};

export function ApprovalActionsBar({
  approvalInfo,
  permissions,
  menuCode,
  onSave,
  onOpen,
  onCancelDraft,
  onReopen,
  onSendForApproval,
  onApprove,
  onReject,
  onViewApprovalLog,
  onClone,
  loading = false,
  disabled = false,
}: ApprovalActionsBarProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const handleRejectClick = React.useCallback(() => {
    if (!onReject) return;
    setRejectDialogOpen(true);
  }, [onReject]);

  const handleRejectConfirm = React.useCallback(() => {
    if (!onReject) return;
    onReject(rejectReason.trim() || "No reason provided");
    setRejectDialogOpen(false);
    setRejectReason("");
  }, [onReject, rejectReason]);

  const handleRejectCancel = React.useCallback(() => {
    setRejectDialogOpen(false);
    setRejectReason("");
  }, []);

  const handlers = React.useMemo(
    () => ({
      onSave,
      onOpen,
      onCancelDraft,
      onReopen,
      onSendForApproval,
      onApprove,
      onReject: handleRejectClick,
      onViewApprovalLog,
      onClone,
    }),
    [onSave, onOpen, onCancelDraft, onReopen, onSendForApproval, onApprove, handleRejectClick, onViewApprovalLog, onClone]
  );

  const visibleButtons = React.useMemo(
    () => getVisibleButtons(approvalInfo, permissions, handlers),
    [approvalInfo, permissions, handlers]
  );

  const statusBadgeColor = React.useMemo(() => getStatusBadgeColor(approvalInfo.statusId), [approvalInfo.statusId]);

  const statusLabel = React.useMemo(() => {
    if (approvalInfo.statusId === 20 && approvalInfo.approvalLevel != null) {
      return `Pending Approval L${approvalInfo.approvalLevel}`;
    }
    return approvalInfo.statusLabel;
  }, [approvalInfo]);

  if (visibleButtons.length === 0 && !approvalInfo.statusId) {
    return null;
  }

  return (
    <>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
        {approvalInfo.statusId ? (
          <Chip label={statusLabel} color={statusBadgeColor} size="small" sx={{ fontWeight: 500 }} />
        ) : null}
        {visibleButtons.map((button) => (
            <Button
            key={button.id}
            variant={button.variant === "primary" || button.variant === "success" ? "default" : button.variant}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              button.onClick?.();
            }}
            disabled={button.disabled || disabled || loading}
            className={button.variant === "success" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {button.label}
          </Button>
        ))}
      </Stack>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reject-reason" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Rejection Reason *
              </label>
              <AutoResizeTextarea
                id="reject-reason"
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                minHeight={80}
                maxHeight={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

