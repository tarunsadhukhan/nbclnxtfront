"use client";

import React from "react";
import { Paper, Typography, Box, Chip } from "@mui/material";
import type { LeaveLedgerEntry } from "../../types/leaveRequestTypes";

interface LeaveBalancePanelProps {
  ledger: LeaveLedgerEntry[];
  selectedLeaveTypeId?: number;
}

export default function LeaveBalancePanel({
  ledger,
  selectedLeaveTypeId,
}: LeaveBalancePanelProps) {
  if (!ledger.length) return null;

  const filtered = selectedLeaveTypeId
    ? ledger.filter((l) => l.leave_type_id === selectedLeaveTypeId)
    : ledger;

  return (
    <Paper className="p-4">
      <Typography variant="subtitle1" className="mb-3 font-semibold">
        Leave Balance
      </Typography>
      <Box className="flex flex-wrap gap-3">
        {filtered.map((entry) => (
          <Box
            key={entry.leave_type_id}
            className="flex flex-col gap-1 rounded-md border p-3"
            sx={{ minWidth: 180 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {entry.leave_type}
            </Typography>
            <Box className="flex gap-2">
              <Chip
                size="small"
                label={`Month: ${entry.leaves_taken_this_month ?? 0} / ${entry.max_leaves_per_month}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Year: ${entry.leaves_taken_this_year ?? 0} / ${entry.leaves_per_year}`}
                variant="outlined"
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
