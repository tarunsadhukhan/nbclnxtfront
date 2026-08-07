"use client";
import React from "react";
import { usePathname } from "next/navigation";
import BackToReports from "@/components/reports/BackToReports";

const HUB = "/dashboardportal/hrms/hrmsreports";

/**
 * Wraps the HRMS report pages. Shows a "Back to Reports" button on every
 * individual report route, hidden on the hub (the dropdown page) itself.
 */
export default function HrmsReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHub = (pathname ?? "").replace(/\/$/, "") === HUB;

  return (
    <>
      {!isHub && <BackToReports hub={HUB} />}
      {children}
    </>
  );
}
