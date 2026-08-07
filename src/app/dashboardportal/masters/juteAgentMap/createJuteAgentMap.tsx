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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { X } from "lucide-react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Option type for dropdowns
 */
type Option = {
  label: string;
  value: string;
};

/**
 * Branch option with additional details
 */
type BranchOption = Option & {
  branch_name: string;
  co_name: string;
  co_id: string;
};

/**
 * Party branch option with additional details
 */
type PartyBranchOption = Option & {
  party_id: string;
  party_name: string;
  party_code?: string;
  address?: string;
  gst_no?: string;
};

/**
 * Type for view data (when viewing an existing mapping)
 */
type ViewData = {
  agent_map_id: number;
  agent_branch_display: string;
  party_branch_display: string;
  agent_branch_name?: string;
  agent_company_name?: string;
  party_name?: string;
  party_code?: string;
  party_branch_address?: string;
  party_branch_gst?: string;
};

/**
 * Props for CreateJuteAgentMap dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save */
  onSaved?: () => void;
  /** Data for viewing an existing mapping */
  viewData?: ViewData;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * @component CreateJuteAgentMap
 * @description Dialog component for creating or viewing jute agent to party branch mappings.
 * 
 * When creating:
 * 1. User first selects an Agent Branch from all branches (displays: Company Name - Branch Name)
 * 2. Then selects a Party Branch from party branches filtered by current co_id (displays: Party Name - Address)
 * 
 * Mappings cannot be edited - only created or deleted.
 *
 * @example
 * <CreateJuteAgentMap
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   viewData={selectedRow}
 *   initialMode="view"
 * />
 */
