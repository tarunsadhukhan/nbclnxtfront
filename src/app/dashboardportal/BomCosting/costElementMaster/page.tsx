"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Box, Typography, Snackbar, Alert, Stack } from "@mui/material";
import { Button } from "@/components/ui/button";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CostElementTree, { CostElementNode } from "./_components/CostElementTree";
import CostElementForm from "./_components/CostElementForm";

export default function CostElementMasterPage() {
  const [tree, setTree] = useState<CostElementNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingElement, setEditingElement] = useState<CostElementNode | null>(null);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const getCoId = () => {
    const sel = localStorage.getItem("sidebar_selectedCompany");
    return sel ? JSON.parse(sel).co_id : "";
  };

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const co_id = getCoId();
      if (!co_id) return;
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.COST_ELEMENT_TREE}?co_id=${co_id}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch cost elements");
      setTree(data.data || []);
      // Auto-expand root level
      const initial: Record<number, boolean> = {};
      (data.data || []).forEach((n: CostElementNode) => {
        initial[n.cost_element_id] = true;
      });
      setExpanded(initial);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleToggle = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (node: CostElementNode) => {
    setEditingElement(node);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    setAddParentId(parentId);
    setEditingElement(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleCreateNew = () => {
    setAddParentId(null);
    setEditingElement(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleSeed = async () => {
    try {
      const co_id = getCoId();
      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.COST_ELEMENT_SEED,
        "POST",
        { co_id: Number(co_id) }
      );
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: data?.message || "Template seeded successfully", severity: "success" });
      fetchTree();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      const co_id = getCoId();
      if (formMode === "create") {
        const payload = {
          ...formData,
          co_id: Number(co_id),
          parent_element_id: addParentId || formData.parent_element_id || null,
        };
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.COST_ELEMENT_CREATE,
          "POST",
          payload
        );
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Cost element created", severity: "success" });
      } else {
        const payload = {
          cost_element_id: editingElement?.cost_element_id,
          co_id: Number(co_id),
          ...formData,
        };
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.COST_ELEMENT_UPDATE,
          "POST",
          payload
        );
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Cost element updated", severity: "success" });
      }
      setFormOpen(false);
      fetchTree();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  // Build flat list of non-leaf elements for parent dropdown
  const flattenForParentOptions = (nodes: CostElementNode[]): { id: number; label: string }[] => {
    const result: { id: number; label: string }[] = [];
    const walk = (items: CostElementNode[], prefix: string) => {
      for (const item of items) {
        if (!item.is_leaf) {
          result.push({ id: item.cost_element_id, label: `${prefix}${item.element_code} - ${item.element_name}` });
          if (item.children) walk(item.children, prefix + "  ");
        }
      }
    };
    walk(nodes, "");
    return result;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Cost Element Master
        </Typography>
        <Stack direction="row" spacing={1}>
          {tree.length === 0 && !loading && (
            <Button onClick={handleSeed} variant="outline">
              Seed Template
            </Button>
          )}
          <Button onClick={handleCreateNew}>+ New Element</Button>
        </Stack>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : (
        <CostElementTree
          nodes={tree}
          expanded={expanded}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onAddChild={handleAddChild}
          mode="edit"
        />
      )}

      <CostElementForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={editingElement}
        parentOptions={flattenForParentOptions(tree)}
      />

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
