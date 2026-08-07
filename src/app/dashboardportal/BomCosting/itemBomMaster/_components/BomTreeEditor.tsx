"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Autocomplete,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

type BomStatus = "New" | "Certified" | "Under Development" | "Closed";
const BOM_STATUS_OPTIONS: BomStatus[] = ["New", "Certified", "Under Development", "Closed"];
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Printer } from "lucide-react";
import { IconButton, Tooltip } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { openStyledPrintWindow } from "@/utils/printUtils";
import BomTreeNode from "./BomTreeNode";
import ConfirmDialog from "./ConfirmDialog";
import InlineBomRow, { InlineSavePayload } from "./InlineBomRow";
import BulkAddComponentsDialog, { BulkComponentPayload } from "./BulkAddComponentsDialog";
import BomPrintDialog from "./BomPrintDialog";
import { buildBomPrintHtml, BomPrintOptions } from "./bomPrintRender";
import { BomTreeItem, ItemOption, UomOption, getCoId } from "./types";
import { insertChild, updateNode, removeNode } from "./treeOps";

type BomTreeEditorProps = {
  open: boolean;
  onClose: () => void;
  item: {
    item_id: number;
    item_code: string;
    full_item_code?: string;
    item_name: string;
    bom_hdr_id?: number | null;
    bom_status?: BomStatus | null;
  } | null;
  onSnackbar: (message: string, severity: "success" | "error") => void;
};

const BOM_GRID_COLUMNS = "60px 320px 1fr 220px 80px 90px 80px 100px";

/** Recursively find the sibling list containing both bomId values.
 *  Returns null if the two ids don't share a parent (cross-parent drag). */
function findSiblingList(
  nodes: BomTreeItem[],
  activeId: number,
  overId: number
): { siblings: BomTreeItem[]; parentItemId: number } | null {
  const ai = nodes.findIndex((n) => n.bom_id === activeId);
  const oi = nodes.findIndex((n) => n.bom_id === overId);
  if (ai !== -1 && oi !== -1) {
    return { siblings: nodes, parentItemId: nodes[ai].parent_item_id };
  }
  for (const node of nodes) {
    if (node.children?.length) {
      const found = findSiblingList(node.children, activeId, overId);
      if (found) return found;
    }
  }
  return null;
}

function computeMaxDepth(nodes: BomTreeItem[]): number {
  if (!nodes || nodes.length === 0) return 0;
  let max = 1;
  for (const n of nodes) {
    if (n.children && n.children.length > 0) {
      const d = 1 + computeMaxDepth(n.children);
      if (d > max) max = d;
    }
  }
  return max;
}

/** Immutably replace a sibling list in the tree by matching parentItemId. */
function replaceChildList(
  nodes: BomTreeItem[],
  parentItemId: number,
  newSiblings: BomTreeItem[]
): BomTreeItem[] {
  if (nodes.length > 0 && nodes[0].parent_item_id === parentItemId) {
    return newSiblings;
  }
  return nodes.map((n) => {
    if (!n.children?.length) return n;
    const replaced = replaceChildList(n.children, parentItemId, newSiblings);
    if (replaced !== n.children) return { ...n, children: replaced };
    return n;
  });
}

