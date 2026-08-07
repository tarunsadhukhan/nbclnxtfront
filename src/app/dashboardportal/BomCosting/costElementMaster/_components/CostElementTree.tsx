"use client";

import React from "react";
import { Box, IconButton, Tooltip, Typography, Chip } from "@mui/material";
import { ChevronRight, ChevronDown, Edit, Plus } from "lucide-react";

export type CostElementNode = {
  cost_element_id: number;
  element_code: string;
  element_name: string;
  parent_element_id: number | null;
  element_level: number;
  element_type: string;
  default_basis: string | null;
  is_leaf: number;
  sort_order: number;
  element_desc: string | null;
  active: number;
  children: CostElementNode[];
};

type CostElementTreeProps = {
  nodes: CostElementNode[];
  expanded: Record<number, boolean>;
  onToggle: (id: number) => void;
  onEdit: (node: CostElementNode) => void;
  onAddChild: (parentId: number) => void;
  mode?: "view" | "edit";
};

const TYPE_COLORS: Record<string, string> = {
  material: "#1976d2",
  conversion: "#388e3c",
  overhead: "#f57c00",
};

function TreeNode({
  node,
  level,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  mode,
}: {
  node: CostElementNode;
  level: number;
  expanded: Record<number, boolean>;
  onToggle: (id: number) => void;
  onEdit: (node: CostElementNode) => void;
  onAddChild: (parentId: number) => void;
  mode?: "view" | "edit";
}) {
  const isExpanded = expanded[node.cost_element_id] ?? (level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 16 + level * 24;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.5,
          px: 1,
          pl: `${paddingLeft}px`,
          borderBottom: "1px solid #f0f0f0",
          "&:hover": { bgcolor: "#fafafa" },
          "&:hover .action-buttons": { opacity: 1 },
        }}
      >
        {/* Expand/Collapse */}
        <Box sx={{ width: 24, flexShrink: 0 }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => onToggle(node.cost_element_id)} sx={{ p: 0 }}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 16, display: "inline-block" }} />
          )}
        </Box>

        {/* Element Code */}
        <Typography
          sx={{
            fontWeight: node.is_leaf ? 400 : 600,
            fontSize: "0.85rem",
            width: 120,
            flexShrink: 0,
            color: "#555",
            fontFamily: "monospace",
          }}
        >
          {node.element_code}
        </Typography>

        {/* Element Name */}
        <Typography
          sx={{
            flex: 1,
            fontWeight: node.is_leaf ? 400 : 600,
            fontSize: "0.875rem",
          }}
        >
          {node.element_name}
        </Typography>

        {/* Type Chip */}
        <Chip
          label={node.element_type}
          size="small"
          sx={{
            bgcolor: TYPE_COLORS[node.element_type] || "#999",
            color: "white",
            fontSize: "0.7rem",
            height: 20,
            mx: 0.5,
          }}
        />

        {/* Basis */}
        {node.default_basis && (
          <Typography sx={{ fontSize: "0.75rem", color: "#888", width: 120, textAlign: "center" }}>
            {node.default_basis}
          </Typography>
        )}
        {!node.default_basis && <Box sx={{ width: 120 }} />}

        {/* Leaf indicator */}
        <Typography sx={{ fontSize: "0.7rem", color: "#aaa", width: 40, textAlign: "center" }}>
          {node.is_leaf ? "leaf" : ""}
        </Typography>

        {/* Action buttons */}
        <Box className="action-buttons" sx={{ opacity: 0, transition: "opacity 0.15s", display: "flex", gap: 0.5 }}>
          {mode === "edit" && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(node)}>
                  <Edit size={14} />
                </IconButton>
              </Tooltip>
              {!node.is_leaf && (
                <Tooltip title="Add child element">
                  <IconButton size="small" onClick={() => onAddChild(node.cost_element_id)}>
                    <Plus size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Children */}
      {hasChildren && isExpanded &&
        node.children.map((child) => (
          <TreeNode
            key={child.cost_element_id}
            node={child}
            level={level + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onAddChild={onAddChild}
            mode={mode}
          />
        ))}
    </>
  );
}

export default function CostElementTree({ nodes, expanded, onToggle, onEdit, onAddChild, mode = "edit" }: CostElementTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          No cost elements found. Click &quot;Seed Template&quot; to initialize the default hierarchy.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.75,
          px: 1,
          pl: "40px",
          bgcolor: "#f5f5f5",
          borderBottom: "1px solid #e0e0e0",
          fontWeight: 600,
          fontSize: "0.75rem",
          color: "#666",
        }}
      >
        <Box sx={{ width: 24, flexShrink: 0 }} />
        <Typography sx={{ width: 120, flexShrink: 0, fontWeight: 600, fontSize: "0.75rem" }}>Code</Typography>
        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: "0.75rem" }}>Name</Typography>
        <Typography sx={{ width: 80, textAlign: "center", fontWeight: 600, fontSize: "0.75rem" }}>Type</Typography>
        <Typography sx={{ width: 120, textAlign: "center", fontWeight: 600, fontSize: "0.75rem" }}>Basis</Typography>
        <Typography sx={{ width: 40, textAlign: "center", fontWeight: 600, fontSize: "0.75rem" }}>Leaf</Typography>
        <Box sx={{ width: 64 }} />
      </Box>

      {nodes.map((node) => (
        <TreeNode
          key={node.cost_element_id}
          node={node}
          level={0}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          onAddChild={onAddChild}
          mode={mode}
        />
      ))}
    </Box>
  );
}
