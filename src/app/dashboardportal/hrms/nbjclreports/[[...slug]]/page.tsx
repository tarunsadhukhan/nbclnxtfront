import React from "react";
import ReportsHubLanding from "@/components/reports/ReportsHubLanding";

// ponytail: one landing for the hub and every not-yet-built NBJCL report route;
// a real report gets its own folder beside this one, which Next resolves first.
export default function NbjclReportsPage() {
  return <ReportsHubLanding title="NBJCL Reports" />;
}
