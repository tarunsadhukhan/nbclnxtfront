"use client";

import React, { useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Snackbar, Alert, CircularProgress } from "@mui/material";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useEmployeeFormState } from "../hooks/useEmployeeFormState";
import { useEmployeeSetup } from "../hooks/useEmployeeSetup";
import {
  createEmployee,
  saveEmployeeSection,
  fetchEmployeeById,
  uploadEmployeePhoto,
  deleteEmployeePhoto,
  getEmployeePhotoUrl,
  lookupEmployeeByCode,
  updateEmployeeStatus,
} from "@/utils/hrmsService";
import { WIZARD_STEPS, type FormMode, type SectionName } from "../types/employeeTypes";
import StepOverview, { DIALOG_STATUSES } from "./_components/StepOverview";
import PersonalInformationStep from "./_components/PersonalInformationStep";
import OfficialInformationStep from "./_components/OfficialInformationStep";
import MedicalEnrollmentStep from "./_components/MedicalEnrollmentStep";
import PlaceholderStep from "./_components/PlaceholderStep";
import StatusActionDialog from "./_components/StatusActionDialog";

function AddEmployeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? String(selectedBranches[0]) : "";

  const mode = (searchParams.get("mode") ?? "create") as FormMode;
  const urlEbId = searchParams.get("eb_id");

  const {
    formData,
    activeStep,
    setActiveStep,
    ebId,
    setEbId,
    saving,
    setSaving,
    isDisabled,
    updatePersonal,
    updateContact,
    updateOfficial,
    updateBank,
    updatePf,
    updateEsi,
    addAddress,
    updateAddress,
    removeAddress,
    addExperience,
    updateExperience,
    removeExperience,
    sectionProgress,
    completedSteps,
    setFormData,
  } = useEmployeeFormState({ mode });

  const setup = useEmployeeSetup(coId, branchId);

  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // ─── selectedStep: null = overview, number = which step is open ──
  const [selectedStep, setSelectedStep] = React.useState<number | null>(null);

  // Photo state
  const [photoVersion, setPhotoVersion] = React.useState(0);
  const [hasPhoto, setHasPhoto] = React.useState(false);
  const pendingPhotoRef = React.useRef<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = React.useState<string | null>(null);

  const photoUrl = React.useMemo(() => {
    // Show local preview for pending (unsaved) photo
    if (pendingPhotoPreview) return pendingPhotoPreview;
    if (!hasPhoto || !ebId || !coId) return null;
    return `${getEmployeePhotoUrl(coId, ebId)}&v=${photoVersion}`;
  }, [hasPhoto, ebId, coId, photoVersion, pendingPhotoPreview]);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!coId) return;

      // If employee not yet created, store the file for upload after save
      if (!ebId) {
        pendingPhotoRef.current = file;
        const reader = new FileReader();
        reader.onloadend = () => setPendingPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      const { error } = await uploadEmployeePhoto(coId, ebId, file);
      if (error) throw new Error(error);
      setHasPhoto(true);
      setPhotoVersion((v) => v + 1);
    },
    [coId, ebId],
  );

  const handlePhotoDelete = useCallback(async () => {
    // Clear pending (unsaved) photo
    if (pendingPhotoRef.current) {
      pendingPhotoRef.current = null;
      setPendingPhotoPreview(null);
      return;
    }
    if (!coId || !ebId) return;
    const { error } = await deleteEmployeePhoto(coId, ebId);
    if (!error) setHasPhoto(false);
  }, [coId, ebId]);

  // ─── Previous Employee Lookup ────────────────────────────────────
  const [prevEmpLoading, setPrevEmpLoading] = React.useState(false);

  const handlePrevEmpLookup = useCallback(
    async (empCode: string) => {
      if (!coId) return null;
      setPrevEmpLoading(true);
      try {
        const { data, error } = await lookupEmployeeByCode(coId, empCode);
        if (error || !data?.found) return null;
        return data.data as Record<string, unknown>;
      } catch {
        return null;
      } finally {
        setPrevEmpLoading(false);
      }
    },
    [coId],
  );

  // ─── Load existing data in edit/view mode ────────────────────────
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && urlEbId && coId && branchId) {
      const load = async () => {
        const { data, error } = await fetchEmployeeById(coId, urlEbId, branchId);
        if (error || !data?.data) return;
        setFormData(data.data);
        setHasPhoto(!!data.data.has_photo);
        setEbId(data.data.personal?.eb_id ?? null);
      };
      load();
    }
  }, [mode, urlEbId, coId, branchId, setFormData, setEbId]);

  // ─── Progress calculation ────────────────────────────────────────
  const progress = React.useMemo(() => {
    const sectionKeys = Object.keys(sectionProgress) as SectionName[];
    const completed = sectionKeys.filter((k) => sectionProgress[k]).length;
    return sectionKeys.length > 0 ? Math.round((completed / sectionKeys.length) * 100) : 0;
  }, [sectionProgress]);

  // ─── Save logic ──────────────────────────────────────────────────
  const handleSaveStep = useCallback(async () => {
    if (!coId || !branchId || isDisabled || selectedStep === null) return;
    setSaving(true);

    try {
      const currentWizardStep = WIZARD_STEPS[selectedStep];
      const sections = currentWizardStep.sections;

      // Step 1 (Personal Information) → create employee if no eb_id yet
      if (selectedStep === 0 && !ebId) {
        const { data, error } = await createEmployee(coId, branchId, {
          first_name: formData.personal?.first_name ?? "",
          middle_name: formData.personal?.middle_name,
          last_name: formData.personal?.last_name,
          gender: formData.personal?.gender,
          date_of_birth: formData.personal?.date_of_birth,
          blood_group: formData.personal?.blood_group,
          email_id: formData.personal?.email_id,
          marital_status: formData.personal?.marital_status,
          country_id: formData.personal?.country_id,
          relegion_name: formData.personal?.relegion_name,
          fixed_eb_id: formData.personal?.fixed_eb_id,
          father_spouse_name: formData.personal?.father_spouse_name,
          passport_no: formData.personal?.passport_no,
          driving_licence_no: formData.personal?.driving_licence_no,
          pan_no: formData.personal?.pan_no,
          aadhar_no: formData.personal?.aadhar_no,
        });
        if (error) throw new Error(error);
        const newEbId = data?.data?.eb_id;
        if (newEbId) {
          setEbId(newEbId);

          // Upload pending photo if one was selected before save
          if (pendingPhotoRef.current && coId) {
            const { error: photoErr } = await uploadEmployeePhoto(coId, newEbId, pendingPhotoRef.current);
            if (!photoErr) {
              setHasPhoto(true);
              setPhotoVersion((v) => v + 1);
            }
            pendingPhotoRef.current = null;
            setPendingPhotoPreview(null);
          }
        }
      }

      // Save each section for the current step
      if (ebId || selectedStep !== 0) {
        const currentEbId = ebId ?? 0;
        if (!currentEbId) throw new Error("Employee must be created first (Step 1)");

        for (const section of sections) {
          const sectionDataMap: Record<SectionName, unknown> = {
            personal: formData.personal,
            contact: formData.contact,
            address: formData.address,
            experience: formData.experience,
            official: formData.official,
            bank: formData.bank,
            pf: formData.pf,
            esi: formData.esi,
          };

          const sectionData = sectionDataMap[section];
          if (!sectionData) continue;

          const { error } = await saveEmployeeSection(coId, {
            eb_id: currentEbId,
            section,
            data: sectionData as Record<string, unknown>,
          });
          if (error) throw new Error(error);
        }
      }

      setSnackbar({ open: true, message: `${currentWizardStep.step_name} saved`, severity: "success" });

      // Return to overview after save
      setSelectedStep(null);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [coId, branchId, isDisabled, selectedStep, ebId, formData, setEbId, setSaving]);

  // ─── Action button handler ───────────────────────────────────────
  const [statusDialog, setStatusDialog] = React.useState<{ open: boolean; statusId: number; label: string }>({
    open: false, statusId: 0, label: "",
  });
  const [statusUpdating, setStatusUpdating] = React.useState(false);

  const handleActionClick = useCallback((statusId: number, label: string) => {
    if (!ebId) return;

    // If this status requires date+reason, open the dialog
    if (DIALOG_STATUSES.has(statusId)) {
      setStatusDialog({ open: true, statusId, label });
      return;
    }

    // Direct status change (Joined, Rejected — no dialog needed)
    (async () => {
      setStatusUpdating(true);
      const { data: resp, error } = await updateEmployeeStatus({ eb_id: ebId, status_id: statusId });
      setStatusUpdating(false);
      if (error) {
        setSnackbar({ open: true, message: error, severity: "error" });
        return;
      }
      // Update local status
      setFormData((prev) => ({
        ...prev,
        personal: prev.personal ? { ...prev.personal, status_id: statusId } : prev.personal,
      }));
      setSnackbar({ open: true, message: `Employee marked as ${label}`, severity: "success" });
    })();
  }, [ebId, setFormData]);

  const handleStatusDialogConfirm = useCallback(async (date: string, reason: string) => {
    if (!ebId) return;
    setStatusUpdating(true);
    const { data: resp, error } = await updateEmployeeStatus({
      eb_id: ebId,
      status_id: statusDialog.statusId,
      date,
      reason,
    });
    setStatusUpdating(false);
    if (error) {
      setSnackbar({ open: true, message: error, severity: "error" });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      personal: prev.personal ? { ...prev.personal, status_id: statusDialog.statusId, active: 0 } : prev.personal,
    }));
    setStatusDialog({ open: false, statusId: 0, label: "" });
    setSnackbar({ open: true, message: `Employee marked as ${statusDialog.label}`, severity: "success" });
  }, [ebId, statusDialog, setFormData]);

  // ─── Render selected step content ────────────────────────────────
  const renderStepContent = () => {
    if (selectedStep === null) return null;

    const goBack = () => setSelectedStep(null);
    const commonSaveProps = { saving, onBack: goBack, onSave: handleSaveStep };

    switch (selectedStep) {
      case 0:
        return (
          <PersonalInformationStep
            data={{
              personal: formData.personal,
              contact: formData.contact,
              address: formData.address,
              experience: formData.experience,
            }}
            disabled={isDisabled}
            setup={setup}
            photoUrl={photoUrl}
            onPersonalChange={updatePersonal}
            onContactChange={updateContact}
            onAddAddress={addAddress}
            onUpdateAddress={updateAddress}
            onRemoveAddress={removeAddress}
            onAddExperience={addExperience}
            onUpdateExperience={updateExperience}
            onRemoveExperience={removeExperience}
            onPhotoUpload={handlePhotoUpload}
            onPhotoDelete={handlePhotoDelete}
            employeeName={
              formData.personal
                ? [formData.personal.first_name, formData.personal.last_name].filter(Boolean).join(" ")
                : undefined
            }
            onPrevEmpLookup={handlePrevEmpLookup}
            prevEmpLoading={prevEmpLoading}
            {...commonSaveProps}
          />
        );
      case 1:
        return (
          <OfficialInformationStep
            data={{
              official: formData.official,
              bank: formData.bank,
            }}
            disabled={isDisabled}
            setup={setup}
            sidebarBranchId={branchId}
            ebId={ebId}
            onOfficialChange={updateOfficial}
            onBankChange={updateBank}
            {...commonSaveProps}
          />
        );
      case 2:
        return (
          <PlaceholderStep
            title="Upload Documents"
            description="Upload all relevant documents based on checklist"
            onBack={goBack}
          />
        );
      case 3:
        return (
          <PlaceholderStep
            title="Generate Letters"
            description="Download Offer / Appointment Letter"
            onBack={goBack}
          />
        );
      case 4:
        return (
          <PlaceholderStep
            title="Onboarding"
            description="Generate Welcome letter, email id, assets handover form, etc."
            onBack={goBack}
          />
        );
      case 5:
        return (
          <PlaceholderStep
            title="Shift and Leave Policy"
            description="Select Employee Leave Policy and Shift Timings"
            onBack={goBack}
          />
        );
      case 6:
        return (
          <MedicalEnrollmentStep
            pfData={formData.pf}
            esiData={formData.esi}
            disabled={isDisabled}
            onPfChange={updatePf}
            onEsiChange={updateEsi}
            {...commonSaveProps}
          />
        );
      default:
        return null;
    }
  };

  // ─── Loading state ───────────────────────────────────────────────
  if (setup.loading) {
    return (
      <Box className="flex items-center justify-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="flex flex-col min-h-0">
      {selectedStep === null ? (
        <StepOverview
          steps={WIZARD_STEPS}
          completedSteps={completedSteps}
          progress={progress}
          mode={mode}
          ebId={ebId}
          statusId={formData.personal?.status_id}
          onStepClick={setSelectedStep}
          onActionClick={handleActionClick}
          onBack={() => router.push("/dashboardportal/hrms/employeeDatabase")}
        />
      ) : (
        renderStepContent()
      )}

      <StatusActionDialog
        open={statusDialog.open}
        actionLabel={statusDialog.label}
        onConfirm={handleStatusDialogConfirm}
        onCancel={() => setStatusDialog({ open: false, statusId: 0, label: "" })}
        loading={statusUpdating}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function AddEmployeePage() {
  return (
    <Suspense fallback={<Box className="flex items-center justify-center py-12"><CircularProgress /></Box>}>
      <AddEmployeeContent />
    </Suspense>
  );
}
