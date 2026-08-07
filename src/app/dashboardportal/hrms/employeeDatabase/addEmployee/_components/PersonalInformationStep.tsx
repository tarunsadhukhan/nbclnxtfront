"use client";

import React, { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tokens } from "@/styles/tokens";
import type {
  PersonalDetails,
  ContactDetails,
  AddressDetails,
  ExperienceDetails,
} from "../../types/employeeTypes";
import type { useEmployeeSetup } from "../../hooks/useEmployeeSetup";
import PersonalStep from "./PersonalStep";
import ContactStep from "./ContactStep";
import AddressStep from "./AddressStep";
import ExperienceStep from "./ExperienceStep";

interface PersonalInformationStepProps {
  data: {
    personal: PersonalDetails | null;
    contact: ContactDetails | null;
    address: AddressDetails[];
    experience: ExperienceDetails[];
  };
  disabled: boolean;
  setup: ReturnType<typeof useEmployeeSetup>;
  photoUrl: string | null;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  // Section updaters
  onPersonalChange: (data: Partial<PersonalDetails>) => void;
  onContactChange: (data: Partial<ContactDetails>) => void;
  onAddAddress: (addr: AddressDetails) => void;
  onUpdateAddress: (index: number, data: Partial<AddressDetails>) => void;
  onRemoveAddress: (index: number) => void;
  onAddExperience: (exp: ExperienceDetails) => void;
  onUpdateExperience: (index: number, data: Partial<ExperienceDetails>) => void;
  onRemoveExperience: (index: number) => void;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete: () => void;
  employeeName?: string;
  onPrevEmpLookup?: (empCode: string) => Promise<Record<string, unknown> | null>;
  prevEmpLoading?: boolean;
}

const SUB_TABS = ["Personal Details", "Contact Details", "Address Details", "Previous Experience"] as const;

export default function PersonalInformationStep({
  data,
  disabled,
  setup,
  photoUrl,
  saving,
  onBack,
  onSave,
  onPersonalChange,
  onContactChange,
  onAddAddress,
  onUpdateAddress,
  onRemoveAddress,
  onAddExperience,
  onUpdateExperience,
  onRemoveExperience,
  onPhotoUpload,
  onPhotoDelete,
  employeeName,
  onPrevEmpLookup,
  prevEmpLoading,
}: PersonalInformationStepProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box className="flex flex-col gap-4 p-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" style={{ color: tokens.neutral[500] }} />
          <Typography variant="h6" fontWeight={600}>
            Personal Information
          </Typography>
        </Box>
        {!disabled && (
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        )}
      </Box>

      {/* Sub-tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.875rem" },
          "& .Mui-selected": { color: tokens.brand.secondary },
          "& .MuiTabs-indicator": { backgroundColor: tokens.brand.secondary },
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Tab content */}
      <Box className="rounded-lg border bg-white p-6 shadow-sm">
        {activeTab === 0 && (
          <PersonalStep
            data={data.personal}
            onChange={onPersonalChange}
            disabled={disabled}
            setup={setup}
            photoUrl={photoUrl}
            onPhotoUpload={onPhotoUpload}
            onPhotoDelete={onPhotoDelete}
            employeeName={employeeName}
            onPrevEmpLookup={onPrevEmpLookup}
            prevEmpLoading={prevEmpLoading}
          />
        )}
        {activeTab === 1 && (
          <ContactStep data={data.contact} onChange={onContactChange} disabled={disabled} setup={setup} />
        )}
        {activeTab === 2 && (
          <AddressStep
            addresses={data.address}
            onAdd={onAddAddress}
            onUpdate={onUpdateAddress}
            onRemove={onRemoveAddress}
            disabled={disabled}
            setup={setup}
          />
        )}
        {activeTab === 3 && (
          <ExperienceStep
            items={data.experience}
            onAdd={onAddExperience}
            onUpdate={onUpdateExperience}
            onRemove={onRemoveExperience}
            disabled={disabled}
          />
        )}
      </Box>
    </Box>
  );
}
