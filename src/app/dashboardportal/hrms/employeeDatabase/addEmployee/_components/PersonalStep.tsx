"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { Box, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button as MuiButton } from "@mui/material";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import type { PersonalDetails, Option } from "../../types/employeeTypes";
import type { useEmployeeSetup } from "../../hooks/useEmployeeSetup";
import EmployeePhotoUpload from "./EmployeePhotoUpload";

interface PersonalStepProps {
  data: PersonalDetails | null;
  onChange: (data: Partial<PersonalDetails>) => void;
  disabled: boolean;
  setup: ReturnType<typeof useEmployeeSetup>;
  photoUrl: string | null;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete?: () => void;
  employeeName?: string;
  onPrevEmpLookup?: (empCode: string) => Promise<Record<string, unknown> | null>;
  prevEmpLoading?: boolean;
}

const GENDER_OPTIONS: Option[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

const MARITAL_OPTIONS: Option[] = [
  { label: "Single", value: "0" },
  { label: "Married", value: "1" },
  { label: "Divorced", value: "2" },
  { label: "Widowed", value: "3" },
];

export default function PersonalStep({
  data,
  onChange,
  disabled,
  setup,
  photoUrl,
  onPhotoUpload,
  onPhotoDelete,
  employeeName,
  onPrevEmpLookup,
  prevEmpLoading,
}: PersonalStepProps) {
  const formRef = useRef<MuiFormHandle>(null);
  const [prevEmpNo, setPrevEmpNo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingLookup, setPendingLookup] = useState<Record<string, unknown> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handlePrevEmpBlur = useCallback(async () => {
    const code = prevEmpNo.trim();
    if (!code || !onPrevEmpLookup) return;
    setLookupError(null);
    const result = await onPrevEmpLookup(code);
    if (!result) {
      setLookupError("Employee code not found");
      return;
    }
    setPendingLookup(result);
    setConfirmOpen(true);
  }, [prevEmpNo, onPrevEmpLookup]);

  const handleConfirmYes = useCallback(() => {
    if (!pendingLookup) return;
    const d = pendingLookup;
    onChange({
      fixed_eb_id: d.eb_id as number,
      first_name: (d.first_name as string) ?? "",
      middle_name: (d.middle_name as string | null) ?? null,
      last_name: (d.last_name as string | null) ?? null,
      gender: (d.gender as string | null) ?? null,
      date_of_birth: (d.date_of_birth as string | null) ?? null,
      blood_group: (d.blood_group as string | null) ?? null,
      mobile_no: (d.mobile_no as string | null) ?? null,
      email_id: (d.email_id as string | null) ?? null,
      marital_status: (d.marital_status as number | null) ?? null,
      country_id: (d.country_id as number | null) ?? null,
      relegion_name: (d.relegion_name as string | null) ?? null,
      father_spouse_name: (d.father_spouse_name as string | null) ?? null,
      passport_no: (d.passport_no as string | null) ?? null,
      driving_licence_no: (d.driving_licence_no as string | null) ?? null,
      pan_no: (d.pan_no as string | null) ?? null,
      aadhar_no: (d.aadhar_no as string | null) ?? null,
    });
    setConfirmOpen(false);
    setPendingLookup(null);
  }, [pendingLookup, onChange]);

  const handleConfirmNo = useCallback(() => {
    setConfirmOpen(false);
    setPendingLookup(null);
    setPrevEmpNo("");
  }, []);

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        { name: "first_name", label: "First Name", type: "text", required: true, grid: { xs: 12, sm: 4 } },
        { name: "middle_name", label: "Middle Name", type: "text", grid: { xs: 12, sm: 4 } },
        { name: "last_name", label: "Last Name", type: "text", required: true, grid: { xs: 12, sm: 4 } },
        { name: "gender", label: "Gender", type: "select", options: GENDER_OPTIONS, required: true, grid: { xs: 12, sm: 4 } },
        { name: "date_of_birth", label: "Date of Birth", type: "date", grid: { xs: 12, sm: 4 } },
        { name: "blood_group", label: "Blood Group", type: "select", options: setup.bloodGroupOptions as Option[], grid: { xs: 12, sm: 4 } },
        { name: "email_id", label: "Email Id", type: "text", grid: { xs: 12, sm: 4 } },
        { name: "marital_status", label: "Marital Status", type: "select", options: MARITAL_OPTIONS, grid: { xs: 12, sm: 4 } },
        { name: "relegion_name", label: "Nationality", type: "text", grid: { xs: 12, sm: 4 } },
        { name: "father_spouse_name", label: "Father / Spouse Name", type: "text", grid: { xs: 12, sm: 6 } },
        { name: "passport_no", label: "Passport Number", type: "text", grid: { xs: 12, sm: 6 } },
        { name: "driving_licence_no", label: "Driving Licence No", type: "text", grid: { xs: 12, sm: 4 } },
        { name: "pan_no", label: "PAN No", type: "text", grid: { xs: 12, sm: 4 } },
        { name: "aadhar_no", label: "Aadhaar No", type: "text", grid: { xs: 12, sm: 4 } },
      ] satisfies Field[],
    }),
    [setup.bloodGroupOptions],
  );

  const values = useMemo(
    () => ({
      first_name: data?.first_name ?? "",
      middle_name: data?.middle_name ?? "",
      last_name: data?.last_name ?? "",
      gender: data?.gender ?? "",
      date_of_birth: data?.date_of_birth ?? "",
      blood_group: data?.blood_group ?? "",
      email_id: data?.email_id ?? "",
      marital_status: data?.marital_status != null ? String(data.marital_status) : "",
      relegion_name: data?.relegion_name ?? "",
      father_spouse_name: data?.father_spouse_name ?? "",
      passport_no: data?.passport_no ?? "",
      driving_licence_no: data?.driving_licence_no ?? "",
      pan_no: data?.pan_no ?? "",
      aadhar_no: data?.aadhar_no ?? "",
    }),
    [data],
  );

  const handleChange = useCallback(
    (vals: Record<string, unknown>) => {
      onChange(vals as Partial<PersonalDetails>);
    },
    [onChange],
  );

  return (
    <Box className="flex flex-col md:flex-row gap-6">
      {/* Photo upload on the left */}
      <Box
        className="flex flex-col items-center justify-center shrink-0"
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 3,
          minHeight: 220,
          width: { xs: "100%", md: 220 },
        }}
      >
        <EmployeePhotoUpload
          photoUrl={photoUrl}
          onUpload={onPhotoUpload}
          onDelete={onPhotoDelete}
          disabled={disabled}
          employeeName={employeeName}
        />
      </Box>
      {/* Form fields on the right */}
      <Box className="flex-1 min-w-0">
        {/* Prev Emp No — lookup field before the main form */}
        {!disabled && (
          <Box className="mb-4" sx={{ maxWidth: 300 }}>
            <TextField
              label="Prev Emp No"
              size="small"
              fullWidth
              value={prevEmpNo}
              onChange={(e) => { setPrevEmpNo(e.target.value); setLookupError(null); }}
              onBlur={handlePrevEmpBlur}
              disabled={prevEmpLoading}
              error={!!lookupError}
              helperText={lookupError ?? "Enter previous employee code to pre-fill data"}
              slotProps={{
                input: {
                  endAdornment: prevEmpLoading ? <CircularProgress size={18} /> : null,
                },
              }}
            />
          </Box>
        )}
        <MuiForm
          ref={formRef}
          schema={schema}
          initialValues={values}
          mode={disabled ? "view" : "edit"}
          onValuesChange={handleChange}
          hideModeToggle
          hideSubmit
        />
      </Box>

      {/* Confirmation dialog for pre-filling previous employee data */}
      <Dialog open={confirmOpen} onClose={handleConfirmNo}>
        <DialogTitle>Previous Employee Found</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Employee <strong>{String(pendingLookup?.emp_code ?? "")}</strong> found:{" "}
            <strong>{String(pendingLookup?.first_name ?? "")} {String(pendingLookup?.last_name ?? "")}</strong>.
            <br />
            Do you want to pre-fill the form with this employee&apos;s data?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleConfirmNo}>No</MuiButton>
          <MuiButton onClick={handleConfirmYes} variant="contained" autoFocus>
            Yes, Pre-fill
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