export default function BomTreeEditor({ open, onClose, item, onSnackbar }: BomTreeEditorProps) {
  const [tree, setTree] = useState<BomTreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [itemPickerMode, setItemPickerMode] = useState(false);
  const [selectedRootItem, setSelectedRootItem] = useState<ItemOption | null>(null);
  const [rootItemSearchValue, setRootItemSearchValue] = useState("");
  const [rootItemOptions, setRootItemOptions] = useState<ItemOption[]>([]);
  const [confirmRemoveNode, setConfirmRemoveNode] = useState<BomTreeItem | null>(null);

  // Inline editing state
  const [editingBomId, setEditingBomId] = useState<number | null>(null);
  const [addingUnderParentId, setAddingUnderParentId] = useState<number | null>(null);

  // Lifecycle status (independent of BOM Costing approval). Persists immediately on change.
  const [bomStatus, setBomStatus] = useState<BomStatus>("New");
  const [statusSaving, setStatusSaving] = useState(false);

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  // Shared item/uom options for inline rows (debounce lives in InlineBomRow)
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const itemFetchSeqRef = useRef<number>(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchTree = useCallback(
    async (itemId: number) => {
      setLoading(true);
      try {
        const co_id = getCoId();
        const params = new URLSearchParams({ co_id, item_id: String(itemId) });
        const { data, error } = await fetchWithCookie(
          `${apiRoutesPortalMasters.BOM_TREE}?${params}`,
          "GET"
        );
        if (error || !data) throw new Error(error || "Failed to fetch BOM tree");
        const nodes: BomTreeItem[] = data.data || [];
        setTree(nodes);
        // Auto-expand first level
        const autoExpanded: Record<number, boolean> = {};
        nodes.forEach((n) => { if (!n.is_leaf) autoExpanded[n.child_item_id] = true; });
        setExpanded((prev) => ({ ...autoExpanded, ...prev }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load BOM tree";
        onSnackbar(msg, "error");
      } finally {
        setLoading(false);
      }
    },
    [onSnackbar]
  );

  const fetchSetup = useCallback(async (search: string) => {
    const co_id = getCoId();
    const params = new URLSearchParams({ co_id });
    if (search) params.append("search", search);
    const seq = ++itemFetchSeqRef.current;
    const { data } = await fetchWithCookie(
      `${apiRoutesPortalMasters.BOM_CREATE_SETUP}?${params}`,
      "GET"
    );
    // Ignore stale responses (a newer fetch superseded this one)
    if (seq !== itemFetchSeqRef.current) return;
    if (data?.items) setItemOptions(data.items);
    if (data?.uoms) setUomOptions(data.uoms);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setTree([]);
    setLoading(false);
    setExpanded({});
    setItemPickerMode(false);
    setSelectedRootItem(null);
    setRootItemSearchValue("");
    setRootItemOptions([]);
    setConfirmRemoveNode(null);
    setEditingBomId(null);
    setAddingUnderParentId(null);
    setItemOptions([]);
    setUomOptions([]);
    setPrintDialogOpen(false);
    setBulkAddOpen(false);
  }, []);

  useEffect(() => {
    if (open && item) {
      resetState();
      setSelectedRootItem(item as ItemOption);
      setBomStatus((item.bom_status as BomStatus) ?? "New");
      fetchTree(item.item_id);
      fetchSetup("");
    } else if (open && !item) {
      resetState();
      setBomStatus("New");
      setItemPickerMode(true);
    } else if (!open) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const handleStatusChange = useCallback(
    async (next: BomStatus) => {
      const prev = bomStatus;
      const targetItemId = selectedRootItem?.item_id ?? item?.item_id;
      if (!targetItemId) return;
      setBomStatus(next);
      setStatusSaving(true);
      try {
        const co_id = getCoId();
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.BOM_UPDATE_STATUS,
          "POST",
          { co_id: Number(co_id), item_id: targetItemId, bom_status: next }
        );
        if (error) throw new Error(error);
        onSnackbar(`Status set to ${next}`, "success");
      } catch (e: any) {
        setBomStatus(prev);
        onSnackbar(
          e?.message?.includes("not found")
            ? "Add a component first to create the BOM, then set status."
            : (e?.message || "Failed to update status"),
          "error"
        );
      } finally {
        setStatusSaving(false);
      }
    },
    [bomStatus, selectedRootItem, item, onSnackbar]
  );

  const handlePrintConfirm = useCallback(
    (opts: BomPrintOptions) => {
      const root = selectedRootItem ?? item;
      if (!root) return;
      const code = (root as ItemOption).full_item_code || (root as ItemOption).item_code || "";
      const name = (root as ItemOption).item_name || "";
      let coName: string | undefined;
      try {
        const stored = localStorage.getItem("sidebar_selectedCompany");
        if (stored) coName = JSON.parse(stored)?.co_name;
      } catch { /* ignore */ }

      const html = buildBomPrintHtml(
        { item_code: code, item_name: name, bom_status: bomStatus },
        tree,
        opts,
        { printedAt: new Date(), coName }
      );

      const printWindow = openStyledPrintWindow(html, `BOM_${code || "Print"}`);
      setPrintDialogOpen(false);
      if (!printWindow) return;
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    },
    [tree, bomStatus, selectedRootItem, item]
  );

  // Debounced item search for the root item picker
  useEffect(() => {
    if (!itemPickerMode || !open) return;
    const searchItems = async () => {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id });
      if (rootItemSearchValue) params.append("search", rootItemSearchValue);
      const { data } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_CREATE_SETUP}?${params}`,
        "GET"
      );
      if (data?.items) setRootItemOptions(data.items);
    };
    const t = setTimeout(searchItems, 300);
    return () => clearTimeout(t);
  }, [itemPickerMode, rootItemSearchValue, open]);

  // ── Inline row option search (debounced) ──────────────────────────────────

  const handleItemSearchChange = useCallback(
    (query: string) => {
      fetchSetup(query);
    },
    [fetchSetup]
  );

  // ── Toggling ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback((itemId: number) => {
    setExpanded((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const handleRemoveOpen = useCallback((node: BomTreeItem) => {
    setConfirmRemoveNode(node);
  }, []);

  // ── Inline edit/add handlers ──────────────────────────────────────────────

  const handleStartEdit = useCallback((bomId: number) => {
    setEditingBomId(bomId);
    setAddingUnderParentId(null);
  }, []);

  const handleStartAddChild = useCallback((parentItemId: number) => {
    setAddingUnderParentId(parentItemId);
    setEditingBomId(null);
    // Auto-expand so the blank row is visible
    setExpanded((prev) => ({ ...prev, [parentItemId]: true }));
  }, []);

  const handleCancelInline = useCallback(() => {
    setEditingBomId(null);
    setAddingUnderParentId(null);
  }, []);

  const handleSaveNew = useCallback(
    async (parentItemId: number, payload: InlineSavePayload) => {
      const { _meta, ...wirePayload } = payload;
      const { error, data } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_ADD_COMPONENT,
        "POST",
        { parent_item_id: parentItemId, ...wirePayload }
      );
      if (error) throw new Error(error);

      const newBomId = data?.bom_id;
      const rootId = selectedRootItem?.item_id ?? item?.item_id;
      if (newBomId && rootId) {
        const newNode: BomTreeItem = {
          bom_id: newBomId,
          parent_item_id: parentItemId,
          child_item_id: payload.child_item_id,
          child_item_code: _meta.child_item_code,
          child_full_item_code: _meta.child_full_item_code,
          child_item_name: _meta.child_item_name,
          additional_description: payload.additional_description ?? null,
          qty: payload.qty,
          uom_id: payload.uom_id,
          uom_name: _meta.uom_name,
          sequence_no: payload.sequence_no,
          has_children: false,
          is_leaf: true,
          children: [],
        };
        setTree((t) => insertChild(t, parentItemId, newNode, rootId));
      }
      onSnackbar(data?.message || "Component added", "success");
      // Keep addingUnderParentId set → auto-spawn blank row stays open
    },
    [item, onSnackbar, selectedRootItem]
  );

  const handleBulkSave = useCallback(
    async (payload: BulkComponentPayload[]) => {
      const rootId = selectedRootItem?.item_id ?? item?.item_id;
      if (!rootId) throw new Error("No parent item selected");

      const co_id = parseInt(getCoId());
      const components = payload.map((p) => ({
        child_item_id: p.child_item_id,
        qty: p.qty,
        uom_id: p.uom_id,
        sequence_no: p.sequence_no,
        additional_description: p.additional_description ?? null,
      }));

      const { error, data } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_ADD_COMPONENTS_BULK,
        "POST",
        { parent_item_id: rootId, co_id, components }
      );
      if (error) {
        onSnackbar(error, "error");
        throw new Error(error);
      }

      const bomIds: number[] = data?.bom_ids ?? [];
      setTree((t) => {
        let updated = t;
        payload.forEach((p, i) => {
          const newBomId = bomIds[i];
          if (!newBomId) return;
          const newNode: BomTreeItem = {
            bom_id: newBomId,
            parent_item_id: rootId,
            child_item_id: p.child_item_id,
            child_item_code: p._meta.child_item_code,
            child_full_item_code: p._meta.child_full_item_code,
            child_item_name: p._meta.child_item_name,
            additional_description: p.additional_description ?? null,
            qty: p.qty,
            uom_id: p.uom_id,
            uom_name: p._meta.uom_name,
            sequence_no: p.sequence_no,
            has_children: false,
            is_leaf: true,
            children: [],
          };
          updated = insertChild(updated, rootId, newNode, rootId);
        });
        return updated;
      });

      onSnackbar(data?.message || `${payload.length} component(s) added`, "success");
    },
    [item, onSnackbar, selectedRootItem]
  );

  const handleSaveEdit = useCallback(
    async (
      bomId: number,
      payload: {
        qty: number;
        uom_id: number;
        sequence_no: number;
        co_id: number;
        additional_description?: string | null;
      }
    ) => {
      const { error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_EDIT_COMPONENT,
        "POST",
        { bom_id: bomId, ...payload }
      );
      if (error) throw new Error(error);

      const uom = uomOptions.find((u) => u.uom_id === payload.uom_id);
      setTree((t) => updateNode(t, bomId, {
        qty: payload.qty,
        uom_id: payload.uom_id,
        uom_name: uom?.uom_name ?? "",
        sequence_no: payload.sequence_no,
        additional_description: payload.additional_description ?? null,
      }));
      onSnackbar("Component updated", "success");
      setEditingBomId(null);
    },
    [onSnackbar, uomOptions]
  );

  // ── Remove ────────────────────────────────────────────────────────────────

  const handleRemoveConfirm = async () => {
    const node = confirmRemoveNode;
    if (!node) return;
    try {
      const co_id = getCoId();
      const { error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_REMOVE_COMPONENT,
        "POST",
        { bom_id: node.bom_id, co_id: parseInt(co_id) }
      );
      if (error) throw new Error(error);
      setTree((t) => removeNode(t, node.bom_id));
      onSnackbar("Component removed", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove component";
      onSnackbar(msg, "error");
    } finally {
      setConfirmRemoveNode(null);
    }
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as number;
      const overId = over.id as number;

      const result = findSiblingList(tree, activeId, overId);
      if (!result) return; // Cross-parent drag — reject

      const { siblings, parentItemId } = result;
      const activeIdx = siblings.findIndex((n) => n.bom_id === activeId);
      const overIdx = siblings.findIndex((n) => n.bom_id === overId);

      const newSiblings = arrayMove(siblings, activeIdx, overIdx);
      const reorderedRows = newSiblings.map((n, i) => ({ bom_id: n.bom_id, sequence_no: i + 1 }));

      // Optimistic update
      const prevTree = tree;
      setTree((t) => replaceChildList(t, parentItemId, newSiblings));

      try {
        const co_id = parseInt(getCoId());
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.BOM_REORDER_SIBLINGS,
          "POST",
          { co_id, parent_item_id: parentItemId, rows: reorderedRows }
        );
        if (error) throw new Error(error);
        // Patch sequence_no locally to match the new order — server is authoritative
        // for the reorder, so we mirror the change without a full refetch.
        setTree((t) => {
          let updated = t;
          newSiblings.forEach((n, i) => {
            updated = updateNode(updated, n.bom_id, { sequence_no: i + 1 });
          });
          return updated;
        });
      } catch (err: unknown) {
        // Revert to pre-drag state
        setTree(prevTree);
        const msg = err instanceof Error ? err.message : "Reorder failed";
        onSnackbar(msg, "error");
      }
    },
    [tree, onSnackbar]
  );

  // ── Root item picker ──────────────────────────────────────────────────────

  const handleSelectRootItem = (newValue: ItemOption | null) => {
    if (newValue) {
      setSelectedRootItem(newValue);
      setItemPickerMode(false);
      setRootItemSearchValue("");
      setRootItemOptions([]);
      fetchTree(newValue.item_id);
      fetchSetup("");
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const rootItemId = selectedRootItem?.item_id ?? item?.item_id;
  const rootLabel = selectedRootItem
    ? `${selectedRootItem.full_item_code || selectedRootItem.item_code} — ${selectedRootItem.item_name}`
    : item
    ? `${item.full_item_code || item.item_code} — ${item.item_name}`
    : "";

  const rootNextSeq = Math.max(0, ...tree.map((n) => n.sequence_no)) + 1;

  const maxDepth = useMemo(() => computeMaxDepth(tree), [tree]);

  // Drag is disabled for root-level rows while any inline row is open
  const rootDragDisabled = editingBomId !== null || addingUnderParentId !== null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { minHeight: "85vh" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
          <span>Item BOM {rootLabel ? `— ${rootLabel}` : ""}</span>
          {!itemPickerMode && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={tree.length === 0 ? "Add components before printing" : "Print BOM"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setPrintDialogOpen(true)}
                    disabled={loading || tree.length === 0}
                  >
                    <Printer size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <FormControl size="small" sx={{ minWidth: 200 }} disabled={statusSaving}>
                <InputLabel id="bom-status-label">Status</InputLabel>
                <Select
                  labelId="bom-status-label"
                  label="Status"
                  value={bomStatus}
                  onChange={(e) => handleStatusChange(e.target.value as BomStatus)}
                >
                  {BOM_STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {itemPickerMode ? (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Select an item to define or view its BOM:
              </Typography>
              <Autocomplete
                autoHighlight
                options={rootItemOptions}
                filterOptions={(x) => x}
                getOptionLabel={(opt: ItemOption) =>
                  `${opt.full_item_code || opt.item_code} — ${opt.item_name}`
                }
                renderOption={(props, opt) => {
                  const { key: _ignore, ...rest } = props as { key?: React.Key } & React.HTMLAttributes<HTMLLIElement>;
                  return (
                    <li {...rest} key={opt.item_id}>
                      {`${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
                    </li>
                  );
                }}
                value={null}
                inputValue={rootItemSearchValue}
                onChange={(_, newValue) => handleSelectRootItem(newValue)}
                onInputChange={(_, value, reason) => {
                  if (reason !== "reset") setRootItemSearchValue(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Item"
                    placeholder="Type to search..."
                    size="small"
                    autoFocus
                  />
                )}
                isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
              />
            </Box>
          ) : loading && tree.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ py: 1, position: "relative" }}>
              {loading && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                  }}
                >
                  <CircularProgress size={18} />
                </Box>
              )}
              {tree.length === 0 && addingUnderParentId !== rootItemId ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No components defined yet. Click &quot;Add Component&quot; to get started.
                </Typography>
              ) : (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Header row */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: BOM_GRID_COLUMNS,
                      bgcolor: "grey.50",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        textAlign: "center",
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Seq
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Item Code
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Item Name
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Addl. Desc
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        textAlign: "right",
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Qty
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        textAlign: "right",
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      BOM Qty
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        textAlign: "right",
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      UOM
                    </Typography>
                    <Box />
                  </Box>

                  {/* Top-level tree rows wrapped in DndContext + SortableContext */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tree.map((n) => n.bom_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tree.map((node) => (
                        <BomTreeNode
                          key={node.bom_id}
                          node={node}
                          level={0}
                          expanded={expanded}
                          gridColumns={BOM_GRID_COLUMNS}
                          editingBomId={editingBomId}
                          addingUnderParentId={addingUnderParentId}
                          itemOptions={itemOptions}
                          uomOptions={uomOptions}
                          dragDisabled={rootDragDisabled}
                          onToggle={handleToggle}
                          onStartAddChild={handleStartAddChild}
                          onStartEdit={handleStartEdit}
                          onRemove={handleRemoveOpen}
                          onSaveNew={handleSaveNew}
                          onSaveEdit={handleSaveEdit}
                          onCancelInline={handleCancelInline}
                          onItemSearchChange={handleItemSearchChange}
                          onSnackbar={onSnackbar}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Root-level inline blank row */}
                  {addingUnderParentId === rootItemId && rootItemId !== undefined && (
                    <InlineBomRow
                      level={0}
                      gridColumns={BOM_GRID_COLUMNS}
                      nextSeq={rootNextSeq}
                      parentItemId={rootItemId}
                      parentMultiplier={1}
                      itemOptions={itemOptions}
                      uomOptions={uomOptions}
                      onItemSearchChange={handleItemSearchChange}
                      onSave={handleSaveNew}
                      onCancel={handleCancelInline}
                    />
                  )}
                </Box>
              )}

              {rootItemId && (
                <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setAddingUnderParentId(rootItemId);
                      setEditingBomId(null);
                    }}
                  >
                    + Add Component
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setBulkAddOpen(true)}
                  >
                    + Bulk Add
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmRemoveNode}
        title="Remove Component"
        message={
          confirmRemoveNode
            ? `Remove "${confirmRemoveNode.child_item_code} — ${confirmRemoveNode.child_item_name}" from the BOM?`
            : ""
        }
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmRemoveNode(null)}
      />

      <BomPrintDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        onConfirm={handlePrintConfirm}
        itemLabel={rootLabel}
        maxDepth={maxDepth}
      />

      <BulkAddComponentsDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        parentItemId={rootItemId}
        nextSeqStart={rootNextSeq}
        itemOptions={itemOptions}
        uomOptions={uomOptions}
        onItemSearchChange={handleItemSearchChange}
        onBulkSave={handleBulkSave}
      />
    </>
  );
}