export default function CreateJuteAgentMap({
  open,
  onClose,
  onSaved,
  viewData,
  initialMode = "create",
}: Props) {
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingPartyBranches, setLoadingPartyBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>(initialMode);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Form state
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [partyBranchOptions, setPartyBranchOptions] = useState<PartyBranchOption[]>([]);
  const [selectedAgentBranch, setSelectedAgentBranch] = useState<string>("");
  const [selectedPartyBranch, setSelectedPartyBranch] = useState<string>("");
  
  // Validation errors
  const [errors, setErrors] = useState<{ agentBranch?: string; partyBranch?: string }>({});

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Load setup data (all branches with company names) from API
   */
  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const url = `${apiRoutesPortalMasters.JUTE_AGENT_MAP_CREATE_SETUP}?co_id=${co_id}`;
      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load setup data");
      }

      // Map branches to options with display: co_name - branch_name
      const branches = data.branches ?? [];
      const mappedBranches: BranchOption[] = branches.map((b: Record<string, unknown>) => ({
        label: (b.display as string) ?? `${b.co_name ?? ""} - ${b.branch_name ?? ""}`,
        value: String(b.branch_id ?? ""),
        branch_name: (b.branch_name as string) ?? "",
        co_name: (b.co_name as string) ?? "",
        co_id: String(b.co_id ?? ""),
      }));
      setBranchOptions(mappedBranches);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading setup";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingSetup(false);
    }
  }, [getCoId]);

  /**
   * Load available party branches for mapping (filtered by current co_id)
   */
  const loadPartyBranches = useCallback(async () => {
    setLoadingPartyBranches(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const url = `${apiRoutesPortalMasters.JUTE_AGENT_MAP_PARTY_BRANCHES}?co_id=${co_id}`;
      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load party branches");
      }

      // Map party branches to options with display: party_name - address
      const partyBranches = data.party_branches ?? [];
      const mappedPartyBranches: PartyBranchOption[] = partyBranches.map((p: Record<string, unknown>) => ({
        label: (p.display as string) ?? `${p.party_name ?? ""} - ${p.address ?? ""}`,
        value: String(p.party_mst_branch_id ?? ""),
        party_id: String(p.party_id ?? ""),
        party_name: (p.party_name as string) ?? "",
        party_code: (p.party_code as string) ?? "",
        address: (p.address as string) ?? "",
        gst_no: (p.gst_no as string) ?? "",
      }));
      setPartyBranchOptions(mappedPartyBranches);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading party branches";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingPartyBranches(false);
    }
  }, [getCoId]);

  // Reset state and load setup when dialog opens
  useEffect(() => {
    if (open) {
      // Set mode based on whether we're viewing or creating
      if (viewData) {
        setMode("view");
      } else {
        setMode("create");
        loadSetup();
        loadPartyBranches();
      }
      
      // Reset form state
      setSelectedAgentBranch("");
      setSelectedPartyBranch("");
      setErrors({});
    } else {
      // Reset state when dialog closes
      setBranchOptions([]);
      setPartyBranchOptions([]);
      setSelectedAgentBranch("");
      setSelectedPartyBranch("");
      setErrors({});
    }
  }, [open, viewData, loadSetup, loadPartyBranches]);

  /**
   * Handle agent branch selection change
   */
  const handleAgentBranchChange = useCallback((value: string) => {
    setSelectedAgentBranch(value);
    setErrors((prev) => ({ ...prev, agentBranch: undefined }));
  }, []);

  /**
   * Handle party branch selection change
   */
  const handlePartyBranchChange = useCallback((value: string) => {
    setSelectedPartyBranch(value);
    setErrors((prev) => ({ ...prev, partyBranch: undefined }));
  }, []);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: { agentBranch?: string; partyBranch?: string } = {};
    
    if (!selectedAgentBranch) {
      newErrors.agentBranch = "Please select an agent branch";
    }
    if (!selectedPartyBranch) {
      newErrors.partyBranch = "Please select a party branch";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedAgentBranch, selectedPartyBranch]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const payload = {
        agent_branch_id: parseInt(selectedAgentBranch, 10),
        party_branch_id: parseInt(selectedPartyBranch, 10),
      };

      const url = `${apiRoutesPortalMasters.JUTE_AGENT_MAP_CREATE}?co_id=${co_id}`;
      const { error } = await fetchWithCookie(url, "POST", payload);

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message: "Agent mapping created successfully",
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
   * Dialog title based on mode
   */
  const dialogTitle = useMemo(() => {
    return mode === "view" ? "View Agent Mapping" : "Add Agent Mapping";
  }, [mode]);

  /**
   * Render view mode content
   */
  const renderViewContent = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          Agent Branch (Company - Branch)
        </Typography>
        <Typography variant="body1">{viewData?.agent_branch_display ?? "-"}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          Party Branch (Party - Address)
        </Typography>
        <Typography variant="body1">{viewData?.party_branch_display ?? "-"}</Typography>
      </Box>
      {viewData?.party_code && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Party Code
          </Typography>
          <Typography variant="body1">{viewData.party_code}</Typography>
        </Box>
      )}
      {viewData?.party_branch_gst && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Party Branch GST
          </Typography>
          <Typography variant="body1">{viewData.party_branch_gst}</Typography>
        </Box>
      )}
    </Box>
  );

  /**
   * Render create mode content
   */
  const renderCreateContent = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
      <FormControl fullWidth error={!!errors.agentBranch}>
        <InputLabel id="agent-branch-label">Agent Branch (Company - Branch) *</InputLabel>
        <Select
          labelId="agent-branch-label"
          value={selectedAgentBranch}
          label="Agent Branch (Company - Branch) *"
          onChange={(e) => handleAgentBranchChange(e.target.value)}
          disabled={loadingSetup}
        >
          {branchOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {errors.agentBranch && <FormHelperText>{errors.agentBranch}</FormHelperText>}
      </FormControl>

      <FormControl fullWidth error={!!errors.partyBranch} disabled={loadingPartyBranches}>
        <InputLabel id="party-branch-label">Party Branch (Party - Address) *</InputLabel>
        <Select
          labelId="party-branch-label"
          value={selectedPartyBranch}
          label="Party Branch (Party - Address) *"
          onChange={(e) => handlePartyBranchChange(e.target.value)}
        >
          {loadingPartyBranches ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
            </MenuItem>
          ) : partyBranchOptions.length === 0 ? (
            <MenuItem disabled>No party branches available</MenuItem>
          ) : (
            partyBranchOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))
          )}
        </Select>
        {errors.partyBranch && <FormHelperText>{errors.partyBranch}</FormHelperText>}
      </FormControl>
    </Box>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
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
          {(loadingSetup || loadingPartyBranches) && mode === "create" ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 150,
              }}
            >
              <CircularProgress />
            </Box>
          ) : mode === "view" ? (
            renderViewContent()
          ) : (
            renderCreateContent()
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "create" && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={saving || !selectedAgentBranch || !selectedPartyBranch}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
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
