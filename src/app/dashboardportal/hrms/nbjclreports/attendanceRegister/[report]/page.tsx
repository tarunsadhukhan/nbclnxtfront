"use client";
import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import NbjclReportView from "../../_components/NbjclReportView";
import { fetchAttendanceRegisterReport, fetchAttendanceRegisterSetup } from "@/utils/nbjclReportService";

/**
 * NBJCL Reports > Attendance Register — one page for all 16 reports of the group. The route's
 * last segment is the report key (it matches the seeded menu path).
 */
function Content() {
  const { report } = useParams<{ report: string }>();
  return <NbjclReportView reportKey={report} loadSetup={fetchAttendanceRegisterSetup} loadReport={fetchAttendanceRegisterReport} />;
}

export default function NbjclAttendanceRegisterReportPage() {
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
