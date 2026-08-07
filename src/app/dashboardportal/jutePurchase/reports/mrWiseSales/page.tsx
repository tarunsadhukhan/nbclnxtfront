"use client";
import React from "react";
import StubReport from "../_components/StubReport";

export default function MrWiseSalesPage() {
  return (
    <StubReport
      title="Jute MR Wise Sales"
      reason="This report tracks raw-jute resale per MR, but the current schema has no raw-jute sale/dispatch source (only finished-goods sales). It will be enabled once a raw-jute sale source exists."
    />
  );
}
