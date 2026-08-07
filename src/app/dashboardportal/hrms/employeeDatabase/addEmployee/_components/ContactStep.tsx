"use client";

import React, { useMemo, useRef, useCallback } from "react";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import type { ContactDetails } from "../../types/employeeTypes";
import type { useEmployeeSetup } from "../../hooks/useEmployeeSetup";

interface ContactStepProps {
  data: ContactDetails | null;
  onChange: (data: Partial<ContactDetails>) => void;
  disabled: boolean;
  setup: ReturnType<typeof useEmployeeSetup>;
}

export default function ContactStep({ data, onChange, disabled }: ContactStepProps) {
  const formRef = useRef<MuiFormHandle>(null);

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        { name: "mobile_no", label: "Mobile Number", type: "text", required: true, grid: { xs: 12, sm: 6 } },
        { name: "emergency_no", label: "Emergency Number", type: "text", grid: { xs: 12, sm: 6 } },
      ] satisfies Field[],
    }),
    [],
  );

  const values = useMemo(
    () => ({
      mobile_no: data?.mobile_no ?? "",
      emergency_no: data?.emergency_no ?? "",
    }),
    [data],
  );

  const handleChange = useCallback(
    (vals: Record<string, unknown>) => onChange(vals as Partial<ContactDetails>),
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
