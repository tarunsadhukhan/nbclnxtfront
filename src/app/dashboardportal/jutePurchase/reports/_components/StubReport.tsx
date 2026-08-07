"use client";
import React from "react";
import { Alert, Box, Typography } from "@mui/material";

interface StubReportProps {
  title: string;
  /** Why the report has no data yet — shown to the user. */
  reason: string;
}

/**
 * Placeholder for reports whose data source does not exist in the current
 * schema (#8 Claim Deviation, #12 MR Wise Sales, #13 Batch Deviation). The
 * menu entry + route exist so the report is discoverable; the body explains
 * what's missing until a source is wired up.
 */
export default function StubReport({ title, reason }: StubReportProps) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        {title}
      </Typography>
      <Alert severity="info">{reason}</Alert>
    </Box>
  );
}
