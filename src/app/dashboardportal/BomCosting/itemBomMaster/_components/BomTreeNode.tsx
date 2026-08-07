"use client";

import React, { memo, useState } from "react";
import {
  Autocomplete,
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Package,
  Box as BoxIcon,
  Check,
  X,
  GripVertical,
} from "lucide-react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BomTreeItem, ItemOption, UomOption, getCoId } from "./types";
import InlineBomRow, { InlineSavePayload } from "./InlineBomRow";

type BomTreeNodeProps = {
  node: BomTreeItem;
  level: number;
  expanded: Record<number, boolean>;
  gridColumns: string;
  parentMultiplier?: number;
  editingBomId: number | null;
  addingUnderParentId: number | null;
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  dragDisabled: boolean;
  onToggle: (itemId: number) => void;
  onStartAddChild: (parentItemId: number) => void;
  onStartEdit: (bomId: number) => void;
  onRemove: (node: BomTreeItem) => void;
  onSaveNew: (parentItemId: number, payload: InlineSavePayload) => Promise<void>;
  onSaveEdit: (
    bomId: number,
    payload: {
      qty: number;
      uom_id: number;
      sequence_no: number;
      co_id: number;
      additional_description?: string | null;
    }
  ) => Promise<void>;
  onCancelInline: () => void;
  onItemSearchChange: (query: string) => void;
  onSnackbar: (message: string, severity: "success" | "error") => void;
};

