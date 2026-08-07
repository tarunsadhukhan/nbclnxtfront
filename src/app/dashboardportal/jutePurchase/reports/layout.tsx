"use client";
import React from "react";
import { Box, Button } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const HUB = "/dashboardportal/jutePurchase/reports";

/**
 * Wraps the jute report pages. Shows a "Back to Reports" button on every
 * individual report route, hidden on the hub (the dropdown page) itself.
 */
export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isHub = (pathname ?? "").replace(/\/$/, "") === HUB;

  return (
    <>
      {!isHub && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowLeft size={18} />}
            onClick={() => {
              // Prefer history back so the hub returns with its dropdown +
              // branch/date already populated. Fall back to a fresh push only
              // when there's no in-app history (e.g. a direct refresh/deep link).
              if (window.history.length > 1) router.back();
              else router.push(HUB);
            }}
            sx={{ textTransform: "none", color: "#0C3C60" }}
          >
            Back to Reports
          </Button>
        </Box>
      )}
      {children}
    </>
  );
}
