"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  PaySchemeStructureEntry,
  FormMode,
} from "../types/paySchemeTypes";

interface UsePaySchemeFormStateParams {
  mode: FormMode;
}

interface PaySchemeFormData {
  code: string;
  name: string;
  description: string;
  components: PaySchemeStructureEntry[];
}

function buildDefaults(): PaySchemeFormData {
  return {
    code: "",
    name: "",
    description: "",
    components: [],
  };
}

export function usePaySchemeFormState({ mode }: UsePaySchemeFormStateParams) {
  const [formData, setFormData] = useState<PaySchemeFormData>(buildDefaults);
  const [saving, setSaving] = useState(false);

  const isDisabled = mode === "view";

  const updateField = useCallback(
    <K extends keyof PaySchemeFormData>(key: K, value: PaySchemeFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addComponent = useCallback((entry: PaySchemeStructureEntry) => {
    setFormData((prev) => ({
      ...prev,
      components: [...prev.components, entry],
    }));
  }, []);

  const updateComponent = useCallback(
    (index: number, data: Partial<PaySchemeStructureEntry>) => {
      setFormData((prev) => ({
        ...prev,
        components: prev.components.map((c, i) => (i === index ? { ...c, ...data } : c)),
      }));
    },
    [],
  );

  const removeComponent = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  }, []);

  const resetForm = useCallback((data?: PaySchemeFormData) => {
    setFormData(data ?? buildDefaults());
  }, []);

  return {
    formData,
    setFormData,
    saving,
    setSaving,
    isDisabled,
    updateField,
    addComponent,
    updateComponent,
    removeComponent,
    resetForm,
  };
}
