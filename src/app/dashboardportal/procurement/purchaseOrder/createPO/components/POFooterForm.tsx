import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";

type POFooterFormProps = {
  schema: Schema;
  formKey: number;
  initialValues: Record<string, unknown>;
  mode: MuiFormMode;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onValuesChange: (values: Record<string, unknown>) => void;
};

/**
 * Footer form housing notes, advance percentages, and other fields rendered after line items.
 */
export function POFooterForm({ schema, formKey, initialValues, mode, onSubmit, onValuesChange }: POFooterFormProps) {
  return (
    <MuiForm
      key={`${formKey}-footer`}
      schema={schema}
      initialValues={initialValues}
      mode={mode}
      hideModeToggle
      hideSubmit
      onSubmit={onSubmit}
      onValuesChange={onValuesChange}
    />
  );
}

export default POFooterForm;
