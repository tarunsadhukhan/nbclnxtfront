"use client";

import React, { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tokens } from "@/styles/tokens";
import type { OfficialDetails, BankDetails } from "../../types/employeeTypes";
import type { useEmployeeSetup } from "../../hooks/useEmployeeSetup";
import OfficialStep from "./OfficialStep";
import BankStep from "./BankStep";
import SalaryStructureStep from "./SalaryStructureStep";

interface OfficialInformationStepProps {
  data: {
    official: OfficialDetails | null;
    bank: BankDetails | null;
  };
  disabled: boolean;
  setup: ReturnType<typeof useEmployeeSetup>;
  sidebarBranchId: string;
  ebId: number | null;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onOfficialChange: (data: Partial<OfficialDetails>) => void;
  onBankChange: (data: Partial<BankDetails>) => void;
}

const SUB_TABS = ["Work Details", "Salary Structure", "Bank Details"] as const;

export default function OfficialInformationStep({
  data,
  disabled,
  setup,
  sidebarBranchId,
  ebId,
  saving,
  onBack,
  onSave,
  onOfficialChange,
  onBankChange,
}: OfficialInformationStepProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box className="flex flex-col gap-4 p-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" style={{ color: tokens.neutral[500] }} />
          <Typography variant="h6" fontWeight={600}>
            Official Information
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
          <OfficialStep data={data.official} onChange={onOfficialChange} disabled={disabled} setup={setup} sidebarBranchId={sidebarBranchId} ebId={ebId} />
        )}
        {activeTab === 1 && (
          <SalaryStructureStep ebId={ebId} branchId={sidebarBranchId} disabled={disabled} saving={saving} />
        )}
        {activeTab === 2 && (
          <BankStep data={data.bank} onChange={onBankChange} disabled={disabled} />
        )}
      </Box>
    </Box>
  );
}
