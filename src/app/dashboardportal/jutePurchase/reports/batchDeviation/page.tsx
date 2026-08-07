"use client";
import React from "react";
import StubReport from "../_components/StubReport";

export default function BatchDeviationPage() {
  return (
    <StubReport
      title="Jute Batch Deviation"
      reason="This report was sourced from an external production API (task code 1024) that is not yet integrated with this system. It will be enabled once that API is wired up."
    />
  );
}
