"use client";

import React from "react";
import { Box, Typography, Paper } from "@mui/material";

type SummaryProps = {
  materialCost: number;
  conversionCost: number;
  overheadCost: number;
  totalCost: number;
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: 1.5,
        borderLeft: `4px solid ${color}`,
        bgcolor: "#fafafa",
      }}
    >
      <Typography sx={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#333", mt: 0.25 }}>
        {value > 0 ? `\u20B9 ${value.toLocaleString("en-IN")}` : "-"}
      </Typography>
    </Paper>
  );
}

export default function CostEntrySummaryBar({ materialCost, conversionCost, overheadCost, totalCost }: SummaryProps) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
      <SummaryCard label="Material" value={materialCost} color="#1976d2" />
      <SummaryCard label="Conversion" value={conversionCost} color="#388e3c" />
      <SummaryCard label="Overhead (excluded from total)" value={overheadCost} color="#f57c00" />
      <SummaryCard label="Total Cost" value={totalCost} color="#d32f2f" />
    </Box>
  );
}
