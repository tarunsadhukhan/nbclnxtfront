"use client";
import React from "react";
import StubReport from "../_components/StubReport";

export default function ClaimDeviationPage() {
  return (
    <StubReport
      title="Jute Claim Deviation"
      reason="This report compares the advised claim against the actual claim, but the current schema records only the actual claim (no 'advised claim' figure). It will be enabled once that data source is available."
    />
  );
}
