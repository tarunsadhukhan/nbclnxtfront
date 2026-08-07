"use client";
import React from "react";
import StubReport from "@/components/reports/StubReport";

export default function PayschemeSalaryPage() {
  return (
    <StubReport
      title="Payscheme Wise Salary"
      reason="This report pivots employee payroll amounts by pay component for a pay period (legacy report 544). It needs populated pay period / payroll tables — the payroll module data is not available on this tenant yet."
    />
  );
}
