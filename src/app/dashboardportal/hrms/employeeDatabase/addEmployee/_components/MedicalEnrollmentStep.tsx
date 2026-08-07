"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tokens } from "@/styles/tokens";
import type { PfDetails, EsiDetails } from "../../types/employeeTypes";
import PfEsiStep from "./PfEsiStep";

interface MedicalEnrollmentStepProps {
  pfData: PfDetails | null;
  esiData: EsiDetails | null;
  disabled: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onPfChange: (data: Partial<PfDetails>) => void;
  onEsiChange: (data: Partial<EsiDetails>) => void;
}

export default function MedicalEnrollmentStep({
  pfData,
  esiData,
  disabled,
  saving,
  onBack,
  onSave,
  onPfChange,
  onEsiChange,
}: MedicalEnrollmentStepProps) {
  return (
    <Box className="flex flex-col gap-4 p-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" style={{ color: tokens.neutral[500] }} />
          <Typography variant="h6" fontWeight={600}>
            Medical Enrollments, ESI, PF
          </Typography>
        </Box>
        {!disabled && (
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        )}
      </Box>

      {/* Content */}
      <Box className="rounded-lg border bg-white p-6 shadow-sm">
        <PfEsiStep
          pfData={pfData}
          esiData={esiData}
          onPfChange={onPfChange}
          onEsiChange={onEsiChange}
          disabled={disabled}
        />
      </Box>
    </Box>
  );
}
