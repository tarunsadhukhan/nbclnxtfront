"use client";

import React from "react";
import { Box, Typography, LinearProgress, IconButton, Chip } from "@mui/material";
import { ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tokens } from "@/styles/tokens";
import type { WizardStep } from "../../types/employeeTypes";
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

interface StepOverviewProps {
  steps: readonly WizardStep[];
  completedSteps: Set<number>;
  progress: number;
  mode: "create" | "edit" | "view";
  ebId: number | null;
  statusId: number | undefined;
  onStepClick: (stepIndex: number) => void;
  onActionClick?: (statusId: number, label: string) => void;
  onBack: () => void;
}

// ─── Step Card ─────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  isCompleted,
  onClick,
}: {
  step: WizardStep;
  index: number;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50 transition-colors"
    >
      <Box className="flex items-center gap-4">
        {/* Step indicator circle */}
        {isCompleted ? (
          <Box
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            sx={{ backgroundColor: tokens.brand.primary }}
          >
            <Check className="w-5 h-5 text-white" />
          </Box>
        ) : (
          <Box
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2"
            sx={{ borderColor: tokens.neutral[200], color: tokens.neutral[500] }}
          >
            <Typography variant="body2" fontWeight={600}>
              {index + 1}
            </Typography>
          </Box>
        )}

        {/* Step text */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            {step.step_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {step.description}
          </Typography>
        </Box>
      </Box>

      {/* Right side: optional button + arrow */}
      <Box className="flex items-center gap-3 shrink-0">
        {step.rightButton && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
            {step.rightButton}
          </Button>
        )}
        <IconButton
          onClick={onClick}
          aria-label={`Navigate to ${step.step_name}`}
          sx={{
            border: `1px solid ${tokens.neutral[200]}`,
            width: 36,
            height: 36,
          }}
        >
          <ChevronRight className="w-5 h-5" style={{ color: tokens.neutral[500] }} />
        </IconButton>
      </Box>
    </Box>
  );
}

// ─── Main component ────────────────────────────────────────────────

export default function StepOverview({
  steps,
  completedSteps,
  progress,
  mode,
  ebId,
  statusId,
  onStepClick,
  onActionClick,
  onBack,
}: StepOverviewProps) {
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

      {/* ── Step cards ─────────────────────────────────────────── */}
      <Box className="rounded-lg border bg-white shadow-sm mx-6 mb-6 overflow-hidden">
        {steps.map((step, idx) => (
          <StepCard
            key={step.step_id}
            step={step}
            index={idx}
            isCompleted={completedSteps.has(idx)}
            onClick={() => onStepClick(idx)}
          />
        ))}
      </Box>
    </Box>
  );
}
