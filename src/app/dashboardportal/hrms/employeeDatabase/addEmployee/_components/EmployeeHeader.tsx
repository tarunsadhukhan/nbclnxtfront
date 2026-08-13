"use client";

import React from "react";
import { Box, Typography, LinearProgress, Chip } from "@mui/material";
import { Button } from "@/components/ui/button";
import { tokens } from "@/styles/tokens";
import { EMPLOYEE_LIFECYCLE_STATUS } from "../../types/employeeTypes";

// ─── Status-aware action button definitions ────────────────────────

interface ActionButtonDef {
  label: string;
  statusId: number;
  color: string;
}

/** Buttons shown before any lifecycle status is set (after save, before Joined) */
const INITIAL_ACTIONS: ActionButtonDef[] = [
  { label: "Joined", statusId: EMPLOYEE_LIFECYCLE_STATUS.JOINED, color: tokens.brand.primary },
  { label: "Rejected", statusId: EMPLOYEE_LIFECYCLE_STATUS.REJECTED, color: "#E91E63" },
  { label: "Blacklisted", statusId: EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED, color: "#E91E63" },
];

/** Buttons shown after employee has "Joined" status */
const POST_JOIN_ACTIONS: ActionButtonDef[] = [
  { label: "Blacklist", statusId: EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED, color: "#E91E63" },
  { label: "Terminate", statusId: EMPLOYEE_LIFECYCLE_STATUS.TERMINATED, color: "#E91E63" },
  { label: "Resign", statusId: EMPLOYEE_LIFECYCLE_STATUS.RESIGNED, color: "#FF9800" },
  { label: "Retired", statusId: EMPLOYEE_LIFECYCLE_STATUS.RETIRED, color: "#607D8B" },
];

const DIALOG_STATUSES: Set<number> = new Set([
  EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED,
  EMPLOYEE_LIFECYCLE_STATUS.TERMINATED,
  EMPLOYEE_LIFECYCLE_STATUS.RESIGNED,
  EMPLOYEE_LIFECYCLE_STATUS.RETIRED,
]);

/** Map status_id → display label */
const STATUS_LABEL: Record<number, string> = {
  [EMPLOYEE_LIFECYCLE_STATUS.JOINED]: "Joined",
  [EMPLOYEE_LIFECYCLE_STATUS.REJECTED]: "Rejected",
  [EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED]: "Blacklisted",
  [EMPLOYEE_LIFECYCLE_STATUS.RESIGNED]: "Resigned",
  [EMPLOYEE_LIFECYCLE_STATUS.IN_NOTICE]: "In Notice",
  [EMPLOYEE_LIFECYCLE_STATUS.TERMINATED]: "Terminated",
  [EMPLOYEE_LIFECYCLE_STATUS.RETIRED]: "Retired",
};

function getStatusChipColor(statusId: number): "success" | "error" | "warning" | "default" {
  if (statusId === EMPLOYEE_LIFECYCLE_STATUS.JOINED) return "success";
  if (([EMPLOYEE_LIFECYCLE_STATUS.REJECTED, EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED, EMPLOYEE_LIFECYCLE_STATUS.TERMINATED] as number[]).includes(statusId)) return "error";
  if (([EMPLOYEE_LIFECYCLE_STATUS.RESIGNED, EMPLOYEE_LIFECYCLE_STATUS.IN_NOTICE] as number[]).includes(statusId)) return "warning";
  return "default";
}

/** Determine which action buttons to show based on current status */
function getActionsForStatus(statusId: number | undefined): ActionButtonDef[] {
  if (!statusId) return [];
  if (statusId === EMPLOYEE_LIFECYCLE_STATUS.JOINED) return POST_JOIN_ACTIONS;
  // If still in draft/open/approved (pre-lifecycle), show initial actions
  if (![...Object.values(EMPLOYEE_LIFECYCLE_STATUS)].includes(statusId as never)) return INITIAL_ACTIONS;
  // Terminal statuses (blacklisted, terminated, resigned, retired, rejected) — no further actions
  return [];
}

export { DIALOG_STATUSES };

// ─── Props ─────────────────────────────────────────────────────────

interface EmployeeHeaderProps {
  progress: number;
  mode: "create" | "edit" | "view";
  ebId: number | null;
  statusId: number | undefined;
  onActionClick?: (statusId: number, label: string) => void;
  onBack: () => void;
}

// ─── Main component ────────────────────────────────────────────────

export default function EmployeeHeader({
  progress,
  mode,
  ebId,
  statusId,
  onActionClick,
  onBack,
}: EmployeeHeaderProps) {
  const title = mode === "create" ? "Add Employee" : mode === "edit" ? "Edit Employee" : "View Employee";
  const actions = ebId ? getActionsForStatus(statusId) : [];
  const statusLabel = statusId ? STATUS_LABEL[statusId] : undefined;

  return (
    <Box className="flex flex-col gap-0">
      {/* ── Header row ─────────────────────────────────────────── */}
      <Box className="flex items-start justify-between px-6 pt-6 pb-2">
        {/* Left: back arrow + title */}
        <Box className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1 }}>
            {"<"}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: tokens.brand.secondary }}>
            {title}
          </Typography>
        </Box>

        {/* Right: progress bar */}
        <Box className="flex flex-col items-end" sx={{ minWidth: 220 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Completed
          </Typography>
          <Box className="flex items-center gap-2 w-full">
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                backgroundColor: tokens.neutral[200],
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  backgroundColor: tokens.brand.primary,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Subtitle + status chip + action buttons row ──────────── */}
      <Box className="flex items-center justify-between px-6 pb-4">
        <Box className="flex items-center gap-3">
          <Typography variant="body2" color="text.secondary">
            Complete the steps below to add employee to your organisation
          </Typography>
          {statusLabel && (
            <Chip
              label={statusLabel}
              size="small"
              color={getStatusChipColor(statusId!)}
              variant="filled"
            />
          )}
        </Box>

        {/* Action buttons (only show when employee is saved) */}
        {actions.length > 0 && mode !== "create" && (
          <Box className="flex items-center gap-2">
            {actions.map((btn) => (
              <Button
                key={btn.label}
                size="sm"
                onClick={() => onActionClick?.(btn.statusId, btn.label)}
                style={{
                  backgroundColor: btn.color,
                  color: "#fff",
                  borderColor: btn.color,
                }}
              >
                {btn.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>

    </Box>
  );
}
