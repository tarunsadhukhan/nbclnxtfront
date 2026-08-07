"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { MuiForm, type Schema } from "@/components/ui/muiform";
import { Card } from "@/components/ui/card";
import Menu from "@/components/ui/expandableMenuTable/ExpandableMenu";
import { useUserForm } from "../hooks/useUserForm";

function CreateUserContent() {
  const router = useRouter();
  const {
    userName,
    setUserName,
    password,
    setPassword,
    name,
    setName,
    isActive,
    setIsActive,
    isEditMode,
    loading,
    submitting,
    error,
    menuItems,
    assignmentOptions,
    handleAssignmentChange,
    handleSubmit,
  } = useUserForm();

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Show error in snackbar when it occurs
  React.useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: "error",
      });
    }
  }, [error]);

  // Build MuiForm schema
  const formSchema = useMemo((): Schema => {
    const fields = [
      {
        name: "name",
        label: "Name",
        type: "text" as const,
        required: true,
        placeholder: "Enter Name",
        grid: { xs: 12, sm: 6 },
      },
      {
        name: "username",
        label: "Username (Email)",
        type: "text" as const,
        required: true,
        placeholder: "Enter Email ID",
        disabled: isEditMode,
        grid: { xs: 12, sm: 6 },
      },
    ];

    // Add password field only in create mode
    if (!isEditMode) {
      fields.push({
        name: "password",
        label: "Password",
        type: "text" as const, // We'll handle password type in MuiForm
        required: true,
        placeholder: "Enter password",
        grid: { xs: 12, sm: 6 },
      });
    }

    return { fields };
  }, [isEditMode]);

  // Form values
  const formValues = useMemo(
    () => ({
      name: name,
      username: userName,
      password: password,
    }),
    [name, userName, password]
  );

  // Handle form value changes
  const handleFormValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const newName = String(values.name || "");
      const newUserName = String(values.username || "");
      const newPassword = String(values.password || "");

      if (newName !== name) {
        setName(newName);
      }
      if (newUserName !== userName) {
        setUserName(newUserName);
      }
      if (newPassword !== password) {
        setPassword(newPassword);
      }
    },
    [name, userName, password, setName, setUserName, setPassword]
  );

  // Handle form submission
  const onSubmit = useCallback(async () => {
    const result = await handleSubmit();
    if (!result.success) {
      setSnackbar({
        open: true,
        message: result.message || "An error occurred",
        severity: "error",
      });
    }
  }, [handleSubmit]);

  const handleCancel = useCallback(() => {
    router.push("/dashboardadmin/userManagement");
  }, [router]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  if (loading) {
    return (
      <Box className="min-h-screen bg-gray-50 p-8">
        <Box className="mx-auto max-w-4xl">
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography component="span">Loading user data...</Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="min-h-screen bg-gray-50 p-8">
      <Box className="mx-auto max-w-4xl">
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: "#0C3C60" }}>
            {isEditMode ? "Edit User" : "Create User"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isEditMode
              ? "Update user information and branch role assignments"
              : "Create a new portal user and assign them to branches"}
          </Typography>
        </Box>

        {/* User Details Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            User Details
          </Typography>

          <MuiForm
            schema={formSchema}
            initialValues={formValues}
            mode="create"
            hideModeToggle
            hideSubmit
            onValuesChange={handleFormValuesChange}
          />

          {/* Active checkbox for edit mode */}
          {isEditMode && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                }
                label="Active"
              />
            </Box>
          )}
        </Paper>

        {/* Branch Role Assignments */}
        {menuItems.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Branch Role Assignments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign roles to the user for each branch
            </Typography>

            <Menu
              items={menuItems}
              assignmentOptions={assignmentOptions}
              onAssignmentChange={handleAssignmentChange}
              title=""
              description=""
            />
          </Paper>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
          >
            {submitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? "Update User"
              : "Create User"}
          </Button>
        </Box>

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

// Loading fallback component
function LoadingFallback() {
  return (
    <Box className="min-h-screen bg-gray-50 p-8">
      <Box className="mx-auto max-w-4xl">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography component="span">Loading...</Typography>
        </Paper>
      </Box>
    </Box>
  );
}

// Main component that wraps content with Suspense for useSearchParams
export default function CreateUserPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateUserContent />
    </Suspense>
  );
}
