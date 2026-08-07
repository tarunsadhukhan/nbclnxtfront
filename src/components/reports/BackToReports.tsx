"use client";
import React from "react";
import { Box, Button } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * "Back to Reports" link shown above an individual report.
 *
 * Goes back in history when there is somewhere to go back to, otherwise
 * straight to `hub` — so a report opened directly by URL still lands
 * somewhere useful. Report *hub* pages must not render this.
 *
 * Module report folders get this from their `layout.tsx`; report pages that
 * sit outside their hub's folder (e.g. hrms/attendanceChecklist) render it
 * themselves.
 */
export default function BackToReports({ hub }: { hub: string }) {
  const router = useRouter();

  return (
    <Box sx={{ px: 3, pt: 2 }} className="print:hidden">
      <Button
        variant="text"
        startIcon={<ArrowLeft size={18} />}
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(hub);
        }}
        sx={{ textTransform: "none", color: "#0C3C60" }}
      >
        Back to Reports
      </Button>
    </Box>
  );
}
