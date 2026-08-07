"use client";

import React, { Suspense } from "react";
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
  Autocomplete,
  Checkbox,
} from "@mui/material";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useBranchOptions } from "@/utils/branchUtils";

import type {
  BatchAssignMode,
  EditableAssignLine,
  Option,
  BatchDailyAssignRow,
} from "./types/batchAssignTypes";
import { useBatchAssignSetup } from "./hooks/useBatchAssignSetup";
import {
  BATCH_ASSIGN_STATUS_IDS,
  BATCH_ASSIGN_STATUS_LABELS,
} from "./utils/batchAssignConstants";
import {
  createBlankAssignLine,
  lineIsComplete,
  isDraft,
} from "./utils/batchAssignFactories";
import {
  mapApiToEditableLines,
  mapYarnTypesToOptions,
  mapBatchPlansToOptions,
  mapEditableToCreatePayload,
  buildLabelMap,
} from "./utils/batchAssignMappers";

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

const getStatusColor = (
  statusId: number
): "success" | "error" | "warning" | "info" | "default" => {
  if (statusId === BATCH_ASSIGN_STATUS_IDS.APPROVED) return "success";
  if (statusId === BATCH_ASSIGN_STATUS_IDS.REJECTED) return "error";
  if (statusId === BATCH_ASSIGN_STATUS_IDS.OPEN) return "warning";
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

const getModeBadgeLabel = (mode: BatchAssignMode): string => {
  switch (mode) {
    case "create":
      return "Create";
    case "edit":
      return "Edit";
    case "view":
      return "View";
  }
};

const getModeBadgeColor = (
  mode: BatchAssignMode
): "success" | "warning" | "info" => {
  switch (mode) {
    case "create":
      return "success";
    case "edit":
      return "warning";
    case "view":
      return "info";
  }
};

/* ---------------------------------------------------------------------------
 * Wrapper (Suspense boundary for useSearchParams)
 * --------------------------------------------------------------------------- */

/**
 * @component BatchAssignEditPageWrapper
 * @description Wraps the main page in Suspense as required by useSearchParams.
 */
export default function BatchAssignEditPageWrapper() {
  return (
    <Suspense
      fallback={
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      }
    >
      <BatchAssignEditPage />
    </Suspense>
  );
}

/* ---------------------------------------------------------------------------
 * Main page component
 * --------------------------------------------------------------------------- */

/**
 * @component BatchAssignEditPage
 * @description Transaction detail page for creating, editing, or viewing
 * Batch Plan Daily Assignments. Each row pairs a Yarn Type with a Batch Plan.
 * Supports Draft -> Open -> Approved / Rejected approval workflow.
 */
function BatchAssignEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const sidebarBranches = useBranchOptions();

  // --------------- URL params ---------------
  const modeParam = searchParams.get("mode") as BatchAssignMode | null;
  const dateParam = searchParams.get("date");
  const branchIdParam = searchParams.get("branch_id");

  const mode: BatchAssignMode = modeParam ?? "create";
  const isViewMode = mode === "view";
  const isCreateMode = mode === "create";

  // --------------- State ---------------
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");
  const [assignDate, setAssignDate] = React.useState<string>(
    dateParam ?? new Date().toISOString().slice(0, 10)
  );
  const [lines, setLines] = React.useState<EditableAssignLine[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );
  const [selectedLineIds, setSelectedLineIds] = React.useState<Set<string>>(
    new Set()
  );
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // --------------- Setup data ---------------
  const {
    yarnTypes,
    batchPlans,
    loading: setupLoading,
    error: setupError,
  } = useBatchAssignSetup(coId, selectedBranchId);

  // --------------- Memoised options ---------------
  const yarnTypeOptions = React.useMemo(
    () => mapYarnTypesToOptions(yarnTypes),
    [yarnTypes]
  );
  const batchPlanOptions = React.useMemo(
    () => mapBatchPlansToOptions(batchPlans),
    [batchPlans]
  );

  const branchOptions = React.useMemo(() => {
    if (sidebarBranches.length >= 1) return sidebarBranches;
    return [] as Option[];
  }, [sidebarBranches]);

  // Label resolvers for displaying names on saved rows
  const yarnTypeLabelMap = React.useMemo(
    () =>
      buildLabelMap(
        yarnTypes,
        (t) => String(t.jute_yarn_id),
        (t) => t.jute_yarn_name
      ),
    [yarnTypes]
  );

  const batchPlanLabelMap = React.useMemo(
    () =>
      buildLabelMap(
        batchPlans,
        (p) => String(p.batch_plan_id),
        (p) => p.plan_name
      ),
    [batchPlans]
  );

  // Compute which yarn type IDs are already assigned (saved lines) so we can
  // filter them out of the dropdown for new/unsaved rows.
  const usedYarnTypeIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const line of lines) {
      if (line.yarn_type_id) {
        ids.add(line.yarn_type_id);
      }
    }
    return ids;
  }, [lines]);

  /**
   * Returns yarn type options filtered to exclude already-assigned types,
   * except for the value currently selected on this specific line.
   */
  const getFilteredYarnTypeOptions = React.useCallback(
    (currentLineYarnTypeId: string): Option[] =>
      yarnTypeOptions.filter(
        (opt) =>
          opt.value === currentLineYarnTypeId || !usedYarnTypeIds.has(opt.value)
      ),
    [yarnTypeOptions, usedYarnTypeIds]
  );

  // --------------- Selectable line groups ---------------
  const selectableDraftLines = React.useMemo(
    () =>
      lines.filter(
        (l) =>
          l.batch_daily_assign_id &&
          l.status_id === BATCH_ASSIGN_STATUS_IDS.DRAFT
      ),
    [lines]
  );

  const selectableOpenLines = React.useMemo(
    () =>
      lines.filter(
        (l) =>
          l.batch_daily_assign_id &&
          l.status_id === BATCH_ASSIGN_STATUS_IDS.OPEN
      ),
    [lines]
  );

  const hasSelectableLines =
    selectableDraftLines.length > 0 || selectableOpenLines.length > 0;

  // --------------- Line item helpers ---------------
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

  const handleAddRow = React.useCallback(() => {
    setLines((prev) => [...prev, createBlankAssignLine()]);
  }, []);

  const handleRemoveLine = React.useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const handleLineYarnTypeChange = React.useCallback(
    (lineId: string, value: Option | null) => {
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? { ...l, yarn_type_id: value?.value ?? "", yarn_type_name: value?.label }
            : l
        )
      );
    },
    []
  );

  const handleLineBatchPlanChange = React.useCallback(
    (lineId: string, value: Option | null) => {
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? { ...l, batch_plan_id: value?.value ?? "", plan_name: value?.label }
            : l
        )
      );
    },
    []
  );

  // --------------- Auto-select branch ---------------
  React.useEffect(() => {
    if (!selectedBranchId && sidebarBranches.length === 1) {
      setSelectedBranchId(sidebarBranches[0].value);
    } else if (!selectedBranchId && branchIdParam) {
      setSelectedBranchId(branchIdParam);
    }
  }, [selectedBranchId, sidebarBranches, branchIdParam]);

  // --------------- Fetch max date (create mode) ---------------
  React.useEffect(() => {
    if (!isCreateMode || !coId || !selectedBranchId || dateParam) return;

    let cancelled = false;

    const fetchMaxDate = async () => {
      try {
        const params = new URLSearchParams({
          co_id: coId,
          branch_id: selectedBranchId,
        });
        const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_MAX_DATE}?${params.toString()}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError || cancelled) return;

        const response = data as Record<string, unknown>;
        const maxDate = response.max_date as string | null;
        if (maxDate) {
          const nextDay = new Date(maxDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setAssignDate(nextDay.toISOString().slice(0, 10));
        }
      } catch {
        // Non-critical -- keep default date
      }
    };

    fetchMaxDate();
    return () => {
      cancelled = true;
    };
  }, [isCreateMode, coId, selectedBranchId, dateParam]);

  // --------------- Fetch existing assignments ---------------
  React.useEffect(() => {
    if (!coId || !selectedBranchId || !assignDate) return;

    let cancelled = false;

    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          co_id: coId,
          branch_id: selectedBranchId,
          assign_date: assignDate,
        });
        const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_BY_DATE}?${params.toString()}`;
        const { data, error: fetchError } = await fetchWithCookie(url, "GET");

        if (fetchError) throw new Error(fetchError);
        if (cancelled) return;

        const response = data as Record<string, unknown>;
        const rows = (response.data ?? []) as BatchDailyAssignRow[];
        const mapped = mapApiToEditableLines(rows);
        setLines(mapped);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load assignments";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAssignments();
    return () => {
      cancelled = true;
    };
  }, [coId, selectedBranchId, assignDate, refreshCounter]);

  // --------------- Save ---------------
  const handleSave = React.useCallback(async () => {
    if (!coId || !selectedBranchId || !assignDate) {
      setError("Please select branch and date");
      return;
    }

    // Only save unsaved, complete lines
    const unsavedComplete = lines.filter(
      (l) => !l.batch_daily_assign_id && lineIsComplete(l)
    );

    if (unsavedComplete.length === 0) {
      setError("No complete unsaved rows to save");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      for (const line of unsavedComplete) {
        const payload = mapEditableToCreatePayload(
          line,
          Number(selectedBranchId),
          assignDate
        );
        const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_CREATE}?co_id=${coId}`;
        const { error: createError } = await fetchWithCookie(
          url,
          "POST",
          payload
        );
        if (createError) throw new Error(createError);
      }

      setSuccessMessage(
        `${unsavedComplete.length} assignment(s) saved successfully`
      );

      // Reload to get server-assigned IDs
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save assignments";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [coId, selectedBranchId, assignDate, lines]);

  // --------------- Delete ---------------
  const handleDeleteLine = React.useCallback(
    async (line: EditableAssignLine) => {
      if (isViewMode) return;

      if (line.batch_daily_assign_id) {
        // Delete from server
        try {
          const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_DELETE}/${line.batch_daily_assign_id}?co_id=${coId}`;
          const { error: deleteError } = await fetchWithCookie(url, "DELETE");
          if (deleteError) throw new Error(deleteError);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to delete";
          setError(message);
          return;
        }
      }

      setLines((prev) => prev.filter((l) => l.id !== line.id));
    },
    [isViewMode, coId]
  );

  // --------------- Approval actions ---------------
  const handleOpen = React.useCallback(async () => {
    if (!coId) return;

    const targets = selectableDraftLines.filter(
      (l) => selectedLineIds.size === 0 || selectedLineIds.has(l.id)
    );

    if (targets.length === 0) {
      setError("No draft items to open");
      return;
    }

    const ids = targets
      .map((l) => l.batch_daily_assign_id)
      .filter(Boolean) as number[];

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_OPEN}?co_id=${coId}`;
      const { error: openError } = await fetchWithCookie(url, "POST", {
        ids,
      });
      if (openError) throw new Error(openError);

      setSuccessMessage(`${ids.length} assignment(s) opened for approval`);
      setSelectedLineIds(new Set());
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open assignments"
      );
    } finally {
      setSaving(false);
    }
  }, [coId, selectableDraftLines, selectedLineIds]);

  const handleApprove = React.useCallback(async () => {
    if (!coId) return;

    const targets = selectableOpenLines.filter(
      (l) => selectedLineIds.size === 0 || selectedLineIds.has(l.id)
    );

    if (targets.length === 0) {
      setError("No open items to approve");
      return;
    }

    const ids = targets
      .map((l) => l.batch_daily_assign_id)
      .filter(Boolean) as number[];

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_APPROVE}?co_id=${coId}`;
      const { error: approveError } = await fetchWithCookie(url, "POST", {
        ids,
      });
      if (approveError) throw new Error(approveError);

      setSuccessMessage(`${ids.length} assignment(s) approved`);
      setSelectedLineIds(new Set());
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve assignments"
      );
    } finally {
      setSaving(false);
    }
  }, [coId, selectableOpenLines, selectedLineIds]);

  const handleReject = React.useCallback(async () => {
    if (!coId) return;

    const targets = selectableOpenLines.filter(
      (l) => selectedLineIds.size === 0 || selectedLineIds.has(l.id)
    );

    if (targets.length === 0) {
      setError("No open items to reject");
      return;
    }

    const ids = targets
      .map((l) => l.batch_daily_assign_id)
      .filter(Boolean) as number[];

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_REJECT}?co_id=${coId}`;
      const { error: rejectError } = await fetchWithCookie(url, "POST", {
        ids,
      });
      if (rejectError) throw new Error(rejectError);

      setSuccessMessage(`${ids.length} assignment(s) rejected`);
      setSelectedLineIds(new Set());
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject assignments"
      );
    } finally {
      setSaving(false);
    }
  }, [coId, selectableOpenLines, selectedLineIds]);

  // --------------- Derived booleans ---------------
  const unsavedLines = React.useMemo(
    () => lines.filter((l) => !l.batch_daily_assign_id && lineIsComplete(l)),
    [lines]
  );
  const hasUnsavedItems = unsavedLines.length > 0;
  const canSave = !isViewMode && hasUnsavedItems;
  const canOpen = !isViewMode && selectableDraftLines.length > 0;
  const canApprove = !isViewMode && selectableOpenLines.length > 0;
  const canAddRows = !isViewMode && Boolean(selectedBranchId);

  // --------------- Loading guard ---------------
  if (setupLoading || loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // --------------- Render ---------------
  return (
    <Box sx={{ p: 3 }}>
      {/* ===== Header ===== */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            onClick={() =>
              router.push("/dashboardportal/jutePurchase/batchPlan")
            }
            size="small"
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight={600}>
                Batch Plan Assignment
              </Typography>
              <Chip
                label={getModeBadgeLabel(mode)}
                color={getModeBadgeColor(mode)}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isCreateMode
                ? "Create a new daily batch plan assignment"
                : `Assignment for ${formatDate(assignDate)}`}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          onClick={() =>
            router.push("/dashboardportal/jutePurchase/batchPlan")
          }
        >
          Back to List
        </Button>
      </Box>

      {/* ===== Alerts ===== */}
      {(error || setupError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error || setupError}
        </Alert>
      )}
      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* ===== Header Form (Branch + Date) ===== */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          {/* Branch selector */}
          {sidebarBranches.length === 1 ? (
            <TextField
              label="Branch"
              value={sidebarBranches[0].label}
              disabled
              sx={{ minWidth: 200 }}
            />
          ) : (
            <FormControl sx={{ minWidth: 200 }} disabled={!isCreateMode}>
              <InputLabel id="batch-assign-branch-label">Branch</InputLabel>
              <Select
                labelId="batch-assign-branch-label"
                id="batch-assign-branch-select"
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

          {/* Date picker */}
          <TextField
            label="Assignment Date"
            type="date"
            value={assignDate}
            onChange={(e) => setAssignDate(e.target.value)}
            disabled={!isCreateMode}
            sx={{ minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      </Paper>

      {/* ===== Assignment Table ===== */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Assignments</Typography>
          {canAddRows && (
            <Button
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={handleAddRow}
              size="small"
            >
              Add Row
            </Button>
          )}
        </Box>

        {lines.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No assignments yet. Click &quot;Add Row&quot; to begin.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {/* Checkbox column for selectable items */}
                {hasSelectableLines && !isViewMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={
                        selectedLineIds.size > 0 &&
                        (selectableDraftLines.every((l) =>
                          selectedLineIds.has(l.id)
                        ) ||
                          selectableOpenLines.every((l) =>
                            selectedLineIds.has(l.id)
                          ))
                      }
                      indeterminate={
                        selectedLineIds.size > 0 &&
                        !selectableDraftLines.every((l) =>
                          selectedLineIds.has(l.id)
                        ) &&
                        !selectableOpenLines.every((l) =>
                          selectedLineIds.has(l.id)
                        )
                      }
                      onChange={(e) => {
                        if (selectableDraftLines.length > 0) {
                          handleSelectAllDraft(e.target.checked);
                        } else {
                          handleSelectAllOpen(e.target.checked);
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell sx={{ width: 60 }}>#</TableCell>
                <TableCell sx={{ minWidth: 260 }}>Yarn Type</TableCell>
                <TableCell sx={{ minWidth: 260 }}>Batch Plan</TableCell>
                <TableCell sx={{ width: 130 }}>Status</TableCell>
                {!isViewMode && <TableCell sx={{ width: 70 }} align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, index) => {
                const lineStatusId =
                  line.status_id ?? BATCH_ASSIGN_STATUS_IDS.DRAFT;
                const isSaved = Boolean(line.batch_daily_assign_id);
                const lineIsDraft = isDraft(line);
                const isEditable = !isViewMode && !isSaved;
                const isSelectable =
                  isSaved &&
                  (lineStatusId === BATCH_ASSIGN_STATUS_IDS.DRAFT ||
                    lineStatusId === BATCH_ASSIGN_STATUS_IDS.OPEN);
                const canDelete =
                  !isViewMode &&
                  (lineIsDraft || !isSaved);

                // Resolve display labels for saved rows
                const yarnTypeLabel =
                  line.yarn_type_name ??
                  yarnTypeLabelMap.get(line.yarn_type_id) ??
                  "";
                const batchPlanLabel =
                  line.plan_name ??
                  batchPlanLabelMap.get(line.batch_plan_id) ??
                  "";

                return (
                  <TableRow key={line.id}>
                    {/* Checkbox */}
                    {hasSelectableLines && !isViewMode && (
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

                    {/* Row number */}
                    <TableCell>{index + 1}</TableCell>

                    {/* Yarn Type */}
                    <TableCell>
                      {isEditable ? (
                        <Autocomplete
                          size="small"
                          options={getFilteredYarnTypeOptions(
                            line.yarn_type_id
                          )}
                          value={
                            yarnTypeOptions.find(
                              (o) => o.value === line.yarn_type_id
                            ) ?? null
                          }
                          onChange={(_, val) =>
                            handleLineYarnTypeChange(line.id, val)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select yarn type"
                              variant="outlined"
                            />
                          )}
                          isOptionEqualToValue={(opt, val) =>
                            opt.value === val.value
                          }
                          fullWidth
                          disableClearable={false}
                        />
                      ) : (
                        <Typography variant="body2">{yarnTypeLabel}</Typography>
                      )}
                    </TableCell>

                    {/* Batch Plan */}
                    <TableCell>
                      {isEditable ? (
                        <Autocomplete
                          size="small"
                          options={batchPlanOptions}
                          value={
                            batchPlanOptions.find(
                              (o) => o.value === line.batch_plan_id
                            ) ?? null
                          }
                          onChange={(_, val) =>
                            handleLineBatchPlanChange(line.id, val)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select batch plan"
                              variant="outlined"
                            />
                          )}
                          isOptionEqualToValue={(opt, val) =>
                            opt.value === val.value
                          }
                          fullWidth
                          disableClearable={false}
                        />
                      ) : (
                        <Typography variant="body2">
                          {batchPlanLabel}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={
                          isSaved
                            ? BATCH_ASSIGN_STATUS_LABELS[lineStatusId] ??
                              "Unknown"
                            : "Unsaved"
                        }
                        size="small"
                        color={isSaved ? getStatusColor(lineStatusId) : "default"}
                        variant={isSaved ? "filled" : "outlined"}
                      />
                    </TableCell>

                    {/* Actions */}
                    {!isViewMode && (
                      <TableCell align="center">
                        {canDelete && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLine(line)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ===== Action Buttons ===== */}
      <Box display="flex" justifyContent="flex-end" gap={2} alignItems="center">
        {/* Selection indicator */}
        {selectedLineIds.size > 0 && (
          <Typography variant="body2" color="text.secondary">
            {selectedLineIds.size} item(s) selected
          </Typography>
        )}

        {/* Save */}
        {canSave && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : `Save (${unsavedLines.length})`}
          </Button>
        )}

        {/* Open */}
        {canOpen && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleOpen}
            disabled={saving}
          >
            {selectedLineIds.size > 0 &&
            selectableDraftLines.some((l) => selectedLineIds.has(l.id))
              ? `Open Selected (${selectableDraftLines.filter((l) => selectedLineIds.has(l.id)).length})`
              : `Open All (${selectableDraftLines.length})`}
          </Button>
        )}

        {/* Approve */}
        {canApprove && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={handleApprove}
              disabled={saving}
            >
              {selectedLineIds.size > 0 &&
              selectableOpenLines.some((l) => selectedLineIds.has(l.id))
                ? `Approve Selected (${selectableOpenLines.filter((l) => selectedLineIds.has(l.id)).length})`
                : `Approve All (${selectableOpenLines.length})`}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleReject}
              disabled={saving}
            >
              {selectedLineIds.size > 0 &&
              selectableOpenLines.some((l) => selectedLineIds.has(l.id))
                ? `Reject Selected (${selectableOpenLines.filter((l) => selectedLineIds.has(l.id)).length})`
                : `Reject All (${selectableOpenLines.length})`}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
