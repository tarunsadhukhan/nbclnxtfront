"use client";
import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ReportsHubLanding from "@/components/reports/ReportsHubLanding";
import NbjclReportView from "../../nbjclreports/_components/NbjclReportView";
import { fetchWinsomeReport, fetchWinsomeReportsSetup } from "@/utils/nbjclReportService";

/**
 * Winsome Reports (ports of the legacy Winsome Smart-Eye reports): /hrms/winsomereports/<group>/<report>
 * is the backend registry key "<group>/<report>"; anything else shows the hub landing.
 */
/** "Export to PDF" of these reports prints the legacy Crystal pay slips (WagesPaySlip_WIL / _OT_WIL). */
const SLIP_LAYOUTS = { "wages/wagesPayslip": "wages", "wages/wagesPayslipOt": "ot" } as const;

function Content() {
  const { slug } = useParams<{ slug?: string[] }>();
  if (!slug || slug.length !== 2) return <ReportsHubLanding title="Winsome Reports" />;
  return (
    <NbjclReportView
      reportKey={slug.join("/")}
      loadSetup={fetchWinsomeReportsSetup}
      loadReport={fetchWinsomeReport}
      hubTitle="Winsome Reports"
      slipLayouts={SLIP_LAYOUTS}
    />
  );
}

export default function WinsomeReportsPage() {
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
