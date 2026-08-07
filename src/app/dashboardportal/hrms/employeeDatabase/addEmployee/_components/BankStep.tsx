"use client";

import React, { useMemo, useRef, useCallback } from "react";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import type { BankDetails } from "../../types/employeeTypes";

interface BankStepProps {
  data: BankDetails | null;
  onChange: (vals: Partial<BankDetails>) => void;
  disabled: boolean;
}

export default function BankStep({ data, onChange, disabled }: BankStepProps) {
  const formRef = useRef<MuiFormHandle>(null);

  const schema = useMemo<Schema>(() => ({
    fields: [
      { name: "bank_name", label: "Bank Name", type: "text", required: true, grid: { xs: 12, sm: 6 } },
      { name: "bank_branch_name", label: "Bank Branch", type: "text", grid: { xs: 12, sm: 6 } },
      { name: "bank_acc_no", label: "Account Number", type: "text", required: true, grid: { xs: 12, sm: 6 } },
      { name: "ifsc_code", label: "IFSC Code", type: "text", required: true, grid: { xs: 12, sm: 6 } },
      { name: "is_verified", label: "Verified", type: "checkbox", grid: { xs: 12, sm: 4 } },
    ] satisfies Field[],
  }), []);

  const values = useMemo(() => ({
    bank_name: data?.bank_name ?? "",
    bank_branch_name: data?.bank_branch_name ?? "",
    bank_acc_no: data?.bank_acc_no ?? "",
    ifsc_code: data?.ifsc_code ?? "",
    is_verified: data?.is_verified ?? 0,
  }), [data]);

  const handleChange = useCallback(
    (vals: Record<string, unknown>) => onChange(vals as Partial<BankDetails>),
    [onChange],
  );

  return (
    <MuiForm
      ref={formRef}
      schema={schema}
      initialValues={values}
      mode={disabled ? "view" : "edit"}
      onValuesChange={handleChange}
      hideModeToggle
      hideSubmit
    />
  );
}
