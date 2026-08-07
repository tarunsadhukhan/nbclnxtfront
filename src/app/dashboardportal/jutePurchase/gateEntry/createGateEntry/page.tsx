"use client";

/**
 * @page JuteGateEntryCreatePage
 * @description Create/Edit/View page for Jute Gate Entry.
 * Posts data to jute_mr table via the backend API.
 * Supports create, edit, and view modes via URL params.
 *
 * Fields displayed (from screenshot):
 * - Branch (required, dropdown)
 * - Entry Date (required, date picker)
 * - Entry Time (required, time picker)
 * - Challan No (text input)
 * - Challan Date (date picker)
 * - Vehicle No (required, text input)
 * - Driver Name (required, text input)
 * - Transporter (optional, text input)
 *
 * Section below (disabled before IN, except Remarks):
 * - Tare Weight (Kg)
 * - Net Weight (Kg) - calculated/disabled
 * - Variable Shortage (Kg)
 * - Actual Weight (Kg) - disabled
 * - Challan Weight (Kg)
 * - Gross Weight (Kg, required)
 * - Remarks
 */

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, LogIn, Save, LogOut } from "lucide-react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// =============================================================================
// TYPES
// =============================================================================

type MuiFormMode = "create" | "edit" | "view";

type Option = {
  label: string;
  value: string;
};

type BranchRecord = {
  branch_id: number;
  branch_name: string;
};

type SetupData = {
  branches: BranchRecord[];
};

type GateEntryFormValues = {
  branch: string;
  entryDate: string;
  entryTime: string;
  outDate: string;
  outTime: string;
  challanNo: string;
  challanDate: string;
  vehicleNo: string;
  driverName: string;
  transporter: string;
  challanWeight: string;
  grossWeight: string;
  tareWeight: string;
  netWeight: string;
  variableShortage: string;
  actualWeight: string;
  remarks: string;
};

type GateEntryDetails = {
  jute_mr_id: number;
  jute_gate_entry_no: number | null;
  branch_id: number | null;
  jute_gate_entry_date: string | null;
  in_time: string | null;
  out_date: string | null;
  out_time: string | null;
  challan_no: string | null;
  challan_date: string | null;
  vehicle_no: string | null;
  driver_name: string | null;
  transporter: string | null;
  challan_weight: number | null;
  gross_weight: number | null;
  tare_weight: number | null;
  net_weight: number | null;
  variable_shortage: number | null;
  actual_weight: number | null;
  remarks: string | null;
  status_id: number | null;
  status: string | null;
  qc_check: number | null;
};

// =============================================================================
// CONSTANTS
// =============================================================================

// Status IDs - Note: status_id remains in draft/IN state. 
// The out_time field is used to restrict further editing, NOT status_id.
const GATE_ENTRY_STATUS_IN = 1;
// OUT status (5) is defined but NOT used - out_time presence determines OUT state

const buildDefaultFormValues = (): GateEntryFormValues => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM

  return {
    branch: "",
    entryDate: dateStr,
    entryTime: timeStr,
    outDate: "",
    outTime: "",
    challanNo: "",
    challanDate: dateStr,
    vehicleNo: "",
    driverName: "",
    transporter: "",
    challanWeight: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
    variableShortage: "",
    actualWeight: "",
    remarks: "",
  };
};

/**
 * Parse date string to YYYY-MM-DD format
 */
const parseDateToInputFormat = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  // Handle various formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

/**
 * Parse time from datetime string to HH:MM format
 */
const parseTimeFromDatetime = (datetimeStr: string | null | undefined): string => {
  if (!datetimeStr) return "";
  // Handle datetime format (e.g., "2025-01-15 14:30:00" or ISO format)
  const trimmed = datetimeStr.trim();
  if (trimmed.includes(" ") || trimmed.includes("T")) {
    const timePart = trimmed.split(/[ T]/)[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(":");
      if (hours && minutes) {
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      }
    }
  }
  // Handle time-only format
  const [hours, minutes] = trimmed.split(":");
  if (hours && minutes) {
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }
  return "";
};

