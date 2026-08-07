"use client";
import React from "react";
import StubReport from "@/components/reports/StubReport";

export default function CashOutsiderPage() {
  return (
    <StubReport
      title="Daily Cash Outsider Payment"
      reason="The legacy report (682) reads the daily cash outsider payment table from the external EMPMILL12 hand-computation database, which this tenant does not have. It can be built once outsider cash payments are recorded in the portal."
    />
  );
}
