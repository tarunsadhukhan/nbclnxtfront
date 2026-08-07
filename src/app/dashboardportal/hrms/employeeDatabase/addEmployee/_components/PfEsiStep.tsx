"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { Box, Typography, Divider } from "@mui/material";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import type { PfDetails, EsiDetails } from "../../types/employeeTypes";

interface PfEsiStepProps {
  pfData: PfDetails | null;
  esiData: EsiDetails | null;
  onPfChange: (vals: Partial<PfDetails>) => void;
  onEsiChange: (vals: Partial<EsiDetails>) => void;
  disabled: boolean;
}

const pfSchema: Schema = {
  fields: [
    { name: "pf_no", label: "PF Number", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "pf_uan_no", label: "UAN Number", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "pf_previous_no", label: "Previous PF Number", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "pf_transfer_no", label: "PF Transfer Number", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "nominee_name", label: "Nominee Name", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "relationship_name", label: "Relationship", type: "text", grid: { xs: 12, sm: 4 } },
    { name: "pf_date_of_join", label: "PF Date of Joining", type: "date", grid: { xs: 12, sm: 4 } },
  ] satisfies Field[],
};

const esiSchema: Schema = {
  fields: [
    { name: "esi_no", label: "ESI Number", type: "text", grid: { xs: 12, sm: 6 } },
    { name: "medical_policy_no", label: "Medical Policy Number", type: "text", grid: { xs: 12, sm: 6 } },
  ] satisfies Field[],
};

export default function PfEsiStep({ pfData, esiData, onPfChange, onEsiChange, disabled }: PfEsiStepProps) {
  const pfFormRef = useRef<MuiFormHandle>(null);
  const esiFormRef = useRef<MuiFormHandle>(null);

  const pfValues = useMemo(() => ({
    pf_no: pfData?.pf_no ?? "",
    pf_uan_no: pfData?.pf_uan_no ?? "",
    pf_previous_no: pfData?.pf_previous_no ?? "",
    pf_transfer_no: pfData?.pf_transfer_no ?? "",
    nominee_name: pfData?.nominee_name ?? "",
    relationship_name: pfData?.relationship_name ?? "",
    pf_date_of_join: pfData?.pf_date_of_join ?? "",
  }), [pfData]);

  const esiValues = useMemo(() => ({
    esi_no: esiData?.esi_no ?? "",
    medical_policy_no: esiData?.medical_policy_no ?? "",
  }), [esiData]);

  const handlePfChange = useCallback(
    (vals: Record<string, unknown>) => onPfChange(vals as Partial<PfDetails>),
    [onPfChange],
  );

  const handleEsiChange = useCallback(
    (vals: Record<string, unknown>) => onEsiChange(vals as Partial<EsiDetails>),
    [onEsiChange],
  );

  const mode = disabled ? "view" as const : "edit" as const;

  return (
    <Box className="flex flex-col gap-6">
      <Box>
        <Typography variant="subtitle1" className="mb-3 font-semibold">
          Provident Fund Details
        </Typography>
        <MuiForm ref={pfFormRef} schema={pfSchema} initialValues={pfValues} mode={mode} onValuesChange={handlePfChange} hideModeToggle hideSubmit />
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle1" className="mb-3 font-semibold">
          ESI Details
        </Typography>
        <MuiForm ref={esiFormRef} schema={esiSchema} initialValues={esiValues} mode={mode} onValuesChange={handleEsiChange} hideModeToggle hideSubmit />
      </Box>
    </Box>
  );
}
