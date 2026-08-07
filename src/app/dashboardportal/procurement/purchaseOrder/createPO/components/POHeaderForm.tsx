import React from "react";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";
import { Button } from "@/components/ui/button";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

type POHeaderFormProps = {
  schema: Schema;
  formKey: number;
  initialValues: Record<string, unknown>;
  mode: MuiFormMode;
  formRef: FormRef;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onValuesChange: (values: Record<string, unknown>) => void;
  showIndentButton: boolean;
  onIndentSelect: () => void;
  indentButtonDisabled: boolean;
};

/**
 * Renders the header-level form controls (branch/supplier details) and the optional indent helper button.
 */
export function POHeaderForm({
  schema,
  formKey,
  initialValues,
  mode,
  formRef,
  onSubmit,
  onValuesChange,
  showIndentButton,
  onIndentSelect,
  indentButtonDisabled,
}: POHeaderFormProps) {
  return (
    <div className="space-y-6">
      <MuiForm
        key={formKey}
        ref={formRef}
        schema={schema}
        initialValues={initialValues}
        mode={mode}
        hideModeToggle
        hideSubmit
        onSubmit={onSubmit}
        onValuesChange={onValuesChange}
      />

      {showIndentButton && (
        <div className="space-y-2">
          <Button variant="outline" onClick={onIndentSelect} disabled={indentButtonDisabled}>
            Select from Indent
          </Button>
          <p className="text-xs text-slate-500">Select items from an indent to populate the PO line items.</p>
        </div>
      )}
    </div>
  );
}

export default POHeaderForm;
