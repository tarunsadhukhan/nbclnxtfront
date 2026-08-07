"use client";

import React, { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { Box, Typography, Snackbar, Alert, Stack, Chip, CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CostSheetTreeNode, { CostEntryNode } from "./_components/CostSheetTreeNode";
import CostEntrySummaryBar from "./_components/CostEntrySummaryBar";
import SnapshotHistoryPanel from "./_components/SnapshotHistoryPanel";
import { ArrowLeft } from "lucide-react";

// Suspense wrapper for useSearchParams
export default function CostSheetPage() {
  return (
    <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}><CircularProgress /></Box>}>
      <CostSheetEditorPage />
    </Suspense>
  );
}

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

type Header = {
  bom_hdr_id: number;
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  bom_version: number;
  version_label: string | null;
  status_id: number;
  status_name: string | null;
};

function CostSheetEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const bomHdrId = searchParams.get("bom_hdr_id");
  const canEdit = mode === "edit";

  const [header, setHeader] = useState<Header | null>(null);
  const [costTree, setCostTree] = useState<CostEntryNode[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Local entry state for editing (tracked by cost_element_id)
  const localEntries = useRef<Record<number, Partial<CostEntryNode>>>({});

  const getCoId = () => {
    const sel = localStorage.getItem("sidebar_selectedCompany");
    return sel ? JSON.parse(sel).co_id : "";
  };

  const fetchDetail = useCallback(async () => {
    if (!bomHdrId) return;
    setLoading(true);
    try {
      const co_id = getCoId();
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_COSTING_DETAIL}?bom_hdr_id=${bomHdrId}&co_id=${co_id}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch BOM costing detail");
      const detail = data.data;
      setHeader(detail.header);
      setCostTree(detail.cost_entries_tree || []);
      setSnapshots(detail.snapshots || []);

      // Auto-expand all root elements
      const initial: Record<number, boolean> = {};
      (detail.cost_entries_tree || []).forEach((n: CostEntryNode) => {
        initial[n.cost_element_id] = true;
      });
      setExpanded(initial);

      // Reset local entries
      localEntries.current = {};
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [bomHdrId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleToggle = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Update local state for a tree node field
  const handleEntryChange = (nodeId: number, field: string, value: any) => {
    localEntries.current[nodeId] = {
      ...localEntries.current[nodeId],
      [field]: value,
    };

    // Update tree in-place for immediate visual feedback
    const updateTree = (nodes: CostEntryNode[]): CostEntryNode[] =>
      nodes.map((n) => {
        if (n.cost_element_id === nodeId) {
          const updated = { ...n, [field]: value === "" ? null : value };
          // Auto-calculate amount when qty and rate both present
          if (field === "qty" || field === "rate") {
            const qty = field === "qty" ? (value ? Number(value) : null) : n.qty;
            const rate = field === "rate" ? (value ? Number(value) : null) : n.rate;
            if (qty != null && rate != null) {
              updated.amount = qty * rate;
              localEntries.current[nodeId] = { ...localEntries.current[nodeId], amount: qty * rate };
            }
          }
          return updated;
        }
        if (n.children && n.children.length > 0) {
          return { ...n, children: updateTree(n.children) };
        }
        return n;
      });

    setCostTree((prev) => updateTree(prev));
  };

  // Save a single entry on blur
  const handleSaveEntry = async (nodeId: number) => {
    const local = localEntries.current[nodeId];
    if (!local) return; // no changes

    // Find the node in tree
    const findNode = (nodes: CostEntryNode[]): CostEntryNode | null => {
      for (const n of nodes) {
        if (n.cost_element_id === nodeId) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(costTree);
    if (!node) return;

    // Only save if there's actual amount data
    const amount = node.amount;
    if (!amount && amount !== 0) return;

    try {
      setSaving(true);
      const co_id = getCoId();
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_COST_ENTRY_SAVE,
        "POST",
        {
          bom_hdr_id: Number(bomHdrId),
          cost_element_id: nodeId,
          amount: Number(amount),
          qty: node.qty != null ? Number(node.qty) : null,
          rate: node.rate != null ? Number(node.rate) : null,
          source: node.source || "manual",
          remarks: node.remarks || null,
          effective_date: node.effective_date || today,
          co_id: Number(co_id),
        }
      );
      if (error) throw new Error(error);

      // Update parent amounts in-place from response
      if (data?.updated_parents) {
        setCostTree((prev) => {
          const updateParents = (nodes: CostEntryNode[]): CostEntryNode[] =>
            nodes.map((n) => {
              const parentUpdate = data.updated_parents.find(
                (p: any) => p.cost_element_id === n.cost_element_id
              );
              const updated = parentUpdate
                ? { ...n, amount: parentUpdate.amount, source: parentUpdate.source }
                : n;
              if (updated.children && updated.children.length > 0) {
                return { ...updated, children: updateParents(updated.children) };
              }
              return updated;
            });
          return updateParents(prev);
        });
      }

      // Clear local entry for this node
      delete localEntries.current[nodeId];
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      const co_id = getCoId();
      const { error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_COST_ENTRY_DELETE,
        "POST",
        { bom_cost_entry_id: entryId, co_id: Number(co_id) }
      );
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: "Entry removed", severity: "success" });
      fetchDetail();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const handleComputeRollup = async () => {
    try {
      setSaving(true);
      const co_id = getCoId();
      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_COST_ROLLUP,
        "POST",
        { bom_hdr_id: Number(bomHdrId), co_id: Number(co_id) }
      );
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: "Rollup computed successfully", severity: "success" });
      fetchDetail(); // Refresh everything
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Compute summary from tree root elements
  const summaryTotals = costTree.reduce(
    (acc, node) => {
      if (node.element_type === "material") acc.material += node.amount || 0;
      else if (node.element_type === "conversion") acc.conversion += node.amount || 0;
      else if (node.element_type === "overhead") acc.overhead += node.amount || 0;
      return acc;
    },
    { material: 0, conversion: 0, overhead: 0 }
  );
  const totalCost = summaryTotals.material + summaryTotals.conversion;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      {/* Header Bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboardportal/BomCosting/bomCosting")}>
            <ArrowLeft size={16} />
          </Button>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {header?.full_item_code || header?.item_code} &mdash; {header?.item_name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
              <Typography sx={{ fontSize: "0.8rem", color: "#666" }}>
                Version {header?.bom_version}
                {header?.version_label ? ` (${header.version_label})` : ""}
              </Typography>
              {header?.status_name && (
                <Chip label={header.status_name} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
            </Stack>
          </Box>
        </Stack>

        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button variant="outline" onClick={handleComputeRollup} disabled={saving}>
              {saving ? "Computing..." : "Compute Rollup"}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Summary Bar */}
      <CostEntrySummaryBar
        materialCost={summaryTotals.material}
        conversionCost={summaryTotals.conversion}
        overheadCost={summaryTotals.overhead}
        totalCost={totalCost}
      />

      {/* Cost Element Tree Grid */}
      <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, overflow: "hidden" }}>
        {/* Grid Header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(200px, 2fr) 90px 80px 90px 110px 70px 120px 40px",
            px: 0.5,
            py: 0.5,
            bgcolor: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
            fontWeight: 600,
            fontSize: "0.7rem",
            color: "#666",
          }}
        >
          <Typography sx={{ pl: 1, fontSize: "inherit", fontWeight: "inherit" }}>Cost Element</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Qty</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Basis</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Rate</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Amount</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Source</Typography>
          <Typography sx={{ fontSize: "inherit", fontWeight: "inherit", textAlign: "center" }}>Remarks</Typography>
          <Box />
        </Box>

        {costTree.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              No cost elements found. Set up cost elements first.
            </Typography>
          </Box>
        ) : (
          costTree.map((node) => (
            <CostSheetTreeNode
              key={node.cost_element_id}
              node={node}
              level={0}
              expanded={expanded}
              onToggle={handleToggle}
              onEntryChange={handleEntryChange}
              onSaveEntry={handleSaveEntry}
              onDeleteEntry={handleDeleteEntry}
              canEdit={canEdit}
            />
          ))
        )}
      </Box>

      {/* Snapshot History */}
      <SnapshotHistoryPanel snapshots={snapshots} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
