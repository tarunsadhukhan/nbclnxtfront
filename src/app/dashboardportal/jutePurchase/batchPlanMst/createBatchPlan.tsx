"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
} from "@mui/material";
import { X, Plus, Trash2 } from "lucide-react";
import { MuiFormMode } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

/**
 * Props for CreateBatchPlan dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save (create or edit) */
  onSaved?: () => void;
  /** ID of the batch plan to edit/view. If undefined, opens in create mode */
  editId?: number | string;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * Option type for dropdown selections
 */
type Option = {
  label: string;
  value: string;
};

/**
 * Item type from API
 */
type ItemRecord = {
  item_grp_id: number;
  item_grp_name?: string;
  item_grp_desc?: string;
  item_code?: string;
  parent_grp_name?: string;
};

/**
 * Quality type from API
 */
type QualityRecord = {
  item_id: number;
  jute_quality: string;
  item_grp_id: number;
};

/**
 * Line item for batch plan
 */
type BatchPlanLineItem = {
  id: string; // Client-side ID for tracking
  item_grp_id: string;
  item_id: string;
  percentage: string;
  // For display
  jute_group_name?: string;
  quality_name?: string;
};

let lineIdCounter = 0;

/**
 * Generate a unique ID for line items
 */
const generateLineId = (): string => {
  lineIdCounter += 1;
  return `line-${lineIdCounter}`;
};

/**
 * Create a blank line item
 */
const createBlankLineItem = (): BatchPlanLineItem => ({
  id: generateLineId(),
  item_grp_id: "",
  item_id: "",
  percentage: "",
});

