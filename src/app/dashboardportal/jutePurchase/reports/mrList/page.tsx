"use client";
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import MrListReport from "../_components/MrListReport";
import type { BranchOption } from "../types/reportTypes";

/**
 * MR List report page. Reached from the reports dropdown via menu_path
 * `jutePurchase/reports/mrList`. MrListReport carries its own branch + date-range
 * filter bar, so this page only supplies company scope and the branch options.
 */
export default function MrListReportPage() {
  const { selectedCompany } = useSidebarContext();
  const coId = selectedCompany?.co_id ?? null;

  const branches: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        MR List Report
      </Typography>
      <MrListReport coId={coId} branches={branches} />
    </Box>
  );
}
