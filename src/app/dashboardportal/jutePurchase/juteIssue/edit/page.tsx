"use client";

import React, { useId, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useBranchOptions } from "@/utils/branchUtils";

import type {
  JuteIssueMode,
  EditableLineItem,
  JuteIssueLineItem,
  JuteIssueSummary,
  StockOutstandingItem,
  Option,
} from "./types/juteIssueTypes";
import { useJuteIssueSetup } from "./hooks/useJuteIssueSetup";
import { useStockOutstanding } from "./hooks/useStockOutstanding";
import { useJuteIssueLineItems } from "./hooks/useJuteIssueLineItems";
import {
  mapApiLineItemsToEditable,
  mapJuteItemsToOptions,
  mapYarnTypesToOptions,
  mapBranchesToOptions,
  mapStockToOption,
  mapEditableToCreatePayload,
  buildLabelMap,
  createLabelResolver,
} from "./utils/juteIssueMappers";
import { JUTE_ISSUE_STATUS_IDS, JUTE_ISSUE_STATUS_LABELS } from "./utils/juteIssueConstants";
import { calculateIssueValue } from "./utils/juteIssueFactories";

/**
 * @component JuteIssueEditPage
 * @description Transaction page for viewing/editing/creating jute issues.
 * Shows available stock from MR and allows creating issue line items.
 */

const getStatusColor = (statusId: number): "success" | "error" | "warning" | "info" | "default" => {
  if (statusId === JUTE_ISSUE_STATUS_IDS.APPROVED) return "success";
  if (statusId === JUTE_ISSUE_STATUS_IDS.REJECTED) return "error";
  if (statusId === JUTE_ISSUE_STATUS_IDS.OPEN) return "warning";
  return "info"; // Draft
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const trimmed = value.trim();
  const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  return trimmed;
};

export default function JuteIssueEditPageWrapper() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      }
    >
      <JuteIssueEditPage />
    </Suspense>
  );
}

function JuteIssueEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const sidebarBranches = useBranchOptions();

  // Parse URL params
  const modeParam = searchParams.get("mode") as JuteIssueMode | null;
  const dateParam = searchParams.get("date");
  const branchIdParam = searchParams.get("branch_id");

  const mode: JuteIssueMode = modeParam || "create";
  const isViewMode = mode === "view";
  const isCreateMode = mode === "create";

  // State
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");
  const [issueDate, setIssueDate] = React.useState<string>(
    dateParam || new Date().toISOString().slice(0, 10)
  );
  const [summary, setSummary] = React.useState<JuteIssueSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Stock selection dialog state
  const [stockDialogOpen, setStockDialogOpen] = React.useState(false);
  const [filterItemId, setFilterItemId] = React.useState<Option | null>(null);
  const [filterItemName, setFilterItemName] = React.useState<Option | null>(null);
  const [selectedStockId, setSelectedStockId] = React.useState<string>("");

  // Add item dialog state (quantity/weight input after selecting stock)
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [selectedStock, setSelectedStock] = React.useState<StockOutstandingItem | null>(null);
  const [newYarnTypeId, setNewYarnTypeId] = React.useState<string>("");
  const [newQuantity, setNewQuantity] = React.useState<string>("");

  // Line item selection state (for bulk actions)
  const [selectedLineIds, setSelectedLineIds] = React.useState<Set<string>>(new Set());

  // Refetch counter - increment to trigger data reload
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // Selection handlers for checkbox column
  const handleToggleLineSelection = React.useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  // Calculate weight per unit from selected stock (actual_weight / actual_qty)
  const wtPerUnit = React.useMemo(() => {
    if (!selectedStock || !selectedStock.actual_qty) return 0;
    return selectedStock.actual_weight / selectedStock.actual_qty;
  }, [selectedStock]);

  // Setup data
  const { juteGroups, yarnTypes, branches, loading: setupLoading, error: setupError } = useJuteIssueSetup({
    coId,
  });

  // Line items management - must be before stockItems filter that uses lineItems
  const {
    lineItems,
    addLineFromStock,
    removeLineItem,
    updateLineItem,
    replaceItems,
    calculateTotals,
  } = useJuteIssueLineItems({ mode });

  // Stock data - fetch when branch is selected (filtered client-side by jute type/item)
  const { stockItems: allStockItems, loading: stockLoading, refetch: refetchStock } = useStockOutstanding({
    coId,
    branchId: selectedBranchId,
    itemId: undefined, // Fetch all, filter client-side
    issueDate, // Filter stock by issue date
  });

  // Filter stock items by selected jute type and item
  const stockItems = React.useMemo(() => {
    let filtered = allStockItems;
    if (filterItemId) {
      filtered = filtered.filter((s) => String(s.item_grp_id) === filterItemId.value);
    }
    if (filterItemName) {
      filtered = filtered.filter((s) => String(s.item_id) === filterItemName.value);
    }
    return filtered;
  }, [allStockItems, filterItemId, filterItemName]);

  // Calculate how much of each stock has already been entered in draft items
  const draftQuantityByMrLiId = React.useMemo(() => {
    const draftItems = lineItems.filter(
      (l) => l.status_id === JUTE_ISSUE_STATUS_IDS.DRAFT || (l.status_id === undefined && !l.jute_issue_id)
    );
    
    const map = new Map<string, number>();
    draftItems.forEach((item) => {
      const key = String(item.jute_mr_li_id);
      const currentQty = map.get(key) || 0;
      const qty = Number(item.quantity) || 0;
      map.set(key, currentQty + qty);
    });
    return map;
  }, [lineItems]);

  // Get adjusted balqty for display (API balqty - already entered in drafts)
  const getAdjustedBalQty = React.useCallback(
    (stock: StockOutstandingItem): number => {
      const draftQty = draftQuantityByMrLiId.get(String(stock.jute_mr_li_id)) || 0;
      const adjusted = stock.balqty - draftQty;
      return Math.max(0, adjusted); // Don't show negative values
    },
    [draftQuantityByMrLiId]
  );

  // Get adjusted weight for display
  const getAdjustedBalWeight = React.useCallback(
    (stock: StockOutstandingItem): number => {
      const draftQty = draftQuantityByMrLiId.get(String(stock.jute_mr_li_id)) || 0;
      if (stock.actual_qty === 0) return stock.balweight;
      const wtPerUnit = stock.actual_weight / stock.actual_qty;
      const adjusted = stock.balweight - draftQty * wtPerUnit;
      return Math.max(0, adjusted); // Don't show negative values
    },
    [draftQuantityByMrLiId]
  );

  // Auto-calculate weight based on quantity * wt_per_unit
  // When issuing the full remaining balance, use bal_weight directly to absorb rounding differences
  const calculatedWeight = React.useMemo(() => {
    const qty = Number(newQuantity) || 0;
    if (qty <= 0 || !selectedStock) return 0;

    const adjustedBalQty = getAdjustedBalQty(selectedStock);
    // If issuing the entire remaining balance, use bal_weight directly
    // This absorbs any 1-2 kg rounding difference from MR weight distribution
    if (qty >= adjustedBalQty && adjustedBalQty > 0) {
      return getAdjustedBalWeight(selectedStock);
    }

    return qty * wtPerUnit;
  }, [newQuantity, wtPerUnit, selectedStock, getAdjustedBalQty, getAdjustedBalWeight]);

  // Max weight based on balance quantity (adjusted for drafts)
  const maxWeight = React.useMemo(() => {
    if (!selectedStock) return 0;
    const adjustedBalQty = getAdjustedBalQty(selectedStock);
    return adjustedBalQty * wtPerUnit;
  }, [selectedStock, wtPerUnit, getAdjustedBalQty]);

  // Quantity validation - check if entered quantity exceeds available balance (adjusted for drafts)
  const quantityExceedsBalance = React.useMemo(() => {
    const qty = Number(newQuantity) || 0;
    if (!selectedStock) return false;
    const adjustedBalQty = getAdjustedBalQty(selectedStock);
    return qty > adjustedBalQty;
  }, [newQuantity, selectedStock, getAdjustedBalQty]);

  // Extract unique items from stock for filter dropdown
  const itemNameOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    allStockItems.forEach((s) => {
      if (s.item_id && s.item_name && !seen.has(String(s.item_id))) {
        seen.set(String(s.item_id), s.item_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [allStockItems]);

  // Get selectable lines (saved items that are not draft - i.e., Open status for approve/reject)
  const selectableOpenLines = React.useMemo(
    () => lineItems.filter((l) => l.jute_issue_id && l.status_id === JUTE_ISSUE_STATUS_IDS.OPEN),
    [lineItems]
  );

  // Get selectable draft lines (for Open action)
  const selectableDraftLines = React.useMemo(
    () => lineItems.filter((l) => l.jute_issue_id && l.status_id === JUTE_ISSUE_STATUS_IDS.DRAFT),
    [lineItems]
  );

  const handleSelectAllOpen = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedLineIds(new Set(selectableOpenLines.map((l) => l.id)));
      } else {
        setSelectedLineIds(new Set());
      }
    },
    [selectableOpenLines]
  );

  const handleSelectAllDraft = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedLineIds(new Set(selectableDraftLines.map((l) => l.id)));
      } else {
        setSelectedLineIds(new Set());
      }
    },
    [selectableDraftLines]
  );

  // Memoized options
  const juteItemOptions = React.useMemo(() => mapJuteItemsToOptions(juteGroups), [juteGroups]);
  const yarnTypeOptions = React.useMemo(() => mapYarnTypesToOptions(yarnTypes), [yarnTypes]);
  const branchOptions = React.useMemo(() => {
    // If sidebar has only one branch selected, use it
    if (sidebarBranches.length === 1) {
      return sidebarBranches;
    }
    // Otherwise use branches from setup
    return mapBranchesToOptions(branches);
  }, [sidebarBranches, branches]);

  const stockOptions = React.useMemo(
    () => stockItems.map(mapStockToOption),
    [stockItems]
  );

  // Label resolvers
  const yarnTypeLabelMap = React.useMemo(
    () => buildLabelMap(yarnTypes, (t) => String(t.jute_yarn_type_id), (t) => t.jute_yarn_type_name),
    [yarnTypes]
  );
  const getYarnTypeLabel = React.useMemo(() => createLabelResolver(yarnTypeLabelMap), [yarnTypeLabelMap]);

  const juteItemLabelMap = React.useMemo(
    () => buildLabelMap(juteGroups, (i) => String(i.item_grp_id), (i) => i.item_grp_desc),
    [juteGroups]
  );
  const getJuteItemLabel = React.useMemo(() => createLabelResolver(juteItemLabelMap), [juteItemLabelMap]);

  // Auto-select branch if only one is available
  React.useEffect(() => {
    if (!selectedBranchId && sidebarBranches.length === 1) {
      setSelectedBranchId(sidebarBranches[0].value);
    } else if (!selectedBranchId && branchIdParam) {
      setSelectedBranchId(branchIdParam);
    }
  }, [selectedBranchId, sidebarBranches, branchIdParam]);

  // Fetch max date and set default date to max+1 for create mode
  React.useEffect(() => {
    if (!isCreateMode || !coId || !selectedBranchId || dateParam) return;

    const fetchMaxDate = async () => {
      try {
        const params = new URLSearchParams({
          co_id: coId,
          branch_id: selectedBranchId,
        });
        const url = `${apiRoutesPortalMasters.JUTE_ISSUE_MAX_DATE}?${params.toString()}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError) {
          console.warn("Failed to fetch max date:", fetchError);
          return;
        }

        const response = data as { max_date: string | null };
        if (response.max_date) {
          // Set date to max_date + 1 day
          const maxDate = new Date(response.max_date);
          maxDate.setDate(maxDate.getDate() + 1);
          setIssueDate(maxDate.toISOString().slice(0, 10));
        }
        // If no max_date, keep the current date (today)
      } catch (err) {
        console.warn("Error fetching max date:", err);
      }
    };

    fetchMaxDate();
  }, [isCreateMode, coId, selectedBranchId, dateParam]);

  // Load existing issues for any mode when date/branch changes
  React.useEffect(() => {
    if (!coId || !selectedBranchId || !issueDate) return;

    const fetchIssues = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          co_id: coId,
          branch_id: selectedBranchId,
          issue_date: issueDate,
        });
        const url = `${apiRoutesPortalMasters.JUTE_ISSUES_BY_DATE}?${params.toString()}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError) {
          throw new Error(fetchError);
        }

        const response = data as {
          data: JuteIssueLineItem[];
          summary: JuteIssueSummary;
        };

        const mapped = mapApiLineItemsToEditable(response.data || []);
        replaceItems(mapped);
        setSummary(response.summary || null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load issues";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [coId, selectedBranchId, issueDate, replaceItems, refreshCounter]);

  // Handle stock selection dialog
  const handleOpenStockDialog = () => {
    setFilterItemId(null);
    setFilterItemName(null);
    setSelectedStockId("");
    refetchStock();
    setStockDialogOpen(true);
  };

  const handleCloseStockDialog = () => {
    setStockDialogOpen(false);
  };

  const handleStockRadioChange = (stockId: string) => {
    setSelectedStockId(stockId);
  };

  const handleConfirmStockSelection = () => {
    const stock = stockItems.find((s) => String(s.jute_mr_li_id) === selectedStockId);
    if (stock) {
      setSelectedStock(stock);
      setNewYarnTypeId("");
      setNewQuantity(String(stock.balqty || 0)); // Pre-fill with available balance qty
      // Weight is auto-calculated based on quantity * wt_per_unit
      setStockDialogOpen(false);
      setAddDialogOpen(true);
    }
  };

  // Handle add item dialog (quantity/weight input)
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setSelectedStock(null);
  };

  const handleAddItem = () => {
    if (!selectedStock || !newYarnTypeId) return;

    const quantity = Number(newQuantity) || 0;
    const weight = calculatedWeight; // Use auto-calculated weight

    if (quantity <= 0 || weight <= 0) {
      setError("Quantity and weight must be greater than 0");
      return;
    }

    if (quantity > getAdjustedBalQty(selectedStock)) {
      setError("Cannot issue more than available balance quantity");
      return;
    }

    addLineFromStock(selectedStock, newYarnTypeId, quantity, weight);
    handleCloseAddDialog();
    // Refetch stock to update available quantities
    refetchStock();
  };

  // Handle save
  const handleSave = async () => {
    if (!coId || !selectedBranchId || !issueDate) {
      setError("Please select branch and date");
      return;
    }

    if (lineItems.length === 0) {
      setError("Please add at least one issue line");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Create each line item
      for (const line of lineItems) {
        if (line.jute_issue_id) continue; // Skip existing items

        const payload = mapEditableToCreatePayload(line, Number(selectedBranchId), issueDate);
        const url = `${apiRoutesPortalMasters.JUTE_ISSUE_CREATE}?co_id=${coId}`;
        const { error: createError } = await fetchWithCookie(url, "POST", payload);

        if (createError) {
          throw new Error(createError);
        }
      }

      setSuccessMessage("Issues saved successfully");
      
      // Reload data to get saved issue IDs - stay in edit mode to allow adding more
      const params = new URLSearchParams({
        co_id: coId,
        branch_id: selectedBranchId,
        issue_date: issueDate,
      });
      const reloadUrl = `${apiRoutesPortalMasters.JUTE_ISSUES_BY_DATE}?${params.toString()}`;
      const { data: reloadData, error: reloadError } = await fetchWithCookie(reloadUrl, "GET");
      
      if (!reloadError && reloadData) {
        const response = reloadData as {
          data: JuteIssueLineItem[];
          summary: JuteIssueSummary;
        };
        const mapped = mapApiLineItemsToEditable(response.data || []);
        replaceItems(mapped);
        setSummary(response.summary || null);
      }
      
      // Refetch stock to update available quantities
      refetchStock();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save issues";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete line item
  const handleDeleteLine = async (line: EditableLineItem) => {
    if (isViewMode) return;

    if (line.jute_issue_id) {
      // Delete from backend
      try {
        const url = `${apiRoutesPortalMasters.JUTE_ISSUE_DELETE}/${line.jute_issue_id}?co_id=${coId}`;
        const { error: deleteError } = await fetchWithCookie(url, "DELETE");
        if (deleteError) {
          throw new Error(deleteError);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete";
        setError(message);
        return;
      }
    }

    removeLineItem(line.id);
    refetchStock();
  };

  // Handle approval actions
  const handleOpen = async () => {
    if (!coId) return;

    // Get selected draft items, or if none selected, use all draft items
    const selectedDraftItems = lineItems.filter(
      (l) => l.jute_issue_id && l.status_id === JUTE_ISSUE_STATUS_IDS.DRAFT &&
        (selectedLineIds.size === 0 || selectedLineIds.has(l.id))
    );

    if (selectedDraftItems.length === 0) {
      setError("No draft items to open");
      return;
    }

    const issueIds = selectedDraftItems.map((l) => l.jute_issue_id).filter(Boolean) as number[];

    setSaving(true);
    try {
      const url = `${apiRoutesPortalMasters.JUTE_ISSUE_OPEN}?co_id=${coId}`;
      const { error: openError } = await fetchWithCookie(url, "POST", {
        issue_ids: issueIds,
        status_id: 1,
      });

      if (openError) throw new Error(openError);
      setSuccessMessage(`${issueIds.length} issue(s) opened for approval`);
      setSelectedLineIds(new Set());
      // Trigger refetch to reflect status changes
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open issues");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!coId) return;

    // Get selected open items, or if none selected, use all open items
    const selectedOpenItems = lineItems.filter(
      (l) => l.jute_issue_id && l.status_id === JUTE_ISSUE_STATUS_IDS.OPEN &&
        (selectedLineIds.size === 0 || selectedLineIds.has(l.id))
    );

    if (selectedOpenItems.length === 0) {
      setError("No open items to approve");
      return;
    }

    const issueIds = selectedOpenItems.map((l) => l.jute_issue_id).filter(Boolean) as number[];

    setSaving(true);
    try {
      const url = `${apiRoutesPortalMasters.JUTE_ISSUE_APPROVE}?co_id=${coId}`;
      const { error: approveError } = await fetchWithCookie(url, "POST", {
        issue_ids: issueIds,
        status_id: 3,
      });

      if (approveError) throw new Error(approveError);
      setSuccessMessage(`${issueIds.length} issue(s) approved`);
      setSelectedLineIds(new Set());
      // Trigger refetch to reflect status changes
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve issues");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!coId) return;

    // Get selected open items, or if none selected, use all open items
    const selectedOpenItems = lineItems.filter(
      (l) => l.jute_issue_id && l.status_id === JUTE_ISSUE_STATUS_IDS.OPEN &&
        (selectedLineIds.size === 0 || selectedLineIds.has(l.id))
    );

    if (selectedOpenItems.length === 0) {
      setError("No open items to reject");
      return;
    }

    const issueIds = selectedOpenItems.map((l) => l.jute_issue_id).filter(Boolean) as number[];

    setSaving(true);
    try {
      const url = `${apiRoutesPortalMasters.JUTE_ISSUE_REJECT}?co_id=${coId}`;
      const { error: rejectError } = await fetchWithCookie(url, "POST", {
        issue_ids: issueIds,
        status_id: 4,
      });

      if (rejectError) throw new Error(rejectError);
      setSuccessMessage(`${issueIds.length} issue(s) rejected`);
      setSelectedLineIds(new Set());
      // Trigger refetch to reflect status changes
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject issues");
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totals = calculateTotals();

  // Loading state
  if (setupLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const statusId = summary?.status_id || JUTE_ISSUE_STATUS_IDS.DRAFT;
  // Allow adding items in create mode OR edit mode (not view mode)
  const canAddItems = !isViewMode;
  const canEdit = !isViewMode && selectableDraftLines.length > 0;
  // Check if there are unsaved items that need to be saved
  const unsavedLines = lineItems.filter((l) => !l.jute_issue_id);
  const hasUnsavedItems = unsavedLines.length > 0;
  // Show Save button if there are unsaved items (in create or edit mode)
  const canSave = !isViewMode && hasUnsavedItems;
  // Show Open button if there are any draft items that can be opened
  const canOpen = selectableDraftLines.length > 0;
  // Show Approve/Reject buttons if there are any open items that can be approved
  const canApprove = selectableOpenLines.length > 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {isCreateMode ? "Create Jute Issue" : isViewMode ? "View Jute Issue" : "Edit Jute Issue"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isCreateMode
              ? "Issue jute stock to production"
              : `Issue for ${formatDate(issueDate)}`}
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          {summary && (
            <Chip
              label={summary.status || "Draft"}
              color={getStatusColor(statusId)}
              size="medium"
            />
          )}
          <Button variant="outlined" onClick={() => router.push("/dashboardportal/jutePurchase/juteIssue")}>
            Back to List
          </Button>
        </Box>
      </Box>

      {/* Errors and Success */}
      {(error || setupError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error || setupError}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Header Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" gap={3} flexWrap="wrap">
          {/* Branch Selection */}
          {sidebarBranches.length === 1 ? (
            <TextField
              id="jute-issue-branch-readonly"
              label="Branch"
              value={sidebarBranches[0].label}
              disabled
              sx={{ minWidth: 200 }}
            />
          ) : (
            <FormControl sx={{ minWidth: 200 }} disabled={!isCreateMode}>
              <InputLabel id="jute-issue-branch-label">Branch</InputLabel>
              <Select
                labelId="jute-issue-branch-label"
                id="jute-issue-branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                label="Branch"
              >
                {branchOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Date */}
          <TextField
            id="jute-issue-date"
            label="Issue Date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            disabled={!isCreateMode}
            sx={{ minWidth: 200 }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Add Stock Button */}
          {canAddItems && selectedBranchId && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={handleOpenStockDialog}
              disabled={stockLoading}
            >
              Add from Stock
            </Button>
          )}
        </Box>
      </Paper>

      {/* Issue Line Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          Issue Items
        </Typography>

        {lineItems.length === 0 ? (
          <Typography color="text.secondary">No issue items added yet</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {/* Checkbox column - only show if there are selectable items */}
                {(selectableDraftLines.length > 0 || selectableOpenLines.length > 0) && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={
                        selectedLineIds.size > 0 &&
                        (selectableDraftLines.every((l) => selectedLineIds.has(l.id)) ||
                          selectableOpenLines.every((l) => selectedLineIds.has(l.id)))
                      }
                      indeterminate={
                        selectedLineIds.size > 0 &&
                        !selectableDraftLines.every((l) => selectedLineIds.has(l.id)) &&
                        !selectableOpenLines.every((l) => selectedLineIds.has(l.id))
                      }
                      onChange={(e) => {
                        // If we have draft lines pending, select those; otherwise select open lines
                        if (selectableDraftLines.length > 0) {
                          handleSelectAllDraft(e.target.checked);
                        } else {
                          handleSelectAllOpen(e.target.checked);
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>Status</TableCell>
                <TableCell>Yarn Type</TableCell>
                <TableCell>Gate Entry No</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Jute Type</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Bale/Drum</TableCell>
                <TableCell align="right">Weight (kg)</TableCell>
                <TableCell align="right">Rate/Qtl</TableCell>
                <TableCell align="right">Issue Value</TableCell>
                {canEdit && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((line) => {
                const lineStatusId = line.status_id ?? JUTE_ISSUE_STATUS_IDS.DRAFT;
                const isSelectable = line.jute_issue_id && 
                  (lineStatusId === JUTE_ISSUE_STATUS_IDS.DRAFT || lineStatusId === JUTE_ISSUE_STATUS_IDS.OPEN);
                return (
                  <TableRow key={line.id}>
                    {/* Checkbox cell */}
                    {(selectableDraftLines.length > 0 || selectableOpenLines.length > 0) && (
                      <TableCell padding="checkbox">
                        {isSelectable ? (
                          <Checkbox
                            size="small"
                            checked={selectedLineIds.has(line.id)}
                            onChange={() => handleToggleLineSelection(line.id)}
                          />
                        ) : null}
                      </TableCell>
                    )}
                    {/* Status chip */}
                    <TableCell>
                      <Chip
                        label={JUTE_ISSUE_STATUS_LABELS[lineStatusId] || "Unknown"}
                        size="small"
                        color={getStatusColor(lineStatusId)}
                      />
                    </TableCell>
                    <TableCell>{getYarnTypeLabel(line.yarn_type_id)}</TableCell>
                    <TableCell>{line.jute_gate_entry_no ?? "-"}</TableCell>
                    <TableCell>{line.unit_conversion}</TableCell>
                    <TableCell>{line.jute_group_name || getJuteItemLabel(line.item_grp_id)}</TableCell>
                    <TableCell>{line.item_name || "-"}</TableCell>
                    <TableCell align="right">{Number(line.quantity).toFixed(2)}</TableCell>
                    <TableCell align="right">{Number(line.weight).toFixed(2)}</TableCell>
                    <TableCell align="right">{line.actual_rate?.toFixed(2)}</TableCell>
                    <TableCell align="right">{line.issue_value?.toFixed(2)}</TableCell>
                    {canEdit && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLine(line)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Totals */}
        <Box display="flex" justifyContent="flex-end" mt={3} gap={4}>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Total Issue Weight
            </Typography>
            <Typography variant="h6">{totals.totalWeight.toFixed(2)} kg</Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Average Rate
            </Typography>
            <Typography variant="h6">
              {totals.totalWeight > 0
                ? ((totals.totalValue / totals.totalWeight) * 100).toFixed(2)
                : "0.00"}{" "}
              /Qtl
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Total Issue Value
            </Typography>
            <Typography variant="h6">₹ {totals.totalValue.toFixed(2)}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2} alignItems="center">
        {/* Selection indicator */}
        {selectedLineIds.size > 0 && (
          <Typography variant="body2" color="text.secondary">
            {selectedLineIds.size} item(s) selected
          </Typography>
        )}
        {canSave && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving || lineItems.length === 0}
          >
            {saving ? <CircularProgress size={20} /> : "Save"}
          </Button>
        )}
        {canOpen && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleOpen}
            disabled={saving}
          >
            {selectedLineIds.size > 0 && selectableDraftLines.some((l) => selectedLineIds.has(l.id))
              ? `Open Selected (${selectableDraftLines.filter((l) => selectedLineIds.has(l.id)).length})`
              : `Open All (${selectableDraftLines.length})`}
          </Button>
        )}
        {canApprove && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={handleApprove}
              disabled={saving}
            >
              {selectedLineIds.size > 0 && selectableOpenLines.some((l) => selectedLineIds.has(l.id))
                ? `Approve Selected (${selectableOpenLines.filter((l) => selectedLineIds.has(l.id)).length})`
                : `Approve All (${selectableOpenLines.length})`}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleReject}
              disabled={saving}
            >
              {selectedLineIds.size > 0 && selectableOpenLines.some((l) => selectedLineIds.has(l.id))
                ? `Reject Selected (${selectableOpenLines.filter((l) => selectedLineIds.has(l.id)).length})`
                : `Reject All (${selectableOpenLines.length})`}
            </Button>
          </>
        )}
      </Box>

      {/* Stock Selection Dialog */}
      <Dialog open={stockDialogOpen} onClose={handleCloseStockDialog} maxWidth="md" fullWidth>
        <DialogTitle>Select Stock to Issue</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={2}>
            {/* Filters Row */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Autocomplete
                id="stock-filter-jute-type"
                options={juteItemOptions}
                value={filterItemId}
                onChange={(_, value) => setFilterItemId(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Jute Type" size="small" />
                )}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                sx={{ minWidth: 220, flex: 1 }}
              />
              <Autocomplete
                id="stock-filter-item"
                options={itemNameOptions}
                value={filterItemName}
                onChange={(_, value) => setFilterItemName(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Item" size="small" />
                )}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                sx={{ minWidth: 220, flex: 1 }}
              />
              <IconButton onClick={refetchStock} disabled={stockLoading}>
                <RefreshCw size={18} />
              </IconButton>
            </Box>

            {/* Stock Table with Radio Selection */}
            {stockLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
              </Box>
            ) : stockItems.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No available stock for selected filters
              </Typography>
            ) : (
              <RadioGroup value={selectedStockId} onChange={(e) => handleStockRadioChange(e.target.value)}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>Gate Entry No</TableCell>
                      <TableCell>MR No</TableCell>
                      <TableCell>Jute Type</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Warehouse</TableCell>
                      <TableCell align="right">Bal Qty</TableCell>
                      <TableCell align="right">Bal Weight (kg)</TableCell>
                      <TableCell align="right">Rate/Qtl</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockItems.map((stock) => (
                      <TableRow
                        key={stock.jute_mr_li_id}
                        hover
                        onClick={() => handleStockRadioChange(String(stock.jute_mr_li_id))}
                        onDoubleClick={() => {
                          handleStockRadioChange(String(stock.jute_mr_li_id));
                          setTimeout(() => handleConfirmStockSelection(), 50);
                        }}
                        sx={{ cursor: "pointer" }}
                        selected={selectedStockId === String(stock.jute_mr_li_id)}
                      >
                        <TableCell padding="checkbox">
                          <Radio
                            checked={selectedStockId === String(stock.jute_mr_li_id)}
                            value={String(stock.jute_mr_li_id)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{stock.jute_gate_entry_no || "-"}</TableCell>
                        <TableCell>{stock.mr_num ?? stock.branch_mr_no}</TableCell>
                        <TableCell>{stock.jute_group_name || "-"}</TableCell>
                        <TableCell>{stock.item_name || "-"}</TableCell>
                        <TableCell>{stock.unit_conversion}</TableCell>
                        <TableCell>{stock.warehouse_name || "-"}</TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {getAdjustedBalQty(stock).toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              (Prv Bal: {stock.balqty?.toFixed(2)})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {getAdjustedBalWeight(stock).toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              (Prv Bal: {stock.balweight?.toFixed(2)})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{stock.actual_rate?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </RadioGroup>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStockDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmStockSelection}
            disabled={!selectedStockId}
          >
            Select & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog (Quantity/Weight Input) */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Issue Item</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={2}>
            {/* Quantity Error Alert */}
            {quantityExceedsBalance && (
              <Alert severity="error">
                Cannot issue more than available balance quantity ({selectedStock?.balqty?.toFixed(2)})
              </Alert>
            )}
            {/* Selected Stock Info */}
            {selectedStock && (
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Selected Stock
                </Typography>
                <Typography>
                  MR {selectedStock.mr_num ?? selectedStock.branch_mr_no} / GE {selectedStock.jute_gate_entry_no ?? "-"} - {selectedStock.jute_group_name || "Unknown"} ({selectedStock.item_name || "N/A"})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available: {selectedStock ? getAdjustedBalQty(selectedStock).toFixed(2) : "0"} unit({selectedStock?.unit_conversion}) | Rate: ₹{selectedStock?.actual_rate?.toFixed(2)}/qtl
                </Typography>
                <Typography variant="body2" color="primary">
                  Wt/Unit: {wtPerUnit.toFixed(2)} kg
                </Typography>
              </Box>
            )}

            {/* Yarn Type */}
            <Autocomplete
              id="jute-issue-yarn-type"
              options={yarnTypeOptions}
              value={yarnTypeOptions.find((o) => o.value === newYarnTypeId) || null}
              onChange={(_, value) => setNewYarnTypeId(value?.value || "")}
              renderInput={(params) => (
                <TextField {...params} label="Yarn Type" required />
              )}
              isOptionEqualToValue={(opt, val) => opt.value === val.value}
            />

            {/* Quantity and Weight */}
            <Box display="flex" gap={2}>
              <TextField
                id="jute-issue-quantity"
                label="Quantity (Bale/Drum)"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onFocus={(e) => e.target.select()}
                fullWidth
                autoFocus
                inputProps={{ min: 0, step: 1, max: selectedStock ? getAdjustedBalQty(selectedStock) : 0 }}
                helperText={selectedStock ? `Available: ${getAdjustedBalQty(selectedStock).toFixed(2)}` : ""}
              />
              <TextField
                id="jute-issue-weight"
                label="Weight (kg)"
                type="number"
                value={calculatedWeight.toFixed(2)}
                fullWidth
                InputProps={{ readOnly: true }}
                helperText={`Max: ${maxWeight.toFixed(2)} kg (auto-calculated)`}
              />
            </Box>

            {/* Calculated Value */}
            {selectedStock && calculatedWeight > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Calculated Issue Value (Weight × Rate ÷ 100)
                </Typography>
                <Typography variant="h6">
                  ₹ {calculateIssueValue(calculatedWeight, selectedStock.actual_rate || 0).toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!selectedStock || !newYarnTypeId || !newQuantity || calculatedWeight <= 0 || quantityExceedsBalance}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
