"use client";
import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ReportsHubLanding from "@/components/reports/ReportsHubLanding";
import NbjclReportView from "../_components/NbjclReportView";
import { fetchNbjclReport, fetchNbjclReportsSetup } from "@/utils/nbjclReportService";

/**
 * NBJCL Reports hub and every report group except Attendance Register (which has its own route):
 * /hrms/nbjclreports/<group>/<report> is the backend registry key "<group>/<report>"; anything else
 * (the hub itself, a report not ported yet) shows the landing.
 */
function Content() {
  const { slug } = useParams<{ slug?: string[] }>();
  if (!slug || slug.length !== 2) return <ReportsHubLanding title="NBJCL Reports" />;
  return <NbjclReportView reportKey={slug.join("/")} loadSetup={fetchNbjclReportsSetup} loadReport={fetchNbjclReport} />;
}

export default function NbjclReportsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <Content />
    </Suspense>
  );
}
