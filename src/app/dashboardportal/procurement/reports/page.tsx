"use client";

import * as React from "react";
import { Box, MenuItem, Paper, Select, Typography } from "@mui/material";
import { reportConfig, ReportKey, reportOrder } from "./_components/reportConfig";

export default function ProcurementReportsHub() {
  const [mounted, setMounted] = React.useState(false);
  const [selected, setSelected] = React.useState<ReportKey>("all-indent-itemwise");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const ActiveReport = reportConfig[selected].component;

  return (
    <Box className="min-h-screen bg-gray-50 p-8">
      <Box className="mx-auto max-w-7xl">
        <Box className="mb-6 flex flex-col gap-2">
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Procurement Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operational reports across indents, POs, and SRs
          </Typography>
        </Box>

        <Paper sx={{ mb: 2 }}>
          <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2" fontWeight={600}>
              Report:
            </Typography>
            <Select
              size="small"
              value={selected}
              onChange={e => setSelected(e.target.value as ReportKey)}
              sx={{ minWidth: 380 }}
            >
              {reportOrder.map(k => (
                <MenuItem key={k} value={k}>
                  {reportConfig[k].label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Paper>

        <Paper>
          <ActiveReport />
        </Paper>
      </Box>
    </Box>
  );
}