/**
 * Map API response to form values
 */
const mapDetailsToFormValues = (details: GateEntryDetails): GateEntryFormValues => {
  return {
    branch: details.branch_id ? String(details.branch_id) : "",
    entryDate: parseDateToInputFormat(details.jute_gate_entry_date),
    entryTime: parseTimeFromDatetime(details.in_time),
    outDate: parseDateToInputFormat(details.out_date),
    outTime: parseTimeFromDatetime(details.out_time),
    challanNo: details.challan_no ?? "",
    challanDate: parseDateToInputFormat(details.challan_date),
    vehicleNo: details.vehicle_no ?? "",
    driverName: details.driver_name ?? "",
    transporter: details.transporter ?? "",
    challanWeight: details.challan_weight != null ? String(details.challan_weight) : "",
    grossWeight: details.gross_weight != null ? String(details.gross_weight) : "",
    tareWeight: details.tare_weight != null ? String(details.tare_weight) : "",
    netWeight: details.net_weight != null ? String(details.net_weight) : "",
    variableShortage: details.variable_shortage != null ? String(details.variable_shortage) : "",
    actualWeight: details.actual_weight != null ? String(details.actual_weight) : "",
    remarks: details.remarks ?? "",
  };
};

// =============================================================================
// COMPONENT
// =============================================================================

function JuteGateEntryCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();

  // Derive mode and ID from URL
  const modeParam = searchParams?.get("mode") ?? "create";
  const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";
  const entryId = searchParams?.get("id") ?? null;

  // Page state
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  // Setup data
  const [setupData, setSetupData] = React.useState<SetupData | null>(null);

  // Entry details (for edit/view modes)
  const [details, setDetails] = React.useState<GateEntryDetails | null>(null);

  // Form values
  const [formValues, setFormValues] = React.useState<GateEntryFormValues>(buildDefaultFormValues);

  // Validation errors
  const [errors, setErrors] = React.useState<Partial<Record<keyof GateEntryFormValues, string>>>({});

  // Derived state
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";
  const currentStatusId = details?.status_id ?? null;
  const isStatusIN = currentStatusId === GATE_ENTRY_STATUS_IN;
  // OUT is determined by out_time presence, NOT status_id (status remains draft)
  const isOutComplete = Boolean(details?.out_time);
  // QC checkpoint: qc_check=1 means QC is complete
  const isQcComplete = details?.qc_check === 1;

  // Build branch options — restricted to branches selected in the sidebar.
  // Fall back to all setup branches only if the sidebar has no selection.
  const branchOptions = React.useMemo<Option[]>(() => {
    if (!setupData?.branches) return [];
    const allowed = new Set(selectedBranches);
    // Only restrict in create mode; edit/view must keep showing the saved branch.
    const filtered =
      isCreateMode && allowed.size > 0
        ? setupData.branches.filter((b) => allowed.has(b.branch_id))
        : setupData.branches;
    return filtered.map((b) => ({
      label: b.branch_name,
      value: String(b.branch_id),
    }));
  }, [setupData, selectedBranches, isCreateMode]);

  // Auto-select the branch when the sidebar exposes exactly one (create mode only).
  React.useEffect(() => {
    if (!isCreateMode) return;
    if (branchOptions.length === 1 && !formValues.branch) {
      setFormValues((prev) => ({ ...prev, branch: branchOptions[0].value }));
    }
  }, [isCreateMode, branchOptions, formValues.branch]);

  // Calculate weights whenever gross/tare/shortage changes (only in create/edit mode)
  React.useEffect(() => {
    if (isViewMode) return;
    
    const gross = parseFloat(formValues.grossWeight) || 0;
    const tare = parseFloat(formValues.tareWeight) || 0;
    const shortage = parseFloat(formValues.variableShortage) || 0;

    const net = gross - tare;
    const actual = net - shortage;

    setFormValues((prev) => ({
      ...prev,
      netWeight: net > 0 ? net.toFixed(2) : "",
      actualWeight: actual > 0 ? actual.toFixed(2) : "",
    }));
  }, [formValues.grossWeight, formValues.tareWeight, formValues.variableShortage, isViewMode]);

  // Fetch setup data and entry details on mount
  React.useEffect(() => {
    const fetchData = async () => {
      if (!coId) return;

      setLoading(true);
      setPageError(null);

      try {
        // Always fetch setup data (for branch dropdown)
        const setupResponse = await fetchWithCookie(
          `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_CREATE_SETUP}?co_id=${coId}`,
          "GET"
        );

        if (setupResponse?.data) {
          setSetupData({
            branches: setupResponse.data.branches ?? [],
          });
        } else if (setupResponse?.error) {
          setPageError(setupResponse.error);
        }

        // Fetch entry details if in edit/view mode
        if ((isEditMode || isViewMode) && entryId) {
          const detailsResponse = await fetchWithCookie(
            `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_BY_ID}/${entryId}?co_id=${coId}`,
            "GET"
          );

          if (detailsResponse?.data) {
            const entryDetails = detailsResponse.data as GateEntryDetails;
            setDetails(entryDetails);
            // Map API response to form values
            const mappedValues = mapDetailsToFormValues(entryDetails);
            setFormValues(mappedValues);
          } else if (detailsResponse?.error) {
            setPageError(detailsResponse.error);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setPageError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [coId, mode, entryId, isEditMode, isViewMode]);

  // Handle field change
  const handleFieldChange = React.useCallback(
    (field: keyof GateEntryFormValues, value: string) => {
      if (isViewMode) return;
      setFormValues((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is edited
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors, isViewMode]
  );

  // Validate form
  const validateForm = React.useCallback((): boolean => {
    const newErrors: Partial<Record<keyof GateEntryFormValues, string>> = {};

    if (!formValues.branch) {
      newErrors.branch = "Branch is required";
    }
    if (!formValues.entryDate) {
      newErrors.entryDate = "Entry Date is required";
    }
    if (!formValues.entryTime) {
      newErrors.entryTime = "Entry Time is required";
    }
    if (!formValues.vehicleNo) {
      newErrors.vehicleNo = "Vehicle No is required";
    }
    if (!formValues.driverName) {
      newErrors.driverName = "Driver Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues]);

  // Build payload from form values
  const buildPayload = React.useCallback(() => {
    // QC checkpoint: zero out fields that require QC completion when QC is not done
    const tareWeightNum = isQcComplete ? (parseFloat(formValues.tareWeight) || 0) : 0;
    const variableShortageNum = isQcComplete ? (parseFloat(formValues.variableShortage) || 0) : 0;
    
    const payload: any = {
      co_id: parseInt(coId ?? "0", 10),
      branch_id: parseInt(formValues.branch, 10),
      jute_gate_entry_date: formValues.entryDate,
      in_time: formValues.entryTime,
      challan_no: formValues.challanNo || "N/A",
      challan_date: formValues.challanDate || formValues.entryDate,
      challan_weight: parseFloat(formValues.challanWeight) || 0,
      vehicle_no: formValues.vehicleNo,
      driver_name: formValues.driverName,
      transporter: formValues.transporter,
      gross_weight: parseFloat(formValues.grossWeight) || 0,
      tare_weight: tareWeightNum,
      variable_shortage: variableShortageNum,
      remarks: formValues.remarks || null,
      out_date: isQcComplete ? (formValues.outDate || null) : null,
      out_time: isQcComplete ? (formValues.outTime || null) : null,
    };

    // net_weight should not be sent if no tare weight is entered
    if (tareWeightNum > 0) {
      payload.net_weight = parseFloat(formValues.netWeight) || 0;
    }

    return payload;
  }, [coId, formValues, isQcComplete]);

  // Handle IN submission (Create new entry)
  const handleSubmitIN = React.useCallback(async () => {
    if (!coId) {
      setPageError("Company ID not available");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      const payload = buildPayload();

      const response = await fetchWithCookie(
        apiRoutesPortalMasters.JUTE_GATE_ENTRY_CREATE,
        "POST",
        payload
      );

      if (response?.error) {
        setPageError(response.error);
        return;
      }

      if (response?.data) {
        // Success - navigate back to list
        router.push("/dashboardportal/jutePurchase/gateEntry");
      }
    } catch (error) {
      console.error("Error creating gate entry:", error);
      setPageError("Failed to create gate entry");
    } finally {
      setSaving(false);
    }
  }, [coId, buildPayload, validateForm, router]);

  // Handle Save (Update existing entry)
  const handleSave = React.useCallback(async () => {
    if (!coId || !entryId) {
      setPageError("Company ID or Entry ID not available");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      const payload = buildPayload();

      const response = await fetchWithCookie(
        `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_UPDATE}/${entryId}?co_id=${coId}`,
        "PUT",
        payload
      );

      if (response?.error) {
        setPageError(response.error);
        return;
      }

      if (response?.data) {
        // Success - navigate back to list
        router.push("/dashboardportal/jutePurchase/gateEntry");
      }
    } catch (error) {
      console.error("Error updating gate entry:", error);
      setPageError("Failed to update gate entry");
    } finally {
      setSaving(false);
    }
  }, [coId, entryId, buildPayload, validateForm, router]);

  // Handle OUT submission (Update with out_time and action="OUT")
  const handleSubmitOUT = React.useCallback(async () => {
    if (!coId || !entryId) {
      setPageError("Company ID or Entry ID not available");
      return;
    }

    if (!validateForm()) {
      return;
    }

    // QC checkpoint - prevent OUT if QC is not complete
    if (!isQcComplete) {
      setPageError("Vehicle cannot be marked as OUT until Quality Check (QC / Material Inspection) is completed.");
      return;
    }

    // Validate out date and time are provided
    if (!formValues.outDate || !formValues.outTime) {
      setPageError("Out Date and Out Time are required for OUT action");
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      // Use the user-entered out date and time
      const outTimeStr = formValues.outTime; // HH:MM format
      const outDateStr = formValues.outDate; // YYYY-MM-DD format

      // Backend expects action="OUT" to trigger OUT logic
      const payload = {
        ...buildPayload(),
        out_time: outTimeStr,
        out_date: outDateStr,
        action: "OUT",
      };

      const response = await fetchWithCookie(
        `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_UPDATE}/${entryId}?co_id=${coId}`,
        "PUT",
        payload
      );

      if (response?.error) {
        setPageError(response.error);
        return;
      }

      if (response?.data) {
        // Success - navigate back to list
        router.push("/dashboardportal/jutePurchase/gateEntry");
      }
    } catch (error) {
      console.error("Error updating gate entry:", error);
      setPageError("Failed to record OUT");
    } finally {
      setSaving(false);
    }
  }, [coId, entryId, buildPayload, validateForm, router, formValues.outDate, formValues.outTime, isQcComplete]);

  // Handle back navigation
  const handleBack = React.useCallback(() => {
    router.push("/dashboardportal/jutePurchase/gateEntry");
  }, [router]);

  // Determine page title based on mode
  const pageTitle = React.useMemo(() => {
    if (isViewMode) return "View Gate Entry";
    if (isEditMode) return "Edit Gate Entry";
    return "New Gate Entry";
  }, [isViewMode, isEditMode]);

  // Determine status chip
  // OUT is determined by out_time presence, not status_id
  const statusChip = React.useMemo(() => {
    if (isCreateMode) return { label: "New Entry", color: "default" as const };
    if (isOutComplete) return { label: "OUT", color: "success" as const };
    if (isStatusIN) return { label: "IN", color: "primary" as const };
    return { label: "Draft", color: "default" as const };
  }, [isCreateMode, isStatusIN, isOutComplete]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {pageTitle}
        </Typography>
        <Chip 
          label={statusChip.label} 
          size="small" 
          color={statusChip.color}
          variant={statusChip.color === "default" ? "outlined" : "filled"} 
        />
        {details?.jute_gate_entry_no && (
          <Typography variant="body2" color="text.secondary">
            Entry No: {details.jute_gate_entry_no}
          </Typography>
        )}
      </Box>

      {/* Error Alert */}
      {pageError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}

      {/* Form Card */}
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          {/* Row 1: Branch, Entry Date, Entry Time */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Branch */}
            <FormControl fullWidth required error={Boolean(errors.branch)} disabled={isViewMode || isEditMode}>
              <InputLabel id="branch-label">Branch</InputLabel>
              <Select
                labelId="branch-label"
                value={formValues.branch}
                label="Branch"
                onChange={(e) => handleFieldChange("branch", e.target.value)}
              >
                {branchOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.branch && <FormHelperText>{errors.branch}</FormHelperText>}
            </FormControl>

            {/* Entry Date */}
            <TextField
              label="Entry Date"
              type="date"
              required
              fullWidth
              value={formValues.entryDate}
              onChange={(e) => handleFieldChange("entryDate", e.target.value)}
              error={Boolean(errors.entryDate)}
              helperText={errors.entryDate}
              InputLabelProps={{ shrink: true }}
              disabled={isViewMode}
            />

            {/* Entry Time */}
            <TextField
              label="Entry Time"
              type="time"
              required
              fullWidth
              value={formValues.entryTime}
              onChange={(e) => handleFieldChange("entryTime", e.target.value)}
              error={Boolean(errors.entryTime)}
              helperText={errors.entryTime}
              InputLabelProps={{ shrink: true }}
              disabled={isViewMode}
            />
          </Box>

          {/* Row 2: Challan No, Challan Date, Vehicle No */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Challan No */}
            <TextField
              label="Challan No"
              fullWidth
              value={formValues.challanNo}
              onChange={(e) => handleFieldChange("challanNo", e.target.value)}
              disabled={isViewMode}
            />

            {/* Challan Date */}
            <TextField
              label="Challan Date"
              type="date"
              fullWidth
              value={formValues.challanDate}
              onChange={(e) => handleFieldChange("challanDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={isViewMode}
            />

            {/* Vehicle No */}
            <TextField
              label="Vehicle No"
              required
              fullWidth
              value={formValues.vehicleNo}
              onChange={(e) => handleFieldChange("vehicleNo", e.target.value)}
              error={Boolean(errors.vehicleNo)}
              helperText={errors.vehicleNo}
              disabled={isViewMode}
            />
          </Box>

          {/* Row 3: Driver Name, Transporter */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Driver Name */}
            <TextField
              label="Driver Name"
              required
              fullWidth
              value={formValues.driverName}
              onChange={(e) => handleFieldChange("driverName", e.target.value)}
              error={Boolean(errors.driverName)}
              helperText={errors.driverName}
              disabled={isViewMode}
            />

            {/* Transporter */}
            <TextField
              label="Transporter"
              fullWidth
              value={formValues.transporter}
              onChange={(e) => handleFieldChange("transporter", e.target.value)}
              error={Boolean(errors.transporter)}
              helperText={errors.transporter}
              disabled={isViewMode}
            />
          </Box>

          {/* Divider with note */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This section below will be disabled before IN entry. After IN is done, the rest will be
            visible and editable (except Remarks which is always editable).
          </Typography>

          {/* QC checkpoint alert - show in edit mode when QC is not complete */}
          {isEditMode && isStatusIN && !isQcComplete && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Tare Weight, Variable Shortage, and Out Time are locked until the Quality Check (QC / Material Inspection) is completed for this entry.
            </Alert>
          )}

          {/* Row 4: Weights - Challan Weight, Gross Weight */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Challan Weight */}
            <TextField
              label="Challan Weight (Kg)"
              type="number"
              fullWidth
              value={formValues.challanWeight}
              onChange={(e) => handleFieldChange("challanWeight", e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              disabled={isViewMode}
            />

            {/* Gross Weight */}
            <TextField
              label="Gross Weight (Kg)"
              type="number"
              required
              fullWidth
              value={formValues.grossWeight}
              onChange={(e) => handleFieldChange("grossWeight", e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              disabled={isViewMode}
            />
          </Box>

          {/* Row 5: Tare, Net, Shortage, Actual */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Tare Weight - locked until QC is complete */}
            <TextField
              label="Tare Weight (Kg)"
              type="number"
              fullWidth
              value={formValues.tareWeight}
              onChange={(e) => handleFieldChange("tareWeight", e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              disabled={isViewMode || (isEditMode && !isQcComplete)}
              helperText={isEditMode && !isQcComplete && !isViewMode ? "QC must be completed first" : undefined}
            />

            {/* Net Weight - Calculated/Disabled */}
            <TextField
              label="Net Weight (Kg)"
              type="number"
              fullWidth
              value={formValues.netWeight}
              disabled
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />

            {/* Variable Shortage - locked until QC is complete */}
            <TextField
              label="Variable Shortage (Kg)"
              type="number"
              fullWidth
              value={formValues.variableShortage}
              onChange={(e) => handleFieldChange("variableShortage", e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              disabled={isViewMode || (isEditMode && !isQcComplete)}
              helperText={isEditMode && !isQcComplete && !isViewMode ? "QC must be completed first" : undefined}
            />

            {/* Actual Weight - Calculated/Disabled */}
            <TextField
              label="Actual Weight (Kg)"
              type="number"
              fullWidth
              value={formValues.actualWeight}
              disabled
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Box>

          {/* Row 6: Out Date and Out Time - Only visible after QC is complete */}
          {isQcComplete && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                mb: 3,
              }}
            >
              {/* Out Date */}
              <TextField
                label="Out Date"
                type="date"
                fullWidth
                value={formValues.outDate}
                onChange={(e) => handleFieldChange("outDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isViewMode}
              />

              {/* Out Time */}
              <TextField
                label="Out Time"
                type="time"
                fullWidth
                value={formValues.outTime}
                onChange={(e) => handleFieldChange("outTime", e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isViewMode}
              />
            </Box>
          )}

          {/* Row 7: Remarks */}
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Remarks"
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              value={formValues.remarks}
              onChange={(e) => handleFieldChange("remarks", e.target.value)}
              disabled={isViewMode}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={18} />}
          onClick={handleBack}
          disabled={saving}
        >
          Back
        </Button>

        {/* Create mode: Show IN button */}
        {isCreateMode && (
          <Button
            variant="contained"
            color="success"
            endIcon={<LogIn size={18} />}
            onClick={handleSubmitIN}
            disabled={saving}
          >
            {saving ? "Saving..." : "IN"}
          </Button>
        )}

        {/* Edit mode with status IN: Show Save and OUT buttons */}
        {isEditMode && isStatusIN && (
          <>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save size={18} />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="contained"
              color="warning"
              endIcon={<LogOut size={18} />}
              onClick={handleSubmitOUT}
              disabled={saving || !isQcComplete}
              title={!isQcComplete ? "Quality Check must be completed before recording OUT" : undefined}
            >
              {saving ? "Saving..." : "OUT"}
            </Button>
          </>
        )}

        {/* Edit mode with other status (Draft or before IN finalized): Show Save button */}
        {isEditMode && !isStatusIN && !isOutComplete && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}

        {/* View mode: No action buttons (already have Back) */}
      </Box>
    </Box>
  );
}

export default function JuteGateEntryCreatePage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      }
    >
      <JuteGateEntryCreatePageContent />
    </Suspense>
  );
}
