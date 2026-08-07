/**
 * Hook to manage employee wizard form state across all steps.
 */
"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  FormMode,
  EmployeeFullData,
  PersonalDetails,
  ContactDetails,
  AddressDetails,
  OfficialDetails,
  BankDetails,
  PfDetails,
  EsiDetails,
  ExperienceDetails,
  SectionProgress,
  SectionName,
} from "../types/employeeTypes";
import { WIZARD_STEPS } from "../types/employeeTypes";

interface UseEmployeeFormStateProps {
  mode: FormMode;
  initialData?: EmployeeFullData | null;
}

const EMPTY_DATA: EmployeeFullData = Object.freeze({
  personal: null,
  contact: null,
  address: [],
  official: null,
  bank: null,
  pf: null,
  esi: null,
  experience: [],
});

export function useEmployeeFormState({ mode, initialData }: UseEmployeeFormStateProps) {
  const [formData, setFormData] = useState<EmployeeFullData>(initialData ?? { ...EMPTY_DATA, address: [], experience: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [ebId, setEbId] = useState<number | null>(initialData?.personal?.eb_id ?? null);
  const [saving, setSaving] = useState(false);

  const isDisabled = mode === "view";

  const updateSection = useCallback(
    <K extends keyof EmployeeFullData>(section: K, data: EmployeeFullData[K]) => {
      setFormData((prev) => ({ ...prev, [section]: data }));
    },
    [],
  );

  const updatePersonal = useCallback(
    (data: Partial<PersonalDetails>) =>
      setFormData((prev) => ({
        ...prev,
        personal: { ...prev.personal, ...data } as PersonalDetails,
      })),
    [],
  );

  const updateContact = useCallback(
    (data: Partial<ContactDetails>) =>
      setFormData((prev) => ({
        ...prev,
        contact: { ...prev.contact, ...data } as ContactDetails,
      })),
    [],
  );

  const updateOfficial = useCallback(
    (data: Partial<OfficialDetails>) =>
      setFormData((prev) => ({
        ...prev,
        official: { ...prev.official, ...data } as OfficialDetails,
      })),
    [],
  );

  const updateBank = useCallback(
    (data: Partial<BankDetails>) =>
      setFormData((prev) => ({
        ...prev,
        bank: { ...prev.bank, ...data } as BankDetails,
      })),
    [],
  );

  const updatePf = useCallback(
    (data: Partial<PfDetails>) =>
      setFormData((prev) => ({
        ...prev,
        pf: { ...prev.pf, ...data } as PfDetails,
      })),
    [],
  );

  const updateEsi = useCallback(
    (data: Partial<EsiDetails>) =>
      setFormData((prev) => ({
        ...prev,
        esi: { ...prev.esi, ...data } as EsiDetails,
      })),
    [],
  );

  const addAddress = useCallback(
    (addr: AddressDetails) =>
      setFormData((prev) => ({ ...prev, address: [...prev.address, addr] })),
    [],
  );

  const updateAddress = useCallback(
    (index: number, data: Partial<AddressDetails>) =>
      setFormData((prev) => ({
        ...prev,
        address: prev.address.map((a, i) => (i === index ? { ...a, ...data } : a)),
      })),
    [],
  );

  const removeAddress = useCallback(
    (index: number) =>
      setFormData((prev) => ({
        ...prev,
        address: prev.address.filter((_, i) => i !== index),
      })),
    [],
  );

  const addExperience = useCallback(
    (exp: ExperienceDetails) =>
      setFormData((prev) => ({ ...prev, experience: [...prev.experience, exp] })),
    [],
  );

  const updateExperience = useCallback(
    (index: number, data: Partial<ExperienceDetails>) =>
      setFormData((prev) => ({
        ...prev,
        experience: prev.experience.map((e, i) => (i === index ? { ...e, ...data } : e)),
      })),
    [],
  );

  const removeExperience = useCallback(
    (index: number) =>
      setFormData((prev) => ({
        ...prev,
        experience: prev.experience.filter((_, i) => i !== index),
      })),
    [],
  );

  const sectionProgress = useMemo<SectionProgress>(() => {
    const p = formData.personal;
    return {
      personal: p !== null && !!p.first_name,
      contact: formData.contact !== null && !!formData.contact.mobile_no,
      address: formData.address.length > 0,
      experience: formData.experience.length > 0,
      official: formData.official !== null && !!formData.official.emp_code,
      bank: formData.bank !== null && !!formData.bank.bank_acc_no,
      pf: formData.pf !== null && !!formData.pf.pf_no,
      esi: formData.esi !== null,
    };
  }, [formData]);

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    (WIZARD_STEPS as readonly { sections: SectionName[] }[]).forEach((step, idx) => {
      // Steps with no sections are not markable as complete yet (placeholder steps)
      if (step.sections.length === 0) return;
      if (step.sections.every((s: SectionName) => sectionProgress[s])) {
        set.add(idx);
      }
    });
    return set;
  }, [sectionProgress]);

  return {
    formData,
    setFormData,
    activeStep,
    setActiveStep,
    ebId,
    setEbId,
    saving,
    setSaving,
    isDisabled,
    updateSection,
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
  };
}
