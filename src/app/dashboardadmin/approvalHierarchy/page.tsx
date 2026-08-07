"use client";

import React, { useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { MuiForm, type Schema, type Option } from "@/components/ui/muiform";
import ApprovalLevelsTable from "./ApprovalLevelsTable";
import { useApprovalHierarchy } from "./hooks/useApprovalHierarchy";
import type { DropdownField, DropdownItem } from "./types";

// Helper to convert DropdownItem[] to Option[]
function toOptions(items: DropdownItem[]): Option[] {
  return items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
}

// Helper to get items for a dropdown based on parent selection
function getItemsForField(
  field: DropdownField,
  selections: { company: string; branch: string; menu: string }
): Option[] {
  if (!field.dependsOn || Array.isArray(field.items)) {
    return toOptions(field.items as DropdownItem[]);
  }

  const parentKey = field.dependsOn as keyof typeof selections;
  const parentSelection = selections[parentKey];
  if (!parentSelection) {
    return [];
  }

  const itemsMap = field.items as Record<string, DropdownItem[]>;
  return toOptions(itemsMap[parentSelection] || []);
}

export default function ApprovalHierarchyPage() {
  const {
    dropdownFields,
    isDropdownLoading,
    selections,
    handleSelectionChange,
    approvalLevelsData,
    isApprovalLevelsLoading,
    updateApprovalRows,
    handleSubmit,
    isSubmitting,
    canShowTable,
  } = useApprovalHierarchy();

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Build MuiForm schema from dropdown fields
  const formSchema = useMemo((): Schema => {
    const companyField = dropdownFields.find((f) => f.id === "company");
    const branchField = dropdownFields.find((f) => f.id === "branch");
    const menuField = dropdownFields.find((f) => f.id === "menu");

    return {
      fields: [
        {
          name: "company",
          label: "Company",
          type: "select",
          required: true,
          options: companyField ? toOptions(companyField.items as DropdownItem[]) : [],
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "branch",
          label: "Branch",
          type: "select",
          required: true,
          options: branchField
            ? getItemsForField(branchField, selections)
            : [],
          disabled: !selections.company,
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "menu",
          label: "Menu",
          type: "select",
          required: true,
          options: menuField
            ? getItemsForField(menuField, selections)
            : [],
          disabled: !selections.branch,
          grid: { xs: 12, sm: 4 },
        },
      ],
    };
  }, [dropdownFields, selections]);

  // Form values for MuiForm
  const formValues = useMemo(
    () => ({
      company: selections.company,
      branch: selections.branch,
      menu: selections.menu,
    }),
    [selections]
  );

  // Handle form value changes
  const handleFormValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      // Determine which field changed
      const newCompany = String(values.company || "");
      const newBranch = String(values.branch || "");
      const newMenu = String(values.menu || "");

      if (newCompany !== selections.company) {
        handleSelectionChange("company", newCompany);
      } else if (newBranch !== selections.branch) {
        handleSelectionChange("branch", newBranch);
      } else if (newMenu !== selections.menu) {
        handleSelectionChange("menu", newMenu);
      }
    },
    [selections, handleSelectionChange]
  );

  // Handle submit button click
  const onSubmitClick = useCallback(async () => {
    const result = await handleSubmit();
    setSnackbar({
      open: true,
      message: result.message || (result.success ? "Saved successfully" : "Failed to save"),
      severity: result.success ? "success" : "error",
    });
  }, [handleSubmit]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box className="min-h-screen bg-gray-50 p-8">
      <Box className="mx-auto max-w-7xl">
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: "#0C3C60" }}>
            Approval Hierarchy Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure approval levels and assign users for different menus and branches
          </Typography>
        </Box>

        {/* Selection Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {isDropdownLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Loading configuration options...</Typography>
            </Box>
          ) : (
            <MuiForm
              schema={formSchema}
              initialValues={formValues}
              mode="create"
              hideModeToggle
              hideSubmit
              onValuesChange={handleFormValuesChange}
            />
          )}
        </Paper>

        {/* Loading state for approval levels */}
        {isApprovalLevelsLoading && (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography component="span">Loading approval levels...</Typography>
          </Paper>
        )}

        {/* Approval Levels Table */}
        {canShowTable && approvalLevelsData && (
          <Paper sx={{ p: 3 }}>
            <ApprovalLevelsTable
              key={`${selections.branch}-${selections.menu}`}
              maxLevel={approvalLevelsData.maxLevel}
              userOptions={approvalLevelsData.userOptions}
              data={approvalLevelsData.data}
              onChange={updateApprovalRows}
            />

            {/* Submit Button */}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                onClick={onSubmitClick}
                disabled={isSubmitting}
                className="bg-[#95C11F] hover:bg-[#85ad1b] text-white px-6"
              >
                {isSubmitting ? "Saving..." : "Save Configuration"}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Empty state */}
        {!isDropdownLoading && !isApprovalLevelsLoading && !canShowTable && selections.company && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please select a company, branch, and menu to configure approval levels.
          </Alert>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
