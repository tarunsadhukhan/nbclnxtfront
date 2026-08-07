"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from "@mui/material";
import { Button } from "@/components/ui/button";

export interface StatusActionDialogProps {
  open: boolean;
  actionLabel: string;
  onConfirm: (date: string, reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function StatusActionDialog({
  open,
  actionLabel,
  onConfirm,
  onCancel,
  loading,
}: StatusActionDialogProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!date) return;
    onConfirm(date, reason);
    setDate("");
    setReason("");
  };

  const handleCancel = () => {
    setDate("");
    setReason("");
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{actionLabel}</DialogTitle>
      <DialogContent>
        <Box className="flex flex-col gap-4 pt-2">
          <TextField
            label={`Date of ${actionLabel}`}
            type="date"
            size="small"
            fullWidth
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Reason"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!date || loading}>
          {loading ? "Saving..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
