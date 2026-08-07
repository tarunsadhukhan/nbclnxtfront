"use client";

/**
 * @component JutePOApprovalBar
 * @description Renders the approval status chip and action buttons for Jute PO.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import type { ApprovalInfo, ApprovalActionPermissions } from "../types/jutePOTypes";

type JutePOApprovalBarProps = {
  approvalInfo: ApprovalInfo;
  permissions: ApprovalActionPermissions;
  loading: boolean;
  onOpen?: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onCancelDraft?: () => void;
  onReopen?: () => void;
};

export function JutePOApprovalBar({
  approvalInfo,
  permissions,
  loading,
  onOpen,
  onApprove,
  onReject,
  onCancelDraft,
  onReopen,
}: JutePOApprovalBarProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const handleRejectConfirm = () => {
    if (onReject) {
      onReject(rejectReason);
    }
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  const getChipColor = () => {
    switch (approvalInfo.statusColor) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Chip */}
        <Chip
          label={approvalInfo.statusLabel}
          color={getChipColor()}
          size="small"
          className="font-medium"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {permissions.canOpen && onOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpen}
              disabled={loading}
            >
              Open
            </Button>
          )}

          {permissions.canApprove && onApprove && (
            <Button
              variant="default"
              size="sm"
              onClick={onApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
          )}

          {permissions.canReject && onReject && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRejectDialogOpen(true)}
              disabled={loading}
            >
              Reject
            </Button>
          )}

          {permissions.canCancelDraft && onCancelDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelDraft}
              disabled={loading}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel Draft
            </Button>
          )}

          {permissions.canReopen && onReopen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReopen}
              disabled={loading}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Jute PO</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRejectConfirm}
            disabled={!rejectReason.trim()}
          >
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default JutePOApprovalBar;
