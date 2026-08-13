import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * Landing shown on a module's Reports menu node.
 *
 * The reports themselves are children of this node in the sidebar tree, so the
 * node needs a route (clicking the label navigates) but no picker of its own.
 */
export default function ReportsHubLanding({ title }: { title: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: "secondary.main", fontWeight: "bold" }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
        Select a report from the menu.
      </Typography>
    </Box>
  );
}
