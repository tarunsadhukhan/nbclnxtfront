"use client";

import React from "react";
import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { ChevronDown } from "lucide-react";

type Snapshot = {
  bom_cost_snapshot_id: number;
  material_cost: number;
  conversion_cost: number;
  overhead_cost: number;
  total_cost: number;
  computed_at: string;
  is_current: number;
  status: string;
};

type SnapshotHistoryPanelProps = {
  snapshots: Snapshot[];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#1976d2",
  approved: "#388e3c",
  superseded: "#999",
};

export default function SnapshotHistoryPanel({ snapshots }: SnapshotHistoryPanelProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <Typography sx={{ fontSize: "0.8rem", color: "#999", mt: 1 }}>
        No snapshots yet. Click &quot;Compute Rollup&quot; to create one.
      </Typography>
    );
  }

  return (
    <Accordion defaultExpanded={false} sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ChevronDown size={16} />}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          Snapshot History ({snapshots.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "120px 100px 100px 100px 100px 80px",
            px: 1.5,
            py: 0.5,
            bgcolor: "#f5f5f5",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#666",
          }}
        >
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit" }}>Date</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "right" }}>Material</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "right" }}>Conversion</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "right" }}>Overhead</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "right" }}>Total</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Status</Typography>
        </Box>

        {snapshots.map((snap) => (
          <Box
            key={snap.bom_cost_snapshot_id}
            sx={{
              display: "grid",
              gridTemplateColumns: "120px 100px 100px 100px 100px 80px",
              px: 1.5,
              py: 0.5,
              borderBottom: "1px solid #f0f0f0",
              bgcolor: snap.is_current ? "#f0f7ff" : "transparent",
              fontSize: "0.8rem",
            }}
          >
            <Typography sx={{ fontSize: "0.8rem" }}>
              {snap.computed_at ? new Date(snap.computed_at).toLocaleDateString("en-IN") : "-"}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right" }}>
              {snap.material_cost > 0 ? `\u20B9${snap.material_cost.toLocaleString("en-IN")}` : "-"}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right" }}>
              {snap.conversion_cost > 0 ? `\u20B9${snap.conversion_cost.toLocaleString("en-IN")}` : "-"}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right" }}>
              {snap.overhead_cost > 0 ? `\u20B9${snap.overhead_cost.toLocaleString("en-IN")}` : "-"}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right", fontWeight: 600 }}>
              {snap.total_cost > 0 ? `\u20B9${snap.total_cost.toLocaleString("en-IN")}` : "-"}
            </Typography>
            <Box sx={{ textAlign: "center" }}>
              <Chip
                label={snap.status}
                size="small"
                sx={{
                  bgcolor: STATUS_COLORS[snap.status] || "#999",
                  color: "white",
                  fontSize: "0.65rem",
                  height: 18,
                }}
              />
            </Box>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
