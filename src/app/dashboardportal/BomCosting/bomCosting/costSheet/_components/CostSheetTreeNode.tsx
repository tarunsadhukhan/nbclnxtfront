"use client";

import React from "react";
import { Box, IconButton, TextField, Tooltip, Typography, Chip } from "@mui/material";
import { ChevronRight, ChevronDown, Trash2 } from "lucide-react";

export type CostEntryNode = {
  cost_element_id: number;
  element_code: string;
  element_name: string;
  parent_element_id: number | null;
  element_level: number;
  element_type: string;
  default_basis: string | null;
  is_leaf: number;
  sort_order: number;
  // Entry data
  bom_cost_entry_id: number | null;
  amount: number;
  source: string | null;
  qty: number | null;
  rate: number | null;
  basis_override: string | null;
  effective_date: string | null;
  remarks: string | null;
  children: CostEntryNode[];
};

type CostSheetTreeNodeProps = {
  node: CostEntryNode;
  level: number;
  expanded: Record<number, boolean>;
  onToggle: (id: number) => void;
  onEntryChange: (nodeId: number, field: string, value: any) => void;
  onSaveEntry: (nodeId: number) => void;
  onDeleteEntry: (entryId: number) => void;
  canEdit: boolean;
};

const SOURCE_COLORS: Record<string, string> = {
  manual: "#1976d2",
  calculated: "#388e3c",
  assumed: "#f57c00",
  standard: "#7b1fa2",
  imported: "#555",
};

export default function CostSheetTreeNode({
  node,
  level,
  expanded,
  onToggle,
  onEntryChange,
  onSaveEntry,
  onDeleteEntry,
  canEdit,
}: CostSheetTreeNodeProps) {
  const isExpanded = expanded[node.cost_element_id] ?? (level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 8 + level * 24;
  const isCalculated = node.source === "calculated";
  const isEditable = canEdit && (node.is_leaf === 1 || (!hasChildren && !isCalculated));

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 2fr) 90px 80px 90px 110px 70px 120px 40px",
          alignItems: "center",
          py: 0.25,
          px: 0.5,
          pl: `${paddingLeft}px`,
          borderBottom: "1px solid #f0f0f0",
          bgcolor: level === 0 ? "#fafafa" : "transparent",
          "&:hover": { bgcolor: "#f5f9ff" },
          minHeight: 36,
        }}
      >
        {/* Element Name with expand/collapse */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, overflow: "hidden" }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => onToggle(node.cost_element_id)} sx={{ p: 0, flexShrink: 0 }}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 14, flexShrink: 0 }} />
          )}
          <Typography
            sx={{
              fontWeight: node.is_leaf ? 400 : 600,
              fontSize: "0.8rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`${node.element_code} - ${node.element_name}`}
          >
            {node.element_name}
          </Typography>
        </Box>

        {/* Qty */}
        <Box sx={{ px: 0.25 }}>
          {isEditable ? (
            <TextField
              value={node.qty ?? ""}
              onChange={(e) => onEntryChange(node.cost_element_id, "qty", e.target.value)}
              onBlur={() => onSaveEntry(node.cost_element_id)}
              size="small"
              type="number"
              slotProps={{ input: { sx: { fontSize: "0.8rem", py: 0.25, px: 0.5 } } }}
              sx={{ "& .MuiOutlinedInput-root": { height: 28 } }}
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right", color: "#666" }}>
              {node.qty != null ? node.qty : ""}
            </Typography>
          )}
        </Box>

        {/* Basis/UOM */}
        <Typography sx={{ fontSize: "0.7rem", color: "#888", textAlign: "center" }}>
          {node.basis_override || node.default_basis || ""}
        </Typography>

        {/* Rate */}
        <Box sx={{ px: 0.25 }}>
          {isEditable ? (
            <TextField
              value={node.rate ?? ""}
              onChange={(e) => onEntryChange(node.cost_element_id, "rate", e.target.value)}
              onBlur={() => onSaveEntry(node.cost_element_id)}
              size="small"
              type="number"
              slotProps={{ input: { sx: { fontSize: "0.8rem", py: 0.25, px: 0.5 } } }}
              sx={{ "& .MuiOutlinedInput-root": { height: 28 } }}
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.8rem", textAlign: "right", color: "#666" }}>
              {node.rate != null ? `\u20B9${node.rate.toLocaleString("en-IN")}` : ""}
            </Typography>
          )}
        </Box>

        {/* Amount */}
        <Box sx={{ px: 0.25 }}>
          {isEditable ? (
            <TextField
              value={node.amount || ""}
              onChange={(e) => onEntryChange(node.cost_element_id, "amount", e.target.value)}
              onBlur={() => onSaveEntry(node.cost_element_id)}
              size="small"
              type="number"
              slotProps={{ input: { sx: { fontSize: "0.8rem", py: 0.25, px: 0.5, fontWeight: 600 } } }}
              sx={{ "& .MuiOutlinedInput-root": { height: 28 } }}
              fullWidth
            />
          ) : (
            <Typography
              sx={{
                fontSize: "0.8rem",
                textAlign: "right",
                fontWeight: level === 0 ? 700 : 500,
                color: node.amount > 0 ? "#222" : "#999",
              }}
            >
              {node.amount > 0 ? `\u20B9 ${node.amount.toLocaleString("en-IN")}` : "-"}
            </Typography>
          )}
        </Box>

        {/* Source badge */}
        <Box sx={{ textAlign: "center" }}>
          {node.source && (
            <Chip
              label={node.source}
              size="small"
              sx={{
                bgcolor: SOURCE_COLORS[node.source] || "#999",
                color: "white",
                fontSize: "0.65rem",
                height: 18,
              }}
            />
          )}
        </Box>

        {/* Remarks */}
        <Box sx={{ px: 0.25 }}>
          {isEditable ? (
            <TextField
              value={node.remarks ?? ""}
              onChange={(e) => onEntryChange(node.cost_element_id, "remarks", e.target.value)}
              onBlur={() => onSaveEntry(node.cost_element_id)}
              size="small"
              placeholder="..."
              slotProps={{ input: { sx: { fontSize: "0.75rem", py: 0.25, px: 0.5 } } }}
              sx={{ "& .MuiOutlinedInput-root": { height: 28 } }}
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.7rem", color: "#888" }} title={node.remarks || ""}>
              {node.remarks || ""}
            </Typography>
          )}
        </Box>

        {/* Delete */}
        <Box>
          {canEdit && node.bom_cost_entry_id && (
            <Tooltip title="Remove entry">
              <IconButton size="small" onClick={() => onDeleteEntry(node.bom_cost_entry_id!)} sx={{ p: 0 }}>
                <Trash2 size={13} color="#d32f2f" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Children */}
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <CostSheetTreeNode
            key={child.cost_element_id}
            node={child}
            level={level + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEntryChange={onEntryChange}
            onSaveEntry={onSaveEntry}
            onDeleteEntry={onDeleteEntry}
            canEdit={canEdit}
          />
        ))}
    </>
  );
}