function BomTreeNode({
  node,
  level,
  expanded,
  gridColumns,
  parentMultiplier = 1,
  editingBomId,
  addingUnderParentId,
  itemOptions,
  uomOptions,
  dragDisabled,
  onToggle,
  onStartAddChild,
  onStartEdit,
  onRemove,
  onSaveNew,
  onSaveEdit,
  onCancelInline,
  onItemSearchChange,
  onSnackbar,
}: BomTreeNodeProps) {
  const isExpanded = expanded[node.child_item_id] || false;
  const hasChildren = node.children && node.children.length > 0;
  const bomQty = node.qty * parentMultiplier;
  const isEditMode = editingBomId === node.bom_id;

  // Edit-mode local state
  const [editQty, setEditQty] = useState<string>(String(node.qty));
  const [editSeq, setEditSeq] = useState<string>(String(node.sequence_no));
  const [editUom, setEditUom] = useState<UomOption | null>({ uom_id: node.uom_id, uom_name: node.uom_name });
  const [editAdditionalDescription, setEditAdditionalDescription] = useState<string>(node.additional_description ?? "");
  const [editQtyError, setEditQtyError] = useState(false);
  const [editUomError, setEditUomError] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Sync local edit state when entering edit mode
  React.useEffect(() => {
    if (isEditMode) {
      setEditQty(String(node.qty));
      setEditSeq(String(node.sequence_no));
      setEditUom({ uom_id: node.uom_id, uom_name: node.uom_name });
      setEditAdditionalDescription(node.additional_description ?? "");
      setEditQtyError(false);
      setEditUomError(false);
    }
  }, [isEditMode, node.qty, node.sequence_no, node.uom_id, node.uom_name, node.additional_description]);

  // Drag-and-drop sortable (only for read-only rows)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.bom_id,
    disabled: dragDisabled || isEditMode,
  });

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  // ── Edit-mode save ───────────────────────────────────────────────────────

  const handleEditSave = async () => {
    let valid = true;
    const parsedQty = parseFloat(editQty);
    if (!editQty || isNaN(parsedQty) || parsedQty <= 0) {
      setEditQtyError(true);
      valid = false;
    }
    if (!editUom) {
      setEditUomError(true);
      valid = false;
    }
    if (!valid) return;

    setEditSaving(true);
    try {
      const co_id = parseInt(getCoId());
      await onSaveEdit(node.bom_id, {
        qty: parsedQty,
        uom_id: editUom!.uom_id,
        sequence_no: parseInt(editSeq) || node.sequence_no,
        co_id,
        additional_description: editAdditionalDescription.trim() || null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      onSnackbar(msg, "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleEditSave(); }
    if (e.key === "Escape") { e.preventDefault(); onCancelInline(); }
  };

  // ── Derived for child blank row ─────────────────────────────────────────

  const childNextSeq =
    Math.max(0, ...(node.children?.map((c) => c.sequence_no) ?? [])) + 1;

  const showChildBlankRow = addingUnderParentId === node.child_item_id;
  // Disable child drag while any inline action is open under this parent
  const childDragDisabled =
    dragDisabled || showChildBlankRow || node.children?.some((c) => c.bom_id === editingBomId);

  return (
    <div ref={setNodeRef} style={rowStyle}>
      {/* ── Row ─────────────────────────────────────────────────────────── */}
      <Box
        onKeyDown={isEditMode ? handleEditKeyDown : undefined}
        sx={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: isEditMode ? "action.selected" : "transparent",
          "&:hover": { bgcolor: isEditMode ? "action.selected" : "action.hover" },
          "&:hover .bom-actions": { opacity: 1 },
          "&:hover .bom-drag": { opacity: 1 },
        }}
      >
        {/* ── Seq cell ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0.5,
            py: 0.75,
            borderRight: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {!isEditMode && (
            <Box
              className="bom-drag"
              {...attributes}
              {...listeners}
              sx={{
                opacity: 0,
                transition: "opacity 0.2s",
                cursor: dragDisabled ? "default" : "grab",
                display: "flex",
                alignItems: "center",
                "&:active": { cursor: "grabbing" },
              }}
            >
              <GripVertical size={13} />
            </Box>
          )}
          {isEditMode ? (
            <TextField
              size="small"
              type="number"
              value={editSeq}
              onChange={(e) => setEditSeq(e.target.value)}
              inputProps={{ min: 1, style: { textAlign: "center", padding: "2px 4px" } }}
              sx={{ width: 48 }}
            />
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
              {node.sequence_no}
            </Typography>
          )}
        </Box>

        {/* ── Item Code cell (chevron + icon + code) ────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            pl: level * 3 + 1,
            pr: 1,
            py: 0.75,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              width: 24,
              minWidth: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: hasChildren ? "pointer" : "default",
              mr: 0.5,
            }}
            onClick={() => hasChildren && onToggle(node.child_item_id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <Box sx={{ width: 16 }} />
            )}
          </Box>
          {hasChildren ? (
            <Package size={16} style={{ marginRight: 8, flexShrink: 0, color: "#1976d2" }} />
          ) : (
            <BoxIcon size={16} style={{ marginRight: 8, flexShrink: 0, color: "#666" }} />
          )}
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: hasChildren ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {node.child_full_item_code || node.child_item_code}
          </Typography>
        </Box>

        {/* ── Item Name cell (wraps) ────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            py: 0.75,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }}
          >
            {node.child_item_name}
          </Typography>
        </Box>

        {/* ── Additional Description cell ───────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            py: isEditMode ? 0.5 : 0.75,
            borderRight: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {isEditMode ? (
            <TextField
              size="small"
              value={editAdditionalDescription}
              onChange={(e) => setEditAdditionalDescription(e.target.value)}
              placeholder="Notes…"
              sx={{ width: "100%" }}
            />
          ) : node.additional_description ? (
            <Tooltip title={node.additional_description} placement="top-start">
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {node.additional_description}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">—</Typography>
          )}
        </Box>

        {/* ── Qty cell ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: isEditMode ? "stretch" : "flex-end",
            alignItems: "center",
            py: isEditMode ? 0.5 : 0.75,
            px: 1,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          {isEditMode ? (
            <TextField
              size="small"
              type="number"
              value={editQty}
              onChange={(e) => { setEditQty(e.target.value); setEditQtyError(false); }}
              error={editQtyError}
              helperText={editQtyError ? "> 0" : undefined}
              inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
              sx={{ width: "100%" }}
            />
          ) : (
            <Typography variant="body2">{node.qty}</Typography>
          )}
        </Box>

        {/* ── BOM Qty cell ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            py: 0.75,
            px: 1,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isEditMode
              ? (() => {
                  const q = parseFloat(editQty);
                  if (!isNaN(q) && q > 0) return Math.round(q * parentMultiplier * 1000) / 1000;
                  return "";
                })()
              : Math.round(bomQty * 1000) / 1000}
          </Typography>
        </Box>

        {/* ── UOM cell ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: isEditMode ? "stretch" : "flex-end",
            alignItems: "center",
            py: isEditMode ? 0.5 : 0.75,
            px: 1,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          {isEditMode ? (
            <Autocomplete
              size="small"
              options={uomOptions}
              getOptionLabel={(opt) => opt.uom_name}
              value={editUom}
              onChange={(_, newValue) => { setEditUom(newValue); setEditUomError(false); }}
              isOptionEqualToValue={(opt, val) => opt.uom_id === val.uom_id}
              sx={{ width: "100%" }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  error={editUomError}
                  helperText={editUomError ? "Required" : undefined}
                />
              )}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {node.uom_name}
            </Typography>
          )}
        </Box>

        {/* ── Actions cell ──────────────────────────────────────────────── */}
        {isEditMode ? (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 0.25, py: 0.5 }}>
            <Tooltip title="Save (Enter)">
              <span>
                <IconButton size="small" color="primary" onClick={handleEditSave} disabled={editSaving}>
                  <Check size={14} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Cancel (Esc)">
              <IconButton size="small" onClick={onCancelInline} disabled={editSaving}>
                <X size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            className="bom-actions"
            sx={{
              opacity: 0,
              transition: "opacity 0.2s",
              display: "flex",
              justifyContent: "center",
              gap: 0.25,
              py: 0.75,
            }}
          >
            <Tooltip title="Add child component">
              <IconButton size="small" onClick={() => onStartAddChild(node.child_item_id)}>
                <Plus size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit qty / UOM">
              <IconButton size="small" onClick={() => onStartEdit(node.bom_id)}>
                <Pencil size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove component">
              <IconButton size="small" color="error" onClick={() => onRemove(node)}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* ── Children ──────────────────────────────────────────────────────── */}
      {(hasChildren || showChildBlankRow) && isExpanded && (
        <div>
          <SortableContext
            items={(node.children ?? []).map((c) => c.bom_id)}
            strategy={verticalListSortingStrategy}
          >
            {(node.children ?? []).map((child) => (
              <BomTreeNode
                key={child.bom_id}
                node={child}
                level={level + 1}
                expanded={expanded}
                gridColumns={gridColumns}
                parentMultiplier={bomQty}
                editingBomId={editingBomId}
                addingUnderParentId={addingUnderParentId}
                itemOptions={itemOptions}
                uomOptions={uomOptions}
                dragDisabled={childDragDisabled}
                onToggle={onToggle}
                onStartAddChild={onStartAddChild}
                onStartEdit={onStartEdit}
                onRemove={onRemove}
                onSaveNew={onSaveNew}
                onSaveEdit={onSaveEdit}
                onCancelInline={onCancelInline}
                onItemSearchChange={onItemSearchChange}
                onSnackbar={onSnackbar}
              />
            ))}
          </SortableContext>

          {/* Inline blank child row — rendered as last child */}
          {showChildBlankRow && (
            <InlineBomRow
              level={level + 1}
              gridColumns={gridColumns}
              nextSeq={childNextSeq}
              parentItemId={node.child_item_id}
              parentMultiplier={bomQty}
              itemOptions={itemOptions}
              uomOptions={uomOptions}
              onItemSearchChange={onItemSearchChange}
              onSave={onSaveNew}
              onCancel={onCancelInline}
            />
          )}
        </div>
      )}

      {/* Collapsed but blank row is requested — auto-expand happened at click time,
          but guard here in case expand state is stale */}
      {showChildBlankRow && !isExpanded && (
        <InlineBomRow
          level={level + 1}
          gridColumns={gridColumns}
          nextSeq={childNextSeq}
          parentItemId={node.child_item_id}
          parentMultiplier={bomQty}
          itemOptions={itemOptions}
          uomOptions={uomOptions}
          onItemSearchChange={onItemSearchChange}
          onSave={onSaveNew}
          onCancel={onCancelInline}
        />
      )}
    </div>
  );
}

/** Custom comparator: only re-render when something that affects THIS row's
 *  output changes. Children rerender independently via their own memo. */
function areEqual(prev: BomTreeNodeProps, next: BomTreeNodeProps): boolean {
  if (prev.node !== next.node) return false;
  if (prev.level !== next.level) return false;
  if (prev.gridColumns !== next.gridColumns) return false;
  if (prev.parentMultiplier !== next.parentMultiplier) return false;
  if (prev.dragDisabled !== next.dragDisabled) return false;

  // Own expand state — children handle their own
  if ((prev.expanded[prev.node.child_item_id] || false) !==
      (next.expanded[next.node.child_item_id] || false)) return false;
  // Pass new expanded ref through so descendants can re-evaluate own state
  if (prev.expanded !== next.expanded) return false;

  // Own edit / add flags
  const prevEditMine = prev.editingBomId === prev.node.bom_id;
  const nextEditMine = next.editingBomId === next.node.bom_id;
  if (prevEditMine !== nextEditMine) return false;
  const prevAddMine = prev.addingUnderParentId === prev.node.child_item_id;
  const nextAddMine = next.addingUnderParentId === next.node.child_item_id;
  if (prevAddMine !== nextAddMine) return false;

  // If the editing/adding flag changes anywhere, descendants need the new
  // primitive — pass-through compare
  if (prev.editingBomId !== next.editingBomId) return false;
  if (prev.addingUnderParentId !== next.addingUnderParentId) return false;

  // Options must propagate to deeply-nested edit/add rows; ancestor nodes
  // (where nextEditMine/nextAddMine are false) still need to re-render so the
  // child receives the fresh prop.
  if (prev.itemOptions !== next.itemOptions) return false;
  if (prev.uomOptions !== next.uomOptions) return false;

  // Callbacks assumed stable via useCallback in BomTreeEditor
  return true;
}

const MemoBomTreeNode = memo(BomTreeNode, areEqual);
MemoBomTreeNode.displayName = "BomTreeNode";
export default MemoBomTreeNode;