/**
 * @component CreateBatchPlan
 * @description Dialog component for creating, editing, or viewing batch plan records.
 * Supports line items for jute quality and percentage allocation.
 *
 * @example
 * <CreateBatchPlan
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateBatchPlan({
  open,
  onClose,
  onSaved,
  editId,
  initialMode = "create",
}: Props) {
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>(initialMode);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({ open: false, message: "", severity: "success" });

  // Get branches from sidebar context
  const { selectedCompany, selectedBranches: contextSelectedBranches } = useSidebarContext();
  const branchOptions = useMemo<Option[]>(() => {
    if (!selectedCompany?.branches) return [];
    return selectedCompany.branches.map((b) => ({
      label: b.branch_name,
      value: String(b.branch_id),
    }));
  }, [selectedCompany]);

  // Form data
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [planName, setPlanName] = useState("");
  const [lineItems, setLineItems] = useState<BatchPlanLineItem[]>([createBlankLineItem()]);

  // Setup data
  const [itemOptions, setItemOptions] = useState<Option[]>([]);
  const [itemRecords, setItemRecords] = useState<ItemRecord[]>([]);

  // Quality cache per item_id
  const [qualityCache, setQualityCache] = useState<Record<string, Option[]>>({});
  const [qualityLoading, setQualityLoading] = useState<Record<string, boolean>>({});

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Fetch qualities for an item - stable function that checks cache via closure
   */
  const fetchQualitiesForItem = useCallback(
    async (itemId: string, currentCache: Record<string, Option[]>): Promise<Option[]> => {
      if (!itemId) return [];
      if (currentCache[itemId]) return currentCache[itemId];

      setQualityLoading((prev) => ({ ...prev, [itemId]: true }));

      try {
        const co_id = getCoId();
        const { data, error } = await fetchWithCookie(
          `${apiRoutesPortalMasters.BATCH_PLAN_QUALITIES_FOR_ITEM}/${itemId}?co_id=${co_id}`,
          "GET"
        );

        if (error || !data) {
          console.error("Error fetching qualities:", error);
          return [];
        }

        const qualities = data.qualities ?? [];
        const options: Option[] = qualities.map((q: QualityRecord) => ({
          label: q.jute_quality || "",
          value: String(q.item_id),
        }));

        setQualityCache((prev) => ({ ...prev, [itemId]: options }));
        return options;
      } catch (err) {
        console.error("Error fetching qualities:", err);
        return [];
      } finally {
        setQualityLoading((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [getCoId]
  );

  /**
   * Load setup data from API
   */
  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    // Reset quality cache at start of load
    setQualityCache({});
    setQualityLoading({});
    
    try {
      const co_id = getCoId();
      // For create mode, default to first selected branch from context
      const defaultBranchId = contextSelectedBranches.length > 0 
        ? String(contextSelectedBranches[0]) 
        : "";

      if (!co_id) throw new Error("No company selected");

      let url: string;
      if (editId !== undefined) {
        // Edit/View mode - get setup with existing details
        // We need a branch_id for the query, use the default for now
        url = `${apiRoutesPortalMasters.BATCH_PLAN_EDIT_SETUP}/${editId}?co_id=${co_id}&branch_id=${defaultBranchId}`;
      } else {
        // Create mode - set default branch
        setSelectedBranch(defaultBranchId);
        url = `${apiRoutesPortalMasters.BATCH_PLAN_CREATE_SETUP}?co_id=${co_id}`;
      }

      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load setup data");
      }

      // Map items to options
      const items = (data.items ?? []) as ItemRecord[];
      setItemRecords(items);
      const mappedItems: Option[] = items.map((item) => ({
        label: `${item.item_grp_name ?? item.item_grp_desc ?? String(item.item_grp_id)}${item.item_code ? ` (${item.item_code})` : ""}`,
        value: String(item.item_grp_id),
      }));
      setItemOptions(mappedItems);

      // If editing, set form values from existing record
      if (editId !== undefined && data.batch_plan_details) {
        const details = data.batch_plan_details;
        setPlanName(details.plan_name ?? "");
        // Set branch from the batch plan details
        if (details.branch_id) {
          setSelectedBranch(String(details.branch_id));
        }

        // Map line items
        const existingLineItems = data.line_items ?? [];
        if (existingLineItems.length > 0) {
          const mappedLineItems: BatchPlanLineItem[] = existingLineItems.map(
            (li: Record<string, unknown>) => ({
              id: generateLineId(),
              item_grp_id: li.item_grp_id ? String(li.item_grp_id) : (li.item_id ? String(li.item_id) : ""),
              item_id: li.item_id ? String(li.item_id) : "",
              percentage: li.percentage !== null && li.percentage !== undefined
                ? String(li.percentage)
                : "",
              jute_group_name: (li.jute_group_name as string) ?? "",
              quality_name: (li.quality_name as string) ?? (li.jute_quality as string) ?? "",
            })
          );
          setLineItems(mappedLineItems);

          // Pre-fetch qualities for all items in line items
          // Use empty cache since we just reset it
          const uniqueItemIds = [...new Set(mappedLineItems.map((li) => li.item_grp_id).filter(Boolean))];
          for (const itemId of uniqueItemIds) {
            void fetchQualitiesForItem(itemId, {});
          }
        } else {
          setLineItems([createBlankLineItem()]);
        }
      } else {
        // Create mode - empty values
        setPlanName("");
        setLineItems([createBlankLineItem()]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading setup";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingSetup(false);
    }
  }, [editId, getCoId, contextSelectedBranches, fetchQualitiesForItem]);

  // Reset and load setup when dialog opens
  useEffect(() => {
    if (open) {
      // Set mode based on whether we're editing/viewing or creating
      if (editId !== undefined) {
        setMode(initialMode === "create" ? "edit" : initialMode);
      } else {
        setMode("create");
      }
      loadSetup();
    } else {
      // Reset state when dialog closes
      setSelectedBranch("");
      setPlanName("");
      setLineItems([createBlankLineItem()]);
      setItemOptions([]);
      setItemRecords([]);
      setQualityCache({});
      setQualityLoading({});
    }
  }, [open, editId, initialMode, loadSetup]);

  /**
   * Handle item change for a line item
   */
  const handleItemChange = useCallback(
    (lineId: string, newItemId: string) => {
      setLineItems((prev) =>
        prev.map((li) =>
          li.id === lineId
            ? { ...li, item_grp_id: newItemId, item_id: "" }
            : li
        )
      );

      // Fetch qualities for the new item - pass current cache
      if (newItemId) {
        setQualityCache((currentCache) => {
          // Trigger fetch with current cache state
          void fetchQualitiesForItem(newItemId, currentCache);
          return currentCache;
        });
      }
    },
    [fetchQualitiesForItem]
  );

  /**
   * Handle quality change for a line item
   */
  const handleQualityChange = useCallback((lineId: string, newQualityId: string) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineId ? { ...li, item_id: newQualityId } : li
      )
    );
  }, []);

  /**
   * Handle percentage change for a line item
   */
  const handlePercentageChange = useCallback((lineId: string, newPercentage: string) => {
    // Only allow numbers and decimal
    if (newPercentage && !/^\d*\.?\d*$/.test(newPercentage)) return;

    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineId ? { ...li, percentage: newPercentage } : li
      )
    );
  }, []);

  /**
   * Add a new line item
   */
  const handleAddLine = useCallback(() => {
    setLineItems((prev) => [...prev, createBlankLineItem()]);
  }, []);

  /**
   * Remove a line item
   */
  const handleRemoveLine = useCallback((lineId: string) => {
    setLineItems((prev) => {
      const filtered = prev.filter((li) => li.id !== lineId);
      // Always keep at least one line
      return filtered.length > 0 ? filtered : [createBlankLineItem()];
    });
  }, []);

  /**
   * Calculate total percentage
   */
  const totalPercentage = useMemo(() => {
    return lineItems.reduce((sum, li) => {
      const pct = parseFloat(li.percentage);
      return sum + (isNaN(pct) ? 0 : pct);
    }, 0);
  }, [lineItems]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (!selectedBranch) throw new Error("Please select a branch");

      // Validate plan name
      if (!planName || !planName.trim()) {
        throw new Error("Plan name is required");
      }

      // Validate line items
      const validLineItems = lineItems.filter(
        (li) => li.item_id && li.percentage
      );

      if (validLineItems.length === 0) {
        throw new Error("At least one quality with percentage is required");
      }

      // Validate total percentage
      const total = validLineItems.reduce((sum, li) => {
        const pct = parseFloat(li.percentage);
        return sum + (isNaN(pct) ? 0 : pct);
      }, 0);

      if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Total percentage must equal 100%. Current total: ${total.toFixed(2)}%`);
      }

      // Build payload
      const payload = {
        plan_name: planName.trim(),
        branch_id: parseInt(selectedBranch),
        line_items: validLineItems.map((li) => ({
          item_id: parseInt(li.item_id),
          percentage: parseFloat(li.percentage),
          item_grp_id: li.item_grp_id ? parseInt(li.item_grp_id) : null,
        })),
      };

      let url: string;
      let method: "POST" | "PUT";

      if (editId !== undefined) {
        // Edit mode
        url = `${apiRoutesPortalMasters.BATCH_PLAN_EDIT}/${editId}?branch_id=${selectedBranch}`;
        method = "PUT";
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.BATCH_PLAN_CREATE}?branch_id=${selectedBranch}`;
        method = "POST";
      }

      const { error } = await fetchWithCookie(url, method, payload);

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message:
          editId !== undefined
            ? "Batch plan updated successfully"
            : "Batch plan created successfully",
        severity: "success",
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle mode change (view -> edit)
   */
  const handleModeChange = () => {
    if (mode === "view") {
      setMode("edit");
    }
  };

  /**
   * Dialog title based on mode
   */
  const dialogTitle = useMemo(() => {
    if (editId !== undefined) {
      return mode === "view" ? "View Batch Plan" : "Edit Batch Plan";
    }
    return "Create Batch Plan";
  }, [editId, mode]);

  const isViewMode = mode === "view";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="span">
            {dialogTitle}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loadingSetup ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              {/* Branch Selection */}
              <Autocomplete
                size="small"
                options={branchOptions}
                value={branchOptions.find((o) => o.value === selectedBranch) ?? null}
                onChange={(_, newValue) => {
                  setSelectedBranch(newValue?.value ?? "");
                }}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.value === b.value}
                renderInput={(params) => (
                  <TextField {...params} label="Branch" required />
                )}
                disabled={isViewMode || editId !== undefined}
                sx={{ mb: 2 }}
              />

              {/* Plan Name */}
              <TextField
                label="Plan Name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                fullWidth
                required
                disabled={isViewMode}
                size="small"
                sx={{ mb: 3 }}
              />

              {/* Line Items Table */}
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                Quality Allocation
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "grey.100" }}>
                      <TableCell sx={{ fontWeight: 600, width: "35%" }}>Item (Jute Type)</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: "35%" }}>Quality</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: "20%" }} align="right">
                        Percentage (%)
                      </TableCell>
                      {!isViewMode && (
                        <TableCell sx={{ fontWeight: 600, width: "10%" }} align="center">
                          Action
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((line) => {
                      const qualityOptions = qualityCache[line.item_grp_id] ?? [];
                      const isLoadingQualities = qualityLoading[line.item_grp_id] ?? false;

                      return (
                        <TableRow key={line.id}>
                          <TableCell>
                            {isViewMode ? (
                              <Typography variant="body2">
                                {line.jute_group_name || 
                                  itemOptions.find((o) => o.value === line.item_grp_id)?.label || 
                                  "-"}
                              </Typography>
                            ) : (
                              <Autocomplete
                                size="small"
                                options={itemOptions}
                                value={itemOptions.find((o) => o.value === line.item_grp_id) ?? null}
                                onChange={(_, newValue) => {
                                  handleItemChange(line.id, newValue?.value ?? "");
                                }}
                                getOptionLabel={(o) => o.label}
                                isOptionEqualToValue={(a, b) => a.value === b.value}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Select item" />
                                )}
                                disableClearable={false}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {isViewMode ? (
                              <Typography variant="body2">
                                {line.quality_name ||
                                  qualityOptions.find((o) => o.value === line.item_id)?.label ||
                                  "-"}
                              </Typography>
                            ) : (
                              <Autocomplete
                                size="small"
                                options={qualityOptions}
                                value={qualityOptions.find((o) => o.value === line.item_id) ?? null}
                                onChange={(_, newValue) => {
                                  handleQualityChange(line.id, newValue?.value ?? "");
                                }}
                                getOptionLabel={(o) => o.label}
                                isOptionEqualToValue={(a, b) => a.value === b.value}
                                loading={isLoadingQualities}
                                disabled={!line.item_grp_id}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder={line.item_grp_id ? "Select quality" : "Select item first"}
                                  />
                                )}
                                disableClearable={false}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {isViewMode ? (
                              <Typography variant="body2">
                                {line.percentage || "-"}
                              </Typography>
                            ) : (
                              <TextField
                                size="small"
                                type="text"
                                value={line.percentage}
                                onChange={(e) => handlePercentageChange(line.id, e.target.value)}
                                placeholder="0.00"
                                inputProps={{
                                  style: { textAlign: "right" },
                                }}
                                sx={{ width: "100px" }}
                              />
                            )}
                          </TableCell>
                          {!isViewMode && (
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveLine(line.id)}
                                aria-label="Remove line"
                              >
                                <Trash2 size={18} />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Total and Add Button Row */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {!isViewMode && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={handleAddLine}
                  >
                    Add Line
                  </Button>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Total:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: Math.abs(totalPercentage - 100) > 0.01 ? "error.main" : "success.main",
                    }}
                  >
                    {totalPercentage.toFixed(2)}%
                  </Typography>
                  {Math.abs(totalPercentage - 100) > 0.01 && (
                    <Typography variant="caption" color="error">
                      (Must equal 100%)
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {isViewMode ? (
            <>
              <Button onClick={onClose} variant="outlined">
                Close
              </Button>
              <Button onClick={handleModeChange} variant="contained">
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose} variant="outlined" disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={saving || loadingSetup}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
