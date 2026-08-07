"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { ArrowLeft, FileUp } from "lucide-react";
import { tokens } from "@/styles/tokens";

interface PlaceholderStepProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onBack: () => void;
}

export default function PlaceholderStep({ title, description, icon, onBack }: PlaceholderStepProps) {
  return (
    <Box className="flex flex-col gap-4 p-6">
      {/* Header */}
      <Box className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" style={{ color: tokens.neutral[500] }} />
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
      </Box>

      {/* Placeholder content */}
      <Box className="rounded-lg border bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center">
        {icon ?? <FileUp className="w-12 h-12" style={{ color: tokens.neutral[200] }} />}
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          {description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          This section will be available soon.
        </Typography>
      </Box>
    </Box>
  );
}
